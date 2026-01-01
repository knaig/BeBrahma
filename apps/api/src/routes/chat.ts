import express from 'express';
import { ChatOrchestrator } from '../ai/chat-orchestrator.js';
import { broadcastAgentStatus, broadcastAgentMessage, broadcastActivityEvent } from '../websocket/index.js';
import { apiConfig } from '../config/env.config.js';

const router = express.Router();

// Service connectivity configuration
const SERVICE_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Lazy initialization of ChatOrchestrator to avoid module-level instantiation errors
let chatOrchestrator: ChatOrchestrator | null = null;

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
      console.warn(`[API] Service call timeout, retrying... (${MAX_RETRIES - retries + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return makeServiceCall(url, options, retries - 1);
    }

    throw error;
  }
}

// Helper function to check service availability
async function checkServiceAvailability(serviceUrl: string, serviceName: string): Promise<boolean> {
  try {
    const response = await makeServiceCall(`${serviceUrl}/health`, { method: 'GET' }, 1);
    return response.ok;
  } catch (error) {
    console.warn(`[API] ${serviceName} service unavailable:`, error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
}

function getChatOrchestrator(): ChatOrchestrator {
  if (!chatOrchestrator) {
    try {
      chatOrchestrator = new ChatOrchestrator();
    } catch (error) {
      console.error('Failed to initialize ChatOrchestrator:', error);
      throw error;
    }
  }
  return chatOrchestrator;
}

// LangGraph Workflow endpoints (with CrewAI integration)
router.post('/chat/crew/start', async (req, res) => {
  try {
    const { sessionId, task, context } = req.body || {};
    console.log('[API] POST /chat/crew/start', { sessionId, hasTask: Boolean(task), context, CREW_SERVICE_URL: apiConfig.CREW_SERVICE_URL });
    if (!sessionId || !task) return res.status(400).json({ success: false, error: 'sessionId and task required' });

    // Call Crew Service directly (bypassing workflow service)
    const isCrewAvailable = await checkServiceAvailability(apiConfig.CREW_SERVICE_URL, 'Crew');
    if (!isCrewAvailable) {
      console.log('[API] Crew service unavailable');
      return res.status(503).json({
        success: false,
        error: 'Crew service unavailable'
      });
    }

    const crewResponse = await makeServiceCall(`${apiConfig.CREW_SERVICE_URL}/api/crew/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, task, context: context || {} })
    });

    if (!crewResponse.ok) {
      console.error('[API] Crew start failed:', crewResponse.status, crewResponse.statusText);
      return res.status(500).json({ success: false, error: 'Failed to start crew session' });
    }

    const crewData = await crewResponse.json();
    console.log('[API] Crew start response:', { success: crewData.success, messageCount: crewData.messages?.length });

    return res.json({
      success: crewData.success,
      messages: crewData.messages || [],
      stage: crewData.stage || 'PROBLEM_CAPTURE',
      messageCount: crewData.messageCount || 0
    });
  } catch (e) {
    console.error('[API] /chat/crew/start error', e);
    return res.status(500).json({ success: false, error: 'Failed to start crew session' });
  }
});


router.post('/chat/crew/next', async (req, res) => {
  try {
    const { sessionId } = req.body || {};
    console.log('[API] POST /chat/crew/next', { sessionId, CREW_SERVICE_URL: apiConfig.CREW_SERVICE_URL });
    if (!sessionId) return res.status(400).json({ success: false, error: 'sessionId required' });

    // Call Crew Service directly
    const isCrewAvailable = await checkServiceAvailability(apiConfig.CREW_SERVICE_URL, 'Crew');
    if (!isCrewAvailable) {
      return res.status(503).json({ success: false, error: 'Crew service unavailable', retry: true });
    }

    const crewResponse = await makeServiceCall(`${apiConfig.CREW_SERVICE_URL}/api/crew/next`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
    });

    if (!crewResponse.ok) {
      console.error('[API] Crew next failed:', crewResponse.status, crewResponse.statusText);
      return res.status(500).json({ success: false, error: 'Failed to advance crew step' });
    }

    const crewData = await crewResponse.json();
    console.log('[API] Crew next response:', { success: crewData.success, messageCount: crewData.messages?.length });

    return res.json({
      success: crewData.success,
      messages: crewData.messages || [],
      stage: crewData.stage || 'PROBLEM_CAPTURE',
      messageCount: crewData.messageCount || 0
    });
  } catch (e) {
    console.error('[API] /chat/crew/next error', e);
    return res.status(500).json({ success: false, error: 'Failed to advance crew step' });
  }
});

