import { test, expect } from '@playwright/test';
import { 
  mockApiRoutes, 
  startWorkflow, 
  progressToDecisionPoint, 
  makeDecision,
  getCurrentWorkflowStage,
  getMessageCount,
  isDecisionPointVisible,
  resetWorkflowState,
  waitForLoadingComplete
} from './utils/test-helpers';

test.describe('ChatInterface Enhanced - LangGraph Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Setup LangGraph workflow mocks
    await mockApiRoutes(page, {
      'langgraph-workflow': true,
      'crew-ai': false
    });
    
    await resetWorkflowState(page);
  });

  test.describe('LangGraph Workflow Integration', () => {
    test('should initialize workflow session through ChatInterface', async ({ page }) => {
      // Arrange
      await page.goto('/chat');

      // Act - Start workflow
      const sessionId = await startWorkflow(page, 'Enhanced Test Workflow', {
        domain: 'testing',
        complexity: 'medium'
      });

      // Assert
      expect(sessionId).toMatch(/session_\d+_\d+/);
      await expect(page.locator('[data-testid="workflow-status"]')).toContainText('IN_PROGRESS');
      await expect(page.locator('[data-testid="current-stage"]')).toContainText('Problem Capture');
    });

    test('should handle API-driven workflow state updates', async ({ page }) => {
      // Arrange
      await page.goto('/chat');
      await startWorkflow(page);

      // Act - Progress workflow
      const initialCount = await getMessageCount(page);
      await page.click('[data-testid="next-message-button"]');

      // Assert - State should update from API response
      await expect(page.locator('[data-testid="message-item"]')).toHaveCount(initialCount + 1);
      await expect(page.locator('[data-testid="loading-indicator"]')).not.toBeVisible();
    });

    test('should display agent messages with proper metadata', async ({ page }) => {
      // Arrange
      await page.goto('/chat');
      await startWorkflow(page);

      // Act - Get next message from agent
      await page.click('[data-testid="next-message-button"]');

      // Assert - Agent metadata should be displayed
      const lastMessage = page.locator('[data-testid="message-item"]').last();
      await expect(lastMessage).toHaveAttribute('data-agent-id', 'business_analyst');
      await expect(lastMessage).toContainText('Business Analyst');
    });

    test('should handle decision point interactions', async ({ page }) => {
      // Arrange
      await page.goto('/chat');
      await startWorkflow(page);

      // Act - Progress to decision point
      await progressToDecisionPoint(page);

      // Assert - Decision UI should be visible
      await expect(page.locator('[data-testid="pending-decision"]')).toBeVisible();
      await expect(page.locator('[data-testid="decision-approve-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="decision-refine-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="decision-reject-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="decision-pause-button"]')).toBeVisible();
    });

    test('should process decisions and advance workflow stages', async ({ page }) => {
      // Arrange
      await page.goto('/chat');
      await startWorkflow(page);
      await progressToDecisionPoint(page);

      const initialStage = await getCurrentWorkflowStage(page);

      // Act - Make approve decision
      await makeDecision(page, 'approve');

      // Assert - Should advance to next stage
      const newStage = await getCurrentWorkflowStage(page);
      expect(newStage).not.toBe(initialStage);
      await expect(page.locator('[data-testid="pending-decision"]')).not.toBeVisible();
    });

    test('should validate stage progression tracking', async ({ page }) => {
      // Arrange
      await page.goto('/chat');
      await startWorkflow(page);

      // Act - Progress through multiple messages
      await page.click('[data-testid="next-message-button"]');
      await page.click('[data-testid="next-message-button"]');

      // Assert - Progress should be tracked
      await expect(page.locator('[data-testid="stage-progress"]')).toContainText('60%');
    });
  });

  test.describe('Step-by-Step Message Release', () => {
    test('should release single messages only', async ({ page }) => {
      // Arrange
      await page.goto('/chat');
      await startWorkflow(page);

      // Act - Click next message multiple times quickly
      const initialCount = await getMessageCount(page);
      
      await page.click('[data-testid="next-message-button"]');
      await waitForLoadingComplete(page);
      
      await page.click('[data-testid="next-message-button"]');
      await waitForLoadingComplete(page);

      // Assert - Should only add messages one at a time
      const finalCount = await getMessageCount(page);
      expect(finalCount).toBe(initialCount + 2);
    });

    test('should disable next message button during API calls', async ({ page }) => {
      // Arrange
      await page.goto('/chat');
      await startWorkflow(page);

      // Act - Click next message
      await page.click('[data-testid="next-message-button"]');

      // Assert - Button should be disabled during loading
      await expect(page.locator('[data-testid="next-message-button"]')).toBeDisabled();
      
      // Wait for completion
      await expect(page.locator('[data-testid="loading-indicator"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="next-message-button"]')).not.toBeDisabled();
    });

    test('should maintain message chronological order', async ({ page }) => {
      // Arrange
      await page.goto('/chat');
      await startWorkflow(page);

      // Act - Add multiple messages
      await page.click('[data-testid="next-message-button"]');
      await waitForLoadingComplete(page);
      await page.click('[data-testid="next-message-button"]');
      await waitForLoadingComplete(page);

      // Assert - Messages should be in chronological order
      const messageElements = page.locator('[data-testid="message-item"]');
      const messageCount = await messageElements.count();
      
      for (let i = 0; i < messageCount - 1; i++) {
        const currentTimestamp = await messageElements.nth(i).getAttribute('data-timestamp');
        const nextTimestamp = await messageElements.nth(i + 1).getAttribute('data-timestamp');
        
        if (currentTimestamp && nextTimestamp) {
          expect(new Date(currentTimestamp).getTime()).toBeLessThanOrEqual(new Date(nextTimestamp).getTime());
        }
      }
    });
  });

  test.describe('Session State Management', () => {
    test('should persist session state across page reloads', async ({ page }) => {
      // Arrange
      await page.goto('/chat');
      const sessionId = await startWorkflow(page);
      await page.click('[data-testid="next-message-button"]');
      
      const messageCount = await getMessageCount(page);

      // Act - Reload page
      await page.reload();

      // Assert - State should be restored
      await expect(page.locator('[data-testid="session-id"]')).toContainText(sessionId);
      await expect(page.locator('[data-testid="message-item"]')).toHaveCount(messageCount);
    });

    test('should synchronize state with LangGraph service', async ({ page }) => {
      // Arrange
      await page.goto('/chat');
      await startWorkflow(page);

      // Act - Check status polling
      await waitForLoadingComplete(page);

      // Assert - Status should be synchronized
      await expect(page.locator('[data-testid="workflow-status"]')).toContainText('IN_PROGRESS');
    });

    test('should handle session recovery after errors', async ({ page }) => {
      // Arrange
      await page.goto('/chat');
      const sessionId = await startWorkflow(page);

      // Act - Mock service error then recovery
      await page.route('**/api/workflow/next', route => {
        route.fulfill({ status: 500, body: 'Service error' });
      });

      await page.click('[data-testid="next-message-button"]');
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();

      // Restore service
      await page.unroute('**/api/workflow/next');
      await page.click('[data-testid="retry-button"]');

      // Assert - Should recover session
      await expect(page.locator('[data-testid="session-id"]')).toContainText(sessionId);
      await expect(page.locator('[data-testid="error-message"]')).not.toBeVisible();
    });
  });

  test.describe('Decision Processing', () => {
    test('should handle different decision types', async ({ page }) => {
      // Arrange
      await page.goto('/chat');
      await startWorkflow(page);
      await progressToDecisionPoint(page);

      const decisionTypes = ['approve', 'refine', 'reject', 'pause'];

      for (const decision of decisionTypes) {
        // Reset to decision point for each test
        await page.reload();
        await progressToDecisionPoint(page);

        // Act - Make decision
        await page.click(`[data-testid="decision-${decision}-button"]`);

        // Assert - Decision should be processed
        await expect(page.locator('[data-testid="pending-decision"]')).not.toBeVisible();
        
        // Check decision message was added
        const lastMessage = page.locator('[data-testid="message-item"]').last();
        await expect(lastMessage).toContainText(`Decision: ${decision.toUpperCase()}`);
      }
    });

    test('should add decision messages to chat history', async ({ page }) => {
      // Arrange
      await page.goto('/chat');
      await startWorkflow(page);
      await progressToDecisionPoint(page);

      const initialCount = await getMessageCount(page);

      // Act - Make decision
      await makeDecision(page, 'approve');

      // Assert - Decision message should be added
      await expect(page.locator('[data-testid="message-item"]')).toHaveCount(initialCount + 1);
      await expect(page.locator('[data-testid="message-item"]').last()).toContainText('Decision: APPROVE');
    });

    test('should clear decision options after processing', async ({ page }) => {
      // Arrange
      await page.goto('/chat');
      await startWorkflow(page);
      await progressToDecisionPoint(page);

      // Act - Make decision
      await makeDecision(page, 'approve');

      // Assert - Decision options should be cleared
      await expect(page.locator('[data-testid="pending-decision"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="decision-options"]')).not.toBeVisible();
    });
  });

  test.describe('Error Handling Integration', () => {
    test('should display API errors in ChatInterface', async ({ page }) => {
      // Arrange
      await page.goto('/chat');
      await startWorkflow(page);

      // Act - Mock API error
      await page.route('**/api/workflow/next', route => {
        route.fulfill({ 
          status: 500, 
          body: JSON.stringify({ detail: 'API error for testing' })
        });
      });

      await page.click('[data-testid="next-message-button"]');

      // Assert - Error should be displayed in UI
      await expect(page.locator('[data-testid="error-message"]')).toContainText('API error for testing');
      await expect(page.locator('[data-testid="error-container"]')).toBeVisible();
    });

    test('should provide retry functionality for failed operations', async ({ page }) => {
      // Arrange
      await page.goto('/chat');
      await startWorkflow(page);

      // Act - Mock temporary error
      await page.route('**/api/workflow/next', route => {
        route.fulfill({ status: 500, body: 'Temporary error' });
      });

      await page.click('[data-testid="next-message-button"]');
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();

      // Restore service and retry
      await page.unroute('**/api/workflow/next');
      await page.click('[data-testid="retry-button"]');

      // Assert - Should recover and continue
      await expect(page.locator('[data-testid="error-message"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="message-item"]')).toHaveCount(2);
    });

    test('should handle timeout scenarios gracefully', async ({ page }) => {
      // Arrange
      await page.goto('/chat');
      await startWorkflow(page);

      // Act - Mock timeout
      await page.route('**/api/workflow/next', route => {
        route.fulfill({ 
          status: 408, 
          body: JSON.stringify({ detail: 'Request timeout' })
        });
      });

      await page.click('[data-testid="next-message-button"]');

      // Assert - Timeout should be handled gracefully
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Request timeout');
      await expect(page.locator('[data-testid="timeout-error-indicator"]')).toBeVisible();
    });
  });

  test.describe('Performance and Reliability', () => {
    test('should handle rapid user interactions', async ({ page }) => {
      // Arrange
      await page.goto('/chat');
      await startWorkflow(page);

      // Act - Rapidly click next message button
      const startTime = Date.now();
      for (let i = 0; i < 5; i++) {
        await page.click('[data-testid="next-message-button"]');
        await waitForLoadingComplete(page);
      }
      const endTime = Date.now();

      // Assert - Should handle rapid interactions without errors
      expect(endTime - startTime).toBeLessThan(10000); // Under 10 seconds
      await expect(page.locator('[data-testid="error-message"]')).not.toBeVisible();
    });

    test('should maintain UI responsiveness during workflow operations', async ({ page }) => {
      // Arrange
      await page.goto('/chat');
      await startWorkflow(page);

      // Act - Perform multiple workflow operations
      await page.click('[data-testid="next-message-button"]');
      await page.click('[data-testid="next-message-button"]');
      await page.click('[data-testid="next-message-button"]');

      // Assert - UI should remain responsive
      await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();
      await expect(page.locator('[data-testid="message-list"]')).toBeVisible();
      await expect(page.locator('[data-testid="workflow-controls"]')).toBeVisible();
    });

    test('should efficiently render large message histories', async ({ page }) => {
      // Arrange
      await page.goto('/chat');
      await startWorkflow(page);

      // Act - Add many messages
      for (let i = 0; i < 20; i++) {
        await page.click('[data-testid="next-message-button"]');
        await waitForLoadingComplete(page);
      }

      // Assert - Should handle large message lists efficiently
      const messageCount = await getMessageCount(page);
      expect(messageCount).toBe(21); // Welcome + 20 messages
      
      // Check if pagination or virtualization is working
      const isScrollable = await page.evaluate(() => {
        const messageList = document.querySelector('[data-testid="message-list"]');
        return messageList ? messageList.scrollHeight > messageList.clientHeight : false;
      });
      
      expect(isScrollable).toBe(true); // Should be scrollable with many messages
    });
  });
});
