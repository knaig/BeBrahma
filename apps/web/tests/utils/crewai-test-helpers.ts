import { Page, expect } from '@playwright/test';
import crewaiResponses from '../fixtures/crewai-agent-responses.json';

export interface AgentMetadata {
  agentId: string;
  agentName: string;
  agentTitle: string;
  agentDepartment?: string;
  expertise?: string[];
  communicationStyle?: string;
  experienceLevel?: string;
}

export interface WorkflowStage {
  name: string;
  description: string;
  status: 'not_started' | 'in_progress' | 'awaiting_decision' | 'completed';
  progress: number;
}

export interface AgentMessage {
  id: string;
  content: string;
  sender: 'agent' | 'system' | 'user';
  timestamp: number;
  agentMetadata?: AgentMetadata;
  stage?: string;
  messageType?: string;
  contextTags?: string[];
}

/**
 * Multi-Agent Mock Utilities
 */

/**
 * Set up complete multi-agent workflow with stage progression
 */
export async function mockMultiAgentWorkflow(
  page: Page, 
  stageSequence: string[], 
  sessionId: string = 'multi-agent-test-session'
): Promise<void> {
  let currentStageIndex = 0;

  // Mock workflow start
  await page.route('**/chat/crew/start', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        sessionId,
        messages: [{
          id: 'workflow-start',
          content: 'Multi-agent workflow initialized. Expert team assembled.',
          sender: 'system',
          timestamp: Date.now(),
          agents: getAgentTeamForStage(stageSequence[0])
        }],
        status: 'active',
        currentStage: stageSequence[0],
        stageSequence: stageSequence
      })
    });
  });

  // Mock stage progression
  await page.route('**/chat/crew/decision', async route => {
    const requestBody = await route.request().postDataJSON();
    if (requestBody.decision === 'approve' && currentStageIndex < stageSequence.length - 1) {
      currentStageIndex++;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        sessionId,
        messages: [{
          id: `stage-transition-${currentStageIndex}`,
          content: `Moving to ${stageSequence[currentStageIndex].replace('_', ' ')}`,
          sender: 'system',
          timestamp: Date.now()
        }],
        status: 'active',
        currentStage: stageSequence[currentStageIndex],
        progress: Math.round(((currentStageIndex + 1) / stageSequence.length) * 100)
      })
    });
  });
}

/**
 * Simulate collaborative agent message exchange
 */
export async function simulateAgentCollaboration(
  page: Page,
  agents: string[],
  messageCount: number,
  sessionId: string = 'collaboration-test-session'
): Promise<void> {
  let messageIndex = 0;

  await page.route('**/chat/crew/next', async route => {
    const currentAgentId = agents[messageIndex % agents.length];
    const agentProfile = getAgentProfile(currentAgentId);
    const collaborativeMessage = generateCollaborativeMessage(currentAgentId, messageIndex, agents);

    messageIndex++;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        sessionId,
        messages: [{
          id: `collab-msg-${messageIndex}`,
          content: collaborativeMessage.content,
          sender: 'agent',
          timestamp: Date.now(),
          agentMetadata: agentProfile,
          collaborationMetadata: {
            sequence: messageIndex,
            references: collaborativeMessage.references,
            buildOnPrevious: messageIndex > 1
          }
        }],
        status: 'active',
        hasMore: messageIndex < messageCount
      })
    });
  });
}

/**
 * Mock real-time agent status and progress updates
 */
export async function mockAgentStatusUpdates(
  page: Page,
  agentStatuses: Record<string, any>,
  sessionId: string = 'status-test-session'
): Promise<void> {
  let updateCount = 0;

  await page.route(`**/chat/progress/${sessionId}`, async route => {
    updateCount++;
    
    // Simulate dynamic status changes
    const updatedStatuses = Object.fromEntries(
      Object.entries(agentStatuses).map(([agentId, status]) => [
        agentId,
        {
          ...status,
          lastActivity: Date.now(),
          updateCount: updateCount,
          taskProgress: Math.min((status.taskProgress || 0) + (updateCount * 10), 100)
        }
      ])
    );

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        progressState: {
          sessionId,
          agentStatus: updatedStatuses,
          progress: Math.min(updateCount * 15, 100),
          timestamp: Date.now(),
          updateSequence: updateCount
        }
      })
    });
  });
}