// POST /chat/decision - User decision endpoint for stage progression
router.post('/chat/decision', async (req, res) => {
  try {
    const { sessionId, decision, userMessage } = req.body;
    console.log('[API] POST /chat/decision', { sessionId, decision, userMessage, WORKFLOW_SERVICE_URL: apiConfig.WORKFLOW_SERVICE_URL });
    if (!sessionId || !decision) {
      return res.status(400).json({ success: false, error: 'SessionId and decision are required' });
    }

    // Check workflow service availability before making the call
    const isWorkflowAvailable = await checkServiceAvailability(apiConfig.WORKFLOW_SERVICE_URL, 'Workflow');
    if (!isWorkflowAvailable) {
      return res.status(503).json({ success: false, error: 'Workflow service unavailable', retry: true });
    }

    // Forward decision to LangGraph Workflow service
    const workflowResponse = await makeServiceCall(`${apiConfig.WORKFLOW_SERVICE_URL}/api/workflow/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        decision,
        userMessage: userMessage || 'Continue analysis'
      })
    });

    if (!workflowResponse.ok) {
      console.error('[API] Workflow decision failed:', workflowResponse.status, workflowResponse.statusText);
      return res.status(500).json({ success: false, error: 'Failed to process decision' });
    }

    const workflowData = await workflowResponse.json();
    console.log('[API] Workflow decision response:', { success: workflowData.success, stage: workflowData.stage, messageCount: workflowData.messages?.length });

    // Broadcast decision result and any agent updates via WebSocket
    try {
      // Broadcast the decision itself
      broadcastAgentMessage(sessionId, 'system', `Decision: ${decision}`, {
        messageType: 'decision_result',
        userMessage,
        stage: workflowData.stage
      });

      // Broadcast any agent status updates from the decision response
      if (workflowData.messages && Array.isArray(workflowData.messages)) {
        workflowData.messages.forEach((message: any) => {
          if (message.agentId && message.agentStatus) {
            broadcastAgentStatus(sessionId, message.agentId, message.agentStatus, {
              stage: workflowData.stage,
              progress: message.progress,
              task: message.currentTask
            });
          }

          // Broadcast agent message if it contains content
          if (message.agentId && message.content) {
            broadcastAgentMessage(sessionId, message.agentId, message.content, {
              agentName: message.agentName,
              department: message.agentDepartment,
              messageType: message.metadata?.type || 'agent_contribution'
            });
          }
        });
      }
    } catch (wsError) {
      console.error('[API] WebSocket broadcast error in /chat/decision:', wsError);
      // Don't fail the request if WebSocket fails
    }

    return res.json({
      success: workflowData.success,
      stage: workflowData.stage,
      messages: workflowData.messages || [],
      stageStatus: workflowData.stageStatus || null,
      stageProgress: workflowData.stageProgress || {},
      pendingDecision: workflowData.pendingDecision || false,
      decisionOptions: workflowData.decisionOptions || []
    });

  } catch (error) {
    console.error('[API] Decision API error:', error);
    return res.status(500).json({ success: false, error: 'Failed to process decision' });
  }
});

// POST /chat/crew/decision - Crew decision endpoint aligned with LangGraph workflow
router.post('/chat/crew/decision', async (req, res) => {
  try {
    const { sessionId, decision, userMessage } = req.body;
    console.log('[API] POST /chat/crew/decision', { sessionId, decision, userMessage, WORKFLOW_SERVICE_URL: apiConfig.WORKFLOW_SERVICE_URL });
    if (!sessionId || !decision) {
      return res.status(400).json({ success: false, error: 'SessionId and decision are required' });
    }

    // Forward decision to LangGraph Workflow service
    const workflowResponse = await makeServiceCall(`${apiConfig.WORKFLOW_SERVICE_URL}/api/workflow/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        decision,
        userMessage: userMessage || 'Continue analysis'
      })
    });

    if (!workflowResponse.ok) {
      console.error('[API] Workflow crew decision failed:', workflowResponse.status, workflowResponse.statusText);
      return res.status(500).json({ success: false, error: 'Failed to process crew decision' });
    }

    const workflowData = await workflowResponse.json();
    console.log('[API] Workflow crew decision response:', { success: workflowData.success, stage: workflowData.stage, messageCount: workflowData.messages?.length });

    return res.json({
      success: workflowData.success,
      stage: workflowData.stage,
      messages: workflowData.messages || [],
      stageStatus: workflowData.stageStatus || null,
      stageProgress: workflowData.stageProgress || {},
      pendingDecision: workflowData.pendingDecision || false,
      decisionOptions: workflowData.decisionOptions || []
    });

  } catch (error) {
    console.error('[API] Crew decision API error:', error);
    return res.status(500).json({ success: false, error: 'Failed to process crew decision' });
  }
});

