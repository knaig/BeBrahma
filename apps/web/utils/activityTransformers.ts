import { ToolUsage, SiteVisit, DocumentRead, ContentCreated, ActivityEvent } from '../hooks/useActivityDashboard';

// Type definitions for crew service data structures
interface ToolCall {
  tool_name: string;
  params: any;
  result: any;
  status: string;
  timestamp: string;
  metadata?: any;
}

interface Note {
  stage: string;
  content: string;
  timestamp: string;
  title?: string;
  metadata?: any;
}

interface Summary {
  stage: string;
  content: string;
  timestamp: string;
  title?: string;
  metadata?: any;
}

interface Message {
  type: 'agent' | 'user';
  content: string;
  timestamp: string;
  agentId?: string;
  agentName?: string;
  metadata?: any;
}

interface CrewServiceData {
  tool_calls?: ToolCall[];
  notes?: Note[];
  summaries?: Summary[];
  messages?: Message[];
}

/**
 * Transform tool calls data into ToolUsage format for dashboard
 */
export function transformToolTraces(toolCalls: ToolCall[]): ToolUsage[] {
  if (!Array.isArray(toolCalls) || toolCalls.length === 0) {
    return [];
  }

  const toolUsageMap = new Map<string, ToolUsage>();

  toolCalls.forEach((call) => {
    const toolName = call.tool_name;
    if (!toolName) return;

    if (toolUsageMap.has(toolName)) {
      const existing = toolUsageMap.get(toolName)!;
      existing.callCount++;
      
      // Update last used time
      if (new Date(call.timestamp) > new Date(existing.lastUsed)) {
        existing.lastUsed = call.timestamp;
      }
      
      // Recalculate success rate
      const successfulCalls = existing.successRate * (existing.callCount - 1) + (call.status === 'success' ? 1 : 0);
      existing.successRate = successfulCalls / existing.callCount;
      
      // Merge metadata
      existing.metadata = {
        ...existing.metadata,
        ...call.metadata,
        totalCalls: existing.callCount
      };
    } else {
      toolUsageMap.set(toolName, {
        toolName,
        callCount: 1,
        successRate: call.status === 'success' ? 1 : 0,
        lastUsed: call.timestamp,
        metadata: {
          ...call.metadata,
          firstUsed: call.timestamp,
          totalCalls: 1
        }
      });
    }
  });

  return Array.from(toolUsageMap.values())
    .sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime());
}

/**
 * Extract site visits from firecrawl-related tool calls
 */
export function transformSitesFromTraces(toolCalls: ToolCall[]): SiteVisit[] {
  if (!Array.isArray(toolCalls) || toolCalls.length === 0) {
    return [];
  }

  const siteVisitsMap = new Map<string, SiteVisit>();

  toolCalls.forEach((call) => {
    // Check if this is a firecrawl or web browsing tool
    const isWebTool = call.tool_name && (
      call.tool_name.toLowerCase().includes('firecrawl') ||
      call.tool_name.toLowerCase().includes('browse') ||
      call.tool_name.toLowerCase().includes('crawl') ||
      call.tool_name.toLowerCase().includes('web')
    );

    if (!isWebTool) return;

    // Extract URL from params, result, or metadata
    const url = call.params?.url || 
                call.result?.url || 
                call.metadata?.url ||
                call.params?.source_url ||
                call.result?.source_url;

    if (!url) return;

    // Extract title from result or metadata
    const title = call.result?.title || 
                  call.metadata?.title || 
                  call.params?.title ||
                  extractHostname(url) ||
                  'Unknown Page';

    if (siteVisitsMap.has(url)) {
      const existing = siteVisitsMap.get(url)!;
      existing.visitCount++;
      
      // Update last visited time
      if (new Date(call.timestamp) > new Date(existing.lastVisited)) {
        existing.lastVisited = call.timestamp;
      }
      
      // Merge metadata
      existing.metadata = {
        ...existing.metadata,
        ...call.metadata,
        tools: [...(existing.metadata?.tools || []), call.tool_name]
      };
    } else {
      siteVisitsMap.set(url, {
        url,
        title,
        visitCount: 1,
        lastVisited: call.timestamp,
        metadata: {
          ...call.metadata,
          firstVisited: call.timestamp,
          tools: [call.tool_name],
          toolType: call.tool_name
        }
      });
    }
  });

  return Array.from(siteVisitsMap.values())
    .sort((a, b) => new Date(b.lastVisited).getTime() - new Date(a.lastVisited).getTime());
}

/**
 * Transform memory bundle into DocumentRead format
 */
