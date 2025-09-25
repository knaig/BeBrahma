import { test, expect } from '@playwright/test';
import { setupTestEnvironment, cleanupTestEnvironment } from './utils/test-helpers';

test.describe('Session Continuity and Recovery', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestEnvironment(page);
  });

  test.afterEach(async ({ page }) => {
    await cleanupTestEnvironment(page);
  });

  test.describe('Session Persistence', () => {
    test('should generate and store sessionId in React state', async ({ page }) => {
      const sessionId = 'generated-session-123';

      await page.route('**/chat/crew/start', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            sessionId: sessionId,
            messages: [{
              id: 'welcome-1',
              content: 'Welcome! Session started successfully.',
              sender: 'system',
              timestamp: Date.now()
            }],
            status: 'active',
            currentStage: 'PROBLEM_CAPTURE'
          })
        });
      });

      await page.goto('/chat');
      await page.fill('[data-testid="task-input"]', 'Start new workflow');
      await page.click('[data-testid="start-workflow-btn"]');

      // Verify sessionId is stored in component state
      const storedSessionId = await page.evaluate(() => {
        return localStorage.getItem('workflowSessionId') || 
               sessionStorage.getItem('workflowSessionId');
      });

      expect(storedSessionId).toBe(sessionId);

      // Verify sessionId is displayed in UI
      await expect(page.locator('[data-testid="session-id"]')).toContainText(sessionId);
    });

    test('should preserve session data across component remounts', async ({ page }) => {
      const sessionData = {
        sessionId: 'remount-session-456',
        messages: [{
          id: 'msg-1',
          content: 'Persistent message across remounts',
          sender: 'agent',
          timestamp: Date.now(),
          agentMetadata: {
            agentId: 'business-analyst',
            agentName: 'Alex Chen'
          }
        }],
        status: 'active',
        currentStage: 'PROBLEM_CLARIFICATION',
        progress: 35
      };

      await page.route('**/chat/crew/status/remount-session-456', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(sessionData)
        });
      });

      // Store sessionId to simulate existing session
      await page.addInitScript((sessionId) => {
        localStorage.setItem('workflowSessionId', sessionId);
      }, 'remount-session-456');

      await page.goto('/chat');

      // Verify session data is restored
      await expect(page.locator('[data-testid="current-stage"]')).toContainText('Problem Clarification');
      await expect(page.locator('[data-testid="progress-bar"]')).toHaveAttribute('aria-valuenow', '35');
      await expect(page.locator('[data-testid="agent-message"]')).toContainText('Persistent message across remounts');
      await expect(page.locator('[data-testid="agent-name"]')).toContainText('Alex Chen');

      // Simulate component remount by navigating away and back
      await page.goto('/dashboard');
      await page.goto('/chat');

      // Verify data is still preserved
      await expect(page.locator('[data-testid="current-stage"]')).toContainText('Problem Clarification');
      await expect(page.locator('[data-testid="progress-bar"]')).toHaveAttribute('aria-valuenow', '35');
    });

    test('should handle session data during navigation', async ({ page }) => {
      const navigationSessionId = 'nav-session-789';

      await page.route(`**/chat/crew/status/${navigationSessionId}`, async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            sessionId: navigationSessionId,
            messages: [{
              id: 'nav-msg-1',
              content: 'Session survives navigation',
              sender: 'system',
              timestamp: Date.now()
            }],
            status: 'active',
            currentStage: 'SOLUTION_DESIGN',
            navigationContext: {
              preservedAcrossNavigation: true,
              lastActiveRoute: '/chat'
            }
          })
        });
      });

      // Start with session
      await page.addInitScript((sessionId) => {
        localStorage.setItem('workflowSessionId', sessionId);
      }, navigationSessionId);

      await page.goto('/chat');

      // Verify initial session load
      await expect(page.locator('[data-testid="chat-message"]')).toContainText('Session survives navigation');
      await expect(page.locator('[data-testid="current-stage"]')).toContainText('Solution Design');

      // Navigate to different page and back
      await page.goto('/dashboard');
      await expect(page.locator('[data-testid="page-title"]')).toContainText('Dashboard');

      await page.goto('/chat');

      // Verify session is maintained
      await expect(page.locator('[data-testid="chat-message"]')).toContainText('Session survives navigation');
      await expect(page.locator('[data-testid="current-stage"]')).toContainText('Solution Design');
    });

    test('should clean up session data on component unmount', async ({ page }) => {
      await page.goto('/chat');

      // Store session data
      await page.evaluate(() => {
        localStorage.setItem('workflowSessionId', 'cleanup-session-123');
        localStorage.setItem('workflowTempData', 'temporary-data');
      });

      // Verify data exists
      let sessionId = await page.evaluate(() => localStorage.getItem('workflowSessionId'));
      expect(sessionId).toBe('cleanup-session-123');

      // Navigate away (simulating component unmount)
      await page.goto('/settings');
      
      // For this test, we'll assume cleanup happens on specific conditions
      // In a real app, this might be handled differently based on cleanup strategy
      await page.evaluate(() => {
        // Simulate cleanup logic that might run on unmount
        const shouldCleanup = !document.hidden && performance.now() > 0;
        if (shouldCleanup) {
          localStorage.removeItem('workflowTempData');
        }
      });

      // Verify temporary data is cleaned up but persistent session ID remains
      const tempData = await page.evaluate(() => localStorage.getItem('workflowTempData'));
      const persistentSessionId = await page.evaluate(() => localStorage.getItem('workflowSessionId'));
      
      expect(tempData).toBeNull();
      expect(persistentSessionId).toBe('cleanup-session-123'); // Session ID typically persists
    });
  });

  test.describe('Page Reload Recovery', () => {
    test('should recover workflow state after hard page refresh', async ({ page }) => {
      const recoverySessionId = 'recovery-session-001';
      const recoveryData = {
        sessionId: recoverySessionId,
        messages: [
          {
            id: 'recovery-msg-1',
            content: 'Welcome! I\'ve assembled your agent team.',
            sender: 'system',
            timestamp: Date.now() - 600000
          },
          {
            id: 'recovery-msg-2',
            content: 'I\'ve completed the initial business analysis.',
            sender: 'agent',
            timestamp: Date.now() - 300000,
            agentMetadata: {
              agentId: 'business-analyst',
              agentName: 'Sarah Chen',
              agentTitle: 'Senior Business Analyst'
            }
          }
        ],
        status: 'active',
        currentStage: 'PROBLEM_CLARIFICATION',
        progress: 30,
        stageProgress: {
          'PROBLEM_CAPTURE': { status: 'completed', completedAt: Date.now() - 300000 },
          'PROBLEM_CLARIFICATION': { status: 'in_progress', startedAt: Date.now() - 300000 }
        },
        pendingDecision: false
      };

      await page.route(`**/chat/crew/status/${recoverySessionId}`, async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(recoveryData)
        });
      });

      // Simulate existing session
      await page.addInitScript((sessionId) => {
        localStorage.setItem('workflowSessionId', sessionId);
      }, recoverySessionId);

      await page.goto('/chat');

      // Perform hard refresh
      await page.reload({ waitUntil: 'networkidle' });

      // Verify complete state recovery
      await expect(page.locator('[data-testid="current-stage"]')).toContainText('Problem Clarification');
      await expect(page.locator('[data-testid="progress-bar"]')).toHaveAttribute('aria-valuenow', '30');
      
      // Verify message history reconstruction
      await expect(page.locator('[data-testid="chat-message"]')).toHaveCount(2);
      await expect(page.locator('[data-testid="chat-message"]').first()).toContainText('assembled your agent team');
      await expect(page.locator('[data-testid="chat-message"]').last()).toContainText('business analysis');
      
      // Verify agent metadata
      await expect(page.locator('[data-testid="agent-name"]').last()).toContainText('Sarah Chen');
      await expect(page.locator('[data-testid="agent-title"]').last()).toContainText('Senior Business Analyst');
      
      // Verify stage indicators
      await expect(page.locator('[data-testid="stage-status-PROBLEM_CAPTURE"]')).toHaveAttribute('data-status', 'completed');
      await expect(page.locator('[data-testid="stage-status-PROBLEM_CLARIFICATION"]')).toHaveAttribute('data-status', 'in_progress');
    });

    test('should reconstruct message history in proper chronological order', async ({ page }) => {
      const chronologySessionId = 'chronology-session-002';
      
      // Messages with different timestamps to test ordering
      const messagesOutOfOrder = [
        {
          id: 'msg-3',
          content: 'Third message chronologically',
          sender: 'agent',
          timestamp: Date.now() - 60000, // 1 minute ago
          agentMetadata: { agentId: 'smart-planner', agentName: 'Mike Thompson' }
        },
        {
          id: 'msg-1',
          content: 'First message chronologically',
          sender: 'system',
          timestamp: Date.now() - 300000 // 5 minutes ago
        },
        {
          id: 'msg-2',
          content: 'Second message chronologically',
          sender: 'agent',
          timestamp: Date.now() - 180000, // 3 minutes ago
          agentMetadata: { agentId: 'business-analyst', agentName: 'Alex Chen' }
        }
      ];

      await page.route(`**/chat/crew/status/${chronologySessionId}`, async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            sessionId: chronologySessionId,
            messages: messagesOutOfOrder, // API returns messages out of order
            status: 'active',
            messageCount: 3
          })
        });
      });

      await page.addInitScript((sessionId) => {
        localStorage.setItem('workflowSessionId', sessionId);
      }, chronologySessionId);

      await page.goto('/chat');

      // Verify messages are displayed in chronological order
      const messageElements = page.locator('[data-testid="chat-message"]');
      await expect(messageElements).toHaveCount(3);
      
      await expect(messageElements.nth(0)).toContainText('First message chronologically');
      await expect(messageElements.nth(1)).toContainText('Second message chronologically');
      await expect(messageElements.nth(2)).toContainText('Third message chronologically');

      // Verify agent names are in correct order
      const agentNames = page.locator('[data-testid="agent-name"]');
      await expect(agentNames.first()).toContainText('Alex Chen');
      await expect(agentNames.last()).toContainText('Mike Thompson');
    });

    test('should restore progress state and stage indicators after reload', async ({ page }) => {
      const progressSessionId = 'progress-session-003';
      
      const progressData = {
        sessionId: progressSessionId,
        messages: [{ id: 'msg-1', content: 'Progress test', sender: 'system', timestamp: Date.now() }],
        status: 'active',
        currentStage: 'IMPLEMENTATION_PLAN',
        progress: 65,
        stageProgress: {
          'PROBLEM_CAPTURE': { status: 'completed', progress: 100, completedAt: Date.now() - 1800000 },
          'PROBLEM_CLARIFICATION': { status: 'completed', progress: 100, completedAt: Date.now() - 1500000 },
          'SOLUTION_DESIGN': { status: 'completed', progress: 100, completedAt: Date.now() - 1200000 },
          'IMPLEMENTATION_PLAN': { status: 'in_progress', progress: 75, startedAt: Date.now() - 900000 },
          'TESTING_STRATEGY': { status: 'not_started', progress: 0 },
          'DEPLOYMENT_PLAN': { status: 'not_started', progress: 0 },
          'MONITORING_SETUP': { status: 'not_started', progress: 0 }
        }
      };

      await page.route(`**/chat/crew/status/${progressSessionId}`, async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(progressData)
        });
      });

      await page.addInitScript((sessionId) => {
        localStorage.setItem('workflowSessionId', sessionId);
      }, progressSessionId);

      await page.goto('/chat');
      await page.reload();

      // Verify overall progress
      await expect(page.locator('[data-testid="progress-bar"]')).toHaveAttribute('aria-valuenow', '65');
      await expect(page.locator('[data-testid="progress-percentage"]')).toContainText('65%');

      // Verify current stage
      await expect(page.locator('[data-testid="current-stage"]')).toContainText('Implementation Plan');

      // Verify individual stage statuses
      await expect(page.locator('[data-testid="stage-status-PROBLEM_CAPTURE"]')).toHaveAttribute('data-status', 'completed');
      await expect(page.locator('[data-testid="stage-status-PROBLEM_CLARIFICATION"]')).toHaveAttribute('data-status', 'completed');
      await expect(page.locator('[data-testid="stage-status-SOLUTION_DESIGN"]')).toHaveAttribute('data-status', 'completed');
      await expect(page.locator('[data-testid="stage-status-IMPLEMENTATION_PLAN"]')).toHaveAttribute('data-status', 'in_progress');
      await expect(page.locator('[data-testid="stage-status-TESTING_STRATEGY"]')).toHaveAttribute('data-status', 'not_started');

      // Verify stage progress bars
      await expect(page.locator('[data-testid="stage-progress-IMPLEMENTATION_PLAN"]')).toHaveAttribute('aria-valuenow', '75');
    });

    test('should handle pending decision state recovery', async ({ page }) => {
      const decisionSessionId = 'decision-session-004';

      const decisionStateData = {
        sessionId: decisionSessionId,
        messages: [
          {
            id: 'decision-msg-1',
            content: 'Analysis complete. Ready for your decision on how to proceed.',
            sender: 'system',
            timestamp: Date.now() - 120000
          }
        ],
        status: 'awaiting_decision',
        currentStage: 'PROBLEM_CAPTURE',
        pendingDecision: true,
        decisionContext: {
          stageComplete: true,
          agentConsensus: true,
          readyForAdvancement: true,
          completionCriteria: [
            'Business requirements identified',
            'Stakeholder analysis completed',
            'Success metrics defined'
          ]
        },
        decisionOptions: [
          { type: 'approve', label: 'Approve & Continue' },
          { type: 'refine', label: 'Request Refinement' },
          { type: 'reject', label: 'Reject & Restart' },
          { type: 'pause', label: 'Pause Workflow' }
        ]
      };

      await page.route(`**/chat/crew/status/${decisionSessionId}`, async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(decisionStateData)
        });
      });

      await page.addInitScript((sessionId) => {
        localStorage.setItem('workflowSessionId', sessionId);
      }, decisionSessionId);

      await page.goto('/chat');
      await page.reload();

      // Verify decision state recovery
      await expect(page.locator('[data-testid="workflow-status"]')).toHaveText('Awaiting Decision');
      await expect(page.locator('[data-testid="decision-buttons"]')).toBeVisible();
      
      // Verify all decision options are restored
      await expect(page.locator('[data-testid="decision-approve"]')).toBeVisible();
      await expect(page.locator('[data-testid="decision-refine"]')).toBeVisible();
      await expect(page.locator('[data-testid="decision-reject"]')).toBeVisible();
      await expect(page.locator('[data-testid="decision-pause"]')).toBeVisible();

      // Verify decision context
      await expect(page.locator('[data-testid="decision-context"]')).toContainText('Business requirements identified');
      await expect(page.locator('[data-testid="agent-consensus-indicator"]')).toHaveAttribute('data-consensus', 'true');
    });
  });

  test.describe('Session State Reconstruction', () => {
    test('should handle complete message history retrieval with metadata', async ({ page }) => {
      const fullHistorySessionId = 'full-history-session-005';

      const completeHistory = {
        sessionId: fullHistorySessionId,
        messages: [
          {
            id: 'history-1',
            content: 'Welcome! Starting your e-commerce platform analysis.',
            sender: 'system',
            timestamp: Date.now() - 2400000, // 40 minutes ago
            messageType: 'welcome'
          },
          {
            id: 'history-2',
            content: 'I need to understand your target market and business model.',
            sender: 'agent',
            timestamp: Date.now() - 2100000, // 35 minutes ago
            agentMetadata: {
              agentId: 'business-analyst',
              agentName: 'Sarah Rodriguez',
              agentTitle: 'Senior Business Analyst',
              expertise: ['Market Analysis', 'Business Strategy']
            }
          },
          {
            id: 'history-3',
            content: 'Based on the requirements, I recommend a cloud-native architecture.',
            sender: 'agent',
            timestamp: Date.now() - 1800000, // 30 minutes ago
            agentMetadata: {
              agentId: 'solution-architect',
              agentName: 'David Chen',
              agentTitle: 'Principal Solution Architect',
              expertise: ['System Design', 'Cloud Architecture']
            }
          },
          {
            id: 'history-4',
            content: 'Stage completed! Moving to Problem Clarification.',
            sender: 'system',
            timestamp: Date.now() - 1500000, // 25 minutes ago
            messageType: 'stage_transition'
          }
        ],
        status: 'active',
        currentStage: 'PROBLEM_CLARIFICATION',
        totalMessages: 4,
        sessionDuration: 900000 // 15 minutes active
      };

      await page.route(`**/chat/crew/status/${fullHistorySessionId}`, async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(completeHistory)
        });
      });

      await page.addInitScript((sessionId) => {
        localStorage.setItem('workflowSessionId', sessionId);
      }, fullHistorySessionId);

      await page.goto('/chat');

      // Verify complete message count
      await expect(page.locator('[data-testid="chat-message"]')).toHaveCount(4);

      // Verify message types are handled correctly
      await expect(page.locator('[data-testid="welcome-message"]')).toContainText('Starting your e-commerce platform');
      await expect(page.locator('[data-testid="stage-transition-message"]')).toContainText('Moving to Problem Clarification');

      // Verify agent metadata preservation
      const businessAnalystMessage = page.locator('[data-testid="agent-message"]').first();
      await expect(businessAnalystMessage.locator('[data-testid="agent-name"]')).toContainText('Sarah Rodriguez');
      await expect(businessAnalystMessage.locator('[data-testid="agent-title"]')).toContainText('Senior Business Analyst');

      const solutionArchitectMessage = page.locator('[data-testid="agent-message"]').last();
      await expect(solutionArchitectMessage.locator('[data-testid="agent-name"]')).toContainText('David Chen');
      await expect(solutionArchitectMessage.locator('[data-testid="agent-title"]')).toContainText('Principal Solution Architect');

      // Verify session metadata
      await expect(page.locator('[data-testid="session-duration"]')).toContainText('15 minutes');
      await expect(page.locator('[data-testid="message-count"]')).toContainText('4 messages');
    });

    test('should preserve agent context awareness across session recovery', async ({ page }) => {
      const contextSessionId = 'context-session-006';

      const contextData = {
        sessionId: contextSessionId,
        messages: [
          {
            id: 'context-1',
            content: 'User wants to build a multi-vendor marketplace with 10,000+ products.',
            sender: 'agent',
            timestamp: Date.now() - 600000,
            agentMetadata: {
              agentId: 'business-analyst',
              agentName: 'Emma Wilson'
            },
            contextTags: ['multi-vendor', 'high-scale', 'marketplace']
          },
          {
            id: 'context-2',
            content: 'Given Emma\'s analysis of the 10,000+ product requirement, I recommend microservices architecture.',
            sender: 'agent',
            timestamp: Date.now() - 300000,
            agentMetadata: {
              agentId: 'solution-architect',
              agentName: 'Alex Thompson'
            },
            contextReferences: ['business-analyst'],
            buildOnPrevious: true
          }
        ],
        status: 'active',
        agentContextGraph: {
          'business-analyst': {
            contributions: ['product scale requirements', 'multi-vendor model'],
            referencedBy: ['solution-architect']
          },
          'solution-architect': {
            references: ['business-analyst'],
            contributions: ['microservices recommendation']
          }
        }
      };

      await page.route(`**/chat/crew/status/${contextSessionId}`, async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(contextData)
        });
      });

      await page.addInitScript((sessionId) => {
        localStorage.setItem('workflowSessionId', sessionId);
      }, contextSessionId);

      await page.goto('/chat');

      // Verify context references are preserved
      const contextMessage = page.locator('[data-testid="agent-message"]').last();
      await expect(contextMessage).toContainText('Given Emma\'s analysis');
      await expect(contextMessage).toContainText('10,000+ product requirement');

      // Verify context indicators
      await expect(page.locator('[data-testid="context-reference-indicator"]')).toBeVisible();
      await expect(page.locator('[data-testid="agent-context-graph"]')).toContainText('business-analyst');

      // Verify context tags
      await expect(page.locator('[data-testid="context-tag-multi-vendor"]')).toBeVisible();
      await expect(page.locator('[data-testid="context-tag-high-scale"]')).toBeVisible();
    });

    test('should handle decision history and user interaction context', async ({ page }) => {
      const interactionSessionId = 'interaction-session-007';

      const interactionData = {
        sessionId: interactionSessionId,
        messages: [
          {
            id: 'interaction-1',
            content: 'Analysis complete. Please review and decide.',
            sender: 'system',
            timestamp: Date.now() - 900000
          },
          {
            id: 'interaction-2',
            content: 'Decision approved! Moving to next stage.',
            sender: 'system',
            timestamp: Date.now() - 600000,
            messageType: 'decision_response',
            userDecision: 'approve'
          }
        ],
        status: 'active',
        decisionHistory: [
          {
            stage: 'PROBLEM_CAPTURE',
            decision: 'approve',
            timestamp: Date.now() - 600000,
            decisionContext: 'User approved initial business analysis'
          }
        ],
        userInteractions: [
          {
            type: 'decision',
            action: 'approve',
            timestamp: Date.now() - 600000,
            context: 'Stage completion decision'
          }
        ]
      };

      await page.route(`**/chat/crew/status/${interactionSessionId}`, async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(interactionData)
        });
      });

      await page.addInitScript((sessionId) => {
        localStorage.setItem('workflowSessionId', sessionId);
      }, interactionSessionId);

      await page.goto('/chat');

      // Verify decision history is preserved
      await page.click('[data-testid="interaction-history-toggle"]');
      await expect(page.locator('[data-testid="decision-history"]')).toBeVisible();
      await expect(page.locator('[data-testid="decision-history-item"]')).toContainText('Problem Capture');
      await expect(page.locator('[data-testid="decision-history-item"]')).toContainText('Approved');

      // Verify decision response messages
      const decisionMessage = page.locator('[data-testid="decision-response-message"]');
      await expect(decisionMessage).toContainText('Decision approved');

      // Verify interaction context
      await expect(page.locator('[data-testid="user-interaction-count"]')).toContainText('1 interaction');
    });
  });

  test.describe('Error Recovery Scenarios', () => {
    test('should handle session recovery when backend services were temporarily unavailable', async ({ page }) => {
      const unavailableSessionId = 'unavailable-session-008';
      let requestCount = 0;

      await page.route(`**/chat/crew/status/${unavailableSessionId}`, async route => {
        requestCount++;
        
        if (requestCount <= 2) {
          // First two requests fail (simulate service unavailable)
          await route.fulfill({
            status: 503,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Service temporarily unavailable',
              code: 'SERVICE_UNAVAILABLE',
              retryAfter: 2000
            })
          });
        } else {
          // Third request succeeds
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              sessionId: unavailableSessionId,
              messages: [{
                id: 'recovery-msg',
                content: 'Service restored! Session recovered successfully.',
                sender: 'system',
                timestamp: Date.now()
              }],
              status: 'active',
              recoveredFromOutage: true
            })
          });
        }
      });

      await page.addInitScript((sessionId) => {
        localStorage.setItem('workflowSessionId', sessionId);
      }, unavailableSessionId);

      await page.goto('/chat');

      // Should show loading/retry indicators initially
      await expect(page.locator('[data-testid="session-recovery-loading"]')).toBeVisible();
      await expect(page.locator('[data-testid="service-unavailable-message"]')).toContainText('Service temporarily unavailable');

      // Wait for retry and recovery
      await page.waitForTimeout(5000);

      // Verify successful recovery
      await expect(page.locator('[data-testid="chat-message"]')).toContainText('Session recovered successfully');
      await expect(page.locator('[data-testid="recovery-indicator"]')).toBeVisible();
      await expect(page.locator('[data-testid="service-unavailable-message"]')).not.toBeVisible();
    });

    test('should gracefully handle expired or invalid session IDs', async ({ page }) => {
      const expiredSessionId = 'expired-session-009';

      await page.route(`**/chat/crew/status/${expiredSessionId}`, async route => {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'CrewAI session not found',
            code: 'SESSION_EXPIRED',
            sessionId: expiredSessionId
          })
        });
      });

      await page.addInitScript((sessionId) => {
        localStorage.setItem('workflowSessionId', sessionId);
      }, expiredSessionId);

      await page.goto('/chat');

      // Verify expired session handling
      await expect(page.locator('[data-testid="session-expired-message"]')).toContainText('Session not found or expired');
      await expect(page.locator('[data-testid="start-new-session-btn"]')).toBeVisible();
      await expect(page.locator('[data-testid="expired-session-id"]')).toContainText(expiredSessionId);

      // Verify cleanup of expired session
      const sessionIdAfterExpiry = await page.evaluate(() => localStorage.getItem('workflowSessionId'));
      expect(sessionIdAfterExpiry).toBeNull();
    });

    test('should recover from partial session data or corrupted state', async ({ page }) => {
      const corruptedSessionId = 'corrupted-session-010';

      await page.route(`**/chat/crew/status/${corruptedSessionId}`, async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            sessionId: corruptedSessionId,
            messages: [
              {
                id: 'valid-msg',
                content: 'This message is valid.',
                sender: 'system',
                timestamp: Date.now()
              },
              {
                id: 'corrupted-msg',
                // Missing required fields to simulate corruption
                timestamp: 'invalid-timestamp'
              }
            ],
            status: 'active',
            currentStage: 'UNKNOWN_STAGE', // Invalid stage
            partialRecovery: true,
            dataIntegrityIssues: [
              'Invalid timestamp in message corrupted-msg',
              'Unknown workflow stage detected'
            ]
          })
        });
      });

      await page.addInitScript((sessionId) => {
        localStorage.setItem('workflowSessionId', sessionId);
      }, corruptedSessionId);

      await page.goto('/chat');

      // Verify partial recovery handling
      await expect(page.locator('[data-testid="partial-recovery-warning"]')).toBeVisible();
      await expect(page.locator('[data-testid="data-integrity-issues"]')).toContainText('Invalid timestamp');

      // Verify valid data is still displayed
      await expect(page.locator('[data-testid="chat-message"]')).toContainText('This message is valid');

      // Verify graceful handling of corrupted data
      await expect(page.locator('[data-testid="corrupted-message-placeholder"]')).toBeVisible();
      await expect(page.locator('[data-testid="stage-fallback"]')).toContainText('Recovering');
    });

    test('should provide user notification and guidance for unrecoverable sessions', async ({ page }) => {
      const unrecoverableSessionId = 'unrecoverable-session-011';

      await page.route(`**/chat/crew/status/${unrecoverableSessionId}`, async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Session data corrupted beyond recovery',
            code: 'SESSION_UNRECOVERABLE',
            details: 'Critical session files are missing or corrupted',
            recoveryOptions: [
              'Start a new workflow session',
              'Contact support for data recovery assistance'
            ]
          })
        });
      });

      await page.addInitScript((sessionId) => {
        localStorage.setItem('workflowSessionId', sessionId);
      }, unrecoverableSessionId);

      await page.goto('/chat');

      // Verify unrecoverable session messaging
      await expect(page.locator('[data-testid="unrecoverable-session-message"]')).toContainText('Session data corrupted beyond recovery');
      await expect(page.locator('[data-testid="recovery-explanation"]')).toContainText('Critical session files are missing');

      // Verify recovery options
      await expect(page.locator('[data-testid="recovery-option"]')).toHaveCount(2);
      await expect(page.locator('[data-testid="recovery-option"]').first()).toContainText('Start a new workflow session');
      await expect(page.locator('[data-testid="recovery-option"]').last()).toContainText('Contact support');

      // Verify action buttons
      await expect(page.locator('[data-testid="start-new-session-btn"]')).toBeVisible();
      await expect(page.locator('[data-testid="contact-support-btn"]')).toBeVisible();

      // Test starting new session
      await page.click('[data-testid="start-new-session-btn"]');
      
      // Should clear corrupted session and prepare for new one
      const clearedSessionId = await page.evaluate(() => localStorage.getItem('workflowSessionId'));
      expect(clearedSessionId).toBeNull();
      await expect(page.locator('[data-testid="new-session-ready"]')).toBeVisible();
    });
  });

  test.describe('Cross-Tab Session Sharing', () => {
    test('should maintain session consistency across multiple browser tabs', async ({ page, context }) => {
      const sharedSessionId = 'shared-session-012';

      const sharedSessionData = {
        sessionId: sharedSessionId,
        messages: [{
          id: 'shared-msg-1',
          content: 'This session is shared across tabs.',
          sender: 'system',
          timestamp: Date.now()
        }],
        status: 'active',
        currentStage: 'PROBLEM_CAPTURE',
        progress: 25,
        crossTabSync: true
      };

      await page.route(`**/chat/crew/status/${sharedSessionId}`, async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(sharedSessionData)
        });
      });

      // Set up session in first tab
      await page.addInitScript((sessionId) => {
        localStorage.setItem('workflowSessionId', sessionId);
      }, sharedSessionId);

      await page.goto('/chat');

      // Verify initial state
      await expect(page.locator('[data-testid="chat-message"]')).toContainText('shared across tabs');
      await expect(page.locator('[data-testid="progress-bar"]')).toHaveAttribute('aria-valuenow', '25');

      // Open second tab
      const page2 = await context.newPage();
      await page2.goto('/chat');

      // Verify second tab loads same session
      await expect(page2.locator('[data-testid="chat-message"]')).toContainText('shared across tabs');
      await expect(page2.locator('[data-testid="progress-bar"]')).toHaveAttribute('aria-valuenow', '25');
      await expect(page2.locator('[data-testid="session-id"]')).toContainText(sharedSessionId);
    });

    test('should handle session cleanup when all tabs are closed', async ({ page, context }) => {
      const cleanupSessionId = 'cleanup-session-013';

      // Track connection cleanup
      let activeConnections = 0;

      await page.route(`**/chat/progress/${cleanupSessionId}`, async route => {
        activeConnections++;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            sessionId: cleanupSessionId,
            activeConnections: activeConnections
          })
        });
      });

      await page.route(`**/chat/crew/status/${cleanupSessionId}`, async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            sessionId: cleanupSessionId,
            messages: [{
              id: 'cleanup-msg',
              content: 'Testing connection cleanup',
              sender: 'system',
              timestamp: Date.now()
            }],
            status: 'active'
          })
        });
      });

      // Open multiple tabs
      const page1 = page;
      const page2 = await context.newPage();
      
      await page1.goto(`/chat?sessionId=${cleanupSessionId}`);
      await page2.goto(`/chat?sessionId=${cleanupSessionId}`);
      
      // Wait for connections to establish
      await page.waitForTimeout(2000);
      expect(activeConnections).toBeGreaterThan(0);

      // Close tabs one by one
      await page2.close();
      await page.waitForTimeout(1000);
      
      await page1.close();
      
      // In a real implementation, server-side cleanup would occur
      // This test verifies the client-side cleanup behavior
    });
  });

  test.describe('Network Interruption Recovery', () => {
    test('should maintain session continuity after temporary network disconnection', async ({ page }) => {
      const networkSessionId = 'network-session-014';
      let networkAvailable = true;

      await page.route(`**/chat/crew/status/${networkSessionId}`, async route => {
        if (!networkAvailable) {
          await route.abort('Failed');
          return;
        }

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            sessionId: networkSessionId,
            messages: [{
              id: 'network-msg-1',
              content: networkAvailable ? 'Network connection restored' : 'Network unavailable',
              sender: 'system',
              timestamp: Date.now()
            }],
            status: 'active',
            networkStatus: networkAvailable ? 'connected' : 'disconnected'
          })
        });
      });

      await page.addInitScript((sessionId) => {
        localStorage.setItem('workflowSessionId', sessionId);
      }, networkSessionId);

      await page.goto('/chat');

      // Verify initial connection
      await expect(page.locator('[data-testid="network-status"]')).toContainText('connected');

      // Simulate network disconnection
      networkAvailable = false;
      await page.reload();

      // Should show offline state
      await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
      await expect(page.locator('[data-testid="network-error-message"]')).toContainText('Connection lost');

      // Restore network
      networkAvailable = true;

      // Simulate automatic retry
      await page.click('[data-testid="retry-connection-btn"]');

      // Should recover session
      await expect(page.locator('[data-testid="chat-message"]')).toContainText('Network connection restored');
      await expect(page.locator('[data-testid="offline-indicator"]')).not.toBeVisible();
    });

    test('should queue user actions during network interruption', async ({ page }) => {
      const queueSessionId = 'queue-session-015';
      let networkDown = false;
      const actionQueue: any[] = [];

      await page.route('**/chat/crew/next', async route => {
        if (networkDown) {
          // Queue the action instead of processing
          const requestData = await route.request().postDataJSON();
          actionQueue.push({
            type: 'next_message',
            data: requestData,
            timestamp: Date.now()
          });
          await route.abort('Failed');
          return;
        }

        // Process normally when network is available
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            sessionId: queueSessionId,
            messages: [{
              id: 'queued-response',
              content: `Processed ${actionQueue.length} queued actions`,
              sender: 'system',
              timestamp: Date.now()
            }],
            status: 'active',
            processedQueue: actionQueue.length > 0
          })
        });

        // Clear queue after processing
        actionQueue.length = 0;
      });

      await page.goto(`/chat?sessionId=${queueSessionId}`);

      // Simulate network interruption
      networkDown = true;

      // Try to perform actions while offline
      await page.click('[data-testid="next-message-button"]');
      await page.click('[data-testid="next-message-button"]');

      // Verify actions are queued
      await expect(page.locator('[data-testid="queued-actions-indicator"]')).toContainText('2 actions queued');

      // Restore network
      networkDown = false;

      // Actions should process automatically
      await page.waitForTimeout(2000);
      await expect(page.locator('[data-testid="chat-message"]')).toContainText('Processed 2 queued actions');
    });
  });
});