import { test, expect } from '@playwright/test';
import { setupMockServer } from './utils/test-helpers';

test.describe('Real-time Agent Status Updates', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockServer(page);
  });

  test.describe('Progress Polling Mechanism', () => {
    test('should start automatic progress polling when workflow session begins', async ({ page }) => {
      let pollCount = 0;
      const sessionId = 'test-session-123';

      // Mock the progress polling endpoint
      await page.route(`**/chat/progress/${sessionId}`, async route => {
        pollCount++;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            progressState: {
              sessionId,
              currentStage: 'PROBLEM_CAPTURE',
              progress: Math.min(pollCount * 10, 100),
              agentStatus: {
                'business-analyst': { 
                  status: 'active', 
                  lastActivity: Date.now(),
                  currentTask: `Processing step ${pollCount}`
                }
              },
              timestamp: Date.now()
            }
          })
        });
      });

      // Mock session start to trigger polling
      await page.route('**/chat/crew/start', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            sessionId,
            messages: [{
              id: 'welcome-1',
              content: 'Welcome! Starting workflow...',
              sender: 'system',
              timestamp: Date.now()
            }],
            status: 'active',
            currentStage: 'PROBLEM_CAPTURE'
          })
        });
      });

      await page.goto('/dashboard');
      await page.fill('[data-testid="chat-input"]', 'Test workflow');
      await page.click('[data-testid="send-button"]');

      // Wait for progress indicator to show polling has begun
      await expect(page.locator('[data-testid="progress-bar"]')).toHaveAttribute('aria-valuenow', /[1-9]\d*/);

      // Verify polling occurred multiple times
      expect(pollCount).toBeGreaterThanOrEqual(2);
      
      // Verify progress updates are reflected in UI
      const progressValue = await page.locator('[data-testid="progress-bar"]').getAttribute('aria-valuenow');
      expect(parseInt(progressValue!)).toBeGreaterThan(0);
    });

    test('should maintain consistent 2-second polling intervals', async ({ page }) => {
      const pollTimestamps: number[] = [];
      const sessionId = 'test-session-123';

      await page.route(`**/chat/progress/${sessionId}`, async route => {
        pollTimestamps.push(Date.now());
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            progressState: {
              sessionId,
              currentStage: 'PROBLEM_CAPTURE',
              progress: 25,
              agentStatus: {},
              timestamp: Date.now()
            }
          })
        });
      });

      await page.goto(`/dashboard?sessionId=${sessionId}`);

      // Wait for at least 3 polling cycles to occur by checking poll count
      await expect.poll(() => pollTimestamps.length).toBeGreaterThanOrEqual(3);

      // Calculate intervals between polls
      const intervals = [];
      for (let i = 1; i < pollTimestamps.length; i++) {
        intervals.push(pollTimestamps[i] - pollTimestamps[i - 1]);
      }

      // Verify intervals are approximately 2 seconds (allow 500ms tolerance)
      for (const interval of intervals) {
        expect(interval).toBeGreaterThan(1500);
        expect(interval).toBeLessThan(2500);
      }
    });

    test('should stop polling when workflow completes', async ({ page }) => {
      let pollCount = 0;
      const sessionId = 'test-session-123';

      await page.route(`**/chat/progress/${sessionId}`, async route => {
        pollCount++;
        const isCompleted = pollCount > 3;
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            progressState: {
              sessionId,
              currentStage: isCompleted ? 'MONITORING_SETUP' : 'PROBLEM_CAPTURE',
              progress: isCompleted ? 100 : pollCount * 25,
              status: isCompleted ? 'completed' : 'active',
              agentStatus: {},
              timestamp: Date.now()
            }
          })
        });
      });

      await page.goto(`/dashboard?sessionId=${sessionId}`);

      // Wait for workflow status to show completed
      await expect(page.locator('[data-testid="workflow-status"]')).toHaveText('Completed');

      const finalPollCount = pollCount;
      
      // Wait for additional polling cycles to confirm polling stopped
      await expect.poll(() => pollCount, { intervals: [1000, 1000, 1000] }).toBe(finalPollCount);
      
      // Polling should have stopped after completion
      expect(pollCount).toBe(finalPollCount);
    });

    test('should handle polling errors gracefully', async ({ page }) => {
      let errorCount = 0;
      const sessionId = 'test-session-123';

      await page.route(`**/chat/progress/${sessionId}`, async route => {
        errorCount++;
        if (errorCount <= 2) {
          // First two requests fail
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Internal server error' })
          });
        } else {
          // Subsequent requests succeed
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              progressState: {
                sessionId,
                currentStage: 'PROBLEM_CAPTURE',
                progress: 30,
                agentStatus: {},
                timestamp: Date.now()
              }
            })
          });
        }
      });

      await page.goto(`/dashboard?sessionId=${sessionId}`);

      // Wait for error recovery by checking progress updates after errors
      await expect(page.locator('[data-testid="progress-bar"]')).toHaveAttribute('aria-valuenow', '30');

      // Should continue polling after errors
      expect(errorCount).toBeGreaterThan(2);
    });
  });

  test.describe('Agent Status Updates', () => {
    test('should display real-time agent activity status', async ({ page }) => {
      const sessionId = 'test-session-123';
      let updateCount = 0;

      const agentStatuses = [
        {
          'business-analyst': { status: 'active', currentTask: 'Analyzing requirements' },
          'solution-architect': { status: 'waiting', currentTask: 'Awaiting analysis' },
          'smart-planner': { status: 'completed', currentTask: 'Planning complete' }
        },
        {
          'business-analyst': { status: 'completed', currentTask: 'Analysis complete' },
          'solution-architect': { status: 'active', currentTask: 'Designing architecture' },
          'smart-planner': { status: 'completed', currentTask: 'Planning complete' }
        }
      ];

      await page.route(`**/chat/progress/${sessionId}`, async route => {
        const statusIndex = Math.min(updateCount, agentStatuses.length - 1);
        updateCount++;

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            progressState: {
              sessionId,
              currentStage: 'PROBLEM_CAPTURE',
              progress: updateCount * 25,
              agentStatus: agentStatuses[statusIndex],
              timestamp: Date.now()
            }
          })
        });
      });

      await page.goto(`/dashboard?sessionId=${sessionId}`);

      // Wait for first status update
      await page.waitForTimeout(2500);

      await expect(page.locator('[data-testid="agent-status-business-analyst"]')).toHaveAttribute('data-status', 'active');
      await expect(page.locator('[data-testid="agent-status-solution-architect"]')).toHaveAttribute('data-status', 'waiting');
      await expect(page.locator('[data-testid="agent-status-smart-planner"]')).toHaveAttribute('data-status', 'completed');

      // Wait for second status update
      await page.waitForTimeout(2500);

      await expect(page.locator('[data-testid="agent-status-business-analyst"]')).toHaveAttribute('data-status', 'completed');
      await expect(page.locator('[data-testid="agent-status-solution-architect"]')).toHaveAttribute('data-status', 'active');
    });

    test('should update agent task descriptions in real-time', async ({ page }) => {
      const sessionId = 'test-session-123';
      
      const taskProgression = [
        { task: 'Initializing analysis', progress: 10 },
        { task: 'Gathering requirements', progress: 30 },
        { task: 'Analyzing stakeholders', progress: 60 },
        { task: 'Finalizing analysis', progress: 90 },
        { task: 'Analysis complete', progress: 100 }
      ];

      let taskIndex = 0;

      await page.route(`**/chat/progress/${sessionId}`, async route => {
        const currentTask = taskProgression[taskIndex % taskProgression.length];
        taskIndex++;

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            progressState: {
              sessionId,
              currentStage: 'PROBLEM_CAPTURE',
              progress: currentTask.progress,
              agentStatus: {
                'business-analyst': {
                  status: currentTask.progress < 100 ? 'active' : 'completed',
                  currentTask: currentTask.task,
                  taskProgress: currentTask.progress,
                  lastActivity: Date.now()
                }
              },
              timestamp: Date.now()
            }
          })
        });
      });

      await page.goto(`/dashboard?sessionId=${sessionId}`);

      // Test task progression updates
      for (let i = 0; i < Math.min(3, taskProgression.length); i++) {
        await page.waitForTimeout(2500);
        
        const expectedTask = taskProgression[i];
        await expect(page.locator('[data-testid="agent-task-business-analyst"]'))
          .toContainText(expectedTask.task);
        await expect(page.locator('[data-testid="agent-progress-business-analyst"]'))
          .toHaveAttribute('aria-valuenow', String(expectedTask.progress));
      }
    });

    test('should display agent last activity timestamps', async ({ page }) => {
      const sessionId = 'test-session-123';
      const now = Date.now();

      await page.route(`**/chat/progress/${sessionId}`, async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            progressState: {
              sessionId,
              currentStage: 'PROBLEM_CAPTURE',
              progress: 50,
              agentStatus: {
                'business-analyst': {
                  status: 'active',
                  lastActivity: now,
                  currentTask: 'Current analysis'
                },
                'solution-architect': {
                  status: 'waiting',
                  lastActivity: now - 60000, // 1 minute ago
                  currentTask: 'Waiting for requirements'
                },
                'smart-planner': {
                  status: 'completed',
                  lastActivity: now - 300000, // 5 minutes ago
                  currentTask: 'Planning completed'
                }
              },
              timestamp: Date.now()
            }
          })
        });
      });

      await page.goto(`/dashboard?sessionId=${sessionId}`);
      await page.waitForTimeout(2500);

      // Check relative time display
      await expect(page.locator('[data-testid="agent-last-activity-business-analyst"]'))
        .toContainText('just now');
      await expect(page.locator('[data-testid="agent-last-activity-solution-architect"]'))
        .toContainText('1 minute ago');
      await expect(page.locator('[data-testid="agent-last-activity-smart-planner"]'))
        .toContainText('5 minutes ago');
    });

    test('should handle multiple agents with different statuses simultaneously', async ({ page }) => {
      const sessionId = 'test-session-123';

      await page.route(`**/chat/progress/${sessionId}`, async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            progressState: {
              sessionId,
              currentStage: 'SOLUTION_DESIGN',
              progress: 65,
              agentStatus: {
                'business-analyst': {
                  status: 'completed',
                  currentTask: 'Requirements analysis complete',
                  lastActivity: Date.now() - 120000
                },
                'solution-architect': {
                  status: 'active',
                  currentTask: 'Designing system architecture',
                  taskProgress: 75,
                  lastActivity: Date.now()
                },
                'smart-planner': {
                  status: 'active',
                  currentTask: 'Creating implementation roadmap',
                  taskProgress: 50,
                  lastActivity: Date.now() - 30000
                },
                'developer': {
                  status: 'waiting',
                  currentTask: 'Awaiting architecture design',
                  lastActivity: Date.now() - 300000
                },
                'qa-tester': {
                  status: 'idle',
                  currentTask: 'Ready for testing phase',
                  lastActivity: Date.now() - 600000
                }
              },
              timestamp: Date.now()
            }
          })
        });
      });

      await page.goto(`/dashboard?sessionId=${sessionId}`);
      await page.waitForTimeout(2500);

      // Verify all agent statuses are displayed correctly
      await expect(page.locator('[data-testid="agent-status-business-analyst"]')).toHaveAttribute('data-status', 'completed');
      await expect(page.locator('[data-testid="agent-status-solution-architect"]')).toHaveAttribute('data-status', 'active');
      await expect(page.locator('[data-testid="agent-status-smart-planner"]')).toHaveAttribute('data-status', 'active');
      await expect(page.locator('[data-testid="agent-status-developer"]')).toHaveAttribute('data-status', 'waiting');
      await expect(page.locator('[data-testid="agent-status-qa-tester"]')).toHaveAttribute('data-status', 'idle');

      // Verify task descriptions
      await expect(page.locator('[data-testid="agent-task-solution-architect"]')).toContainText('Designing system architecture');
      await expect(page.locator('[data-testid="agent-task-smart-planner"]')).toContainText('Creating implementation roadmap');

      // Verify active agents have progress indicators
      await expect(page.locator('[data-testid="agent-progress-solution-architect"]')).toHaveAttribute('aria-valuenow', '75');
      await expect(page.locator('[data-testid="agent-progress-smart-planner"]')).toHaveAttribute('aria-valuenow', '50');
    });
  });

  test.describe('Workflow Progress Tracking', () => {
    test('should calculate and display overall progress percentage across workflow stages', async ({ page }) => {
      const sessionId = 'test-session-123';
      const stages = ['PROBLEM_CAPTURE', 'PROBLEM_CLARIFICATION', 'SOLUTION_DESIGN', 'IMPLEMENTATION_PLAN', 'TESTING_STRATEGY', 'DEPLOYMENT_PLAN', 'MONITORING_SETUP'];
      
      let currentStageIndex = 0;

      await page.route(`**/chat/progress/${sessionId}`, async route => {
        const overallProgress = Math.round(((currentStageIndex + 0.5) / stages.length) * 100);
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            progressState: {
              sessionId,
              currentStage: stages[currentStageIndex],
              progress: overallProgress,
              stageProgress: {
                currentStage: stages[currentStageIndex],
                stageIndex: currentStageIndex,
                totalStages: stages.length,
                overallProgress
              },
              agentStatus: {},
              timestamp: Date.now()
            }
          })
        });
        
        currentStageIndex = Math.min(currentStageIndex + 1, stages.length - 1);
      });

      await page.goto(`/dashboard?sessionId=${sessionId}`);

      // Test progress updates through multiple stages
      for (let i = 0; i < 4; i++) {
        await page.waitForTimeout(2500);
        
        const expectedProgress = Math.round(((i + 0.5) / stages.length) * 100);
        await expect(page.locator('[data-testid="overall-progress"]')).toHaveAttribute('aria-valuenow', String(expectedProgress));
        await expect(page.locator('[data-testid="progress-percentage"]')).toContainText(`${expectedProgress}%`);
      }
    });

    test('should update stage-specific progress indicators', async ({ page }) => {
      const sessionId = 'test-session-123';

      await page.route(`**/chat/progress/${sessionId}`, async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            progressState: {
              sessionId,
              currentStage: 'SOLUTION_DESIGN',
              progress: 60,
              stageProgress: {
                'PROBLEM_CAPTURE': { status: 'completed', progress: 100 },
                'PROBLEM_CLARIFICATION': { status: 'completed', progress: 100 },
                'SOLUTION_DESIGN': { status: 'in_progress', progress: 75 },
                'IMPLEMENTATION_PLAN': { status: 'not_started', progress: 0 },
                'TESTING_STRATEGY': { status: 'not_started', progress: 0 },
                'DEPLOYMENT_PLAN': { status: 'not_started', progress: 0 },
                'MONITORING_SETUP': { status: 'not_started', progress: 0 }
              },
              agentStatus: {},
              timestamp: Date.now()
            }
          })
        });
      });

      await page.goto(`/dashboard?sessionId=${sessionId}`);
      await page.waitForTimeout(2500);

      // Verify stage status indicators
      await expect(page.locator('[data-testid="stage-status-PROBLEM_CAPTURE"]')).toHaveAttribute('data-status', 'completed');
      await expect(page.locator('[data-testid="stage-status-PROBLEM_CLARIFICATION"]')).toHaveAttribute('data-status', 'completed');
      await expect(page.locator('[data-testid="stage-status-SOLUTION_DESIGN"]')).toHaveAttribute('data-status', 'in_progress');
      await expect(page.locator('[data-testid="stage-status-IMPLEMENTATION_PLAN"]')).toHaveAttribute('data-status', 'not_started');

      // Verify progress bars for each stage
      await expect(page.locator('[data-testid="stage-progress-SOLUTION_DESIGN"]')).toHaveAttribute('aria-valuenow', '75');
    });

    test('should synchronize progress state between polling and user actions', async ({ page }) => {
      const sessionId = 'test-session-123';
      let pollingProgress = 30;
      let userActionOccurred = false;

      await page.route(`**/chat/progress/${sessionId}`, async route => {
        // Simulate progress increase after user action
        if (userActionOccurred) {
          pollingProgress = 60;
        }
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            progressState: {
              sessionId,
              currentStage: 'PROBLEM_CAPTURE',
              progress: pollingProgress,
              agentStatus: {},
              timestamp: Date.now()
            }
          })
        });
      });

      await page.route('**/chat/crew/next', async route => {
        userActionOccurred = true;
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            sessionId,
            messages: [{
              id: 'action-response-1',
              content: 'Processing your request...',
              sender: 'agent',
              timestamp: Date.now()
            }],
            status: 'active',
            progress: 60
          })
        });
      });

      await page.goto(`/dashboard?sessionId=${sessionId}`);

      // Wait for initial polling
      await page.waitForTimeout(2500);
      await expect(page.locator('[data-testid="progress-bar"]')).toHaveAttribute('aria-valuenow', '30');

      // Trigger user action
      await page.click('[data-testid="next-message-button"]');

      // Wait for polling to sync with user action
      await page.waitForTimeout(2500);
      await expect(page.locator('[data-testid="progress-bar"]')).toHaveAttribute('aria-valuenow', '60');
    });

    test('should handle progress state during decision points', async ({ page }) => {
      const sessionId = 'test-session-123';

      await page.route(`**/chat/progress/${sessionId}`, async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            progressState: {
              sessionId,
              currentStage: 'PROBLEM_CAPTURE',
              progress: 45,
              status: 'awaiting_decision',
              pendingDecision: {
                type: 'stage_completion',
                stageComplete: true,
                awaitingUserInput: true
              },
              agentStatus: {
                'business-analyst': { status: 'completed', currentTask: 'Analysis ready for review' },
                'smart-planner': { status: 'completed', currentTask: 'Planning ready for approval' }
              },
              timestamp: Date.now()
            }
          })
        });
      });

      await page.goto(`/dashboard?sessionId=${sessionId}`);
      await page.waitForTimeout(2500);

      // Verify progress shows awaiting decision state
      await expect(page.locator('[data-testid="workflow-status"]')).toHaveText('Awaiting Decision');
      await expect(page.locator('[data-testid="progress-bar"]')).toHaveAttribute('aria-valuenow', '45');
      await expect(page.locator('[data-testid="progress-status"]')).toContainText('awaiting decision');

      // Verify agents show completion status
      await expect(page.locator('[data-testid="agent-status-business-analyst"]')).toHaveAttribute('data-status', 'completed');
      await expect(page.locator('[data-testid="agent-task-business-analyst"]')).toContainText('ready for review');
    });
  });

  test.describe('Real-time UI Updates', () => {
    test('should animate progress bar updates smoothly', async ({ page }) => {
      const sessionId = 'test-session-123';
      let currentProgress = 0;

      await page.route(`**/chat/progress/${sessionId}`, async route => {
        currentProgress = Math.min(currentProgress + 15, 100);
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            progressState: {
              sessionId,
              currentStage: 'PROBLEM_CAPTURE',
              progress: currentProgress,
              agentStatus: {},
              timestamp: Date.now()
            }
          })
        });
      });

      await page.goto(`/dashboard?sessionId=${sessionId}`);

      // Track progress bar animations
      let previousProgress = 0;
      
      for (let i = 0; i < 4; i++) {
        await page.waitForTimeout(2500);
        
        const progressValue = parseInt(await page.locator('[data-testid="progress-bar"]').getAttribute('aria-valuenow') || '0');
        expect(progressValue).toBeGreaterThan(previousProgress);
        
        // Verify progress bar has animation class
        await expect(page.locator('[data-testid="progress-bar"]')).toHaveClass(/.*progress-animated.*/);
        
        previousProgress = progressValue;
      }
    });

    test('should highlight current active agents with visual indicators', async ({ page }) => {
      const sessionId = 'test-session-123';

      await page.route(`**/chat/progress/${sessionId}`, async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            progressState: {
              sessionId,
              currentStage: 'SOLUTION_DESIGN',
              progress: 70,
              agentStatus: {
                'business-analyst': { status: 'completed' },
                'solution-architect': { 
                  status: 'active',
                  currentTask: 'Designing architecture',
                  highlighted: true
                },
                'smart-planner': { 
                  status: 'active',
                  currentTask: 'Creating project plan',
                  highlighted: true
                },
                'developer': { status: 'waiting' },
                'qa-tester': { status: 'idle' }
              },
              timestamp: Date.now()
            }
          })
        });
      });

      await page.goto(`/dashboard?sessionId=${sessionId}`);
      await page.waitForTimeout(2500);

      // Verify active agents have highlighting
      await expect(page.locator('[data-testid="agent-card-solution-architect"]')).toHaveClass(/.*agent-active.*/);
      await expect(page.locator('[data-testid="agent-card-smart-planner"]')).toHaveClass(/.*agent-active.*/);
      
      // Verify inactive agents don't have highlighting
      await expect(page.locator('[data-testid="agent-card-business-analyst"]')).not.toHaveClass(/.*agent-active.*/);
      await expect(page.locator('[data-testid="agent-card-developer"]')).not.toHaveClass(/.*agent-active.*/);

      // Verify activity indicators are visible
      await expect(page.locator('[data-testid="agent-activity-indicator-solution-architect"]')).toBeVisible();
      await expect(page.locator('[data-testid="agent-activity-indicator-smart-planner"]')).toBeVisible();
    });

    test('should display loading states during agent processing', async ({ page }) => {
      const sessionId = 'test-session-123';

      await page.route(`**/chat/progress/${sessionId}`, async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            progressState: {
              sessionId,
              currentStage: 'IMPLEMENTATION_PLAN',
              progress: 85,
              agentStatus: {
                'developer': {
                  status: 'processing',
                  currentTask: 'Generating implementation code',
                  isLoading: true,
                  processingIndicator: {
                    type: 'spinner',
                    message: 'Analyzing complex requirements...'
                  }
                },
                'smart-planner': {
                  status: 'active',
                  currentTask: 'Finalizing project timeline'
                }
              },
              timestamp: Date.now()
            }
          })
        });
      });

      await page.goto(`/dashboard?sessionId=${sessionId}`);
      await page.waitForTimeout(2500);

      // Verify loading spinner is visible for processing agent
      await expect(page.locator('[data-testid="agent-loading-spinner-developer"]')).toBeVisible();
      await expect(page.locator('[data-testid="agent-loading-message-developer"]')).toContainText('Analyzing complex requirements');

      // Verify status shows processing
      await expect(page.locator('[data-testid="agent-status-developer"]')).toHaveAttribute('data-status', 'processing');
    });

    test('should update stage transition animations and highlights', async ({ page }) => {
      const sessionId = 'test-session-123';
      let stageTransition = false;

      await page.route(`**/chat/progress/${sessionId}`, async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            progressState: {
              sessionId,
              currentStage: stageTransition ? 'PROBLEM_CLARIFICATION' : 'PROBLEM_CAPTURE',
              progress: stageTransition ? 30 : 15,
              stageTransition: stageTransition ? {
                from: 'PROBLEM_CAPTURE',
                to: 'PROBLEM_CLARIFICATION',
                transitionTime: Date.now()
              } : null,
              agentStatus: {},
              timestamp: Date.now()
            }
          })
        });
        
        if (!stageTransition) {
          stageTransition = true;
        }
      });

      await page.goto(`/dashboard?sessionId=${sessionId}`);

      // Wait for initial state
      await page.waitForTimeout(2500);
      await expect(page.locator('[data-testid="current-stage-indicator"]')).toContainText('Problem Capture');

      // Wait for stage transition
      await page.waitForTimeout(2500);
      
      // Verify stage transition animation
      await expect(page.locator('[data-testid="stage-transition-animation"]')).toBeVisible();
      await expect(page.locator('[data-testid="current-stage-indicator"]')).toContainText('Problem Clarification');
      
      // Verify previous stage is marked as completed
      await expect(page.locator('[data-testid="stage-PROBLEM_CAPTURE"]')).toHaveClass(/.*stage-completed.*/);
      await expect(page.locator('[data-testid="stage-PROBLEM_CLARIFICATION"]')).toHaveClass(/.*stage-current.*/);
    });
  });

  test.describe('Error Handling in Progress Tracking', () => {
    test('should handle temporary network failures gracefully', async ({ page }) => {
      const sessionId = 'test-session-123';
      let requestCount = 0;

      await page.route(`**/chat/progress/${sessionId}`, async route => {
        requestCount++;
        
        if (requestCount >= 2 && requestCount <= 3) {
          // Simulate network failure
          await route.abort('failed');
        } else {
          // Normal response
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              progressState: {
                sessionId,
                currentStage: 'PROBLEM_CAPTURE',
                progress: requestCount * 10,
                agentStatus: {},
                timestamp: Date.now()
              }
            })
          });
        }
      });

      await page.goto(`/dashboard?sessionId=${sessionId}`);

      // Wait through failure and recovery period
      await page.waitForTimeout(8000);

      // Should continue polling after network recovery
      expect(requestCount).toBeGreaterThan(3);
      
      // Should eventually show updated progress
      const finalProgress = parseInt(await page.locator('[data-testid="progress-bar"]').getAttribute('aria-valuenow') || '0');
      expect(finalProgress).toBeGreaterThan(0);
    });

    test('should display connection status indicators', async ({ page }) => {
      const sessionId = 'test-session-123';

      await page.route(`**/chat/progress/${sessionId}`, async route => {
        // Simulate server timeout
        await new Promise(resolve => setTimeout(resolve, 5000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            progressState: {
              sessionId,
              currentStage: 'PROBLEM_CAPTURE',
              progress: 25,
              agentStatus: {},
              timestamp: Date.now()
            }
          })
        });
      });

      await page.goto(`/dashboard?sessionId=${sessionId}`);

      // Should show connecting/loading state during timeout
      await expect(page.locator('[data-testid="connection-status"]')).toContainText('Connecting...');
      await expect(page.locator('[data-testid="connection-indicator"]')).toHaveClass(/.*status-connecting.*/);

      // Wait for eventual connection
      await page.waitForTimeout(6000);

      // Should show connected state after successful response
      await expect(page.locator('[data-testid="connection-status"]')).toContainText('Connected');
      await expect(page.locator('[data-testid="connection-indicator"]')).toHaveClass(/.*status-connected.*/);
    });

    test('should provide retry mechanisms for failed requests', async ({ page }) => {
      const sessionId = 'test-session-123';
      let failCount = 0;

      await page.route(`**/chat/progress/${sessionId}`, async route => {
        failCount++;
        
        if (failCount <= 2) {
          await route.fulfill({
            status: 503,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Service temporarily unavailable' })
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              progressState: {
                sessionId,
                currentStage: 'PROBLEM_CAPTURE',
                progress: 40,
                agentStatus: {},
                timestamp: Date.now()
              }
            })
          });
        }
      });

      await page.goto(`/dashboard?sessionId=${sessionId}`);

      // Should show retry indicator during failures
      await page.waitForTimeout(3000);
      await expect(page.locator('[data-testid="retry-indicator"]')).toBeVisible();

      // Should eventually succeed after retries
      await page.waitForTimeout(5000);
      await expect(page.locator('[data-testid="progress-bar"]')).toHaveAttribute('aria-valuenow', '40');
      await expect(page.locator('[data-testid="retry-indicator"]')).not.toBeVisible();
    });
  });

  test.describe('Concurrent Session Handling', () => {
    test('should isolate progress tracking between multiple sessions', async ({ page, context }) => {
      const session1Id = 'test-session-111';
      const session2Id = 'test-session-222';

      // Set up different responses for each session
      await page.route(`**/chat/progress/${session1Id}`, async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            progressState: {
              sessionId: session1Id,
              currentStage: 'PROBLEM_CAPTURE',
              progress: 25,
              agentStatus: { 'business-analyst': { status: 'active' } },
              timestamp: Date.now()
            }
          })
        });
      });

      await page.route(`**/chat/progress/${session2Id}`, async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            progressState: {
              sessionId: session2Id,
              currentStage: 'SOLUTION_DESIGN',
              progress: 75,
              agentStatus: { 'solution-architect': { status: 'active' } },
              timestamp: Date.now()
            }
          })
        });
      });

      // Open first session
      await page.goto(`/dashboard?sessionId=${session1Id}`);
      await page.waitForTimeout(2500);

      // Verify session 1 data
      await expect(page.locator('[data-testid="progress-bar"]')).toHaveAttribute('aria-valuenow', '25');
      await expect(page.locator('[data-testid="current-stage"]')).toContainText('Problem Capture');

      // Open second session in new tab
      const page2 = await context.newPage();
      await page2.goto(`/dashboard?sessionId=${session2Id}`);
      await page2.waitForTimeout(2500);

      // Verify session 2 data is different
      await expect(page2.locator('[data-testid="progress-bar"]')).toHaveAttribute('aria-valuenow', '75');
      await expect(page2.locator('[data-testid="current-stage"]')).toContainText('Solution Design');

      // Verify session 1 is unchanged
      await expect(page.locator('[data-testid="progress-bar"]')).toHaveAttribute('aria-valuenow', '25');
    });

    test('should handle session cleanup when tabs are closed', async ({ page, context }) => {
      const sessionId = 'test-session-cleanup';
      let activeConnections = 0;

      await page.route(`**/chat/progress/${sessionId}`, async route => {
        activeConnections++;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            progressState: {
              sessionId,
              currentStage: 'PROBLEM_CAPTURE',
              progress: 30,
              agentStatus: {},
              timestamp: Date.now()
            }
          })
        });
      });

      // Open multiple tabs for same session
      const page1 = page;
      const page2 = await context.newPage();
      
      await page1.goto(`/dashboard?sessionId=${sessionId}`);
      await page2.goto(`/dashboard?sessionId=${sessionId}`);
      
      await page.waitForTimeout(3000);
      const connectionsAfterOpen = activeConnections;

      // Close one tab
      await page2.close();
      await page.waitForTimeout(3000);
      
      // Verify connections are properly cleaned up
      expect(activeConnections).toBeGreaterThan(0);
      
      // Close remaining tab
      await page1.close();
    });
  });
});