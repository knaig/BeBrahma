import { AIService } from './ai-service';
// import { DataSourceManager } from './data-sources'; // Temporarily commented out
import { DecisionTracker, DecisionPoint } from './decision-tracker';
import { SmartPlannerAgent, DataPlan } from './smart-planner';
import { BUSINESS_AGENTS, getCriticalAgents, getSaaSAgents, getIndustryAgents } from '../agents/business-agents';
import { CrewClient } from './crew-client';
import { apiConfig } from '../../../bebrahma/env.config.js';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai' | 'agent';
  content: string;
  timestamp: Date;
  agentId?: string;
  agentName?: string;
  agentTitle?: string;
  department?: string;
  type: 'user_input' | 'agent_contribution' | 'agent_response' | 'agent_debate' | 'decision_point' | 'user_approval';
  metadata?: {
    dataPoints?: any[];
    source?: string;
    thinkingTime?: number;
    department?: string;
    messages?: string[];
    decisionDocument?: string;
    confidence?: number;
    sampleSize?: number;
    dataQueries?: any[];
    dataPlan?: DataPlan;
    internalResponse?: any;
    selectedAgents?: Array<{
      id: string;
      name: string;
      department: string;
      expertise: string[];
      strategy: string;
    }>;
    scenarios?: string;
    respondingTo?: string; // Which agent this is responding to
    debateContext?: string; // Context of the debate
    crossReference?: string[]; // References to other agents' insights
    decisionId?: string;
    evidenceMessageIds?: string[];
  };
}

export interface AgentInteraction {
  agentId: string;
  agentName: string;
  message: string;
  timestamp: Date;
  type: 'thought' | 'response' | 'debate' | 'consensus' | 'challenge' | 'agreement';
  citations?: string[];
  respondingTo?: string; // Which agent this is responding to
  crossReferences?: string[]; // References to other agents' insights
}

export interface ChatSession {
  sessionId: string;
  projectTitle: string;
  messages: ChatMessage[];
  currentDecision: DecisionPoint | null;
  decisionTracker: DecisionTracker;
  currentStepId?: string;
  stepData: Record<string, any>;
  agentInteractions: AgentInteraction[]; // Track agent-to-agent interactions
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentProgress {
  agentId: string;
  agentName: string;
  agentTitle: string;
  department: string;
  status: 'waiting' | 'planning' | 'researching' | 'analyzing' | 'thinking' | 'contributing' | 'responding' | 'debating' | 'complete' | 'error';
  currentTask: string;
  progress: number;
  estimatedTime?: number;
  dataSources?: string[];
  insights?: string[];
  error?: string;
  respondingTo?: string; // Which agent this agent is responding to
  crossReferences?: string[]; // What insights from other agents this agent is referencing
}

export interface ProgressState {
  phase: 'planning' | 'agent_selection' | 'data_gathering' | 'analysis' | 'debate' | 'consensus' | 'decision_making' | 'complete';
  currentPhase: string;
  overallProgress: number;
  agents: AgentProgress[];
  estimatedTotalTime: number;
  currentBudget: number;
  totalBudget: number;
}

export class ChatOrchestrator {
  private aiService: AIService;
  // private dataSourceManager: DataSourceManager; // Temporarily commented out
  private decisionTracker: DecisionTracker;
  private smartPlanner: SmartPlannerAgent;
  private crewClient: CrewClient;
  private sessions: Map<string, ChatSession> = new Map();
  // Crew run-loop state per session: abstracts the underlying Crew AI runner
  private crewState: Map<string, { 
    initialized: boolean; 
    turn: number;
    stepId?: string;
  }> = new Map();
  private thinkingDelay: number = 2000; // 2 seconds between agent responses
  private debateDelay: number = 3000; // 3 seconds for debate responses
  private crewReachable: boolean = false;

  constructor() {
    this.aiService = new AIService();
    // this.dataSourceManager = new DataSourceManager(); // Temporarily commented out
    this.decisionTracker = new DecisionTracker('Business Strategy Session');
    this.smartPlanner = new SmartPlannerAgent();
    const externalUrl = apiConfig.CREW_SERVICE_URL;
    console.log('[Orchestrator] CREW_SERVICE_URL =', externalUrl);
    if (!externalUrl) {
      throw new Error('CREW_SERVICE_URL is required for CrewAI integration');
    }
    
    // Validate crew service URL format
    try {
      new URL(externalUrl);
    } catch (error) {
      throw new Error(`Invalid CREW_SERVICE_URL format: ${externalUrl}`);
    }
    
    this.crewClient = new CrewClient(externalUrl);
    
    // Background reachability check
    this.checkCrewReachability(externalUrl);
  }

