import { test, expect, Page } from '@playwright/test';
import { 
  mockApiRoutes, 
  waitForLoadingComplete, 
  waitForDecisionPoint,
  progressToDecisionPoint,
  waitForMessageCountChange 
} from './utils/test-helpers';

test.describe('LangGraph Workflow Integration', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // Setup MSW mocks for LangGraph workflow service
    await mockApiRoutes(page, {
      'langgraph-workflow': true,
      'crew-ai': false // Disable old CrewAI mocks
    });

    // Navigate to the chat interface
    await page.goto('/chat');
  });

  test.describe('Workflow Initialization', () => {
    test('should start new workflow session through ChatInterface', async () => {
      // Arrange
      const workflowName = 'Test Workflow';
      const initialContext = { domain: 'healthcare', complexity: 'high' };

      // Act - Start workflow
      await page.fill('[data-testid="workflow-name-input"]', workflowName);
      await page.fill('[data-testid="workflow-context-input"]', JSON.stringify(initialContext));
      await page.click('[data-testid="start-workflow-button"]');

      // Assert
      await expect(page.locator('[data-testid="workflow-status"]')).toContainText('PROBLEM_CAPTURE');
      await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="session-id"]')).toContainText('session_');
    });

    test('should display welcome message with correct stage information', async () => {
      // Arrange
      await page.click('[data-testid="start-workflow-button"]');

      // Assert
      await expect(page.locator('[data-testid="welcome-message"]')).toContainText('Welcome to the workflow');
      await expect(page.locator('[data-testid="current-stage"]')).toContainText('Problem Capture');
      await expect(page.locator('[data-testid="stage-description"]')).toContainText('Define the problem');
    });

    test('should generate and persist session ID', async () => {
      // Arrange
      await page.click('[data-testid="start-workflow-button"]');

      // Assert
      const sessionId = await page.locator('[data-testid="session-id"]').textContent();
      expect(sessionId).toMatch(/session_\d+_\d+/);

      // Verify persistence by refreshing page
      await page.reload();
      await expect(page.locator('[data-testid="session-id"]')).toContainText(sessionId!);
    });

    test('should setup initial workflow state correctly', async () => {
      // Arrange
      await page.click('[data-testid="start-workflow-button"]');

      // Assert
      await expect(page.locator('[data-testid="workflow-status"]')).toContainText('IN_PROGRESS');
      await expect(page.locator('[data-testid="stage-progress"]')).toContainText('0%');
      await expect(page.locator('[data-testid="pending-decision"]')).not.toBeVisible();
    });
  });

  test.describe('Step-by-Step Progression', () => {
    test.beforeEach(async () => {
      // Start workflow first
      await page.click('[data-testid="start-workflow-button"]');
    });

    test('should progress workflow step-by-step with "Next message" button', async () => {
      // Arrange
      const initialMessageCount = await page.locator('[data-testid="message-item"]').count();

      // Act - Click next message button
      await page.click('[data-testid="next-message-button"]');

      // Assert
      await expect(page.locator('[data-testid="message-item"])).toHaveCount(initialMessageCount + 1);
      await expect(page.locator('[data-testid="loading-indicator"]')).not.toBeVisible();
    });

    test('should release single message (no batch processing)', async () => {
      // Arrange
      const initialMessageCount = await page.locator('[data-testid="message-item"]').count();

      // Act - Click next message multiple times
      await page.click('[data-testid="next-message-button"]');
      await page.click('[data-testid="next-message-button"]');
      await page.click('[data-testid="next-message-button"]');

      // Assert - Should only add one message at a time
      await expect(page.locator('[data-testid="message-item"]')).toHaveCount(initialMessageCount + 3);
    });

    test('should progress through all 7 workflow stages', async () => {
      // Arrange
      const expectedStages = [
        'Problem Capture',
        'Problem Clarification',
        'Solution Design',
        'Implementation Plan',
        'Testing Strategy',
        'Deployment Plan',
        'Monitoring Setup'
      ];

      // Act & Assert - Progress through stages
      for (let i = 0; i < expectedStages.length; i++) {
        const currentStage = await page.locator('[data-testid="current-stage"]').textContent();
        expect(currentStage).toContain(expectedStages[i]);

        // Add messages to complete current stage
        while (await page.locator('[data-testid="pending-decision"]').isVisible() === false) {
          await page.click('[data-testid="next-message-button"]');
          await waitForLoadingComplete(page);
        }

        // Make decision to advance to next stage
        if (i < expectedStages.length - 1) {
          await page.click('[data-testid="decision-approve-button"]');
          await waitForLoadingComplete(page);
        }
      }
    });

    test('should validate stage completion criteria and transitions', async () => {
      // Arrange
      let currentStage = await page.locator('[data-testid="current-stage"]').textContent();

      // Act - Add messages until decision point
      while (await page.locator('[data-testid="pending-decision"]').isVisible() === false) {
        await page.click('[data-testid="next-message-button"]');
        await waitForLoadingComplete(page);
      }

      // Assert - Decision point should appear
      await expect(page.locator('[data-testid="pending-decision"]')).toBeVisible();
      await expect(page.locator('[data-testid="decision-options"]')).toBeVisible();

      // Act - Make decision
      await page.click('[data-testid="decision-approve-button"]');
      await waitForLoadingComplete(page);

      // Assert - Should advance to next stage
      const newStage = await page.locator('[data-testid="current-stage"]').textContent();
      expect(newStage).not.toBe(currentStage);
    });
  });

  test.describe('Decision Point Handling', () => {
    test.beforeEach(async () => {
      // Start workflow and progress to decision point
      await page.click('[data-testid="start-workflow-button"]');
      
      // Add messages until decision point appears
      while (await page.locator('[data-testid="pending-decision"]').isVisible() === false) {
        await page.click('[data-testid="next-message-button"]');
        await waitForLoadingComplete(page);
      }
    });

    test('should detect decision point and display UI correctly', async () => {
      // Assert
      await expect(page.locator('[data-testid="pending-decision"]')).toBeVisible();
      await expect(page.locator('[data-testid="decision-options"]')).toBeVisible();
      await expect(page.locator('[data-testid="decision-approve-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="decision-refine-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="decision-reject-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="decision-pause-button"]')).toBeVisible();
    });

    test('should handle approve decision and advance workflow', async () => {
      // Arrange
      const currentStage = await page.locator('[data-testid="current-stage"]').textContent();

      // Act
      await page.click('[data-testid="decision-approve-button"]');
      await waitForLoadingComplete(page);

      // Assert
      const newStage = await page.locator('[data-testid="current-stage"]').textContent();
      expect(newStage).not.toBe(currentStage);
      await expect(page.locator('[data-testid="pending-decision"]')).not.toBeVisible();
    });

    test('should handle refine decision and stay in current stage', async () => {
      // Arrange
      const currentStage = await page.locator('[data-testid="current-stage"]').textContent();

      // Act
      await page.click('[data-testid="decision-refine-button"]');
      await waitForLoadingComplete(page);

      // Assert
      const newStage = await page.locator('[data-testid="current-stage"]').textContent();
      expect(newStage).toBe(currentStage);
      await expect(page.locator('[data-testid="pending-decision"]')).not.toBeVisible();
    });

    test('should handle reject decision and stay in current stage', async () => {
      // Arrange
      const currentStage = await page.locator('[data-testid="current-stage"]').textContent();

      // Act
      await page.click('[data-testid="decision-reject-button"]');
      await waitForLoadingComplete(page);

      // Assert
      const newStage = await page.locator('[data-testid="current-stage"]').textContent();
      expect(newStage).toBe(currentStage);
      await expect(page.locator('[data-testid="pending-decision"]')).not.toBeVisible();
    });

    test('should handle pause decision and suspend workflow', async () => {
      // Arrange
      const currentStage = await page.locator('[data-testid="current-stage"]').textContent();

      // Act
      await page.click('[data-testid="decision-pause-button"]');
      await waitForLoadingComplete(page);

      // Assert
      const newStage = await page.locator('[data-testid="current-stage"]').textContent();
      expect(newStage).toBe(currentStage);
      await expect(page.locator('[data-testid="workflow-status"]')).toContainText('PAUSED');
    });

    test('should add decision messages to chat history', async () => {
      // Act
      await page.click('[data-testid="decision-approve-button"]');
      await waitForLoadingComplete(page);

      // Assert
      await expect(page.locator('[data-testid="message-item"]').last()).toContainText('Decision: APPROVE');
    });
  });

  test.describe('Stage Transitions', () => {
    test('should automatically advance stages after decisions', async () => {
      // Arrange
      await page.click('[data-testid="start-workflow-button"]');
      
      // Progress through first stage
      while (await page.locator('[data-testid="pending-decision"]').isVisible() === false) {
        await page.click('[data-testid="next-message-button"]');
        await waitForLoadingComplete(page);
      }

      // Act - Make approve decision
      await page.click('[data-testid="decision-approve-button"]');
      await waitForLoadingComplete(page);

      // Assert - Should advance to next stage
      await expect(page.locator('[data-testid="current-stage"]')).toContainText('Problem Clarification');
    });

    test('should update stage progress indicators correctly', async () => {
      // Arrange
      await page.click('[data-testid="start-workflow-button"]');

      // Act - Progress through stage
      await page.click('[data-testid="next-message-button"]');
      await page.click('[data-testid="next-message-button"]');

      // Assert
      await expect(page.locator('[data-testid="stage-progress"]')).toContainText('60%');
    });

    test('should validate stage completion criteria', async () => {
      // Arrange
      await page.click('[data-testid="start-workflow-button"]');

      // Act - Add messages until stage completion
      let messageCount = 0;
      while (await page.locator('[data-testid="pending-decision"]').isVisible() === false && messageCount < 10) {
        await page.click('[data-testid="next-message-button"]');
        await waitForLoadingComplete(page);
        messageCount++;
      }

      // Assert - Decision point should appear when stage is complete
      if (messageCount < 10) {
        await expect(page.locator('[data-testid="pending-decision"]')).toBeVisible();
      }
    });

    test('should complete final stage and end workflow', async () => {
      // Arrange
      await page.click('[data-testid="start-workflow-button"]');

      // Act - Progress through all stages
      for (let stage = 0; stage < 7; stage++) {
        // Add messages until decision point
        while (await page.locator('[data-testid="pending-decision"]').isVisible() === false) {
          await page.click('[data-testid="next-message-button"]');
          await waitForLoadingComplete(page);
        }

        // Make decision (except for final stage)
        if (stage < 6) {
          await page.click('[data-testid="decision-approve-button"]');
          await waitForLoadingComplete(page);
        }
      }

      // Assert - Final stage should be complete
      await expect(page.locator('[data-testid="workflow-status"]')).toContainText('COMPLETED');
      await expect(page.locator('[data-testid="workflow-completion-message"]')).toBeVisible();
    });
  });

  test.describe('Error Scenarios', () => {
    test('should handle workflow service unavailable gracefully', async () => {
      // Arrange - Mock service unavailable
      await page.route('**/api/workflow/**', route => {
        route.fulfill({ status: 503, body: 'Service Unavailable' });
      });

      // Act
      await page.click('[data-testid="start-workflow-button"]');

      // Assert
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Service unavailable');
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    });

    test('should handle session timeout and recovery', async () => {
      // Arrange
      await page.click('[data-testid="start-workflow-button"]');
      const sessionId = await page.locator('[data-testid="session-id"]').textContent();

      // Act - Mock session timeout
      await page.route(`**/api/workflow/status/${sessionId}`, route => {
        route.fulfill({ status: 404, body: 'Session not found' });
      });

      // Refresh page to trigger session recovery
      await page.reload();

      // Assert
      await expect(page.locator('[data-testid="session-expired-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="restart-workflow-button"]')).toBeVisible();
    });

    test('should handle invalid decision gracefully', async () => {
      // Arrange
      await page.click('[data-testid="start-workflow-button"]');
      
      // Progress to decision point
      while (await page.locator('[data-testid="pending-decision"]').isVisible() === false) {
        await page.click('[data-testid="next-message-button"]');
        await waitForLoadingComplete(page);
      }

      // Act - Mock invalid decision error
      await page.route('**/api/workflow/decision', route => {
        route.fulfill({ status: 400, body: 'Invalid decision' });
      });

      await page.click('[data-testid="decision-approve-button"]');

      // Assert
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid decision');
    });

    test('should handle network failure recovery', async () => {
      // Arrange
      await page.click('[data-testid="start-workflow-button"]');

      // Act - Mock network failure then recovery
      await page.route('**/api/workflow/next', route => {
        route.fulfill({ status: 500, body: 'Network error' });
      });

      await page.click('[data-testid="next-message-button"]');
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();

      // Restore normal operation
      await page.unroute('**/api/workflow/next');
      await page.click('[data-testid="retry-button"]');

      // Assert - Should recover and continue
      await expect(page.locator('[data-testid="error-message"]')).not.toBeVisible();
    });
  });

  test.describe('UI State Management', () => {
    test('should update ChatInterface state with LangGraph responses', async () => {
      // Arrange
      await page.click('[data-testid="start-workflow-button"]');

      // Act - Progress workflow
      await page.click('[data-testid="next-message-button"]');

      // Assert
      await expect(page.locator('[data-testid="workflow-status"]')).toContainText('IN_PROGRESS');
      await expect(page.locator('[data-testid="message-count"]')).toContainText('2');
    });

    test('should show loading states during API calls', async () => {
      // Arrange
      await page.click('[data-testid="start-workflow-button"]');

      // Act - Click next message
      await page.click('[data-testid="next-message-button"]');

      // Assert - Loading indicator should appear briefly
      await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible();
      
      // Wait for loading to complete
      await expect(page.locator('[data-testid="loading-indicator"]')).not.toBeVisible();
    });

    test('should update progress indicators and status displays', async () => {
      // Arrange
      await page.click('[data-testid="start-workflow-button"]');

      // Act - Progress through stage
      await page.click('[data-testid="next-message-button"]');
      await page.click('[data-testid="next-message-button"]');

      // Assert
      await expect(page.locator('[data-testid="stage-progress"]')).toContainText('60%');
      await expect(page.locator('[data-testid="workflow-status"]')).toContainText('IN_PROGRESS');
    });

    test('should persist message history across page reloads', async () => {
      // Arrange
      await page.click('[data-testid="start-workflow-button"]');
      await page.click('[data-testid="next-message-button"]');
      
      const messageCount = await page.locator('[data-testid="message-item"]').count();

      // Act - Reload page
      await page.reload();

      // Assert - Messages should persist
      await expect(page.locator('[data-testid="message-item"]')).toHaveCount(messageCount);
    });
  });

  test.describe('Real-time Features', () => {
    test('should poll for workflow status updates', async () => {
      // Arrange
      await page.click('[data-testid="start-workflow-button"]');

      // Act - Wait for status polling
      await waitForLoadingComplete(page);

      // Assert - Status should be updated
      await expect(page.locator('[data-testid="workflow-status"]')).toContainText('IN_PROGRESS');
    });

    test('should track real-time progress', async () => {
      // Arrange
      await page.click('[data-testid="start-workflow-button"]');

      // Act - Monitor progress updates
      const initialProgress = await page.locator('[data-testid="stage-progress"]').textContent();
      
      await page.click('[data-testid="next-message-button"]');
      await waitForLoadingComplete(page);

      const updatedProgress = await page.locator('[data-testid="stage-progress"]').textContent();

      // Assert - Progress should change
      expect(updatedProgress).not.toBe(initialProgress);
    });

    test('should handle concurrent session management', async () => {
      // Arrange
      await page.click('[data-testid="start-workflow-button"]');
      const session1Id = await page.locator('[data-testid="session-id"]').textContent();

      // Act - Open new tab and start another session
      const newPage = await page.context().newPage();
      await newPage.goto('/chat');
      await newPage.click('[data-testid="start-workflow-button"]');
      const session2Id = await newPage.locator('[data-testid="session-id"]').textContent();

      // Assert - Sessions should be different
      expect(session1Id).not.toBe(session2Id);

      // Cleanup
      await newPage.close();
    });
  });

  test.describe('Performance and Reliability', () => {
    test('should handle rapid message requests efficiently', async () => {
      // Arrange
      await page.click('[data-testid="start-workflow-button"]');

      // Act - Rapidly click next message
      const startTime = Date.now();
      for (let i = 0; i < 5; i++) {
        await page.click('[data-testid="next-message-button"]');
        await waitForLoadingComplete(page);
      }
      const endTime = Date.now();

      // Assert - Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(10000); // 10 seconds
    });

    test('should maintain UI responsiveness during workflow progression', async () => {
      // Arrange
      await page.click('[data-testid="start-workflow-button"]');

      // Act - Progress through multiple stages
      for (let stage = 0; stage < 3; stage++) {
        // Add messages until decision point
        while (await page.locator('[data-testid="pending-decision"]').isVisible() === false) {
          await page.click('[data-testid="next-message-button"]');
          await waitForLoadingComplete(page);
        }

        // Make decision
        await page.click('[data-testid="decision-approve-button"]');
        await waitForLoadingComplete(page);
      }

      // Assert - UI should remain responsive
      await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();
      await expect(page.locator('[data-testid="message-list"]')).toBeVisible();
    });
  });
});