// POST /chat/crew/continue - Crew continue endpoint aligned with LangGraph workflow
router.post('/chat/crew/continue', async (req, res) => {
  try {
    const { sessionId, phase, userMessage } = req.body;
    console.log('[API] POST /chat/crew/continue', { sessionId, phase, userMessage, WORKFLOW_SERVICE_URL: apiConfig.WORKFLOW_SERVICE_URL });
    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'SessionId is required' });
    }

    // Forward continue to LangGraph Workflow service
    const workflowResponse = await makeServiceCall(`${apiConfig.WORKFLOW_SERVICE_URL}/api/workflow/next`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        phase,
        userMessage: userMessage || 'Continue workflow'
      })
    });

    if (!workflowResponse.ok) {
      console.error('[API] Workflow crew continue failed:', workflowResponse.status, workflowResponse.statusText);
      return res.status(500).json({ success: false, error: 'Failed to continue crew workflow' });
    }

    const workflowData = await workflowResponse.json();
    console.log('[API] Workflow crew continue response:', { success: workflowData.success, stage: workflowData.stage, messageCount: workflowData.messages?.length });

    return res.json({
      success: workflowData.success,
      stage: workflowData.stage,
      messages: workflowData.messages || [],
      stageStatus: workflowData.stageStatus || null,
      stageProgress: workflowData.stageProgress || {},
      pendingDecision: workflowData.pendingDecision || false,
      decisionOptions: workflowData.decisionOptions || []
    });

  } catch (error) {
    console.error('[API] Crew continue API error:', error);
    return res.status(500).json({ success: false, error: 'Failed to continue crew workflow' });
  }
});

// Workflow status endpoint
router.get('/chat/crew/status/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    console.log('[API] GET /chat/crew/status', { sessionId });
    if (!sessionId) return res.status(400).json({ success: false, error: 'sessionId required' });

    // Call LangGraph Workflow service to get status
    const workflowResponse = await makeServiceCall(`${apiConfig.WORKFLOW_SERVICE_URL}/api/workflow/status/${sessionId}`, { method: 'GET' });
    if (!workflowResponse.ok) {
      return res.status(404).json({ success: false, error: 'Workflow session not found' });
    }

    const workflowData = await workflowResponse.json();
    return res.json({
      success: workflowData.success,
      messages: workflowData.messages || [],
      stage: workflowData.stage || null,
      stageStatus: workflowData.stageStatus || null,
      stageProgress: workflowData.stageProgress || {},
      pendingDecision: workflowData.pendingDecision || false,
      decisionOptions: workflowData.decisionOptions || []
    });
  } catch (e) {
    console.error('[API] /chat/crew/status error', e);
    return res.status(500).json({ success: false, error: 'Failed to get workflow status' });
  }
});

