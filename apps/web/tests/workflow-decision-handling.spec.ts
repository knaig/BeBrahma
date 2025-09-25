import { test, expect } from '@playwright/test';
import { setupTestEnvironment, cleanupTestEnvironment } from './utils/test-helpers';

test.describe('Workflow Decision Handling', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestEnvironment(page);
    await page.goto('/chat');
  });

  test.afterEach(async ({ page }) => {
    await cleanupTestEnvironment(page);
  });

  test.describe('Decision Point Detection', () => {
    test('should automatically trigger decision point when stage completion criteria are met', async ({ page }) => {
      await page.route('**/chat/crew/next', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            sessionId: 'test-session-123',
            messages: [{
              id: 'completion-msg-1',
              content: 'I\'ve completed the comprehensive business analysis. All key requirements have been identified and stakeholders mapped.',
              sender: 'agent',
              timestamp: Date.now(),
              agentMetadata: {
                agentId: 'business-analyst',
                agentName: 'Alex Chen',
                agentTitle: 'Senior Business Analyst'
              }
            }],
            status: 'awaiting_decision',
            currentStage: 'PROBLEM_CAPTURE',
            pendingDecision: true,
            stageCompletion: {
              criteriasMet: [
                'Business requirements identified',
                'Stakeholder analysis completed',
                'Success metrics defined',
                'Risk assessment conducted'
              ],
              completionPercentage: 100,
              agentConsensus: true
            }
          })
        });
      });

      await page.fill('[data-testid="task-input"]', 'Build e-commerce platform');
      await page.click('[data-testid="start-workflow-btn"]');
      await page.click('[data-testid="next-message-button"]');

      await expect(page.locator('[data-testid="decision-point"]')).toBeVisible();
      await expect(page.locator('[data-testid="stage-completion-criteria"]')).toContainText('Business requirements identified');
      await expect(page.locator('[data-testid="completion-percentage"]')).toContainText('100%');
      await expect(page.locator('[data-testid="agent-consensus-indicator"]')).toHaveAttribute('data-consensus', 'true');
    });

    test('should display decision buttons with correct styling and accessibility', async ({ page }) => {
      await page.route('**/chat/crew/next', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            sessionId: 'test-session-123',
            messages: [{
              id: 'decision-prompt-1',
              content: 'Analysis complete. Please review and decide how to proceed.',
              sender: 'system',
              timestamp: Date.now()
            }],
            status: 'awaiting_decision',
            pendingDecision: true,
            decisionOptions: [
              {
                type: 'approve',
                label: 'Approve & Continue',
                description: 'Accept the analysis and move to next stage',
                hotkey: 'A'
              },
              {
                type: 'refine',
                label: 'Request Refinement',
                description: 'Ask for additional details or improvements',
                hotkey: 'R'
              },
              {
                type: 'reject',
                label: 'Reject & Restart',
                description: 'Start over with different approach',
                hotkey: 'X'
              },
              {
                type: 'pause',
                label: 'Pause Workflow',
                description: 'Save progress and continue later',
                hotkey: 'P'
              }
            ]
          })
        });
      });

      await page.fill('[data-testid="task-input"]', 'Test project');
      await page.click('[data-testid="start-workflow-btn"]');
      await page.click('[data-testid="next-message-button"]');

      // Verify all decision buttons are present
      await expect(page.locator('[data-testid="decision-approve"]')).toBeVisible();
      await expect(page.locator('[data-testid="decision-refine"]')).toBeVisible();
      await expect(page.locator('[data-testid="decision-reject"]')).toBeVisible();
      await expect(page.locator('[data-testid="decision-pause"]')).toBeVisible();

      // Verify button labels and descriptions
      await expect(page.locator('[data-testid="decision-approve"]')).toContainText('Approve & Continue');
      await expect(page.locator('[data-testid="decision-approve-description"]')).toContainText('Accept the analysis and move to next stage');

      // Verify accessibility attributes
      await expect(page.locator('[data-testid="decision-approve"]')).toHaveAttribute('aria-label', 'Approve and continue to next stage');
      await expect(page.locator('[data-testid="decision-approve"]')).toHaveAttribute('data-hotkey', 'A');

      // Verify styling classes
      await expect(page.locator('[data-testid="decision-approve"]')).toHaveClass(/.*btn-primary.*/);
      await expect(page.locator('[data-testid="decision-refine"]')).toHaveClass(/.*btn-secondary.*/);
      await expect(page.locator('[data-testid="decision-reject"]')).toHaveClass(/.*btn-warning.*/);
    });

    test('should provide user guidance text for decision points', async ({ page }) => {
      await page.route('**/chat/crew/next', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            sessionId: 'test-session-123',
            messages: [{
              id: 'guidance-msg-1',
              content: 'Our analysis reveals a complex multi-vendor marketplace requirement. Please review the findings below.',
              sender: 'system',
              timestamp: Date.now()
            }],
            status: 'awaiting_decision',
            pendingDecision: true,
            decisionGuidance: {
              summary: 'Stage Analysis Complete',
              recommendation: 'Based on the complexity identified, we recommend proceeding with a phased approach.',
              considerations: [
                'Multi-vendor functionality requires careful planning',
                'Scalability concerns due to expected 10,000+ products',
                'Payment processing compliance requirements identified'
              ],
              nextSteps: 'Choose how you\'d like to proceed with the solution design phase.'
            }
          })
        });
      });

      await page.fill('[data-testid="task-input"]', 'Complex marketplace project');
      await page.click('[data-testid="start-workflow-btn"]');
      await page.click('[data-testid="next-message-button"]');

      // Verify guidance sections
      await expect(page.locator('[data-testid="decision-guidance"]')).toBeVisible();
      await expect(page.locator('[data-testid="decision-summary"]')).toContainText('Stage Analysis Complete');
      await expect(page.locator('[data-testid="decision-recommendation"]')).toContainText('phased approach');
      
      // Verify considerations list
      await expect(page.locator('[data-testid="decision-considerations"]')).toContainText('Multi-vendor functionality');
      await expect(page.locator('[data-testid="decision-considerations"]')).toContainText('Scalability concerns');
      await expect(page.locator('[data-testid="decision-considerations"]')).toContainText('Payment processing compliance');
      
      await expect(page.locator('[data-testid="decision-next-steps"]')).toContainText('Choose how you\'d like to proceed');
    });
  });

  test.describe('Approve Decision Flow', () => {
    test('should process approve decision and advance to next stage', async ({ page }) => {
      await page.route('**/chat/crew/decision', async route => {
        const requestBody = await route.request().postDataJSON();
        expect(requestBody.decision).toBe('approve');
        expect(requestBody.sessionId).toBe('test-session-123');

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            sessionId: 'test-session-123',
            messages: [{
              id: 'approve-response-1',
              content: '✅ **Decision Approved**\n\nExcellent! Your approval allows us to move forward with confidence. Transitioning to Problem Clarification stage...',
              sender: 'system',
              timestamp: Date.now(),
              messageType: 'decision_response'
            }],
            status: 'active',
            currentStage: 'PROBLEM_CLARIFICATION',
            stageTransition: {
              from: 'PROBLEM_CAPTURE',
              to: 'PROBLEM_CLARIFICATION',
              transitionTime: Date.now(),
              reason: 'user_approval'
            },
            progress: 25
          })
        });
      });

      // Set up decision point first
      await page.route('**/chat/crew/next', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            sessionId: 'test-session-123',
            messages: [{
              id: 'ready-for-decision',
              content: 'Analysis complete. Ready for your decision.',
              sender: 'agent',
              timestamp: Date.now()
            }],
            status: 'awaiting_decision',
            pendingDecision: true
          })
        });
      });

      await page.fill('[data-testid="task-input"]', 'Test approval flow');
      await page.click('[data-testid="start-workflow-btn"]');
      await page.click('[data-testid="next-message-button"]');

      // Click approve decision
      await page.click('[data-testid="decision-approve"]');

      // Verify approve response
      await expect(page.locator('[data-testid="decision-response-message"]').last()).toContainText('Decision Approved');
      await expect(page.locator('[data-testid="decision-response-message"]').last()).toContainText('Problem Clarification stage');

      // Verify stage progression
      await expect(page.locator('[data-testid="current-stage"]')).toContainText('Problem Clarification');
      await expect(page.locator('[data-testid="progress-bar"]')).toHaveAttribute('aria-valuenow', '25');
      await expect(page.locator('[data-testid="workflow-status"]')).toHaveText('Active');
    });

    test('should update progress state after approve decision', async ({ page }) => {
      await page.route('**/chat/crew/decision', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            sessionId: 'test-session-123',
            messages: [{
              id: 'progress-update-1',
              content: 'Stage completed successfully. Moving to Solution Design.',
              sender: 'system',
              timestamp: Date.now()
            }],
            status: 'active',
            currentStage: 'SOLUTION_DESIGN',
            progress: 43, // 3/7 stages complete
            stageProgress: {
              'PROBLEM_CAPTURE': { status: 'completed', completedAt: Date.now() },
              'PROBLEM_CLARIFICATION': { status: 'completed', completedAt: Date.now() },
              'SOLUTION_DESIGN': { status: 'in_progress', startedAt: Date.now() }
            }
          })
        });
      });

      await page.goto('/chat?sessionId=test-session-123');
      
      // Mock initial decision point
      await page.locator('[data-testid="decision-approve"]').waitFor();
      await page.click('[data-testid="decision-approve"]');

      // Verify progress updates
      await expect(page.locator('[data-testid="progress-bar"]')).toHaveAttribute('aria-valuenow', '43');
      await expect(page.locator('[data-testid="stage-status-PROBLEM_CAPTURE"]')).toHaveAttribute('data-status', 'completed');
      await expect(page.locator('[data-testid="stage-status-PROBLEM_CLARIFICATION"]')).toHaveAttribute('data-status', 'completed');
      await expect(page.locator('[data-testid="stage-status-SOLUTION_DESIGN"]')).toHaveAttribute('data-status', 'in_progress');
    });

    test('should initialize next stage with appropriate agent assignment', async ({ page }) => {
      await page.route('**/chat/crew/decision', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            sessionId: 'test-session-123',
            messages: [{
              id: 'stage-init-1',
              content: 'Transitioning to Implementation Planning stage. Assigning Developer and Smart Planner agents.',
              sender: 'system',
              timestamp: Date.now()
            }],
            status: 'active',
            currentStage: 'IMPLEMENTATION_PLAN',
            activeAgents: [
              {
                agentId: 'developer',
                agentName: 'Emma Wilson',
                agentTitle: 'Senior Full-Stack Developer',
                assignedTasks: ['Technical implementation planning', 'Architecture validation']
              },
              {
                agentId: 'smart-planner',
                agentName: 'Michael Thompson',
                agentTitle: 'Strategic Project Planner', 
                assignedTasks: ['Resource allocation', 'Timeline development']
              }
            ]
          })
        });
      });

      await page.goto('/chat?sessionId=test-session-123');
      await page.locator('[data-testid="decision-approve"]').waitFor();
      await page.click('[data-testid="decision-approve"]');

      // Verify stage initialization
      await expect(page.locator('[data-testid="current-stage"]')).toContainText('Implementation Planning');
      
      // Verify agent assignments
      await expect(page.locator('[data-testid="active-agent-developer"]')).toBeVisible();
      await expect(page.locator('[data-testid="active-agent-smart-planner"]')).toBeVisible();
      
      // Verify agent task assignments
      await expect(page.locator('[data-testid="agent-tasks-developer"]')).toContainText('Technical implementation planning');
      await expect(page.locator('[data-testid="agent-tasks-smart-planner"]')).toContainText('Resource allocation');
    });
  });

  test.describe('Refine Decision Flow', () => {
    test('should handle refine decision and continue in current stage', async ({ page }) => {
      await page.route('**/chat/crew/decision', async route => {
        const requestBody = await route.request().postDataJSON();
        expect(requestBody.decision).toBe('refine');

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            sessionId: 'test-session-123',
            messages: [{
              id: 'refine-response-1',
              content: '🔄 **Refinement Requested**\n\nUnderstood! Our agents will provide additional analysis and address your specific concerns. What aspects would you like us to focus on?',
              sender: 'system',
              timestamp: Date.now(),
              messageType: 'decision_response'
            }],
            status: 'active',
            currentStage: 'PROBLEM_CAPTURE', // Stays in same stage
            refinementMode: true,
            refinementContext: {
              previousAnalysis: 'Initial business requirements analysis',
              focusAreas: ['detailed user personas', 'competitive analysis', 'technical constraints'],
              additionalQuestions: true
            }
          })
        });
      });

      await page.goto('/chat?sessionId=test-session-123');
      await page.locator('[data-testid="decision-refine"]').waitFor();
      await page.click('[data-testid="decision-refine"]');

      // Verify refinement response
      await expect(page.locator('[data-testid="decision-response-message"]').last()).toContainText('Refinement Requested');
      await expect(page.locator('[data-testid="decision-response-message"]').last()).toContainText('additional analysis');

      // Verify stage remains same
      await expect(page.locator('[data-testid="current-stage"]')).toContainText('Problem Capture');
      await expect(page.locator('[data-testid="workflow-status"]')).toHaveText('Active');

      // Verify refinement indicators
      await expect(page.locator('[data-testid="refinement-mode-indicator"]')).toBeVisible();
      await expect(page.locator('[data-testid="refinement-context"]')).toContainText('detailed user personas');
    });

    test('should incorporate user feedback in refinement requests', async ({ page }) => {
      await page.route('**/chat/crew/decision', async route => {
        const requestBody = await route.request().postDataJSON();
        expect(requestBody.refinementFeedback).toContain('more technical details');

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            sessionId: 'test-session-123',
            messages: [{
              id: 'feedback-incorporated-1',
              content: 'Thank you for the feedback! I\'ll focus on providing more technical details in my analysis. Let me address the specific areas you mentioned.',
              sender: 'agent',
              timestamp: Date.now(),
              agentMetadata: {
                agentId: 'business-analyst',
                agentName: 'Alex Chen',
                refinementFocus: ['technical architecture considerations', 'integration requirements', 'scalability planning']
              }
            }],
            status: 'active',
            refinementInProgress: true
          })
        });
      });

      // Set up refinement feedback form
      await page.route('**/chat/crew/next', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            sessionId: 'test-session-123',
            messages: [{
              id: 'feedback-request-1',
              content: 'Ready for refinement. What specific aspects would you like us to improve?',
              sender: 'system',
              timestamp: Date.now()
            }],
            status: 'awaiting_refinement_feedback',
            refinementOptions: {
              quickFeedback: ['Add more technical details', 'Include cost analysis', 'Focus on scalability'],
              customFeedback: true
            }
          })
        });
      });

      await page.goto('/chat?sessionId=test-session-123');
      await page.click('[data-testid="next-message-button"]');

      // Select quick feedback option
      await page.click('[data-testid="quick-feedback-technical"]');
      
      // Add custom feedback
      await page.fill('[data-testid="custom-feedback-input"]', 'Please include more technical details about API design and database architecture');
      
      await page.click('[data-testid="submit-refinement-feedback"]');

      // Verify feedback incorporation
      await expect(page.locator('[data-testid="agent-message"]').last()).toContainText('more technical details');
      await expect(page.locator('[data-testid="refinement-focus"]')).toContainText('technical architecture considerations');
    });

    test('should generate enhanced agent contributions during refinement', async ({ page }) => {
      await page.route('**/chat/crew/next', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            sessionId: 'test-session-123',
            messages: [{
              id: 'enhanced-analysis-1',
              content: 'Based on your refinement request, I\'ve conducted deeper analysis:\n\n**Enhanced Business Analysis:**\n• Detailed user journey mapping\n• Comprehensive competitor feature analysis\n• Advanced market segmentation\n• ROI projections with sensitivity analysis\n\n**Technical Considerations Added:**\n• API rate limiting requirements\n• Database sharding strategies\n• CDN and caching architecture\n• Security compliance framework',
              sender: 'agent',
              timestamp: Date.now(),
              agentMetadata: {
                agentId: 'business-analyst',
                agentName: 'Alex Chen',
                enhancementLevel: 'detailed',
                refinementAreas: ['user_experience', 'competitive_analysis', 'technical_requirements']
              }
            }],
            status: 'awaiting_decision',
            pendingDecision: true,
            refinementComplete: true
          })
        });
      });

      await page.goto('/chat?sessionId=test-session-123');
      await page.click('[data-testid="next-message-button"]');

      // Verify enhanced content
      const messageContent = await page.locator('[data-testid="agent-message"]').last().textContent();
      expect(messageContent).toContain('Enhanced Business Analysis');
      expect(messageContent).toContain('Technical Considerations Added');
      expect(messageContent).toContain('user journey mapping');
      expect(messageContent).toContain('API rate limiting');

      // Verify refinement indicators
      await expect(page.locator('[data-testid="enhancement-level"]')).toHaveText('detailed');
      await expect(page.locator('[data-testid="refinement-complete-indicator"]')).toBeVisible();
    });
  });

  test.describe('Reject Decision Flow', () => {
    test('should handle reject decision with workflow rollback', async ({ page }) => {
      await page.route('**/chat/crew/decision', async route => {
        const requestBody = await route.request().postDataJSON();
        expect(requestBody.decision).toBe('reject');

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            sessionId: 'test-session-123',
            messages: [{
              id: 'reject-response-1',
              content: '↩️ **Analysis Rejected**\n\nI understand the current approach doesn\'t meet your needs. Let\'s start over with a different strategy. What specific direction would you like us to take?',
              sender: 'system',
              timestamp: Date.now(),
              messageType: 'decision_response'
            }],
            status: 'restarting',
            currentStage: 'PROBLEM_CAPTURE',
            rollbackPerformed: true,
            restartOptions: [
              { approach: 'technical_first', label: 'Start with Technical Analysis' },
              { approach: 'market_first', label: 'Focus on Market Research First' },
              { approach: 'user_first', label: 'Begin with User Experience Design' }
            ]
          })
        });
      });

      await page.goto('/chat?sessionId=test-session-123');
      await page.locator('[data-testid="decision-reject"]').waitFor();
      await page.click('[data-testid="decision-reject"]');

      // Verify rejection response
      await expect(page.locator('[data-testid="decision-response-message"]').last()).toContainText('Analysis Rejected');
      await expect(page.locator('[data-testid="decision-response-message"]').last()).toContainText('start over with a different strategy');

      // Verify workflow status
      await expect(page.locator('[data-testid="workflow-status"]')).toHaveText('Restarting');
      await expect(page.locator('[data-testid="rollback-indicator"]')).toBeVisible();

      // Verify restart options
      await expect(page.locator('[data-testid="restart-option-technical_first"]')).toContainText('Start with Technical Analysis');
      await expect(page.locator('[data-testid="restart-option-market_first"]')).toContainText('Focus on Market Research First');
      await expect(page.locator('[data-testid="restart-option-user_first"]')).toContainText('Begin with User Experience Design');
    });

    test('should provide user guidance for alternative approaches', async ({ page }) => {
      await page.route('**/chat/crew/decision', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            sessionId: 'test-session-123',
            messages: [{
              id: 'guidance-response-1',
              content: 'Let\'s try a different approach that better aligns with your vision.',
              sender: 'system',
              timestamp: Date.now()
            }],
            status: 'awaiting_restart_selection',
            alternativeApproaches: {
              recommendations: [
                {
                  approach: 'lean_startup',
                  title: 'Lean Startup Methodology',
                  description: 'Focus on MVP development with rapid iteration based on user feedback',
                  benefits: ['Faster time to market', 'Lower initial risk', 'User-validated features'],
                  suitableFor: 'Early stage startups with limited resources'
                },
                {
                  approach: 'enterprise_first',
                  title: 'Enterprise-Grade Architecture',
                  description: 'Build robust, scalable system from the start',
                  benefits: ['High scalability', 'Enterprise security', 'Long-term stability'],
                  suitableFor: 'Large organizations with complex requirements'
                }
              ]
            }
          })
        });
      });

      await page.goto('/chat?sessionId=test-session-123');
      await page.click('[data-testid="decision-reject"]');

      // Verify alternative approaches are presented
      await expect(page.locator('[data-testid="alternative-approaches"]')).toBeVisible();
      
      // Verify approach details
      await expect(page.locator('[data-testid="approach-lean_startup"]')).toContainText('Lean Startup Methodology');
      await expect(page.locator('[data-testid="approach-description-lean_startup"]')).toContainText('rapid iteration');
      await expect(page.locator('[data-testid="approach-benefits-lean_startup"]')).toContainText('Faster time to market');
      
      await expect(page.locator('[data-testid="approach-enterprise_first"]')).toContainText('Enterprise-Grade Architecture');
      await expect(page.locator('[data-testid="approach-suitable-enterprise_first"]')).toContainText('Large organizations');
    });
  });

  test.describe('Pause Decision Flow', () => {
    test('should handle pause decision and preserve workflow state', async ({ page }) => {
      await page.route('**/chat/crew/decision', async route => {
        const requestBody = await route.request().postDataJSON();
        expect(requestBody.decision).toBe('pause');

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            sessionId: 'test-session-123',
            messages: [{
              id: 'pause-response-1',
              content: '⏸️ **Workflow Paused**\n\nYour progress has been saved. You can resume this workflow anytime by returning to this session. All analysis and decisions will be preserved.',
              sender: 'system',
              timestamp: Date.now(),
              messageType: 'decision_response'
            }],
            status: 'paused',
            currentStage: 'PROBLEM_CAPTURE',
            pausedAt: Date.now(),
            resumeInstructions: 'Click "Resume Workflow" to continue where you left off'
          })
        });
      });

      await page.goto('/chat?sessionId=test-session-123');
      await page.locator('[data-testid="decision-pause"]').waitFor();
      await page.click('[data-testid="decision-pause"]');

      // Verify pause response
      await expect(page.locator('[data-testid="decision-response-message"]').last()).toContainText('Workflow Paused');
      await expect(page.locator('[data-testid="decision-response-message"]').last()).toContainText('progress has been saved');

      // Verify workflow status
      await expect(page.locator('[data-testid="workflow-status"]')).toHaveText('Paused');
      await expect(page.locator('[data-testid="pause-indicator"]')).toBeVisible();
      await expect(page.locator('[data-testid="resume-instructions"]')).toContainText('Click "Resume Workflow"');
    });

    test('should display pause message and session status', async ({ page }) => {
      await page.route('**/chat/crew/status/test-session-123', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            sessionId: 'test-session-123',
            status: 'paused',
            currentStage: 'SOLUTION_DESIGN',
            pausedAt: Date.now() - 3600000, // 1 hour ago
            messages: [
              {
                id: 'msg-1',
                content: 'Previous analysis results...',
                sender: 'agent',
                timestamp: Date.now() - 7200000
              }
            ],
            resumeAvailable: true,
            sessionSummary: {
              stagesCompleted: ['PROBLEM_CAPTURE', 'PROBLEM_CLARIFICATION'],
              currentProgress: 35,
              lastActivity: Date.now() - 3600000
            }
          })
        });
      });

      await page.goto('/chat?sessionId=test-session-123');

      // Verify paused session display
      await expect(page.locator('[data-testid="session-status"]')).toHaveText('Paused');
      await expect(page.locator('[data-testid="pause-duration"]')).toContainText('1 hour ago');
      await expect(page.locator('[data-testid="resume-button"]')).toBeVisible();

      // Verify session summary
      await expect(page.locator('[data-testid="session-progress"]')).toHaveAttribute('aria-valuenow', '35');
      await expect(page.locator('[data-testid="completed-stages"]')).toContainText('Problem Capture');
      await expect(page.locator('[data-testid="completed-stages"]')).toContainText('Problem Clarification');
    });

    test('should enable workflow resumption functionality', async ({ page }) => {
      await page.route('**/chat/crew/resume', async route => {
        const requestBody = await route.request().postDataJSON();
        expect(requestBody.sessionId).toBe('test-session-123');

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            sessionId: 'test-session-123',
            messages: [{
              id: 'resume-response-1',
              content: '▶️ **Workflow Resumed**\n\nWelcome back! Continuing from where you left off in the Solution Design stage.',
              sender: 'system',
              timestamp: Date.now(),
              messageType: 'resume_response'
            }],
            status: 'active',
            currentStage: 'SOLUTION_DESIGN',
            resumedAt: Date.now(),
            contextRestored: true
          })
        });
      });

      await page.goto('/chat?sessionId=test-session-123');
      await page.locator('[data-testid="resume-button"]').waitFor();
      await page.click('[data-testid="resume-button"]');

      // Verify resume response
      await expect(page.locator('[data-testid="resume-message"]').last()).toContainText('Workflow Resumed');
      await expect(page.locator('[data-testid="resume-message"]').last()).toContainText('Solution Design stage');

      // Verify workflow is active again
      await expect(page.locator('[data-testid="workflow-status"]')).toHaveText('Active');
      await expect(page.locator('[data-testid="pause-indicator"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="context-restored-indicator"]')).toBeVisible();
    });
  });

  test.describe('Decision State Management', () => {
    test('should disable decision buttons during API processing', async ({ page }) => {
      let requestResolve: (value: any) => void;
      const requestPromise = new Promise(resolve => {
        requestResolve = resolve;
      });

      await page.route('**/chat/crew/decision', async route => {
        // Hold the request until we resolve it
        await requestPromise;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            sessionId: 'test-session-123',
            messages: [{ id: 'processed', content: 'Decision processed', sender: 'system', timestamp: Date.now() }],
            status: 'active'
          })
        });
      });

      await page.goto('/chat?sessionId=test-session-123');
      await page.locator('[data-testid="decision-approve"]').waitFor();

      // Click approve and immediately check button states
      await page.click('[data-testid="decision-approve"]');

      // Verify buttons are disabled
      await expect(page.locator('[data-testid="decision-approve"]')).toBeDisabled();
      await expect(page.locator('[data-testid="decision-refine"]')).toBeDisabled();
      await expect(page.locator('[data-testid="decision-reject"]')).toBeDisabled();
      await expect(page.locator('[data-testid="decision-pause"]')).toBeDisabled();

      // Verify loading indicator
      await expect(page.locator('[data-testid="decision-loading"]')).toBeVisible();
      await expect(page.locator('[data-testid="decision-loading-text"]')).toContainText('Processing decision...');

      // Resolve the request
      requestResolve!(true);

      // Wait for processing to complete
      await page.waitForTimeout(1000);

      // Verify buttons are re-enabled (if still in decision state)
      // or hidden (if decision processed)
      const buttonsVisible = await page.locator('[data-testid="decision-buttons"]').isVisible();
      if (!buttonsVisible) {
        await expect(page.locator('[data-testid="decision-loading"]')).not.toBeVisible();
      }
    });

    test('should handle decision errors and provide retry options', async ({ page }) => {
      let attemptCount = 0;

      await page.route('**/chat/crew/decision', async route => {
        attemptCount++;
        
        if (attemptCount === 1) {
          // First attempt fails
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Decision processing failed',
              code: 'DECISION_ERROR',
              retryable: true
            })
          });
        } else {
          // Second attempt succeeds
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              sessionId: 'test-session-123',
              messages: [{ id: 'success', content: 'Decision processed successfully', sender: 'system', timestamp: Date.now() }],
              status: 'active'
            })
          });
        }
      });

      await page.goto('/chat?sessionId=test-session-123');
      await page.locator('[data-testid="decision-approve"]').waitFor();
      await page.click('[data-testid="decision-approve"]');

      // Verify error message appears
      await expect(page.locator('[data-testid="decision-error"]')).toContainText('Decision processing failed');
      await expect(page.locator('[data-testid="decision-retry-btn"]')).toBeVisible();

      // Click retry
      await page.click('[data-testid="decision-retry-btn"]');

      // Verify success on retry
      await expect(page.locator('[data-testid="chat-message"]').last()).toContainText('Decision processed successfully');
      await expect(page.locator('[data-testid="decision-error"]')).not.toBeVisible();
    });

    test('should track decision history and provide audit trail', async ({ page }) => {
      const decisions = [
        { stage: 'PROBLEM_CAPTURE', decision: 'approve', timestamp: Date.now() - 300000 },
        { stage: 'PROBLEM_CLARIFICATION', decision: 'refine', timestamp: Date.now() - 180000 },
        { stage: 'PROBLEM_CLARIFICATION', decision: 'approve', timestamp: Date.now() - 60000 }
      ];

      await page.route('**/chat/crew/status/test-session-123', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            sessionId: 'test-session-123',
            status: 'active',
            currentStage: 'SOLUTION_DESIGN',
            decisionHistory: decisions,
            messages: []
          })
        });
      });

      await page.goto('/chat?sessionId=test-session-123');

      // Access decision history
      await page.click('[data-testid="decision-history-toggle"]');

      // Verify decision history display
      await expect(page.locator('[data-testid="decision-history"]')).toBeVisible();
      await expect(page.locator('[data-testid="decision-history-item"]')).toHaveCount(3);

      // Verify decision details
      await expect(page.locator('[data-testid="decision-history-item"]').first()).toContainText('Problem Capture');
      await expect(page.locator('[data-testid="decision-history-item"]').first()).toContainText('Approved');
      await expect(page.locator('[data-testid="decision-history-item"]').first()).toContainText('5 minutes ago');

      // Verify refinement decision
      const refinementDecision = page.locator('[data-testid="decision-history-item"]').nth(1);
      await expect(refinementDecision).toContainText('Problem Clarification');
      await expect(refinementDecision).toContainText('Refinement Requested');
    });
  });

  test.describe('Keyboard Navigation for Decisions', () => {
    test('should support keyboard shortcuts for decision actions', async ({ page }) => {
      await page.route('**/chat/crew/decision', async route => {
        const requestBody = await route.request().postDataJSON();
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            sessionId: 'test-session-123',
            messages: [{
              id: 'keyboard-response',
              content: `Decision "${requestBody.decision}" processed via keyboard shortcut`,
              sender: 'system',
              timestamp: Date.now()
            }],
            status: 'active'
          })
        });
      });

      await page.goto('/chat?sessionId=test-session-123');
      await page.locator('[data-testid="decision-buttons"]').waitFor();

      // Test approve shortcut (A key)
      await page.keyboard.press('KeyA');
      await expect(page.locator('[data-testid="chat-message"]').last()).toContainText('Decision "approve" processed');

      // Reset decision state for next test
      await page.reload();
      await page.locator('[data-testid="decision-buttons"]').waitFor();

      // Test refine shortcut (R key)
      await page.keyboard.press('KeyR');
      await expect(page.locator('[data-testid="chat-message"]').last()).toContainText('Decision "refine" processed');
    });

    test('should show keyboard shortcut hints in UI', async ({ page }) => {
      await page.route('**/chat/crew/next', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            sessionId: 'test-session-123',
            messages: [{
              id: 'decision-prompt',
              content: 'Ready for your decision.',
              sender: 'system',
              timestamp: Date.now()
            }],
            status: 'awaiting_decision',
            pendingDecision: true,
            keyboardHintsEnabled: true
          })
        });
      });

      await page.goto('/chat?sessionId=test-session-123');
      await page.click('[data-testid="next-message-button"]');

      // Verify keyboard hints are displayed
      await expect(page.locator('[data-testid="keyboard-hint-approve"]')).toContainText('Press A');
      await expect(page.locator('[data-testid="keyboard-hint-refine"]')).toContainText('Press R');
      await expect(page.locator('[data-testid="keyboard-hint-reject"]')).toContainText('Press X');
      await expect(page.locator('[data-testid="keyboard-hint-pause"]')).toContainText('Press P');

      // Verify hints have proper styling
      await expect(page.locator('[data-testid="keyboard-hint-approve"]')).toHaveClass(/.*keyboard-hint.*/);
    });

    test('should only accept keyboard shortcuts when decision points are active', async ({ page }) => {
      let decisionProcessed = false;

      await page.route('**/chat/crew/decision', async route => {
        decisionProcessed = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            sessionId: 'test-session-123',
            messages: [{ id: 'processed', content: 'Decision processed', sender: 'system', timestamp: Date.now() }],
            status: 'active'
          })
        });
      });

      await page.goto('/chat?sessionId=test-session-123');

      // Try keyboard shortcut when no decision point is active
      await page.keyboard.press('KeyA');
      await page.waitForTimeout(1000);
      
      // Should not have processed decision
      expect(decisionProcessed).toBe(false);

      // Set up decision point
      await page.locator('[data-testid="decision-buttons"]').waitFor();

      // Now keyboard shortcut should work
      await page.keyboard.press('KeyA');
      await page.waitForTimeout(1000);
      
      // Should have processed decision
      expect(decisionProcessed).toBe(true);
    });
  });
});