  private async checkCrewReachability(crewUrl: string): Promise<void> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      
      const response = await fetch(`${crewUrl}/health`, {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      this.crewReachable = response.ok;
      console.log(`[Orchestrator] Crew service reachable: ${this.crewReachable}`);
    } catch (error) {
      this.crewReachable = false;
      console.warn(`[Orchestrator] Crew service reachability check failed:`, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  public isCrewReachable(): boolean {
    return this.crewReachable;
  }

  // Initialize Crew AI session (external Crew service required)
  public async startCrewSession(sessionId: string, task: string, context: any): Promise<void> {
    const session = this.sessions.get(sessionId);
    const stepId = session?.currentStepId || 'PROBLEM_CAPTURE';
    console.log('[Orchestrator] startCrewSession → crewClient.start', { sessionId, stepId, task, context });
    const startResp = await this.crewClient.start({ sessionId, stepId, task, context });
    console.log('[Orchestrator] crew start response', { ok: startResp?.success, messages: Array.isArray(startResp?.messages) ? startResp.messages.length : undefined });
    this.crewState.set(sessionId, { initialized: true, turn: 0, stepId });
    console.log('[Orchestrator] crew initialized', this.crewState.get(sessionId));
  }

  // Advance one turn (external)
  public async nextCrewTurn(sessionId: string): Promise<ChatMessage | null> {
    const state = this.crewState.get(sessionId);
    if (!state || !state.initialized) return null;
    console.log('[Orchestrator] nextCrewTurn → crewClient.next', { sessionId, turn: state.turn });
    const nextResp = await this.crewClient.next({ sessionId });
    console.log('[Orchestrator] crew next response', { ok: nextResp?.success, count: Array.isArray(nextResp?.messages) ? nextResp.messages.length : undefined });
    const status = await this.crewClient.status(sessionId);
    console.log('[Orchestrator] status after next', { sessionId, statusSummary: { messages: Array.isArray(status?.messages) ? status.messages.length : undefined } });
    state.turn += 1;
    this.crewState.set(sessionId, state);
    const last = Array.isArray(status.messages) ? status.messages[status.messages.length - 1] : null;
    return last || null;
  }

  async startNewSession(sessionId: string, projectTitle: string): Promise<ChatSession> {
    const decisionTracker = new DecisionTracker(projectTitle);
    const session: ChatSession = {
      sessionId,
      projectTitle,
      messages: [],
      currentDecision: null,
      decisionTracker,
      stepData: {},
      agentInteractions: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  public async processUserMessage(
    sessionId: string,
    userId: string,
    userMessage: string,
    projectTitle: string = 'Business Strategy Session',
    stepId?: string
  ): Promise<{ messages: ChatMessage[]; decisionDocument: string }> {
    
    // Get or create session
    let session = this.sessions.get(sessionId);
    if (!session) {
      session = await this.startNewSession(sessionId, projectTitle);
    }
    if (stepId) session.currentStepId = stepId;

    // Add user message to session
    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      sender: 'user',
      content: userMessage,
      timestamp: new Date(),
      type: 'user_input'
    };
    session.messages.push(userMsg);

    // Start new decision topic and set as current
    const decisionId = this.decisionTracker.startNewTopic(userMessage);
    session.currentDecision = this.decisionTracker.getCurrentDecision();

    // Create data plan using Smart Planner
    const dataPlan = await this.smartPlanner.createDataPlan(
      userMessage,
      userId,
      sessionId,
      200 // Default budget, could be user-configurable
    );

    // Select relevant agents based on data plan and ensure critical agents are included
    const selectedAgents = this.selectRelevantAgents(userMessage, dataPlan);
    console.log('Selected agents:', selectedAgents.map(a => `${a.name} (${a.department})`));
    
    // Add system message explaining the plan with agent selection transparency
    const planMessage: ChatMessage = {
      id: `msg_${Date.now()}_plan`,
      sender: 'ai',
      content: this.generateDataPlanMessage(dataPlan, selectedAgents),
      timestamp: new Date(),
      agentId: 'smart-planner',
      agentName: 'Smart Planner',
      agentTitle: 'Strategic Resource Orchestrator',
      department: 'Strategy',
      type: 'agent_contribution',
      metadata: {
        dataPlan: dataPlan,
        selectedAgents: selectedAgents.map(a => ({ 
          id: a.id, 
          name: a.name, 
          department: a.department,
          expertise: a.expertise?.slice(0, 3) || [],
          strategy: a.personality || 'Data-driven analysis'
        }))
      }
    };
    session.messages.push(planMessage);

    // If no agents selected, skip noisy fallback; UI will show clear status

    // Phase 1: Initial Agent Contributions
    const initialContributions = await this.generateInitialAgentContributions(selectedAgents, userMessage, dataPlan, session);
    session.messages.push(...initialContributions);

    // Phase 2: Agent Debate and Cross-Referencing
    const debateContributions = await this.generateAgentDebate(selectedAgents, initialContributions, session);
    session.messages.push(...debateContributions);

    // Phase 3: Consensus Building
    const consensusContribution = await this.generateConsensus(selectedAgents, [...initialContributions, ...debateContributions], session);
    if (consensusContribution) {
      session.messages.push(consensusContribution);
    }

    // Generate scenario modeling and decision point
    try {
      // First, generate scenario modeling
      const scenarioResponse = await this.aiService.generateResponse(
        `Based on the analysis from ${selectedAgents.length} agents and their collaborative debate, identify 2-3 key scenarios that should be modeled for this business idea. Consider different market conditions, customer adoption rates, and competitive responses.`,
        'smart-planner',
        {
          sessionId: sessionId,
          userId: userId,
          conversationHistory: session.messages,
          availableTools: [],
          userPreferences: {},
          previousMessages: session.messages.map(m => m.content)
        }
      );
      
      if (scenarioResponse && scenarioResponse.content) {
        // Add scenario modeling message
        const scenarioMsg: ChatMessage = {
          id: `msg_${Date.now()}_scenarios`,
          sender: 'ai',
          content: `## 🔮 **Scenario Modeling Plan**\n\n${scenarioResponse.content}\n\n**Next Steps**: I'll model these scenarios to provide you with different outcomes and risk assessments.`,
          timestamp: new Date(),
          agentId: 'smart-planner',
          agentName: 'Smart Planner',
          agentTitle: 'Strategic Decision Facilitator',
          department: 'Strategy',
          type: 'agent_contribution',
          metadata: {
            source: 'smart-planner',
            confidence: 0.85,
            scenarios: scenarioResponse.content
          }
        };
        
        session.messages.push(scenarioMsg);
      }
      
      // Then generate decision point
      const decisionResponse = await this.aiService.generateResponse(
        `Based on the collaborative analysis from ${selectedAgents.length} agents and their debate, generate a decision point for the user. The decision should be actionable and require user input to proceed.`,
        'smart-planner',
        {
          sessionId: sessionId,
          userId: userId,
          conversationHistory: session.messages,
          availableTools: [],
          userPreferences: {},
          previousMessages: session.messages.map(m => m.content)
        }
      );

      // Ensure we have a valid response
      if (decisionResponse && decisionResponse.content) {
        // Add decision point to tracker
        this.decisionTracker.setDecisionPoint(decisionId, decisionResponse.content);

        // Collect evidence trace (messageIds and citations)
        const evidenceMessageIds = session.messages
          .filter(m => m.sender !== 'user')
          .map(m => m.id);
        const citations = session.messages
          .flatMap(m => (m.metadata?.dataPoints || []))
          .slice(0, 20);

        // Create decision point message
        const decisionMsg: ChatMessage = {
          id: `msg_${Date.now()}_decision`,
          sender: 'ai',
          content: `## 🎯 **Decision Point**\n\n${decisionResponse.content}\n\n**Options**:\n• **Approve** - Move forward with current analysis\n• **Refine** - Request improvements from the team\n• **Reject** - Start over with different approach\n• **Pause** - Save progress and continue later\n\n**Evidence (messageIds)**:\n${evidenceMessageIds.map(id => `- ${id}`).join('\n')}\n\nPlease select your preference to continue.`,
          timestamp: new Date(),
          agentId: 'smart-planner',
          agentName: 'Smart Planner',
          agentTitle: 'Strategic Decision Facilitator',
          department: 'Strategy',
          type: 'decision_point',
          metadata: {
            dataPlan: dataPlan,
            scenarios: scenarioResponse?.content,
            decisionId,
            evidenceMessageIds,
            dataPoints: citations
          }
        };
        
        session.messages.push(decisionMsg);

        // Map outputs to stepData for current step with evidence links
        if (session.currentStepId) {
          session.stepData[session.currentStepId] = this.mapStepDataForDecision(
            session.currentStepId,
            userMessage,
            decisionResponse.content,
            evidenceMessageIds
          );
        }
      } else {
        console.error('Invalid decision response:', decisionResponse);
      }
    } catch (error) {
      console.error('Error generating scenario modeling or decision point:', error);
      // Continue without decision point if it fails
    }

    // Update decision document
    const decisionDocument = this.decisionTracker.generateMarkdown();

    return {
      messages: session.messages,
      decisionDocument
    };
  }

  private mapStepDataForDecision(stepId: string, userMessage: string, decisionText: string, evidenceIds: string[]) {
    const evidence = { evidenceMessageIds: evidenceIds, source: 'agents' };
    switch (stepId) {
      case 'PROBLEM_CAPTURE':
        return {
          problemStatement: { value: userMessage, source: 'user_input', evidenceMessageIds: evidenceIds },
          assumptions: { value: 'To be determined', ...evidence },
          successCriteria: { value: 'To be determined', ...evidence }
        };
      case 'PROBLEM_CLARIFICATION':
        return {
          clarifiedProblem: { value: decisionText, ...evidence },
          customerSegments: { value: [], ...evidence },
          valueProposition: { value: 'To be determined', ...evidence },
          riskFactors: { value: [], ...evidence }
        };
      case 'SOLUTION_BRAINSTORM':
        return {
          solutionConcepts: { value: decisionText, ...evidence },
          technicalApproach: { value: 'To be determined', ...evidence },
          businessModel: { value: 'To be determined', ...evidence },
          keyFeatures: { value: [], ...evidence }
        };
      case 'COMPETITOR_ANALYSIS':
        return {
          competitors: { value: 'To be determined', ...evidence },
          competitiveAdvantages: { value: 'To be determined', ...evidence },
          marketGaps: { value: 'To be determined', ...evidence },
          positioning: { value: 'To be determined', ...evidence }
        };
      case 'SCA_ANALYSIS':
        return {
          scaFactors: { value: [], ...evidence },
          resourceRequirements: { value: 'To be determined', ...evidence },
          sustainabilityAssessment: { value: 'To be determined', ...evidence },
          riskMitigation: { value: 'To be determined', ...evidence }
        };
      case 'MVP_PLANNING':
        return {
          mvpFeatures: { value: [], ...evidence },
          developmentTimeline: { value: 'To be determined', ...evidence },
          resourceAllocation: { value: 'To be determined', ...evidence },
          goToMarketStrategy: { value: 'To be determined', ...evidence }
        };
      case 'TASK_GENERATION':
        return {
          taskBreakdown: { value: [], ...evidence },
          dependencies: { value: 'To be determined', ...evidence },
          timeline: { value: 'To be determined', ...evidence },
          resourceAssignment: { value: 'To be determined', ...evidence }
        };
      default:
        return { notes: { value: decisionText, ...evidence } };
    }
  }

  // Generate initial agent contributions with thinking and analysis
  private async generateInitialAgentContributions(
    agents: any[], 
    userMessage: string, 
    dataPlan: DataPlan, 
    session: ChatSession
  ): Promise<ChatMessage[]> {
    const contributions: ChatMessage[] = [];
    
    for (const agent of agents) {
      try {
        await this.delay(this.thinkingDelay);
        
        // Generate agent's initial analysis
        const agentResponse = await this.generateAgentResponse(agent, userMessage, dataPlan);
        
        // Ensure we have a valid response
        if (!agentResponse || !agentResponse.content) {
          console.error(`Invalid response from agent ${agent.id}:`, agentResponse);
          continue;
        }
        
        // Add agent contribution to decision tracker
        this.decisionTracker.addAgentContribution(session.currentDecision?.id || 'unknown', {
          agentId: agent.id,
          agentName: agent.name,
          agentTitle: agent.title,
          message: agentResponse.content,
          dataPoints: agentResponse.metadata?.dataPoints || [],
          source: agentResponse.metadata?.source || 'ai-service',
          department: agent.department
        });

        // Create agent message with user-friendly content
        const agentMsg: ChatMessage = {
          id: `msg_${Date.now()}_${agent.id}`,
          sender: 'agent',
          content: agentResponse.userResponse || agentResponse.content,
          timestamp: new Date(),
          agentId: agent.id,
          agentName: agent.name,
          agentTitle: agent.title,
          department: agent.department,
          type: 'agent_contribution',
          metadata: {
            dataPoints: agentResponse.metadata?.dataPoints || [],
            source: agentResponse.metadata?.source || 'ai-service',
            thinkingTime: this.thinkingDelay,
            confidence: agentResponse.metadata?.confidence || 0.8,
            sampleSize: agentResponse.metadata?.sampleSize || 0,
            dataQueries: agentResponse.metadata?.dataQueries || [],
            dataPlan: dataPlan,
            internalResponse: agentResponse.internalResponse || null
          }
        };
        
        contributions.push(agentMsg);
        
        // Track agent interaction
        const interaction: AgentInteraction = {
          agentId: agent.id,
          agentName: agent.name,
          message: agentResponse.content,
          timestamp: new Date(),
          type: 'thought',
          citations: agentResponse.metadata?.dataPoints || []
        };
        session.agentInteractions.push(interaction);
        
      } catch (error) {
        console.error(`Error processing agent ${agent.id}:`, error);
        // Continue with other agents even if one fails
        continue;
      }
    }
    
    return contributions;
  }

  // Generate agent debate where agents respond to each other's insights
  private async generateAgentDebate(
    agents: any[], 
    initialContributions: ChatMessage[], 
    session: ChatSession
  ): Promise<ChatMessage[]> {
    const debateContributions: ChatMessage[] = [];
    
    // Create debate rounds where agents respond to each other
    for (let round = 0; round < 1; round++) { // 1 round to converge faster
      for (const agent of agents) {
        try {
          await this.delay(this.debateDelay);
          
          // Find insights from other agents to respond to
          const otherAgentInsights = initialContributions
            .filter(msg => msg.agentId !== agent.id && msg.type === 'agent_contribution')
            .map(msg => ({
              agentName: msg.agentName,
              content: msg.content,
              department: msg.department
            }));
          
          if (otherAgentInsights.length === 0) continue;
          
          // Generate debate response
          const debateResponse = await this.generateDebateResponse(agent, otherAgentInsights, session);
          
          if (debateResponse) {
            const debateMsg: ChatMessage = {
              id: `msg_${Date.now()}_debate_${agent.id}`,
              sender: 'agent',
              content: debateResponse.content,
              timestamp: new Date(),
              agentId: agent.id,
              agentName: agent.name,
              agentTitle: agent.title,
              department: agent.department,
              type: 'agent_debate',
              metadata: {
                respondingTo: otherAgentInsights.map(insight => insight.agentName).join(', '),
                debateContext: `Round ${round + 1} debate`,
                crossReference: otherAgentInsights.map(insight => `${insight.agentName}: ${insight.content.substring(0, 100)}...`),
                confidence: debateResponse.confidence || 0.8
              }
            };
            
            debateContributions.push(debateMsg);
            
            // Track debate interaction
            const interaction: AgentInteraction = {
              agentId: agent.id,
              agentName: agent.name,
              message: debateResponse.content,
              timestamp: new Date(),
              type: 'debate',
              respondingTo: otherAgentInsights.map(insight => insight.agentName).join(', '),
              crossReferences: otherAgentInsights.map(insight => insight.content.substring(0, 100))
            };
            session.agentInteractions.push(interaction);
          }
          
        } catch (error) {
          console.error(`Error generating debate response for agent ${agent.id}:`, error);
          continue;
        }
      }
    }
    
    return debateContributions;
  }

  // Generate consensus based on all agent contributions and debate
  private async generateConsensus(
    agents: any[], 
    allContributions: ChatMessage[], 
    session: ChatSession
  ): Promise<ChatMessage | null> {
    try {
      const consensusPrompt = `Based on the collaborative analysis and debate from ${agents.length} agents, create a consensus summary that synthesizes the key insights and recommendations.

Agent Contributions:
${allContributions
  .filter(msg => msg.type === 'agent_contribution' || msg.type === 'agent_debate')
  .map(msg => `- ${msg.agentName} (${msg.department}): ${msg.content.substring(0, 200)}...`)
  .join('\n')}

Please provide:
1. Key consensus points where agents agree
2. Areas of healthy debate and different perspectives
3. Final strategic recommendations
4. Risk factors identified by Critical Cassandra
5. Next steps for the user

Format as a clear, actionable summary.`;

      const consensusResponse = await this.aiService.generateResponse(
        consensusPrompt,
        'smart-planner',
        {
          sessionId: session.sessionId,
          userId: 'system',
          conversationHistory: allContributions,
          availableTools: [],
          userPreferences: {},
          previousMessages: allContributions.map(m => m.content)
        }
      );

      if (consensusResponse && consensusResponse.content) {
        return {
          id: `msg_${Date.now()}_consensus`,
          sender: 'ai',
          content: `## 🤝 **Team Consensus & Strategic Summary**\n\n${consensusResponse.content}\n\n**This represents the collaborative analysis and debate from our expert team.**`,
          timestamp: new Date(),
          agentId: 'smart-planner',
          agentName: 'Smart Planner',
          agentTitle: 'Strategic Consensus Facilitator',
          department: 'Strategy',
          type: 'agent_contribution',
          metadata: {
            confidence: 0.9,
            source: 'team-consensus'
          }
        };
      }
    } catch (error) {
      console.error('Error generating consensus:', error);
    }
    
    return null;
  }

  // Generate debate response where an agent responds to other agents' insights
  private async generateDebateResponse(
    agent: any, 
    otherAgentInsights: any[], 
    session: ChatSession
  ): Promise<any> {
    const debatePrompt = `You are ${agent.name}, a ${agent.title} with expertise in ${agent.expertise?.join(', ')}.

Other team members have shared their insights. Please respond to their perspectives:

${otherAgentInsights.map(insight => 
  `**${insight.agentName} (${insight.department}):** ${insight.content}`
).join('\n\n')}

Your response should:
1. Acknowledge valuable insights from other agents
2. Add your unique perspective based on your expertise
3. Identify areas of agreement or healthy disagreement
4. Provide additional insights that complement or challenge their views
5. Focus on how your expertise adds value to the discussion

Keep your response to 2-3 sentences. Be collaborative but maintain your unique perspective.`;

    try {
      const response = await this.aiService.generateResponse(
        debatePrompt,
      agent.id,
      {
          sessionId: session.sessionId,
          userId: 'system',
          conversationHistory: session.messages,
        availableTools: agent.tools || [],
        userPreferences: {},
          previousMessages: session.messages.map(m => m.content)
        }
      );

      return {
        content: response?.content || `I'm analyzing the insights from my colleagues and will provide my perspective shortly.`,
        confidence: response?.metadata?.confidence || 0.8
      };
    } catch (error) {
      console.error(`Error generating debate response for ${agent.name}:`, error);
      return {
        content: `I'm processing the insights from my colleagues and will respond with my analysis.`,
        confidence: 0.7
      };
    }
  }

  private selectRelevantAgents(userMessage: string, dataPlan: DataPlan): any[] {
    // Get all business agents
    const allAgents = this.getBusinessAgents();
    
    // Always include critical agents for reality checking
    const criticalAgents = getCriticalAgents();
    
    // Select agents based on message content and data plan
    let selectedAgents: any[] = [];
    
    // Priority 1: Required agents from data plan
    const requiredAgents = dataPlan.phases[dataPlan.currentPhase]?.requiredAgents || [];
    const requiredAgentObjects = allAgents.filter(agent => requiredAgents.includes(agent.id));
    selectedAgents.push(...requiredAgentObjects);
    
    // Priority 2: Always include Critical Cassandra for reality checking
    const criticalCassandra = criticalAgents.find(agent => agent.id === 'critical-cassandra');
    if (criticalCassandra && !selectedAgents.includes(criticalCassandra)) {
      selectedAgents.push(criticalCassandra);
    }
    
    // Priority 3: Core agents for startup/business questions
    if (this.isStartupQuestion(userMessage)) {
      // Always include CEO for business strategy
      const ceo = allAgents.find(agent => agent.id === 'ceo');
      if (ceo && !selectedAgents.includes(ceo)) {
        selectedAgents.push(ceo);
      }
      
      // Always include CTO for technical feasibility
      const cto = allAgents.find(agent => agent.id === 'cto');
      if (cto && !selectedAgents.includes(cto)) {
        selectedAgents.push(cto);
      }
      
      // Include SaaS Sage Sarah for SaaS-related questions
      if (this.isSaaSQuestion(userMessage)) {
        const saasAgents = getSaaSAgents();
        saasAgents.forEach(agent => {
          if (!selectedAgents.includes(agent)) {
            selectedAgents.push(agent);
          }
        });
      }
      
      // Include Domain Doctor Dave for industry-specific questions
      if (this.isIndustrySpecificQuestion(userMessage)) {
        const industryAgents = getIndustryAgents();
        industryAgents.forEach(agent => {
          if (!selectedAgents.includes(agent)) {
            selectedAgents.push(agent);
          }
        });
      }
    }
    
    // Priority 4: Relevant agents based on message content
    const relevantAgents = allAgents.filter(agent => 
      !selectedAgents.includes(agent) && 
      this.isAgentRelevantForMessage(agent, userMessage)
    );
    
    // Add relevant agents, prioritizing by department importance
    const priorityOrder = ['critical', 'leadership', 'market-intelligence', 'user-research', 'data', 'business', 'technical', 'domain', 'saas', 'industry'];
    const sortedRelevantAgents = relevantAgents.sort((a, b) => {
      const aPriority = priorityOrder.indexOf(a.department);
      const bPriority = priorityOrder.indexOf(b.department);
      return aPriority - bPriority;
    });
    
    selectedAgents.push(...sortedRelevantAgents);
    
    // Ensure we have at least 4-6 agents for comprehensive analysis
    const defaultMax = 4;
    const maxAgents = Math.min(selectedAgents.length, dataPlan.maxConcurrentAgents || defaultMax);
    return selectedAgents.slice(0, maxAgents);
  }

  private isStartupQuestion(userMessage: string): boolean {
    const startupKeywords = [
      'startup', 'business', 'company', 'product', 'service', 'market', 'customers', 'revenue', 'profit',
      'demand', 'supply', 'pricing', 'competition', 'growth', 'scaling', 'funding', 'investment',
      'lab kits', 'school', 'children', 'education', 'monthly', 'subscription', 'business model'
    ];
    
    const message = userMessage.toLowerCase();
    return startupKeywords.some(keyword => message.includes(keyword));
  }

  private isSaaSQuestion(userMessage: string): boolean {
    const saasKeywords = [
      'saas', 'software as a service', 'subscription', 'recurring revenue', 'monthly', 'annual',
      'b2b', 'enterprise', 'sml', 'customer acquisition', 'churn', 'lifetime value', 'cac',
      'mrr', 'arr', 'product-led growth', 'freemium', 'tiered pricing'
    ];
    
    const message = userMessage.toLowerCase();
    return saasKeywords.some(keyword => message.includes(keyword));
  }

  private isIndustrySpecificQuestion(userMessage: string): boolean {
    const industryKeywords = [
      'healthcare', 'finance', 'education', 'retail', 'manufacturing', 'logistics', 'real estate',
      'legal', 'consulting', 'media', 'entertainment', 'travel', 'food', 'automotive', 'energy',
      'regulatory', 'compliance', 'industry', 'sector', 'vertical'
    ];
    
    const message = userMessage.toLowerCase();
    return industryKeywords.some(keyword => message.includes(keyword));
  }

  private isAgentRelevantForMessage(agent: any, userMessage: string): boolean {
    const message = userMessage.toLowerCase();
    const agentExpertise = agent.expertise?.map((exp: string) => exp.toLowerCase()) || [];
    
    return agentExpertise.some((expertise: string) => message.includes(expertise));
  }

  private getBusinessAgents(): any[] {
    return BUSINESS_AGENTS;
  }

  private generateDataPlanMessage(dataPlan: DataPlan, selectedAgents: any[]): string {
    return `## 🎯 **Strategic Analysis Plan**

I've assembled a specialized team of ${selectedAgents.length} experts to analyze your request:

${selectedAgents.map(agent => `• **${agent.name}** (${agent.department}) - ${agent.expertise?.slice(0, 2).join(', ')}`).join('\n')}

**Analysis Approach:**
1. **Individual Analysis** - Each expert provides their perspective
2. **Collaborative Debate** - Experts discuss and challenge each other's insights
3. **Consensus Building** - Team reaches agreement on key recommendations
4. **Strategic Decision** - Final actionable insights for your approval

**Current Phase:** ${dataPlan.currentPhase}
**Estimated Time:** ${dataPlan.estimatedDuration ? `${dataPlan.estimatedDuration} minutes` : '5-10 minutes'}

Let's begin the collaborative analysis...`;
  }

  private async generateAgentResponse(agent: any, userMessage: string, _dataPlan: DataPlan): Promise<any | null> {
    try {
      const response = await this.aiService.generateResponse(
        userMessage,
        agent.id,
        {
          sessionId: 'session',
          userId: 'user',
          conversationHistory: [],
          availableTools: agent.tools || [],
          userPreferences: {},
          previousMessages: [userMessage]
        }
      );

      return response;
    } catch (error) {
      console.error(`Error generating response for agent ${agent.id}:`, error);
      return null;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public userApproval(_sessionId: string, decisionId: string, response: 'approve' | 'refine' | 'reject' | 'pause'): void {
    this.decisionTracker.userResponse(decisionId, response);
  }

  public getDecisionDocument(_sessionId: string): string {
    const session = this.sessions.get(_sessionId);
    if (!session) return '';
    return session.decisionTracker.generateMarkdown();
  }

  /**
   * Get internal details for admin/debugging purposes
   * This shows budget, costs, and technical implementation details
   */
  public getInternalDetails(sessionId: string): any {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { error: 'Session not found' };
    }

    return {
      sessionId: session.sessionId,
      projectTitle: session.projectTitle,
      currentStepId: session.currentStepId,
      stepData: session.stepData,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      totalMessages: session.messages.length,
      decisionTracker: session.decisionTracker,
      decisionLog: session.decisionTracker.getDecisionLog(),
      // Internal technical details
      internalMetrics: {
        totalMessages: session.messages.length,
        agentMessages: session.messages.filter(msg => msg.sender === 'agent').length,
        userMessages: session.messages.filter(msg => msg.sender === 'user').length,
        agentUsage: session.messages
          .filter(msg => msg.sender === 'agent')
          .map(msg => ({
            agentId: msg.agentId,
            agentName: msg.agentName,
            thinkingTime: msg.metadata?.thinkingTime,
            confidence: msg.metadata?.confidence,
            dataPoints: msg.metadata?.dataPoints?.length || 0
          }))
      },
      // Budget and resource usage (hidden from users)
      budgetDetails: session.messages
        .filter(msg => msg.metadata?.dataPlan)
        .map(msg => ({
          messageId: msg.id,
          dataPlan: msg.metadata?.dataPlan,
          remainingBudget: msg.metadata?.dataPlan?.remainingBudget,
          actualUsage: msg.metadata?.dataPlan?.actualUsage
        }))
    };
  }

  public processUserDecision(sessionId: string, decision: string, _userMessage: string): any {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        return { error: 'Session not found' };
      }

      // Add user decision to session
      const decisionMsg: ChatMessage = {
        id: `msg_${Date.now()}_user_decision`,
        sender: 'user',
        content: `User decided: ${decision}`,
        timestamp: new Date(),
        type: 'user_approval',
        metadata: {
          dataPoints: [],
          source: 'user_decision'
        }
      };
      
      session.messages.push(decisionMsg);

      // Update decision tracker - find the current decision and update it
      const currentDecision = session.messages.find(m => m.type === 'decision_point');
      if (currentDecision) {
        // Extract decision ID from the message ID
        const decisionId = currentDecision.id;
        this.decisionTracker.userResponse(decisionId, decision as 'approve' | 'reject' | 'refine' | 'pause');
      }

      // Generate decision document
      const decisionDocument = this.decisionTracker.generateMarkdown();

      return {
        success: true,
        decisionDocument
      };
    } catch (error) {
      console.error('Error processing user decision:', error);
      return { error: 'Failed to process decision' };
    }
  }

  public async continueAnalysis(sessionId: string, phase: string, userMessage: string): Promise<any> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        return { error: 'Session not found' };
      }

      let newMessages: ChatMessage[] = [];
      
      if (phase === 'refine') {
        // Create a real agent dialogue where agents discuss and refine the analysis
        const dataPlan = session.messages[session.messages.length - 1]?.metadata?.dataPlan;
        if (!dataPlan) {
          throw new Error('No data plan available for refinement');
        }
        
        // Start with a facilitator message
        const facilitatorMsg: ChatMessage = {
          id: `msg_${Date.now()}_facilitator`,
          sender: 'ai',
          content: `## 🔄 **Refinement Session Started**\n\n**Facilitator**: Let's have our expert team discuss and refine the analysis. I'll moderate a conversation between the agents to identify areas for improvement.`,
          timestamp: new Date(),
          agentId: 'facilitator',
          agentName: 'Session Facilitator',
          agentTitle: 'Discussion Moderator',
          department: 'Strategy',
          type: 'agent_contribution',
          metadata: {}
        };
        newMessages.push(facilitatorMsg);
        
        // Select agents for refinement dialogue
        const refinementAgents = this.selectRelevantAgents(userMessage, dataPlan).slice(0, 3);
        
        // Create agent-to-agent dialogue
        for (let i = 0; i < refinementAgents.length; i++) {
          const agent = refinementAgents[i];
          
          try {
            await this.delay(this.thinkingDelay);
            
            // Generate response that considers previous agent inputs
            const previousAgentInputs = newMessages
              .filter(m => m.sender === 'agent')
              .map(m => `${m.agentName}: ${m.content}`)
              .join('\n\n');
            
            const dialoguePrompt = `You are ${agent.name}, ${agent.title}. 

Previous agents have shared their thoughts:
${previousAgentInputs}

Based on their input and your expertise, please:
1. Acknowledge their points
2. Identify any gaps or areas for improvement
3. Suggest specific refinements
4. Ask clarifying questions if needed

Keep your response conversational and focused on improving the analysis.`;

            const agentResponse = await this.aiService.generateResponse(
              dialoguePrompt,
              agent.id,
              {
                sessionId: 'temp',
                userId: 'user',
                conversationHistory: newMessages,
                availableTools: agent.tools || [],
                userPreferences: {},
                previousMessages: newMessages.map(m => m.content)
              }
            );
            
            if (agentResponse && agentResponse.content) {
              const dialogueMsg: ChatMessage = {
                id: `msg_${Date.now()}_${agent.id}_dialogue`,
                sender: 'agent',
                content: `**${agent.name}** (${agent.title}):\n\n${agentResponse.content}`,
                timestamp: new Date(),
                agentId: agent.id,
                agentName: agent.name,
                agentTitle: agent.title,
                department: agent.department,
                type: 'agent_contribution',
                metadata: {
                  dataPoints: agentResponse.metadata?.['dataPoints'] || [],
                  source: 'agent-dialogue',
                  thinkingTime: this.thinkingDelay,
                  confidence: agentResponse.metadata?.confidence || 0.8,
                  sampleSize: agentResponse.metadata?.sampleSize || 0,
                  dataQueries: agentResponse.metadata?.dataQueries || [],
                  internalResponse: agentResponse.metadata?.['internalResponse'] || null
                }
              };
              
              newMessages.push(dialogueMsg);
            }
          } catch (error) {
            console.error(`Error processing dialogue agent ${agent.id}:`, error);
            continue;
          }
        }
        
        // Add a synthesis message
        const synthesisMsg: ChatMessage = {
          id: `msg_${Date.now()}_synthesis`,
          sender: 'ai',
          content: `## 📝 **Refinement Summary**\n\n**Facilitator**: Thank you for the productive discussion. Here's what we've refined:\n\n${newMessages
            .filter(m => m.sender === 'agent')
            .map(m => `• **${m.agentName}**: ${m.content.split('\n')[0]}...`)
            .join('\n')}\n\n**Next Steps**: Based on this refinement, we can now proceed with the improved analysis.`,
          timestamp: new Date(),
          agentId: 'facilitator',
          agentName: 'Session Facilitator',
          agentTitle: 'Discussion Moderator',
          department: 'Strategy',
          type: 'agent_contribution',
          metadata: {}
        };
        newMessages.push(synthesisMsg);
        
      } else if (phase === 'next') {
        // Move to next phase with proactive agent conversation
        const nextPhaseMsg: ChatMessage = {
          id: `msg_${Date.now()}_next_phase`,
          sender: 'ai',
          content: `## 🚀 **Moving to Next Phase**\n\n**Smart Planner**: Excellent! Let's explore the next strategic considerations. I'll coordinate our team to dive deeper into implementation details.`,
          timestamp: new Date(),
          agentId: 'smart-planner',
          agentName: 'Smart Planner',
          agentTitle: 'Strategic Resource Orchestrator',
          department: 'Strategy',
          type: 'agent_contribution',
          metadata: {}
        };
        
        newMessages.push(nextPhaseMsg);
        
        // Add proactive next phase analysis with agent collaboration
        const nextPhaseDataPlan = session.messages[session.messages.length - 1]?.metadata?.dataPlan;
        if (!nextPhaseDataPlan) {
          throw new Error('No data plan available for next phase');
        }
        
        const nextPhaseAgents = this.selectRelevantAgents(userMessage, nextPhaseDataPlan).slice(0, 2);
        
        for (const agent of nextPhaseAgents) {
          try {
            await this.delay(this.thinkingDelay);
            
            // Generate proactive response that builds on previous analysis
            const proactivePrompt = `You are ${agent.name}, ${agent.title}. 

The team has completed the initial analysis. Now, proactively identify the NEXT critical considerations for implementation:

1. What are the immediate next steps?
2. What potential challenges should we anticipate?
3. What resources or partnerships do we need?
4. How do we measure success?

Be proactive and forward-thinking. Don't just analyze - recommend action.`;

            const agentResponse = await this.aiService.generateResponse(
              proactivePrompt,
              agent.id,
              {
                sessionId: 'temp',
                userId: 'user',
                conversationHistory: newMessages,
                availableTools: agent.tools || [],
                userPreferences: {},
                previousMessages: newMessages.map(m => m.content)
              }
            );
            
            if (agentResponse && agentResponse.content) {
              const proactiveMsg: ChatMessage = {
                id: `msg_${Date.now()}_${agent.id}_proactive`,
                sender: 'agent',
                content: `**${agent.name}** (${agent.title}):\n\n${agentResponse.content}`,
                timestamp: new Date(),
                agentId: agent.id,
                agentName: agent.name,
                agentTitle: agent.title,
                department: agent.department,
                type: 'agent_contribution',
                metadata: {
                  dataPoints: agentResponse.metadata?.['dataPoints'] || [],
                  source: 'proactive-analysis',
                  thinkingTime: this.thinkingDelay,
                  confidence: agentResponse.metadata?.confidence || 0.8,
                  sampleSize: agentResponse.metadata?.sampleSize || 0,
                  dataQueries: agentResponse.metadata?.dataQueries || [],
                  internalResponse: agentResponse.metadata?.['internalResponse'] || null
                }
              };
              
              newMessages.push(proactiveMsg);
            }
          } catch (error) {
            console.error(`Error processing proactive agent ${agent.id}:`, error);
            continue;
          }
        }
      }

      // Add new messages to session
      session.messages.push(...newMessages);

      // Generate updated decision document
      const decisionDocument = this.decisionTracker.generateMarkdown();

      return {
        success: true,
        messages: newMessages,
        decisionDocument
      };
    } catch (error) {
      console.error('Error continuing analysis:', error);
      return { error: 'Failed to continue analysis' };
    }
  }