/**
 * Simulate agent consensus building for decisions
 */
export async function simulateDecisionConsensus(
  page: Page,
  agentRecommendations: Record<string, string>,
  consensusLevel: 'unanimous' | 'majority' | 'split' = 'unanimous'
): Promise<void> {
  await page.route('**/chat/crew/next', async route => {
    const consensusMessage = generateConsensusMessage(agentRecommendations, consensusLevel);

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        sessionId: 'consensus-test-session',
        message: consensusMessage,
        status: 'awaiting_decision',
        pendingDecision: true,
        consensus: {
          level: consensusLevel,
          agentRecommendations,
          readyForDecision: true
        }
      })
    });
  });
}

/**
 * Agent Message Utilities
 */

/**
 * Generate realistic agent messages with proper metadata
 */
export function createAgentMessage(
  agentId: string,
  content: string,
  stage: string,
  metadata: Partial<AgentMetadata> = {}
): AgentMessage {
  const agentProfile = getAgentProfile(agentId);
  
  return {
    id: `${agentId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    content,
    sender: 'agent',
    timestamp: Date.now(),
    stage,
    agentMetadata: {
      ...agentProfile,
      ...metadata
    },
    contextTags: extractContextTags(content)
  };
}

/**
 * Mock sequential agent contributions within stages
 */
export async function mockAgentSequence(
  page: Page,
  agentOrder: string[],
  stage: string,
  sessionId: string = 'sequence-test-session'
): Promise<void> {
  let sequenceIndex = 0;

  await page.route('**/chat/crew/next', async route => {
    const currentAgentId = agentOrder[sequenceIndex % agentOrder.length];
    const agentMessage = getStageSpecificMessage(currentAgentId, stage);
    sequenceIndex++;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        sessionId,
        messages: [{
          ...agentMessage,
          id: `sequence-${sequenceIndex}`,
          timestamp: Date.now()
        }],
        status: 'active',
        sequenceNumber: sequenceIndex,
        hasMore: sequenceIndex < agentOrder.length * 2 // Allow multiple rounds
      })
    });
  });
}

/**
 * Validate agent metadata display and accuracy
 */
export async function validateAgentMetadata(
  page: Page,
  expectedAgents: AgentMetadata[]
): Promise<void> {
  for (const expectedAgent of expectedAgents) {
    const agentElement = page.locator(`[data-testid="agent-${expectedAgent.agentId}"]`);
    await expect(agentElement.locator('[data-testid="agent-name"]')).toContainText(expectedAgent.agentName);
    await expect(agentElement.locator('[data-testid="agent-title"]')).toContainText(expectedAgent.agentTitle);
    
    if (expectedAgent.agentDepartment) {
      await expect(agentElement.locator('[data-testid="agent-department"]')).toContainText(expectedAgent.agentDepartment);
    }
    
    if (expectedAgent.expertise) {
      for (const expertiseArea of expectedAgent.expertise) {
        await expect(agentElement.locator('[data-testid="agent-expertise"]')).toContainText(expertiseArea);
      }
    }
  }
}

/**
 * Simulate agent typing indicators and delays
 */
export async function simulateAgentTyping(
  page: Page,
  agentId: string,
  duration: number = 2000
): Promise<void> {
  let requestCount = 0;
  
  await page.route('**/chat/crew/next', async route => {
    requestCount++;
    
    if (requestCount === 1) {
      // First response with typing indicator
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sessionId: 'typing-test-session',
          agentTyping: {
            agentId,
            isTyping: true,
            estimatedDuration: duration
          },
          status: 'active'
        })
      });
    } else {
      // Subsequent responses with actual message
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sessionId: 'typing-test-session',
          messages: [createAgentMessage(agentId, 'Agent response after typing simulation', 'PROBLEM_CAPTURE')],
          agentTyping: {
            agentId,
            isTyping: false
          },
          status: 'active'
        })
      });
    }
  });
}

/**
 * Workflow Progression Utilities
 */

/**
 * Set up complete 7-stage workflow progression
 */
export async function mockWorkflowStageProgression(
  page: Page,
  stages: string[] = [
    'PROBLEM_CAPTURE', 'PROBLEM_CLARIFICATION', 'SOLUTION_DESIGN',
    'IMPLEMENTATION_PLAN', 'TESTING_STRATEGY', 'DEPLOYMENT_PLAN', 'MONITORING_SETUP'
  ]
): Promise<void> {
  await mockMultiAgentWorkflow(page, stages, 'stage-progression-session');
}

/**
 * Simulate stage completion and decision triggers
 */
export async function simulateStageCompletion(
  page: Page,
  stage: string,
  completionCriteria: string[]
): Promise<void> {
  await page.route('**/chat/crew/next', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        sessionId: 'stage-completion-session',
        message: {
          id: `completion-${stage}`,
          content: `${stage.replace('_', ' ')} stage completed. All criteria satisfied.`,
          sender: 'system',
          timestamp: Date.now()
        },
        status: 'awaiting_decision',
        pendingDecision: true,
        stageCompletion: {
          stage,
          criteria: completionCriteria,
          allCriteriaMet: true,
          completionPercentage: 100
        }
      })
    });
  });
}

/**
 * Mock decision processing and stage transitions
 */
export async function mockDecisionPointFlow(
  page: Page,
  decisionType: 'approve' | 'refine' | 'reject' | 'pause',
  nextStage?: string
): Promise<void> {
  await page.route('**/chat/crew/decision', async route => {
    const requestBody = await route.request().postDataJSON();
    
    let responseStatus = 'active';
    let responseMessage = '';
    let currentStage = requestBody.currentStage;

    switch (decisionType) {
      case 'approve':
        responseMessage = 'Decision approved! Advancing to next stage.';
        currentStage = nextStage || 'PROBLEM_CLARIFICATION';
        break;
      case 'refine':
        responseMessage = 'Refinement requested. Continuing with enhanced analysis.';
        responseStatus = 'active';
        break;
      case 'reject':
        responseMessage = 'Analysis rejected. Starting over with different approach.';
        responseStatus = 'restarting';
        break;
      case 'pause':
        responseMessage = 'Workflow paused. Progress saved for later resumption.';
        responseStatus = 'paused';
        break;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        sessionId: 'decision-flow-session',
        messages: [{
          id: `decision-${decisionType}`,
          content: responseMessage,
          sender: 'system',
          timestamp: Date.now(),
          messageType: 'decision_response'
        }],
        status: responseStatus,
        currentStage,
        decisionProcessed: {
          decision: decisionType,
          processedAt: Date.now()
        }
      })
    });
  });
}

/**
 * Validate workflow state accuracy
 */
export async function validateWorkflowState(
  page: Page,
  expectedStage: string,
  expectedProgress: number
): Promise<void> {
  await expect(page.locator('[data-testid="current-stage"]')).toContainText(expectedStage.replace('_', ' '));
  await expect(page.locator('[data-testid="progress-bar"]')).toHaveAttribute('aria-valuenow', expectedProgress.toString());
}

/**
 * Session Management Utilities
 */

/**
 * Create comprehensive session state with agent data
 */
export function createMockSession(
  sessionId: string,
  stage: string,
  messages: AgentMessage[],
  agents: AgentMetadata[]
): any {
  return {
    sessionId,
    currentStage: stage,
    status: 'active',
    messages,
    activeAgents: agents,
    progress: Math.round((getStageIndex(stage) / 7) * 100),
    stageProgress: generateStageProgress(stage),
    createdAt: Date.now() - 3600000, // 1 hour ago
    lastActivity: Date.now() - 300000, // 5 minutes ago
    agentContributions: messages.filter(m => m.sender === 'agent').length,
    sessionMetadata: {
      totalAgents: agents.length,
      messagesCount: messages.length,
      collaborationLevel: 'high'
    }
  };
}

/**
 * Test session recovery with agent state restoration
 */
export async function simulateSessionRecovery(
  page: Page,
  sessionData: any
): Promise<void> {
  await page.route(`**/chat/crew/status/${sessionData.sessionId}`, async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ...sessionData,
        recoveredAt: Date.now(),
        recoverySuccessful: true
      })
    });
  });
}

/**
 * Set up realistic progress polling with agent status
 */
export async function mockProgressPolling(
  page: Page,
  progressUpdates: any[],
  sessionId: string = 'progress-polling-session'
): Promise<void> {
  let updateIndex = 0;

  await page.route(`**/chat/progress/${sessionId}`, async route => {
    const currentUpdate = progressUpdates[updateIndex % progressUpdates.length];
    updateIndex++;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        progressState: {
          sessionId,
          ...currentUpdate,
          pollCount: updateIndex,
          timestamp: Date.now()
        }
      })
    });
  });
}

/**
 * Verify session state preservation across interactions
 */
export async function validateSessionContinuity(
  page: Page,
  expectedState: any
): Promise<void> {
  await expect(page.locator('[data-testid="session-id"]')).toContainText(expectedState.sessionId);
  await expect(page.locator('[data-testid="current-stage"]')).toContainText(expectedState.currentStage.replace('_', ' '));
  await expect(page.locator('[data-testid="chat-message"]')).toHaveCount(expectedState.messages.length);
}

/**
 * Error Simulation Utilities
 */

/**
 * Test individual agent service failures
 */
export async function simulateAgentServiceFailure(
  page: Page,
  agentId: string,
  errorType: 'timeout' | 'unavailable' | 'error'
): Promise<void> {
  await page.route('**/chat/crew/next', async route => {
    const requestBody = await route.request().postDataJSON();
    
    if (requestBody.requestedAgent === agentId) {
      switch (errorType) {
        case 'timeout':
          await new Promise(resolve => setTimeout(resolve, 10000)); // Force timeout
          break;
        case 'unavailable':
          await route.fulfill({
            status: 503,
            contentType: 'application/json',
            body: JSON.stringify({
              error: `Agent ${agentId} temporarily unavailable`,
              code: 'AGENT_UNAVAILABLE',
              retryAfter: 2000
            })
          });
          break;
        case 'error':
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              error: `Agent ${agentId} encountered an error`,
              code: 'AGENT_ERROR'
            })
          });
          break;
      }
    } else {
      // Normal response for other agents
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          messages: [createAgentMessage('fallback-agent', 'Continuing with available agents', 'PROBLEM_CAPTURE')],
          status: 'active'
        })
      });
    }
  });
}

/**
 * Simulate workflow service timeouts
 */
export async function mockWorkflowServiceTimeout(
  page: Page,
  endpoint: string,
  delay: number = 10000
): Promise<void> {
  await page.route(`**${endpoint}`, async route => {
    await new Promise(resolve => setTimeout(resolve, delay));
    await route.fulfill({
      status: 408,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'Request timeout',
        code: 'TIMEOUT_ERROR'
      })
    });
  });
}

/**
 * Test incomplete agent responses
 */
export async function simulatePartialAgentResponse(
  page: Page,
  agentId: string,
  partialData: any
): Promise<void> {
  await page.route('**/chat/crew/next', async route => {
    await route.fulfill({
      status: 206, // Partial content
      contentType: 'application/json',
      body: JSON.stringify({
        sessionId: 'partial-response-session',
        message: {
          id: `partial-${agentId}`,
          content: partialData.content || 'Response was interrupted...',
          sender: 'agent',
          timestamp: Date.now(),
          agentMetadata: getAgentProfile(agentId),
          incomplete: true,
          partialData
        },
        status: 'partial_response',
        requiresCompletion: true
      })
    });
  });
}

/**
 * Simulate agent coordination conflicts
 */
export async function mockAgentCoordinationError(
  page: Page,
  conflictingAgents: string[]
): Promise<void> {
  await page.route('**/chat/crew/next', async route => {
    await route.fulfill({
      status: 409, // Conflict
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'Agent coordination conflict',
        code: 'COORDINATION_CONFLICT',
        conflictingAgents,
        resolutionRequired: true,
        conflictDetails: {
          type: 'simultaneous_response',
          agents: conflictingAgents,
          timestamp: Date.now()
        }
      })
    });
  });
}

/**
 * Validation Utilities
 */

/**
 * Assert proper agent collaboration patterns
 */
export async function validateAgentCommunicationPatterns(
  page: Page,
  expectedPatterns: any[]
): Promise<void> {
  for (const pattern of expectedPatterns) {
    const patternElement = page.locator(`[data-testid="collaboration-pattern-${pattern.type}"]`);
    await expect(patternElement).toBeVisible();
    
    if (pattern.agentReferences) {
      for (const agentRef of pattern.agentReferences) {
        await expect(patternElement.locator(`[data-testid="agent-reference-${agentRef}"]`)).toBeVisible();
      }
    }
  }
}

/**
 * Validate decision point quality and options
 */
export async function checkDecisionQuality(
  page: Page,
  decisionCriteria: any
): Promise<void> {
  await expect(page.locator('[data-testid="decision-buttons"]')).toBeVisible();
  
  if (decisionCriteria.requiresAllOptions) {
    await expect(page.locator('[data-testid="decision-approve"]')).toBeVisible();
    await expect(page.locator('[data-testid="decision-refine"]')).toBeVisible();
    await expect(page.locator('[data-testid="decision-reject"]')).toBeVisible();
    await expect(page.locator('[data-testid="decision-pause"]')).toBeVisible();
  }

  if (decisionCriteria.mustHaveContext) {
    await expect(page.locator('[data-testid="decision-context"]')).toBeVisible();
  }
}

/**
 * Check agent expertise matches stage requirements
 */
export async function verifyAgentExpertiseAlignment(
  page: Page,
  stage: string,
  agents: string[]
): Promise<void> {
  const expectedExpertise = getRequiredExpertiseForStage(stage);
  
  for (const agentId of agents) {
    const agentProfile = getAgentProfile(agentId);
    const hasRelevantExpertise = agentProfile.expertise?.some(expertise => 
      expectedExpertise.includes(expertise)
    );
    
    if (hasRelevantExpertise) {
      await expect(page.locator(`[data-testid="agent-expertise-match-${agentId}"]`)).toBeVisible();
    }
  }
}

/**
 * Verify agent consensus building
 */
export async function validateMultiAgentConsensus(
  page: Page,
  consensusIndicators: any
): Promise<void> {
  if (consensusIndicators.level === 'unanimous') {
    await expect(page.locator('[data-testid="unanimous-consensus"]')).toBeVisible();
  }
  
  await expect(page.locator('[data-testid="consensus-summary"]')).toContainText(consensusIndicators.summary);
  
  for (const [agentId, vote] of Object.entries(consensusIndicators.agentVotes || {})) {
    await expect(page.locator(`[data-testid="agent-vote-${agentId}"]`)).toContainText(vote as string);
  }
}

/**
 * Helper Functions
 */

function getAgentProfile(agentId: string): AgentMetadata {
  const profiles = crewaiResponses.agent_metadata_variations;
  
  // Find profile in variations or create default
  for (const [category, categoryProfiles] of Object.entries(profiles)) {
    const profile = (categoryProfiles as any[]).find(p => p.agentId === agentId);
    if (profile) return profile;
  }
  
  // Default profile
  return {
    agentId,
    agentName: `${agentId.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} Agent`,
    agentTitle: `Senior ${agentId.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
    agentDepartment: getDefaultDepartment(agentId),
    expertise: getDefaultExpertise(agentId),
    communicationStyle: 'professional'
  };
}

function getAgentTeamForStage(stage: string): AgentMetadata[] {
  const stageAgentMap: Record<string, string[]> = {
    'PROBLEM_CAPTURE': ['business-analyst', 'smart-planner'],
    'PROBLEM_CLARIFICATION': ['business-analyst', 'solution-architect'],
    'SOLUTION_DESIGN': ['solution-architect', 'developer'],
    'IMPLEMENTATION_PLAN': ['smart-planner', 'developer'],
    'TESTING_STRATEGY': ['qa-tester', 'developer'],
    'DEPLOYMENT_PLAN': ['solution-architect', 'developer'],
    'MONITORING_SETUP': ['smart-planner', 'qa-tester']
  };

  const agentIds = stageAgentMap[stage] || ['business-analyst'];
  return agentIds.map(id => getAgentProfile(id));
}

function generateCollaborativeMessage(agentId: string, messageIndex: number, allAgents: string[]): any {
  const previousAgents = allAgents.slice(0, messageIndex);
  const content = messageIndex === 0 
    ? `As the ${agentId}, I'll start our collaborative analysis.`
    : `Building on ${previousAgents[messageIndex - 1]}'s contribution, I'd like to add...`;
    
  return {
    content,
    references: messageIndex > 0 ? [previousAgents[messageIndex - 1]] : []
  };
}

function generateConsensusMessage(agentRecommendations: Record<string, string>, consensusLevel: string): AgentMessage {
  const agentVotes = Object.entries(agentRecommendations).map(([agentId, recommendation]) => 
    `• **${getAgentProfile(agentId).agentName}**: ${recommendation}`
  ).join('\n');
  
  const content = `**Agent Consensus Summary:**\n\n${agentVotes}\n\n**Consensus Level**: ${consensusLevel.toUpperCase()}`;
  
  return {
    id: `consensus-${Date.now()}`,
    content,
    sender: 'system',
    timestamp: Date.now(),
    messageType: 'agent_consensus'
  };
}

function getStageSpecificMessage(agentId: string, stage: string): AgentMessage {
  const templates = crewaiResponses.agent_message_templates;
  const agentTemplates = (templates as any)[agentId.replace('-', '_')];
  
  if (agentTemplates && agentTemplates[stage.toLowerCase()]) {
    return agentTemplates[stage.toLowerCase()][0];
  }
  
  return createAgentMessage(
    agentId,
    `Contributing to ${stage.replace('_', ' ').toLowerCase()} stage.`,
    stage
  );
}

function extractContextTags(content: string): string[] {
  const tags: string[] = [];
  if (content.includes('requirement')) tags.push('requirements');
  if (content.includes('architect')) tags.push('architecture');
  if (content.includes('test')) tags.push('testing');
  if (content.includes('deploy')) tags.push('deployment');
  return tags;
}

function getStageIndex(stage: string): number {
  const stages = ['PROBLEM_CAPTURE', 'PROBLEM_CLARIFICATION', 'SOLUTION_DESIGN', 'IMPLEMENTATION_PLAN', 'TESTING_STRATEGY', 'DEPLOYMENT_PLAN', 'MONITORING_SETUP'];
  return stages.indexOf(stage) + 1;
}

function generateStageProgress(currentStage: string): Record<string, any> {
  const stages = ['PROBLEM_CAPTURE', 'PROBLEM_CLARIFICATION', 'SOLUTION_DESIGN', 'IMPLEMENTATION_PLAN', 'TESTING_STRATEGY', 'DEPLOYMENT_PLAN', 'MONITORING_SETUP'];
  const currentIndex = stages.indexOf(currentStage);
  
  const progress: Record<string, any> = {};
  stages.forEach((stage, index) => {
    if (index < currentIndex) {
      progress[stage] = { status: 'completed', progress: 100 };
    } else if (index === currentIndex) {
      progress[stage] = { status: 'in_progress', progress: 50 };
    } else {
      progress[stage] = { status: 'not_started', progress: 0 };
    }
  });
  
  return progress;
}

function getDefaultDepartment(agentId: string): string {
  if (agentId.includes('business') || agentId.includes('planner')) return 'Strategy';
  if (agentId.includes('architect') || agentId.includes('developer')) return 'Technical';
  if (agentId.includes('qa') || agentId.includes('tester')) return 'Quality';
  return 'General';
}

function getDefaultExpertise(agentId: string): string[] {
  const expertiseMap: Record<string, string[]> = {
    'business-analyst': ['Requirements Analysis', 'Stakeholder Management'],
    'solution-architect': ['System Architecture', 'Cloud Infrastructure'],
    'smart-planner': ['Project Management', 'Strategic Planning'],
    'developer': ['Full-Stack Development', 'API Design'],
    'qa-tester': ['Test Automation', 'Quality Assurance']
  };
  
  return expertiseMap[agentId] || ['General Expertise'];
}

function getRequiredExpertiseForStage(stage: string): string[] {
  const stageExpertiseMap: Record<string, string[]> = {
    'PROBLEM_CAPTURE': ['Requirements Analysis', 'Stakeholder Management'],
    'PROBLEM_CLARIFICATION': ['Requirements Analysis', 'System Architecture'],
    'SOLUTION_DESIGN': ['System Architecture', 'Technical Design'],
    'IMPLEMENTATION_PLAN': ['Project Management', 'Full-Stack Development'],
    'TESTING_STRATEGY': ['Quality Assurance', 'Test Automation'],
    'DEPLOYMENT_PLAN': ['Cloud Infrastructure', 'DevOps'],
    'MONITORING_SETUP': ['Performance Analytics', 'Quality Assurance']
  };
  
  return stageExpertiseMap[stage] || [];
}