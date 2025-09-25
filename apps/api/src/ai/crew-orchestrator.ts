import { CrewAgentFactory, SimpleAgent } from './crew-agents';
import { CrewTaskFactory, SimpleTask } from './crew-tasks';
import type { ChatMessage } from './chat-orchestrator';
import { AIService } from './ai-service';

export interface CrewSession {
  id: string;
  stepId: string;
  agents: SimpleAgent[];
  task: SimpleTask;
  status: 'initializing' | 'running' | 'completed' | 'error';
  messages: ChatMessage[];
  currentAgentIndex: number;
  isCollaborating: boolean;
}

export interface CrewCollaborationResult {
  success: boolean;
  messages: ChatMessage[];
  finalOutput: string;
  agentInsights: Record<string, any>;
  collaborationLog: string[];
}

export class CrewAIOrchestrator {
  private sessions: Map<string, CrewSession> = new Map();
  private ai: AIService = new AIService();

  async createCrewSession(
    sessionId: string, 
    stepId: string, 
    problem: string, 
    context: any
  ): Promise<CrewSession> {
    const agents = CrewAgentFactory.getAgentsForStep(stepId);
    const task = CrewTaskFactory.createCollaborativeTask(stepId, { problem, ...context });

    const session: CrewSession = {
      id: sessionId,
      stepId,
      agents,
      task,
      status: 'initializing',
      messages: [],
      currentAgentIndex: 0,
      isCollaborating: false
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  async startCrewCollaboration(sessionId: string): Promise<CrewCollaborationResult> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    session.status = 'running';

    // Simple sequential collaboration: each agent contributes once, then we synthesize a consensus
    for (const agent of session.agents) {
      const content = await this.generateAgentContent(agent, session);
      const msg: ChatMessage = {
        id: `msg_${Date.now()}_${agent.id}`,
        sender: 'agent',
        content,
        timestamp: new Date(),
        agentId: agent.id,
        agentName: agent.name,
        agentTitle: agent.role,
        department: this.getAgentDepartment(agent.id),
        type: 'agent_contribution',
        metadata: { confidence: 0.85 }
      };
      session.messages.push(msg);
    }

    // Consensus synthesis
    const consensus = await this.generateConsensus(session);
    session.messages.push(consensus);

    session.status = 'completed';

    return {
      success: true,
      messages: session.messages,
      finalOutput: consensus.content,
      agentInsights: Object.fromEntries(
        session.agents.map(a => [a.id, { name: a.name, role: a.role }])
      ),
      collaborationLog: ['sequential_contributions', 'consensus_synthesis']
    };
  }

  async getNextAgentMessage(sessionId: string): Promise<ChatMessage | null> {
    const session = this.sessions.get(sessionId);
    if (!session || session.status === 'completed') return null;

    // Next agent contribution
    if (session.currentAgentIndex < session.agents.length) {
      const agent: SimpleAgent | undefined = session.agents[session.currentAgentIndex];
      if (!agent) return null;
      session.currentAgentIndex++;
      const content = await this.generateAgentContent(agent, session);
      const msg: ChatMessage = {
        id: `msg_${Date.now()}_${agent.id}`,
        sender: 'agent',
        content,
        timestamp: new Date(),
        agentId: agent.id,
        agentName: agent.name,
        agentTitle: agent.role,
        department: this.getAgentDepartment(agent.id),
        type: 'agent_contribution'
      };
      session.messages.push(msg);
      return msg;
    }

    // Consensus phase
    if (!session.isCollaborating) {
      session.isCollaborating = true;
      const consensus = await this.generateConsensus(session);
      session.messages.push(consensus);
      session.status = 'completed';
      return consensus;
    }

    return null;
  }

  private async generateAgentContent(agent: SimpleAgent, session: CrewSession): Promise<string> {
    const prompt = `You are ${agent.name} (${agent.role}). Goal: ${agent.goal}.
Task: ${session.task.description}.
Context: ${session.task.context}.
Respond with a concise contribution (6-10 sentences) grounded in your role.`;
    const resp = await this.ai.generateResponse(prompt, agent.id, {
      sessionId: session.id,
      userId: 'system',
      conversationHistory: [],
      availableTools: agent.tools,
      userPreferences: {}
    } as any);
    return (resp as any).userResponse || resp.content || 'No content generated.';
  }

  private async generateConsensus(session: CrewSession): Promise<ChatMessage> {
    const summaryPrompt = `Synthesize a consensus from these agent contributions:
${session.messages.map(m => `${m.agentName}: ${m.content}`).join('\n')}
Provide prioritized recommendations and clear next steps.`;
    const resp = await this.ai.generateResponse(summaryPrompt, 'crew-consensus', {
      sessionId: session.id,
      userId: 'system',
      conversationHistory: session.messages,
      availableTools: [],
      userPreferences: {}
    } as any);

    return {
      id: `msg_${Date.now()}_consensus`,
      sender: 'ai',
      content: (resp as any).userResponse || resp.content || 'Consensus generated.',
      timestamp: new Date(),
      agentId: 'crew-consensus',
      agentName: 'Crew Consensus',
      agentTitle: 'Multi-Agent Team',
      department: 'Strategy',
      type: 'agent_contribution',
      metadata: { confidence: 0.9 }
    };
  }

  private getAgentDepartment(agentId: string): string {
    const departmentMap: Record<string, string> = {
      'captain-strategy': 'leadership',
      'critical-cassandra': 'critical',
      'saas-sage-sarah': 'saas',
      'code-commander': 'technical',
      'market-maverick': 'market-intelligence',
      'customer-claire': 'user-research',
      'numbers-nancy': 'data'
    };
    return departmentMap[agentId] || 'strategy';
  }

  getSession(sessionId: string): CrewSession | undefined {
    return this.sessions.get(sessionId);
  }

  getAllSessions(): CrewSession[] {
    return Array.from(this.sessions.values());
  }

  clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }
}
