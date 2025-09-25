import { Router } from 'express';
import { z } from 'zod';

const router = Router();

// Enhanced data models for UX features
interface AgentResearchData {
  agentId: string;
  toolsUsed: Array<{
    toolName: string;
    callCount: number;
    lastUsed: Date;
    successRate: number;
    avgResponseTime: number;
  }>;
  sitesBrowsed: Array<{
    url: string;
    title: string;
    visitedAt: Date;
    contentExtracted: boolean;
    firecrawlJobId?: string;
    relevanceScore: number;
  }>;
  documentsRead: Array<{
    filename: string;
    type: string;
    readAt: Date;
    progress: number;
  }>;
  contentCreated: Array<{
    type: string;
    title: string;
    createdAt: Date;
    size: number;
  }>;
}

interface DecisionItem {
  id: string;
  title: string;
  workflowStage: string;
  involvedAgents: string[];
  evidenceSummary: string;
  confidenceScore: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  context: {
    relatedDiscussions: string[];
    supportingData: any[];
    risks: string[];
    recommendations: string[];
  };
}

interface TaskItem {
  id: string;
  title: string;
  description: string;
  assignedAgent: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'backlog' | 'in_progress' | 'review' | 'completed';
  workflowStage: string;
  createdAt: Date;
  dueDate?: Date;
  dependencies: string[];
  tags: string[];
  progress: number;
  estimatedEffort: number;
}

// GET /api/ux-enhanced/meeting-room/:sessionId
router.get('/meeting-room/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Use existing session data - no core logic changes
    // This endpoint aggregates existing data for UX presentation
    
    res.json({
      sessionId,
      agents: [], // Will be populated from existing agent data
      currentStage: 'problem-capture', // From existing workflow state
      messages: [], // From existing chat system
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get meeting room data' });
  }
});

// GET /api/ux-enhanced/decisions/pending
router.get('/decisions/pending', async (req, res) => {
  try {
    // This endpoint will aggregate existing decision data
    // No core logic changes - just data presentation
    
    const pendingDecisions: DecisionItem[] = [];
    
    res.json({
      decisions: pendingDecisions,
      total: pendingDecisions.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get pending decisions' });
  }
});

// GET /api/ux-enhanced/research/:agentId
router.get('/research/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    
    // This endpoint will aggregate existing research data
    // Uses existing tool traces, firecrawl data, etc.
    
    const researchData: AgentResearchData = {
      agentId,
      toolsUsed: [],
      sitesBrowsed: [],
      documentsRead: [],
      contentCreated: []
    };
    
    res.json(researchData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get agent research data' });
  }
});

// GET /api/ux-enhanced/tasks
router.get('/tasks', async (req, res) => {
  try {
    // This endpoint will aggregate existing task data
    // No core logic changes - just data presentation
    
    const tasks: TaskItem[] = [];
    
    res.json({
      tasks,
      total: tasks.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get tasks' });
  }
});

// GET /api/ux-enhanced/analytics/tasks
router.get('/analytics/tasks', async (req, res) => {
  try {
    // This endpoint calculates analytics from existing task data
    // No core logic changes - just data aggregation
    
    const analytics = {
      totalTasks: 0,
      completionRate: 0,
      averageCompletionTime: 0,
      bottlenecks: [],
      agentWorkload: {},
      stageDistribution: {}
    };
    
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get task analytics' });
  }
});

export default router;