  public async forwardDecisionToCrew(sessionId: string, decision: string, userMessage?: string): Promise<any> {
    try {
      const result = await this.crewClient.decision({ sessionId, decision, userMessage });
      return result;
    } catch (error) {
      console.error('Error forwarding decision to crew:', error);
      throw error;
    }
  }

  public getProgressState(sessionId: string): ProgressState {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        return {
          phase: 'planning',
          currentPhase: 'Session not found',
          overallProgress: 0,
          agents: [],
          estimatedTotalTime: 0,
          currentBudget: 0,
          totalBudget: 200
        };
      }

      // Calculate overall progress based on messages and phases
      const totalExpectedSteps = 5; // planning + agent_selection + data_gathering + analysis + decision_making
      const completedSteps = Math.min(session.messages.length, totalExpectedSteps);
      const overallProgress = Math.round((completedSteps / totalExpectedSteps) * 100);

      // Determine current phase
      let phase: ProgressState['phase'] = 'planning';
      let currentPhase = 'Initializing analysis...';
      
      if (session.messages.length === 0) {
        phase = 'planning';
        currentPhase = 'Creating strategic plan...';
      } else if (session.messages.length === 1) {
        phase = 'agent_selection';
        currentPhase = 'Selecting expert agents...';
      } else if (session.messages.length <= 3) {
        phase = 'data_gathering';
        currentPhase = 'Gathering market data and insights...';
      } else if (session.messages.length <= 5) {
        phase = 'analysis';
        currentPhase = 'Analyzing data and generating insights...';
      } else {
        phase = 'decision_making';
        currentPhase = 'Preparing decision points...';
      }