function orchestratorAvailable(): boolean {
  try {
    const orchestrator = getChatOrchestrator();
    return orchestrator && typeof (orchestrator as any).processUserMessage === 'function';
  } catch (error) {
    return false;
  }
}

// POST /chat - Main chat endpoint
router.post('/chat', async (req, res) => {
  try {
    const { message, sessionId, stepId } = req.body;

    if (!message || !sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Message and sessionId are required'
      });
    }

    if (!orchestratorAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'AI orchestrator unavailable',
        details: 'Multi-agent orchestrator is not configured on this environment',
        hint: 'Set OPENAI_API_KEY and enable the orchestrator',
      });
    }

    // Use orchestrator for multi-agent collaboration
    const result = await getChatOrchestrator().processUserMessage(
      sessionId,
      'user',
      message,
      'Business Strategy Session',
      stepId
    );

    return res.json({
      success: true,
      message: 'Chat processed successfully',
      messages: result.messages,
      metadata: {
        messageCount: result.messages.length,
        decisionDocument: result.decisionDocument
      }
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process chat message',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});


// POST /chat/approval - User approval endpoint
router.post('/chat/approval', async (req, res) => {
  try {
    const { sessionId, response } = req.body;

    if (!sessionId || !response) {
      return res.status(400).json({
        success: false,
        error: 'SessionId and response are required'
      });
    }

    // Process user approval
    getChatOrchestrator().userApproval(sessionId, 'decision_1', response);

    return res.json({
      success: true,
      response: {
        content: 'Approval processed',
        agentId: 'system',
        model: 'system',
        tokens: 0,
        cost: 0,
        metadata: {
          messages: [],
          decisionDocument: getChatOrchestrator().getDecisionDocument(sessionId)
        }
      }
    });

  } catch (error) {
    console.error('Approval API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process approval',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /chat/decision-document/:sessionId - Get decision document
router.get('/chat/decision-document/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const markdown = getChatOrchestrator().getDecisionDocument(sessionId);

    res.setHeader('Content-Type', 'text/markdown');
    res.send(markdown);
  } catch (error) {
    console.error('Decision document error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get decision document',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /chat/internal-details/:sessionId - Get internal details for admin/debugging
router.get('/chat/internal-details/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const internalDetails = getChatOrchestrator().getInternalDetails(sessionId);

    if (internalDetails.error) {
      return res.status(404).json({
        success: false,
        error: internalDetails.error
      });
    }

    return res.json({
      success: true,
      internalDetails
    });
  } catch (error) {
    console.error('Internal details error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get internal details',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Proxy: memory bundle
router.get('/chat/memory/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Check crew service availability before making the call
    const isCrewAvailable = await checkServiceAvailability(apiConfig.CREW_SERVICE_URL, 'Crew');
    if (!isCrewAvailable) {
      return res.status(503).json({ success: false, error: 'Crew service unavailable', retry: true });
    }

    const base = apiConfig.CREW_SERVICE_URL;
    const r = await makeServiceCall(`${base}/api/crew/memory/${encodeURIComponent(sessionId)}`, { method: 'GET' });
    const j = await r.json();

    // Broadcast activity events for memory items
    if (j.success) {
      try {
        // Broadcast document read events for notes
        if (j.notes && Array.isArray(j.notes)) {
          j.notes.forEach((note: any) => {
            broadcastActivityEvent(
              sessionId,
              'document_read',
              `Read document: ${note.title || 'Research Note'}`,
              {
                title: note.title || 'Research Note',
                type: 'note',
                content: note.content,
                timestamp: note.timestamp
              }
            );
          });
        }

        // Broadcast content created events for summaries
        if (j.summaries && Array.isArray(j.summaries)) {
          j.summaries.forEach((summary: any) => {
            broadcastActivityEvent(
              sessionId,
              'content_created',
              `Created summary: ${summary.title || 'Generated Summary'}`,
              {
                title: summary.title || 'Generated Summary',
                type: 'summary',
                content: summary.content,
                timestamp: summary.timestamp
              }
            );
          });
        }

        // Broadcast content created events for agent messages
        if (j.messages && Array.isArray(j.messages)) {
          j.messages.filter((msg: any) => msg.type === 'agent' && msg.content).forEach((message: any) => {
            broadcastActivityEvent(
              sessionId,
              'content_created',
              `Agent response generated`,
              {
                title: `Agent Response - ${new Date(message.timestamp).toLocaleTimeString()}`,
                type: 'message',
                content: message.content,
                timestamp: message.timestamp,
                agentId: message.agentId
              }
            );
          });
        }
      } catch (wsError) {
        console.error('WebSocket broadcast error in memory proxy:', wsError);
      }
    }

    return res.json(j);
  } catch (error) {
    console.error('Memory proxy error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch memory' });
  }
});

// Proxy: list notes
router.get('/chat/notes/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Check crew service availability before making the call
    const isCrewAvailable = await checkServiceAvailability(apiConfig.CREW_SERVICE_URL, 'Crew');
    if (!isCrewAvailable) {
      return res.status(503).json({ success: false, error: 'Crew service unavailable', retry: true });
    }

    const base = apiConfig.CREW_SERVICE_URL;
    const r = await makeServiceCall(`${base}/api/crew/notes/${encodeURIComponent(sessionId)}`, { method: 'GET' });
    const j = await r.json();
    return res.json(j);
  } catch (error) {
    console.error('Notes proxy error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch notes' });
  }
});

// Proxy: summarize
router.post('/chat/summarize', async (req, res) => {
  try {
    // Check crew service availability before making the call
    const isCrewAvailable = await checkServiceAvailability(apiConfig.CREW_SERVICE_URL, 'Crew');
    if (!isCrewAvailable) {
      return res.status(503).json({ success: false, error: 'Crew service unavailable', retry: true });
    }

    const base = apiConfig.CREW_SERVICE_URL;
    const r = await makeServiceCall(`${base}/api/crew/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const j = await r.json();
    return res.json(j);
  } catch (error) {
    console.error('Summarize proxy error:', error);
    return res.status(500).json({ success: false, error: 'Failed to summarize' });
  }
});

// Proxy: eval
router.post('/chat/eval/stage-flow', async (req, res) => {
  try {
    // Check crew service availability before making the call
    const isCrewAvailable = await checkServiceAvailability(apiConfig.CREW_SERVICE_URL, 'Crew');
    if (!isCrewAvailable) {
      return res.status(503).json({ success: false, error: 'Crew service unavailable', retry: true });
    }

    const base = apiConfig.CREW_SERVICE_URL;
    const r = await makeServiceCall(`${base}/api/eval/stage-flow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const j = await r.json();
    return res.json(j);
  } catch (error) {
    console.error('Eval proxy error:', error);
    return res.status(500).json({ success: false, error: 'Failed to eval' });
  }
});

// Proxy: tools registry and traces
router.get('/chat/tools', async (_req, res) => {
  try {
    // Check crew service availability before making the call
    const isCrewAvailable = await checkServiceAvailability(apiConfig.CREW_SERVICE_URL, 'Crew');
    if (!isCrewAvailable) {
      return res.status(503).json({ success: false, error: 'Crew service unavailable', retry: true });
    }

    const base = apiConfig.CREW_SERVICE_URL;
    const r = await makeServiceCall(`${base}/api/tools/list`, { method: 'GET' });
    const j = await r.json();
    return res.json(j);
  } catch (error) {
    console.error('Tools list proxy error:', error);
    return res.status(500).json({ success: false, error: 'Failed to list tools' });
  }
});

router.get('/chat/tools/traces/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Check crew service availability before making the call
    const isCrewAvailable = await checkServiceAvailability(apiConfig.CREW_SERVICE_URL, 'Crew');
    if (!isCrewAvailable) {
      return res.status(503).json({ success: false, error: 'Crew service unavailable', retry: true });
    }

    const base = apiConfig.CREW_SERVICE_URL;
    const r = await makeServiceCall(`${base}/api/tools/traces/${encodeURIComponent(sessionId)}`, { method: 'GET' });
    const j = await r.json();

    // Broadcast activity events for tool usage
    if (j.success && j.tool_calls && Array.isArray(j.tool_calls)) {
      try {
        j.tool_calls.forEach((toolCall: any) => {
          broadcastActivityEvent(
            sessionId,
            'tool_used',
            `Used ${toolCall.tool_name} tool`,
            {
              toolName: toolCall.tool_name,
              success: toolCall.status === 'success',
              timestamp: toolCall.timestamp,
              result: toolCall.result
            }
          );

          // If it's a firecrawl tool, also broadcast site visit
          if (toolCall.tool_name && toolCall.tool_name.includes('firecrawl')) {
            const url = toolCall.metadata?.url || toolCall.result?.url;
            const title = toolCall.metadata?.title || toolCall.result?.title || 'Unknown Page';
            if (url) {
              broadcastActivityEvent(
                sessionId,
                'site_visited',
                `Visited ${title}`,
                {
                  url,
                  title,
                  timestamp: toolCall.timestamp,
                  toolName: toolCall.tool_name
                }
              );
            }
          }
        });
      } catch (wsError) {
        console.error('WebSocket broadcast error in tool traces:', wsError);
      }
    }

    return res.json(j);
  } catch (error) {
    console.error('Tools traces proxy error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch tool traces' });
  }
});

// GET /chat/trace/:sessionId - Full traceability bundle
router.get('/chat/trace/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const internal = getChatOrchestrator().getInternalDetails(sessionId);
    if (internal.error) {
      return res.status(404).json({ success: false, error: internal.error });
    }
    return res.json({
      success: true,
      trace: {
        sessionId: internal.sessionId,
        projectTitle: internal.projectTitle,
        currentStepId: internal.currentStepId,
        stepData: internal.stepData,
        decisionLog: internal.decisionLog,
        totalMessages: internal.totalMessages
      }
    });
  } catch (error) {
    console.error('Trace endpoint error:', error);
    return res.status(500).json({ success: false, error: 'Failed to get trace' });
  }
});

