import express from 'express';
import { clerkClient } from '@clerk/express';
import { broadcastActivityEvent } from '../websocket/index.js';
import { apiConfig } from '../config/env.config.js';

const router = express.Router();

// Service connectivity configuration
const SERVICE_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Helper function for service calls with timeout and retry logic
async function makeServiceCall(url: string, options: RequestInit, retries = MAX_RETRIES): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SERVICE_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    if (retries > 0 && (error instanceof Error && error.name === 'AbortError')) {
      console.warn(`[Activity] Service call timeout, retrying... (${MAX_RETRIES - retries + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return makeServiceCall(url, options, retries - 1);
    }

    throw error;
  }
}

// Helper function to check crew service availability
async function checkCrewServiceAvailability(): Promise<boolean> {
  try {
    const response = await makeServiceCall(`${apiConfig.CREW_SERVICE_URL}/health`, { method: 'GET' }, 1);
    return response.ok;
  } catch (error) {
    console.warn('[Activity] Crew service unavailable:', error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
}

// Middleware for Clerk authentication
const requireAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const userId = req.headers['user-id'] as string;

    if (!token || !userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    // Verify the JWT token with Clerk
    try {
      await clerkClient.verifyToken(token);
      req.auth = { userId };
      next();
    } catch (error) {
      console.error('Token verification failed:', error);
      return res.status(401).json({ success: false, error: 'Invalid authentication token' });
    }
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({ success: false, error: 'Authentication error' });
  }
};

// Rate limiting map - in production, use Redis or similar
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const rateLimit = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const userId = req.auth?.userId;
  if (!userId) return next();

  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 100; // 100 requests per minute

  const userLimit = rateLimitMap.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    // Reset or initialize
    rateLimitMap.set(userId, { count: 1, resetTime: now + windowMs });
    return next();
  }

  if (userLimit.count >= maxRequests) {
    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      retryAfter: Math.ceil((userLimit.resetTime - now) / 1000)
    });
  }

  userLimit.count++;
  next();
};

// Input validation middleware
const validateActivityTrack = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const { sessionId, activityType, description } = req.body;

  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ success: false, error: 'sessionId is required and must be a string' });
  }

  if (!activityType || !['tool_used', 'site_visited', 'document_read', 'content_created'].includes(activityType)) {
    return res.status(400).json({
      success: false,
      error: 'activityType is required and must be one of: tool_used, site_visited, document_read, content_created'
    });
  }

  if (!description || typeof description !== 'string') {
    return res.status(400).json({ success: false, error: 'description is required and must be a string' });
  }

  // Sanitize description
  req.body.description = description.substring(0, 500); // Max 500 chars

  next();
};

// POST /api/activity/track - Track activity events
router.post('/track', requireAuth, rateLimit, validateActivityTrack, async (req, res) => {
  try {
    const { sessionId, activityType, description, metadata = {} } = req.body;
    const userId = req.auth?.userId;

    // Add user info to metadata
    const enrichedMetadata = {
      ...metadata,
      userId,
      timestamp: new Date().toISOString()
    };

    // Broadcast activity event via WebSocket
    broadcastActivityEvent(sessionId, activityType, description, enrichedMetadata);

    console.log('[Activity] Tracked activity:', {
      sessionId,
      activityType,
      description: description.substring(0, 100),
      userId
    });

    return res.json({
      success: true,
      message: 'Activity tracked successfully',
      data: {
        sessionId,
        activityType,
        description,
        timestamp: enrichedMetadata.timestamp
      }
    });
  } catch (error) {
    console.error('Activity tracking error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to track activity',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/activity/session/:sessionId - Get comprehensive activity data
router.get('/session/:sessionId', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.auth?.userId;

    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'sessionId is required' });
    }

    // Fetch data from crew service endpoints
    const baseUrl = apiConfig.CREW_SERVICE_URL;
    if (!baseUrl) {
      return res.status(500).json({
        success: false,
        error: 'Crew service not configured'
      });
    }

    // Check crew service availability before making calls
    const isCrewAvailable = await checkCrewServiceAvailability();
    if (!isCrewAvailable) {
      return res.status(503).json({
        success: false,
        error: 'Crew service unavailable',
        details: 'The crew service is currently not responding. Please try again later.',
        retry: true
      });
    }

    try {
      // Fetch tool traces and memory data in parallel
      const [toolsResponse, memoryResponse] = await Promise.all([
        makeServiceCall(`${baseUrl}/api/tools/traces/${encodeURIComponent(sessionId)}`, { method: 'GET' }),
        makeServiceCall(`${baseUrl}/api/crew/memory/${encodeURIComponent(sessionId)}`, { method: 'GET' })
      ]);

      const [toolsData, memoryData] = await Promise.all([
        toolsResponse.ok ? toolsResponse.json() : { success: false, tool_calls: [] },
        memoryResponse.ok ? memoryResponse.json() : { success: false, notes: [], summaries: [], messages: [] }
      ]);

      // Transform data into quad-section format
      const activityData = {
        toolsUsed: transformToolCalls(toolsData.tool_calls || []),
        sitesBrowsed: extractSiteVisits(toolsData.tool_calls || []),
        documentsRead: transformDocuments(memoryData.notes || [], memoryData.summaries || []),
        contentCreated: transformContentCreated(memoryData.summaries || [], memoryData.messages || [])
      };

      console.log('[Activity] Session data retrieved:', {
        sessionId,
        userId,
        toolsCount: activityData.toolsUsed.length,
        sitesCount: activityData.sitesBrowsed.length,
        documentsCount: activityData.documentsRead.length,
        contentCount: activityData.contentCreated.length
      });

      return res.json({
        success: true,
        sessionId,
        data: activityData,
        timestamp: new Date().toISOString()
      });

    } catch (fetchError) {
      console.error('Error fetching crew service data:', fetchError);
      const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown error';

      // Check if it's a timeout or connection error
      if (errorMessage.includes('timeout') || errorMessage.includes('ECONNREFUSED')) {
        return res.status(503).json({
          success: false,
          error: 'Crew service connection timeout',
          details: 'The crew service is taking too long to respond. Please try again later.',
          retry: true
        });
      }

      return res.status(502).json({
        success: false,
        error: 'Failed to fetch session data from crew service',
        details: errorMessage,
        retry: true
      });
    }

  } catch (error) {
    console.error('Session activity data error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve session activity data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/activity/health - Health check endpoint
router.get('/health', (req, res) => {
  return res.json({
    success: true,
    service: 'activity-tracking',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Data transformation functions
function transformToolCalls(toolCalls: any[]): any[] {
  const toolUsageMap = new Map();

  toolCalls.forEach((call: any) => {
    const toolName = call.tool_name;
    if (toolUsageMap.has(toolName)) {
      const existing = toolUsageMap.get(toolName);
      existing.callCount++;
      existing.lastUsed = call.timestamp > existing.lastUsed ? call.timestamp : existing.lastUsed;
      if (call.status === 'success') {
        existing.successRate = ((existing.successRate * (existing.callCount - 1)) + 1) / existing.callCount;
      } else {
        existing.successRate = (existing.successRate * (existing.callCount - 1)) / existing.callCount;
      }
    } else {
      toolUsageMap.set(toolName, {
        toolName,
        callCount: 1,
        successRate: call.status === 'success' ? 1 : 0,
        lastUsed: call.timestamp,
        metadata: call.metadata
      });
    }
  });

  return Array.from(toolUsageMap.values()).sort((a, b) =>
    new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime()
  );
}

function extractSiteVisits(toolCalls: any[]): any[] {
  const siteVisitsMap = new Map();

  toolCalls.forEach((call: any) => {
    if (call.tool_name && (call.tool_name.includes('firecrawl') || call.tool_name.includes('browse') || call.tool_name.includes('crawl'))) {
      const url = call.metadata?.url || call.result?.url;
      const title = call.metadata?.title || call.result?.title || 'Unknown Page';

      if (url) {
        if (siteVisitsMap.has(url)) {
          const existing = siteVisitsMap.get(url);
          existing.visitCount++;
          existing.lastVisited = call.timestamp > existing.lastVisited ? call.timestamp : existing.lastVisited;
        } else {
          siteVisitsMap.set(url, {
            url,
            title,
            visitCount: 1,
            lastVisited: call.timestamp,
            metadata: call.metadata
          });
        }
      }
    }
  });

  return Array.from(siteVisitsMap.values()).sort((a, b) =>
    new Date(b.lastVisited).getTime() - new Date(a.lastVisited).getTime()
  );
}

function transformDocuments(notes: any[], summaries: any[]): any[] {
  const documents = [];

  notes.forEach((note: any) => {
    documents.push({
      title: note.title || 'Research Note',
      type: 'note',
      content: note.content || '',
      timestamp: note.timestamp,
      metadata: note.metadata
    });
  });

  summaries.forEach((summary: any) => {
    documents.push({
      title: summary.title || 'Summary',
      type: 'summary',
      content: summary.content || '',
      timestamp: summary.timestamp,
      metadata: summary.metadata
    });
  });

  return documents.sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

function transformContentCreated(summaries: any[], messages: any[]): any[] {
  const content = [];

  summaries.forEach((summary: any) => {
    content.push({
      title: summary.title || 'Generated Summary',
      type: 'summary',
      content: summary.content || '',
      timestamp: summary.timestamp,
      metadata: summary.metadata
    });
  });

  messages.filter((msg: any) => msg.type === 'agent' && msg.content).forEach((message: any) => {
    content.push({
      title: `Agent Response - ${new Date(message.timestamp).toLocaleTimeString()}`,
      type: 'message',
      content: message.content,
      timestamp: message.timestamp,
      metadata: { agentId: message.agentId, ...message.metadata }
    });
  });

  return content.sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

// Extend express Request type
declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
      };
    }
  }
}

export default router;