      // Create agent progress tracking
      const agents: AgentProgress[] = [];
      const agentMessages = session.messages.filter(m => m.sender === 'agent');
      
      // Add Smart Planner progress
      agents.push({
        agentId: 'smart-planner',
        agentName: 'Smart Planner',
        agentTitle: 'Strategic Resource Orchestrator',
        department: 'Strategy',
        status: 'complete',
        currentTask: 'Strategic plan created and agents selected',
        progress: 100,
        insights: ['Data plan created', 'Agents selected based on requirements']
      });

      // Add progress for each agent that has contributed
      agentMessages.forEach((msg) => {
        if (msg.agentId && msg.agentId !== 'smart-planner') {
          agents.push({
            agentId: msg.agentId,
            agentName: msg.agentName || 'Unknown Agent',
            agentTitle: msg.agentTitle || 'Business Expert',
            department: msg.metadata?.department || 'General',
            status: 'complete',
            currentTask: 'Analysis completed',
            progress: 100,
            insights: [msg.content.substring(0, 100) + '...'],
            estimatedTime: this.thinkingDelay / 1000
          });
        }
      });

      // Calculate budget usage
      const dataPlan = session.messages.find(m => m.metadata?.dataPlan)?.metadata?.dataPlan;
      const currentBudget = dataPlan ? dataPlan.actualUsage?.totalCost || 0 : 0;
      const totalBudget = dataPlan ? dataPlan.totalBudget || 200 : 200;

      // Estimate total time
      const estimatedTotalTime = (session.messages.length * this.thinkingDelay) / 1000; // Convert to seconds

      return {
        phase,
        currentPhase,
        overallProgress,
        agents,
        estimatedTotalTime,
        currentBudget,
        totalBudget
      };
    } catch (error) {
      console.error('Error getting progress state:', error);
      return {
        phase: 'planning',
        currentPhase: 'Error occurred while tracking progress',
        overallProgress: 0,
        agents: [],
        estimatedTotalTime: 0,
        currentBudget: 0,
        totalBudget: 200
      };
    }
  }

  // Remove legacy Crew methods that referred to internal crewSessionId
}