// GET /chat/progress/:sessionId - Get real-time progress state
router.get('/chat/progress/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Check workflow service availability before making the call
    const isWorkflowAvailable = await checkServiceAvailability(apiConfig.WORKFLOW_SERVICE_URL, 'Workflow');
    if (!isWorkflowAvailable) {
      return res.status(503).json({ success: false, error: 'Workflow service unavailable', retry: true });
    }

    // Call workflow service to get current status and progress
    const workflowResponse = await makeServiceCall(`${apiConfig.WORKFLOW_SERVICE_URL}/api/workflow/status/${sessionId}`, { method: 'GET' });
    if (!workflowResponse.ok) {
      return res.status(404).json({ success: false, error: 'Workflow session not found' });
    }

    const workflowData = await workflowResponse.json();

    // Compute progress from stageProgress
    const stageProgress = workflowData.stageProgress || {};
    const totalStages = Object.keys(stageProgress).length;
    const completedStages = Object.values(stageProgress).filter((status: any) => status === 'completed').length;
    const overallProgress = totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0;

    // Lightweight log to trace progress state transitions
    console.log('[API] GET /chat/progress', { sessionId, stage: workflowData.stage, overall: overallProgress });

    return res.json({
      success: true,
      progressState: {
        sessionId,
        stage: workflowData.stage,
        stageStatus: workflowData.stageStatus,
        stageProgress: workflowData.stageProgress,
        overallProgress,
        pendingDecision: workflowData.pendingDecision,
        decisionOptions: workflowData.decisionOptions
      }
    });
  } catch (error) {
    console.error('Progress state error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get progress state',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});