export function transformMemoryBundle(memoryData: CrewServiceData): DocumentRead[] {
  const documents: DocumentRead[] = [];

  // Transform notes
  if (Array.isArray(memoryData.notes)) {
    memoryData.notes.forEach((note) => {
      documents.push({
        title: note.title || `Research Note - ${note.stage || 'General'}`,
        type: 'note',
        content: note.content || '',
        timestamp: note.timestamp,
        metadata: {
          ...note.metadata,
          stage: note.stage,
          wordCount: (note.content || '').split(/\s+/).length,
          charCount: (note.content || '').length
        }
      });
    });
  }

  // Transform summaries as documents
  if (Array.isArray(memoryData.summaries)) {
    memoryData.summaries.forEach((summary) => {
      documents.push({
        title: summary.title || `Summary - ${summary.stage || 'General'}`,
        type: 'summary',
        content: summary.content || '',
        timestamp: summary.timestamp,
        metadata: {
          ...summary.metadata,
          stage: summary.stage,
          wordCount: (summary.content || '').split(/\s+/).length,
          charCount: (summary.content || '').length
        }
      });
    });
  }

  return documents.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

/**
 * Transform content into ContentCreated format
 */
export function transformContentCreated(memoryData: CrewServiceData): ContentCreated[] {
  const content: ContentCreated[] = [];

  // Transform summaries as created content
  if (Array.isArray(memoryData.summaries)) {
    memoryData.summaries.forEach((summary) => {
      content.push({
        title: summary.title || `Generated Summary - ${summary.stage || 'General'}`,
        type: 'summary',
        content: summary.content || '',
        timestamp: summary.timestamp,
        metadata: {
          ...summary.metadata,
          stage: summary.stage,
          contentType: 'summary',
          wordCount: (summary.content || '').split(/\s+/).length
        }
      });
    });
  }

  // Transform agent messages as created content
  if (Array.isArray(memoryData.messages)) {
    memoryData.messages
      .filter((msg) => msg.type === 'agent' && msg.content)
      .forEach((message) => {
        const timestamp = message.timestamp;
        const timeString = new Date(timestamp).toLocaleTimeString();
        
        content.push({
          title: `Agent Response - ${timeString}`,
          type: 'message',
          content: message.content,
          timestamp,
          metadata: {
            ...message.metadata,
            agentId: message.agentId,
            agentName: message.agentName,
            contentType: 'agent_message',
            wordCount: message.content.split(/\s+/).length
          }
        });
      });
  }

  return content.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

/**
 * Transform various data sources into ActivityEvent format for real-time feed
 */
export function transformActivityFeed(
  toolCalls: ToolCall[] = [],
  notes: Note[] = [],
  summaries: Summary[] = [],
  messages: Message[] = []
): ActivityEvent[] {
  const activities: ActivityEvent[] = [];

  // Transform tool calls into activity events
  toolCalls.forEach((call, index) => {
    activities.push({
      id: `tool-${index}-${Date.now()}`,
      type: 'tool_used',
      description: `Used ${call.tool_name} tool`,
      timestamp: call.timestamp,
      metadata: {
        toolName: call.tool_name,
        success: call.status === 'success',
        params: call.params,
        result: call.result
      }
    });

    // If it's a web tool, also add site visit activity
    if (call.tool_name && 
        (call.tool_name.includes('firecrawl') || call.tool_name.includes('browse'))) {
      const url = call.params?.url || call.result?.url;
      const title = call.result?.title || extractHostname(url) || 'Unknown Site';
      
      if (url) {
        activities.push({
          id: `site-${index}-${Date.now()}`,
          type: 'site_visited',
          description: `Visited ${title}`,
          timestamp: call.timestamp,
          metadata: {
            url,
            title,
            toolName: call.tool_name
          }
        });
      }
    }
  });

  // Transform notes into activity events
  notes.forEach((note, index) => {
    activities.push({
      id: `note-${index}-${Date.now()}`,
      type: 'document_read',
      description: `Added research note: ${note.title || 'Untitled'}`,
      timestamp: note.timestamp,
      metadata: {
        title: note.title || 'Research Note',
        type: 'note',
        stage: note.stage,
        contentLength: (note.content || '').length
      }
    });
  });

  // Transform summaries into activity events
  summaries.forEach((summary, index) => {
    activities.push({
      id: `summary-${index}-${Date.now()}`,
      type: 'content_created',
      description: `Generated summary: ${summary.title || 'Untitled'}`,
      timestamp: summary.timestamp,
      metadata: {
        title: summary.title || 'Generated Summary',
        type: 'summary',
        stage: summary.stage,
        contentLength: (summary.content || '').length
      }
    });
  });

  // Transform agent messages into activity events
  messages
    .filter((msg) => msg.type === 'agent' && msg.content)
    .forEach((message, index) => {
      activities.push({
        id: `message-${index}-${Date.now()}`,
        type: 'content_created',
        description: `Agent ${message.agentName || message.agentId || 'Unknown'} responded`,
        timestamp: message.timestamp,
        metadata: {
          title: `Agent Response - ${new Date(message.timestamp).toLocaleTimeString()}`,
          type: 'message',
          agentId: message.agentId,
          agentName: message.agentName,
          contentLength: message.content.length
        }
      });
    });

  // Sort by timestamp (newest first) and limit to recent activities
  return activities
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 100); // Keep only last 100 activities
}

/**
 * Utility function to extract hostname from URL
 */
function extractHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url.substring(0, 30) + (url.length > 30 ? '...' : '');
  }
}

/**
 * Utility function to format relative time
 */
export function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diff = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

/**
 * Utility function to truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Utility function to get activity type icon
 */
export function getActivityTypeIcon(type: ActivityEvent['type']): string {
  switch (type) {
    case 'tool_used': return '🛠️';
    case 'site_visited': return '🌐';
    case 'document_read': return '📖';
    case 'content_created': return '✨';
    default: return '📊';
  }
}

/**
 * Utility function to get activity type color
 */
export function getActivityTypeColor(type: ActivityEvent['type']): string {
  switch (type) {
    case 'tool_used': return 'text-blue-600';
    case 'site_visited': return 'text-green-600';
    case 'document_read': return 'text-orange-600';
    case 'content_created': return 'text-purple-600';
    default: return 'text-gray-600';
  }
}