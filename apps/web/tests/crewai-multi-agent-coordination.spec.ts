import { test, expect } from '@playwright/test';
import { setupMockServer } from './utils/test-helpers';

test.describe('CrewAI Multi-Agent Coordination', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockServer(page);
  });

  test.describe('Multi-Agent Message Exchange', () => {
    test('should initiate workflow with task description and display welcome message', async ({ page }) => {
      const mockStartResponse = {
        sessionId: 'test-session-123',
        messages: [{
          id: 'welcome-1',
          content: 'Welcome! I\'ve assembled a team of expert agents to help you with your task. Our team includes:\n\n• **Business Analyst** - Requirements gathering and stakeholder analysis\n• **Solution Architect** - Technical architecture and system design\n• **Smart Planner** - Project coordination and strategic planning\n• **Developer** - Implementation and technical solutions\n• **QA Tester** - Quality assurance and testing strategies\n\nLet\'s begin by capturing your problem requirements.',
          sender: 'system',
          timestamp: Date.now(),
          agentMetadata: {
            teamComposition: [
              { agentId: 'business-analyst', agentName: 'Alex Chen', agentTitle: 'Senior Business Analyst' },
              { agentId: 'solution-architect', agentName: 'Sarah Rodriguez', agentTitle: 'Principal Solution Architect' },
              { agentId: 'smart-planner', agentName: 'Michael Thompson', agentTitle: 'Strategic Project Planner' },
              { agentId: 'developer', agentName: 'Emma Wilson', agentTitle: 'Senior Full-Stack Developer' },
              { agentId: 'qa-tester', agentName: 'David Kim', agentTitle: 'Lead QA Engineer' }
            ]
          }
        }],
        status: 'active',
        currentStage: 'PROBLEM_CAPTURE'
      };

      await page.route('**/chat/crew/start', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockStartResponse)
        });
      });

      await page.goto('/dashboard');
      await page.fill('[data-testid="chat-input"]', 'Help me design a scalable e-commerce platform');
      await page.click('[data-testid="send-button"]');

      await expect(page.locator('[data-testid="chat-message"]').last()).toContainText('Welcome! I\'ve assembled a team of expert agents');
      await expect(page.locator('[data-testid="chat-message"]').last()).toContainText('Business Analyst');
      await expect(page.locator('[data-testid="chat-message"]').last()).toContainText('Solution Architect');
      await expect(page.locator('[data-testid="current-stage"]')).toHaveText('Problem Capture');
    });

    test('should progress through agent messages step-by-step using Next message button', async ({ page }) => {
      const mockNextResponse = {
        sessionId: 'test-session-123',
        messages: [{
          id: 'agent-msg-1',
          content: 'I\'d like to understand the scope of your e-commerce platform. What are the key business requirements?\n\n• What\'s your target market size?\n• What product categories will you sell?\n• Do you need multi-vendor support?\n• What\'s your expected transaction volume?',
          sender: 'agent',
          timestamp: Date.now(),
          agentMetadata: {
            agentId: 'business-analyst',
            agentName: 'Alex Chen',
            agentTitle: 'Senior Business Analyst',
            agentDepartment: 'Strategy',
            expertise: ['Requirements Analysis', 'Stakeholder Management', 'Business Process Design']
          }
        }],
        status: 'active',
        currentStage: 'PROBLEM_CAPTURE'
      };

      await page.route('**/chat/crew/next', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockNextResponse)
        });
      });

      await page.goto('/dashboard?sessionId=test-session-123');
      await page.click('[data-testid="next-message-button"]');

      await expect(page.locator('[data-testid="agent-message"]').last()).toContainText('I\'d like to understand the scope');
      await expect(page.locator('[data-testid="agent-name"]').last()).toHaveText('Alex Chen');
      await expect(page.locator('[data-testid="agent-title"]').last()).toHaveText('Senior Business Analyst');
      await expect(page.locator('[data-testid="agent-avatar"]').last()).toHaveAttribute('data-agent-id', 'business-analyst');
    });

    test('should display agent metadata correctly in chat messages', async ({ page }) => {
      const mockAgentMessage = {
        sessionId: 'test-session-123',
        messages: [{
          id: 'agent-msg-2',
          content: 'Based on your requirements, I recommend a microservices architecture approach...',
          sender: 'agent',
          timestamp: Date.now(),
          agentMetadata: {
            agentId: 'solution-architect',
            agentName: 'Sarah Rodriguez',
            agentTitle: 'Principal Solution Architect',
            agentDepartment: 'Technical',
            expertise: ['System Architecture', 'Cloud Infrastructure', 'API Design']
          }
        }],
        status: 'active',
        currentStage: 'SOLUTION_DESIGN'
      };

      await page.route('**/chat/crew/next', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockAgentMessage)
        });
      });

      await page.goto('/dashboard?sessionId=test-session-123');
      await page.click('[data-testid="next-message-button"]');

      const agentMessage = page.locator('[data-testid="agent-message"]').last();
      await expect(agentMessage.locator('[data-testid="agent-name"]')).toHaveText('Sarah Rodriguez');
      await expect(agentMessage.locator('[data-testid="agent-title"]')).toHaveText('Principal Solution Architect');
      await expect(agentMessage.locator('[data-testid="agent-department"]')).toHaveText('Technical');
      await expect(agentMessage.locator('[data-testid="agent-avatar"]')).toHaveAttribute('data-agent-id', 'solution-architect');
    });

    test('should handle agent role rotation within workflow stages', async ({ page }) => {
      const agentSequence = [
        {
          agentId: 'business-analyst',
          agentName: 'Alex Chen',
          content: 'Let me analyze the business requirements...'
        },
        {
          agentId: 'solution-architect',
          agentName: 'Sarah Rodriguez',
          content: 'From a technical perspective, we should consider...'
        },
        {
          agentId: 'smart-planner',
          agentName: 'Michael Thompson',
          content: 'For project planning, I suggest we break this into phases...'
        }
      ];

      let requestCount = 0;
      await page.route('**/chat/crew/next', async route => {
        const agent = agentSequence[requestCount % agentSequence.length];
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            sessionId: 'test-session-123',
            messages: [{
              id: `agent-msg-${requestCount + 1}`,
              content: agent.content,
              sender: 'agent',
              timestamp: Date.now(),
              agentMetadata: {
                agentId: agent.agentId,
                agentName: agent.agentName,
                agentTitle: `${agent.agentName} Title`
              }
            }],
            status: 'active',
            currentStage: 'PROBLEM_CAPTURE'
          })
        });
        requestCount++;
      });

      await page.goto('/dashboard?sessionId=test-session-123');

      for (const agent of agentSequence) {
        await page.click('[data-testid="next-message-button"]');
        await expect(page.locator('[data-testid="agent-name"]').last()).toHaveText(agent.agentName);
        await expect(page.locator('[data-testid="agent-avatar"]').last()).toHaveAttribute('data-agent-id', agent.agentId);
      }
    });

    test('should validate message content reflects agent expertise', async ({ page }) => {
      const expertiseTests = [
        {
          agentId: 'business-analyst',
          content: 'From a business perspective, we need to identify key stakeholders and their requirements. Let me conduct a thorough business analysis...',
          keywords: ['business perspective', 'stakeholders', 'requirements', 'business analysis']
        },
        {
          agentId: 'solution-architect',
          content: 'The technical architecture should leverage microservices patterns with containerization. I recommend implementing API gateways...',
          keywords: ['technical architecture', 'microservices', 'containerization', 'API gateways']
        },
        {
          agentId: 'qa-tester',
          content: 'For quality assurance, we need comprehensive testing strategies including unit tests, integration tests, and end-to-end validation...',
          keywords: ['quality assurance', 'testing strategies', 'unit tests', 'integration tests']
        }
      ];

      for (const test of expertiseTests) {
        await page.route('**/chat/crew/next', async route => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              sessionId: 'test-session-123',
              messages: [{
                id: `expertise-test-${test.agentId}`,
                content: test.content,
                sender: 'agent',
                timestamp: Date.now(),
                agentMetadata: {
                  agentId: test.agentId,
                  agentName: 'Test Agent',
                  agentTitle: 'Test Title'
                }
              }],
              status: 'active'
            })
          });
        });

        await page.goto('/dashboard?sessionId=test-session-123');
        await page.click('[data-testid="next-message-button"]');

        const messageContent = await page.locator('[data-testid="agent-message"]').last().textContent();
        for (const keyword of test.keywords) {
          expect(messageContent?.toLowerCase()).toContain(keyword.toLowerCase());
        }
      }
    });
  });

  test.describe('Workflow Stage Progression', () => {
    test('should progress through all 7 workflow stages', async ({ page }) => {
      const stages = [
        'PROBLEM_CAPTURE',
        'PROBLEM_CLARIFICATION',
        'SOLUTION_DESIGN',
        'IMPLEMENTATION_PLAN',
        'TESTING_STRATEGY',
        'DEPLOYMENT_PLAN',
        'MONITORING_SETUP'
      ];

      let currentStageIndex = 0;

      await page.route('**/chat/crew/next', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            sessionId: 'test-session-123',
            messages: [{
              id: `stage-msg-${currentStageIndex}`,
              content: `Working on ${stages[currentStageIndex]} stage...`,
              sender: 'agent',
              timestamp: Date.now()
            }],
            status: 'active',
            currentStage: stages[currentStageIndex],
            stageProgress: Math.round(((currentStageIndex + 1) / stages.length) * 100)
          })
        });
        currentStageIndex = Math.min(currentStageIndex + 1, stages.length - 1);
      });

      await page.goto('/dashboard?sessionId=test-session-123');

      for (let i = 0; i < stages.length; i++) {
        await page.click('[data-testid="next-message-button"]');
        await expect(page.locator('[data-testid="current-stage"]')).toContainText(stages[i].replace(/_/g, ' '));
        await expect(page.locator('[data-testid="progress-bar"]')).toHaveAttribute('aria-valuenow', String(Math.round(((i + 1) / stages.length) * 100)));
      }
    });

    test('should display stage transition messages', async ({ page }) => {
      const stageTransition = {
        sessionId: 'test-session-123',
        messages: [{
          id: 'transition-msg-1',
          content: '✅ **Stage Complete: Problem Capture**\n\nGreat progress! We\'ve successfully captured all the key requirements. Moving to Problem Clarification stage...',
          sender: 'system',
          timestamp: Date.now(),
          messageType: 'stage_transition',
          stageTransition: {
            from: 'PROBLEM_CAPTURE',
            to: 'PROBLEM_CLARIFICATION',
            completionSummary: 'Successfully identified key business requirements and stakeholder needs.'
          }
        }],
        status: 'active',
        currentStage: 'PROBLEM_CLARIFICATION'
      };

      await page.route('**/chat/crew/next', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(stageTransition)
        });
      });

      await page.goto('/dashboard?sessionId=test-session-123');
      await page.click('[data-testid="next-message-button"]');

      await expect(page.locator('[data-testid="stage-transition-message"]')).toContainText('Stage Complete: Problem Capture');
      await expect(page.locator('[data-testid="stage-transition-message"]')).toContainText('Moving to Problem Clarification');
      await expect(page.locator('[data-testid="current-stage"]')).toHaveText('Problem Clarification');
    });

    test('should handle stage completion criteria and decision triggers', async ({ page }) => {
      const stageCompletionResponse = {
        sessionId: 'test-session-123',
        messages: [{
          id: 'completion-msg-1',
          content: 'Based on our analysis, we have sufficient information to proceed. All agents agree that the problem capture phase is complete.',
          sender: 'agent',
          timestamp: Date.now(),
          agentMetadata: {
            agentId: 'smart-planner',
            agentName: 'Michael Thompson',
            agentTitle: 'Strategic Project Planner'
          }
        }],
        status: 'awaiting_decision',
        currentStage: 'PROBLEM_CAPTURE',
        pending_decision: true,
        completionCriteria: {
          met: true,
          requirements: [
            'Business requirements identified',
            'Stakeholders mapped',
            'Success criteria defined'
          ]
        }
      };

      await page.route('**/chat/crew/next', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(stageCompletionResponse)
        });
      });

      await page.goto('/dashboard?sessionId=test-session-123');
      await page.click('[data-testid="next-message-button"]');

      await expect(page.locator('[data-testid="decision-buttons"]')).toBeVisible();
      await expect(page.locator('[data-testid="stage-completion-criteria"]')).toContainText('Business requirements identified');
      await expect(page.locator('[data-testid="workflow-status"]')).toHaveText('Awaiting Decision');
    });
  });

  test.describe('Decision Point Handling', () => {
    test('should display decision buttons when decision point is reached', async ({ page }) => {
      const decisionPointResponse = {
        sessionId: 'test-session-123',
        messages: [{
          id: 'decision-msg-1',
          content: 'We\'ve completed the initial analysis. Please review our findings and decide how to proceed:',
          sender: 'system',
          timestamp: Date.now()
        }],
        status: 'awaiting_decision',
        pending_decision: true,
        decisionOptions: [
          { type: 'approve', label: 'Approve & Continue', description: 'Move to next stage' },
          { type: 'refine', label: 'Refine Analysis', description: 'Request additional details' },
          { type: 'reject', label: 'Reject & Restart', description: 'Start over with different approach' },
          { type: 'pause', label: 'Pause Workflow', description: 'Save progress and continue later' }
        ]
      };

      await page.route('**/chat/crew/next', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(decisionPointResponse)
        });
      });

      await page.goto('/dashboard?sessionId=test-session-123');
      await page.click('[data-testid="next-message-button"]');

      await expect(page.locator('[data-testid="decision-approve"]')).toBeVisible();
      await expect(page.locator('[data-testid="decision-refine"]')).toBeVisible();
      await expect(page.locator('[data-testid="decision-reject"]')).toBeVisible();
      await expect(page.locator('[data-testid="decision-pause"]')).toBeVisible();

      await expect(page.locator('[data-testid="decision-approve"]')).toContainText('Approve & Continue');
      await expect(page.locator('[data-testid="decision-refine"]')).toContainText('Refine Analysis');
    });

    test('should process approve decision and advance workflow', async ({ page }) => {
      const approveDecisionResponse = {
        sessionId: 'test-session-123',
        messages: [{
          id: 'approve-msg-1',
          content: '✅ **Decision Approved**\n\nExcellent! Moving forward with the current analysis. Advancing to the next stage...',
          sender: 'system',
          timestamp: Date.now(),
          messageType: 'decision_response'
        }],
        status: 'active',
        currentStage: 'PROBLEM_CLARIFICATION',
        decision_processed: {
          type: 'approve',
          timestamp: Date.now()
        }
      };

      // First mock the status endpoint to return a decision point state
      await page.route('**/chat/crew/status/test-session-123', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            sessionId: 'test-session-123',
            status: 'awaiting_decision',
            pendingDecision: true,
            messages: [{
              id: 'decision-prompt',
              content: 'Analysis complete. Please review and make a decision.',
              sender: 'system',
              timestamp: Date.now()
            }],
            currentStage: 'PROBLEM_CAPTURE',
            decisionOptions: ['approve', 'refine', 'reject', 'pause']
          })
        });
      });

      // Then mock the decision endpoint
      await page.route('**/chat/crew/decision', async route => {
        const requestBody = await route.request().postDataJSON();
        expect(requestBody.decision).toBe('approve');
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(approveDecisionResponse)
        });
      });

      await page.goto('/dashboard?sessionId=test-session-123');
      
      await page.locator('[data-testid="decision-approve"]').waitFor();
      await page.click('[data-testid="decision-approve"]');

      await expect(page.locator('[data-testid="chat-message"]').last()).toContainText('Decision Approved');
      await expect(page.locator('[data-testid="current-stage"]')).toContainText('Problem Clarification');
      await expect(page.locator('[data-testid="workflow-status"]')).toHaveText('Active');
    });

    test('should handle refine decision and continue in current stage', async ({ page }) => {
      const refineDecisionResponse = {
        sessionId: 'test-session-123',
        messages: [{
          id: 'refine-msg-1',
          content: '🔄 **Refining Analysis**\n\nUnderstood. Our agents will provide additional details and refinements based on your feedback.',
          sender: 'system',
          timestamp: Date.now(),
          messageType: 'decision_response'
        }],
        status: 'active',
        currentStage: 'PROBLEM_CAPTURE',
        decision_processed: {
          type: 'refine',
          timestamp: Date.now(),
          refinementFocus: 'additional_requirements'
        }
      };

      await page.route('**/chat/crew/decision', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(refineDecisionResponse)
        });
      });

      await page.goto('/dashboard?sessionId=test-session-123');
      await page.locator('[data-testid="decision-refine"]').waitFor();
      await page.click('[data-testid="decision-refine"]');

      await expect(page.locator('[data-testid="chat-message"]').last()).toContainText('Refining Analysis');
      await expect(page.locator('[data-testid="current-stage"]')).toContainText('Problem Capture');
      await expect(page.locator('[data-testid="workflow-status"]')).toHaveText('Active');
    });

    test('should disable decision buttons during processing', async ({ page }) => {
      let resolveRequest: (value: any) => void;
      const requestPromise = new Promise(resolve => {
        resolveRequest = resolve;
      });

      await page.route('**/chat/crew/decision', async route => {
        await requestPromise;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ sessionId: 'test-session-123', messages: [] })
        });
      });

      await page.goto('/dashboard?sessionId=test-session-123');
      await page.locator('[data-testid="decision-approve"]').waitFor();
      
      await page.click('[data-testid="decision-approve"]');

      await expect(page.locator('[data-testid="decision-approve"]')).toBeDisabled();
      await expect(page.locator('[data-testid="decision-refine"]')).toBeDisabled();
      await expect(page.locator('[data-testid="decision-loading"]')).toBeVisible();

      resolveRequest!(true);
    });
  });

  test.describe('Real-time Status Updates', () => {
    test('should poll for progress updates every 2 seconds', async ({ page }) => {
      let pollCount = 0;
      const maxPolls = 3;

      await page.route('**/chat/progress/test-session-123', async route => {
        pollCount++;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            sessionId: 'test-session-123',
            currentStage: 'PROBLEM_CAPTURE',
            progress: pollCount * 25,
            agentStatus: {
              'business-analyst': { status: 'active', lastActivity: Date.now() },
              'solution-architect': { status: 'waiting', lastActivity: Date.now() - 30000 }
            }
          })
        });
      });

      await page.goto('/dashboard?sessionId=test-session-123');

      await page.waitForTimeout(5000);

      expect(pollCount).toBeGreaterThanOrEqual(2);
      await expect(page.locator('[data-testid="progress-bar"]')).toHaveAttribute('aria-valuenow', String(pollCount * 25));
    });

    test('should update agent status indicators in real-time', async ({ page }) => {
      const progressResponse = {
        sessionId: 'test-session-123',
        currentStage: 'PROBLEM_CAPTURE',
        progress: 50,
        agentStatus: {
          'business-analyst': { 
            status: 'active', 
            lastActivity: Date.now(),
            currentTask: 'Analyzing requirements'
          },
          'solution-architect': { 
            status: 'waiting', 
            lastActivity: Date.now() - 30000,
            currentTask: 'Awaiting analysis results'
          },
          'smart-planner': { 
            status: 'completed', 
            lastActivity: Date.now() - 60000,
            currentTask: 'Initial planning complete'
          }
        }
      };

      await page.route('**/chat/progress/test-session-123', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(progressResponse)
        });
      });

      await page.goto('/dashboard?sessionId=test-session-123');
      await page.waitForTimeout(2500);

      await expect(page.locator('[data-testid="agent-status-business-analyst"]')).toHaveAttribute('data-status', 'active');
      await expect(page.locator('[data-testid="agent-status-solution-architect"]')).toHaveAttribute('data-status', 'waiting');
      await expect(page.locator('[data-testid="agent-status-smart-planner"]')).toHaveAttribute('data-status', 'completed');

      await expect(page.locator('[data-testid="agent-task-business-analyst"]')).toContainText('Analyzing requirements');
    });
  });

  test.describe('Session Management', () => {
    test('should recover session state after page reload', async ({ page }) => {
      const sessionRecoveryResponse = {
        sessionId: 'test-session-123',
        messages: [
          {
            id: 'msg-1',
            content: 'Welcome! I\'ve assembled a team of expert agents...',
            sender: 'system',
            timestamp: Date.now() - 300000
          },
          {
            id: 'msg-2',
            content: 'Let me analyze your business requirements...',
            sender: 'agent',
            timestamp: Date.now() - 240000,
            agentMetadata: {
              agentId: 'business-analyst',
              agentName: 'Alex Chen',
              agentTitle: 'Senior Business Analyst'
            }
          }
        ],
        status: 'active',
        currentStage: 'PROBLEM_CAPTURE',
        progress: 25,
        decisionHistory: []
      };

      await page.route('**/chat/crew/status/test-session-123', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(sessionRecoveryResponse)
        });
      });

      await page.goto('/dashboard?sessionId=test-session-123');
      await page.reload();

      await expect(page.locator('[data-testid="chat-message"]')).toHaveCount(2);
      await expect(page.locator('[data-testid="current-stage"]')).toContainText('Problem Capture');
      await expect(page.locator('[data-testid="progress-bar"]')).toHaveAttribute('aria-valuenow', '25');
      await expect(page.locator('[data-testid="agent-name"]').last()).toHaveText('Alex Chen');
    });

    test('should handle session recovery errors gracefully', async ({ page }) => {
      await page.route('**/chat/crew/status/invalid-session', async route => {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'CrewAI session not found',
            code: 'SESSION_NOT_FOUND'
          })
        });
      });

      await page.goto('/dashboard?sessionId=invalid-session');

      await expect(page.locator('[data-testid="session-error"]')).toContainText('Session not found');
      await expect(page.locator('[data-testid="start-new-session-button"]')).toBeVisible();
    });
  });
});