// POST /chat/continue - Continue analysis after decision
router.post('/chat/continue', async (req, res) => {
  try {
    const { sessionId, phase, userMessage } = req.body;

    if (!sessionId || !phase) {
      return res.status(400).json({
        success: false,
        error: 'SessionId and phase are required'
      });
    }

    // FIXED: When phase is 'next' after user approval, we should forward the decision
    // to advance the stage, not call nextCrewTurn() again
    if (phase === 'next') {
      // This means the user approved and wants to move to the next stage
      // Forward the approval decision to the workflow service
      try {
        const response = await makeServiceCall(`${apiConfig.WORKFLOW_SERVICE_URL}/api/workflow/decision`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            decision: 'approve',
            userMessage: userMessage || 'User approved and wants to continue'
          })
        });

        if (response.ok) {
          const decisionResult = await response.json();
          return res.json({
            success: true,
            phase: 'approve',
            messages: decisionResult.messages || [],
            decisionLog: decisionResult.decisionLog || [],
            stage: decisionResult.stage || null
          });
        } else {
          console.warn('[API] Workflow decision endpoint failed:', response.status, { WORKFLOW_SERVICE_URL: apiConfig.WORKFLOW_SERVICE_URL });
          // Return structured error instead of falling back to legacy orchestrator
          return res.status(500).json({
            success: false,
            error: 'Workflow decision endpoint failed',
            details: `HTTP ${response.status}: ${response.statusText}`,
            retry: true
          });
        }
      } catch (e) {
        console.warn('[API] Forward decision to workflow service failed:', e);
        // Return structured error instead of falling back to legacy orchestrator
        return res.status(500).json({
          success: false,
          error: 'Failed to communicate with workflow service',
          details: e instanceof Error ? e.message : 'Unknown error',
          retry: true
        });
      }
    }

    if (['approve', 'refine', 'reject', 'pause'].includes(String(phase))) {
      let forwarded: any = null;
      try {
        // Call CrewAI service directly instead of using orchestrator
        const response = await makeServiceCall(`${apiConfig.CREW_SERVICE_URL}/api/crew/decision`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            decision: String(phase),
            userMessage: userMessage || 'User decision'
          })
        });

        if (response.ok) {
          forwarded = await response.json();
          console.log('[API] CrewAI continue decision response:', { success: forwarded.success, stage: forwarded.stage });
        } else {
          console.warn('[API] CrewAI continue decision failed:', response.status, response.statusText);
        }
      } catch (e) {
        console.warn('[API] Forward /chat/continue decision to crew failed');
      }
      return res.json({
        success: Boolean(forwarded?.success),
        phase,
        messages: forwarded?.messages || [],
        decisionLog: forwarded?.decisionLog || [],
        stage: forwarded?.stage || null
      });
    }

    return res.status(400).json({ success: false, error: 'Invalid phase' });

  } catch (error) {
    console.error('Continue analysis error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to continue analysis',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /chat/api-keys - Set API keys for data sources
router.post('/chat/api-keys', (req, res) => {
  try {
    const { sourceId, apiKey } = req.body;

    if (!sourceId || !apiKey) {
      return res.status(400).json({
        success: false,
        error: 'SourceId and apiKey are required'
      });
    }

    // TODO: Implement data source manager
    // // TODO: chatOrchestrator['dataSourceManager'].setApiKey(sourceId, apiKey);
    console.log(`API key set for ${sourceId}`);

    return res.json({
      success: true,
      message: `API key set for ${sourceId}`,
      sourceId
    });

  } catch (error) {
    console.error('API key setting error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to set API key',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /chat/data-sources - Get available data sources and their status
router.get('/chat/data-sources', (_req, res) => {
  try {
    // TODO: Implement data source manager
    const sources: any[] = [];

    return res.json({
      success: true,
      sources: sources
    });

  } catch (error) {
    console.error('Data sources error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get data sources',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /chat/marketplace/usage - Get marketplace usage and budget information
router.get('/chat/marketplace/usage', (_req, res) => {
  try {
    // TODO: Implement data source manager
    const usage = { budget: 0, spent: 0, remaining: 0 };

    return res.json({
      success: true,
      usage
    });

  } catch (error) {
    console.error('Marketplace usage error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get marketplace usage',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /chat/marketplace/budget - Set monthly budget for marketplace
router.post('/chat/marketplace/budget', (req, res) => {
  try {
    const { budget } = req.body;

    if (!budget || typeof budget !== 'number' || budget <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid budget amount is required'
      });
    }

    // Set the budget in the marketplace service
    // TODO: chatOrchestrator['dataSourceManager']['marketplace'].setMonthlyBudget(budget);

    return res.json({
      success: true,
      message: `Monthly budget set to $${budget}`,
      budget
    });

  } catch (error) {
    console.error('Budget setting error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to set budget',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /sessions/:sessionId - Get chat session
router.get('/sessions/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = getChatOrchestrator()['sessions'].get(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  return res.json({ session });
});

// GET /agents - Get available agents
router.get('/agents', (_req, res) => {
  const agents = [
    {
      id: 'crew',
      name: 'Crew AI Team',
      description: 'Crew AI multi-agent collaboration with selected experts',
      type: 'multi-agent'
    },
    {
      id: 'product-manager',
      name: 'Sarah Chen - Product Manager',
      description: 'User needs, feature prioritization, product roadmap',
      type: 'business-agent',
      department: 'leadership'
    },
    {
      id: 'ceo',
      name: 'Marcus Rodriguez - CEO & Founder',
      description: 'Business strategy, resource allocation, team building',
      type: 'business-agent',
      department: 'leadership'
    },
    {
      id: 'cto',
      name: 'Alex Kim - CTO & Technical Architect',
      description: 'Technical feasibility, architecture, tech stack',
      type: 'business-agent',
      department: 'technical'
    },
    {
      id: 'devops',
      name: 'Priya Patel - DevOps Engineer',
      description: 'Infrastructure, deployment, scalability, costs',
      type: 'business-agent',
      department: 'technical'
    },
    {
      id: 'industry-expert',
      name: 'Dr. James Wilson - Industry Expert',
      description: 'Market dynamics, regulations, industry trends',
      type: 'business-agent',
      department: 'domain'
    },
    {
      id: 'customer-success',
      name: 'Emma Thompson - Customer Success Lead',
      description: 'User experience, adoption, feedback, retention',
      type: 'business-agent',
      department: 'domain'
    },
    {
      id: 'growth-hacker',
      name: 'David Park - Growth Hacker',
      description: 'User acquisition, marketing, conversion optimization',
      type: 'business-agent',
      department: 'business'
    },
    {
      id: 'finance-analyst',
      name: 'Lisa Zhang - Finance Analyst',
      description: 'Unit economics, pricing, financial modeling',
      type: 'business-agent',
      department: 'business'
    },
    {
      id: 'data-analyst',
      name: 'Raj Malhotra - Data Analyst',
      description: 'Market data, user behavior, metrics, insights',
      type: 'business-agent',
      department: 'data'
    },
    {
      id: 'research-lead',
      name: 'Dr. Maria Garcia - Research Lead',
      description: 'Competitive analysis, market research, trends',
      type: 'business-agent',
      department: 'data'
    }
  ];

  return res.json({ agents });
});

export default router;
