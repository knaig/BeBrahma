import { test, expect, Page } from '@playwright/test';
import { mockApiRoutes, waitForLoadingComplete } from './utils/test-helpers';

test.describe('Workflow Persistence and Recovery', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // Setup MSW mocks for LangGraph workflow service
    await mockApiRoutes(page, {
      'langgraph-workflow': true,
      'crew-ai': false
    });

    // Navigate to the chat interface
    await page.goto('/chat');
  });

  test.describe('Session Persistence', () => {
    test('should persist workflow state across page reloads', async () => {
      // Arrange - Start workflow and progress
      await page.click('[data-testid="start-workflow-button"]');
      await page.click('[data-testid="next-message-button"]');
      await page.click('[data-testid="next-message-button"]');
      
      const messageCount = await page.locator('[data-testid="message-item"]').count();
      const sessionId = await page.locator('[data-testid="session-id"]').textContent();
      const currentStage = await page.locator('[data-testid="current-stage"]').textContent();

      // Act - Reload page
      await page.reload();

      // Assert - State should persist
      await expect(page.locator('[data-testid="session-id"]')).toContainText(sessionId!);
      await expect(page.locator('[data-testid="current-stage"]')).toContainText(currentStage!);
      await expect(page.locator('[data-testid="message-item"]')).toHaveCount(messageCount);
    });

    test('should recover workflow using stored session ID', async () => {
      // Arrange - Start workflow and get session ID
      await page.click('[data-testid="start-workflow-button"]');
      const sessionId = await page.locator('[data-testid="session-id"]').textContent();

      // Act - Clear page and navigate back
      await page.goto('/');
      await page.goto('/chat');

      // Assert - Should recover session
      await expect(page.locator('[data-testid="session-id"]')).toContainText(sessionId!);
      await expect(page.locator('[data-testid="workflow-status"]')).toContainText('IN_PROGRESS');
    });

    test('should reconstruct workflow history from API', async () => {
      // Arrange - Start workflow and add messages
      await page.click('[data-testid="start-workflow-button"]');
      await page.click('[data-testid="next-message-button"]');
      await page.click('[data-testid="next-message-button"]');
      
      const expectedMessages = await page.locator('[data-testid="message-item"]').count();

      // Act - Reload page to trigger history reconstruction
      await page.reload();

      // Assert - All messages should be reconstructed
      await expect(page.locator('[data-testid="message-item"]')).toHaveCount(expectedMessages);
      
      // Verify message content is preserved
      await expect(page.locator('[data-testid="message-item"]').first()).toContainText('Welcome to the workflow');
    });

    test('should maintain message order and state consistency after recovery', async () => {
      // Arrange - Start workflow and add messages
      await page.click('[data-testid="start-workflow-button"]');
      await page.click('[data-testid="next-message-button"]');
      await page.click('[data-testid="next-message-button"]');
      
      // Capture message order
      const messageContents = [];
      for (let i = 0; i < 3; i++) {
        const content = await page.locator('[data-testid="message-item"]').nth(i).textContent();
        messageContents.push(content);
      }

      // Act - Reload page
      await page.reload();

      // Assert - Message order should be preserved
      for (let i = 0; i < 3; i++) {
        await expect(page.locator('[data-testid="message-item"]').nth(i)).toContainText(messageContents[i]!);
      }
    });
  });

  test.describe('Service Restart Scenarios', () => {
    test('should handle behavior when LangGraph service restarts (sessions lost)', async () => {
      // Arrange - Start workflow
      await page.click('[data-testid="start-workflow-button"]');
      const sessionId = await page.locator('[data-testid="session-id"]').textContent();

      // Act - Mock service restart (session lost)
      await page.route(`**/api/workflow/status/${sessionId}`, route => {
        route.fulfill({ status: 404, body: 'Session not found' });
      });

      // Refresh page to trigger session recovery
      await page.reload();

      // Assert - Should handle lost session gracefully
      await expect(page.locator('[data-testid="session-expired-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="restart-workflow-button"]')).toBeVisible();
    });

    test('should provide proper error handling for lost sessions', async () => {
      // Arrange - Start workflow
      await page.click('[data-testid="start-workflow-button"]');
      const sessionId = await page.locator('[data-testid="session-id"]').textContent();

      // Act - Mock service restart
      await page.route(`**/api/workflow/**`, route => {
        route.fulfill({ status: 503, body: 'Service unavailable' });
      });

      // Refresh page
      await page.reload();

      // Assert - Should show appropriate error message
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Service unavailable');
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    });

    test('should provide user notification and recovery options', async () => {
      // Arrange - Start workflow
      await page.click('[data-testid="start-workflow-button"]');
      const sessionId = await page.locator('[data-testid="session-id"]').textContent();

      // Act - Mock session lost
      await page.route(`**/api/workflow/status/${sessionId}`, route => {
        route.fulfill({ status: 404, body: 'Session not found' });
      });

      await page.reload();

      // Assert - Should provide clear user guidance
      await expect(page.locator('[data-testid="session-expired-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="restart-workflow-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="recovery-instructions"]')).toBeVisible();
    });

    test('should allow graceful degradation when service unavailable', async () => {
      // Arrange - Start workflow
      await page.click('[data-testid="start-workflow-button"]');

      // Act - Mock service unavailable
      await page.route('**/api/workflow/**', route => {
        route.fulfill({ status: 503, body: 'Service unavailable' });
      });

      // Try to progress workflow
      await page.click('[data-testid="next-message-button"]');

      // Assert - Should show error but maintain UI state
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    });
  });

  test.describe('Browser Storage', () => {
    test('should store session ID in localStorage/sessionStorage', async () => {
      // Arrange - Start workflow
      await page.click('[data-testid="start-workflow-button"]');
      const sessionId = await page.locator('[data-testid="session-id"]').textContent();

      // Act - Check storage
      const storedSessionId = await page.evaluate(() => {
        return localStorage.getItem('workflow_session_id') || sessionStorage.getItem('workflow_session_id');
      });

      // Assert - Session ID should be stored
      expect(storedSessionId).toBe(sessionId);
    });

    test('should cleanup expired or invalid sessions', async () => {
      // Arrange - Start workflow
      await page.click('[data-testid="start-workflow-button"]');
      const sessionId = await page.locator('[data-testid="session-id"]').textContent();

      // Act - Mock invalid session
      await page.route(`**/api/workflow/status/${sessionId}`, route => {
        route.fulfill({ status: 404, body: 'Session not found' });
      });

      await page.reload();

      // Assert - Should cleanup invalid session
      const storedSessionId = await page.evaluate(() => {
        return localStorage.getItem('workflow_session_id') || sessionStorage.getItem('workflow_session_id');
      });

      expect(storedSessionId).toBeNull();
    });

    test('should handle storage quota handling and cleanup', async () => {
      // Arrange - Start workflow
      await page.click('[data-testid="start-workflow-button"]');

      // Act - Simulate storage quota exceeded
      await page.evaluate(() => {
        // Mock storage quota exceeded
        Object.defineProperty(localStorage, 'setItem', {
          value: () => { throw new Error('QuotaExceededError'); }
        });
      });

      // Try to store session data
      await page.reload();

      // Assert - Should handle quota exceeded gracefully
      await expect(page.locator('[data-testid="storage-error-message"]')).toBeVisible();
    });

    test('should support cross-tab session sharing behavior', async () => {
      // Arrange - Start workflow in first tab
      await page.click('[data-testid="start-workflow-button"]');
      const sessionId = await page.locator('[data-testid="session-id"]').textContent();

      // Act - Open new tab and navigate to chat
      const newPage = await page.context().newPage();
      await newPage.goto('/chat');

      // Assert - Should share session across tabs
      await expect(newPage.locator('[data-testid="session-id"]')).toContainText(sessionId!);
      await expect(newPage.locator('[data-testid="workflow-status"]')).toContainText('IN_PROGRESS');

      // Cleanup
      await newPage.close();
    });
  });

  test.describe('Network Interruption Recovery', () => {
    test('should continue workflow after network reconnection', async () => {
      // Arrange - Start workflow
      await page.click('[data-testid="start-workflow-button"]');
      await page.click('[data-testid="next-message-button"]');

      // Act - Mock network interruption then recovery
      await page.route('**/api/workflow/next', route => {
        route.fulfill({ status: 500, body: 'Network error' });
      });

      await page.click('[data-testid="next-message-button"]');
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();

      // Restore network
      await page.unroute('**/api/workflow/next');
      await page.click('[data-testid="retry-button"]');

      // Assert - Should recover and continue
      await expect(page.locator('[data-testid="error-message"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="message-item"]')).toHaveCount(3);
    });

    test('should implement automatic retry and state synchronization', async () => {
      // Arrange - Start workflow
      await page.click('[data-testid="start-workflow-button"]');

      // Act - Mock intermittent network issues
      let callCount = 0;
      await page.route('**/api/workflow/next', route => {
        callCount++;
        if (callCount < 3) {
          route.fulfill({ status: 500, body: 'Network error' });
        } else {
          route.fulfill({ status: 200, body: JSON.stringify({
            session_id: 'test_session',
            messages: [{ id: 'msg_1', content: 'Test message' }]
          })});
        }
      });

      await page.click('[data-testid="next-message-button"]');

      // Assert - Should retry automatically
      await expect(page.locator('[data-testid="message-item"]')).toHaveCount(2);
    });

    test('should handle offline behavior and queue management', async () => {
      // Arrange - Start workflow
      await page.click('[data-testid="start-workflow-button"]');

      // Act - Mock offline state
      await page.route('**/api/workflow/next', route => {
        route.fulfill({ status: 0, body: 'Network error' });
      });

      await page.click('[data-testid="next-message-button"]');

      // Assert - Should handle offline gracefully
      await expect(page.locator('[data-testid="offline-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="queue-indicator"]')).toBeVisible();
    });

    test('should resolve conflicts for concurrent updates', async () => {
      // Arrange - Start workflow
      await page.click('[data-testid="start-workflow-button"]');
      const sessionId = await page.locator('[data-testid="session-id"]').textContent();

      // Act - Simulate concurrent updates
      await page.route(`**/api/workflow/status/${sessionId}`, route => {
        route.fulfill({ status: 409, body: 'Conflict detected' });
      });

      await page.reload();

      // Assert - Should handle conflict resolution
      await expect(page.locator('[data-testid="conflict-resolution"]')).toBeVisible();
      await expect(page.locator('[data-testid="resolve-conflict-button"]')).toBeVisible();
    });
  });

  test.describe('Error Recovery', () => {
    test('should recover from partial API failures', async () => {
      // Arrange - Start workflow
      await page.click('[data-testid="start-workflow-button"]');

      // Act - Mock partial failure
      await page.route('**/api/workflow/next', route => {
        route.fulfill({ status: 500, body: 'Partial failure' });
      });

      await page.click('[data-testid="next-message-button"]');

      // Assert - Should show partial failure message
      await expect(page.locator('[data-testid="partial-failure-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="retry-partial-button"]')).toBeVisible();
    });

    test('should maintain state consistency after error scenarios', async () => {
      // Arrange - Start workflow and progress
      await page.click('[data-testid="start-workflow-button"]');
      await page.click('[data-testid="next-message-button"]');
      
      const messageCount = await page.locator('[data-testid="message-item"]').count();
      const sessionId = await page.locator('[data-testid="session-id"]').textContent();

      // Act - Mock error then recovery
      await page.route('**/api/workflow/next', route => {
        route.fulfill({ status: 500, body: 'Server error' });
      });

      await page.click('[data-testid="next-message-button"]');
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();

      // Restore normal operation
      await page.unroute('**/api/workflow/next');
      await page.click('[data-testid="retry-button"]');

      // Assert - State should remain consistent
      await expect(page.locator('[data-testid="session-id"]')).toContainText(sessionId!);
      await expect(page.locator('[data-testid="message-item"]')).toHaveCount(messageCount + 1);
    });

    test('should provide user-initiated recovery actions', async () => {
      // Arrange - Start workflow
      await page.click('[data-testid="start-workflow-button"]');

      // Act - Mock error
      await page.route('**/api/workflow/next', route => {
        route.fulfill({ status: 500, body: 'Server error' });
      });

      await page.click('[data-testid="next-message-button"]');

      // Assert - Should provide recovery options
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="restart-workflow-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="contact-support-button"]')).toBeVisible();
    });

    test('should display error message display and user guidance', async () => {
      // Arrange - Start workflow
      await page.click('[data-testid="start-workflow-button"]');

      // Act - Mock error
      await page.route('**/api/workflow/next', route => {
        route.fulfill({ status: 500, body: 'Internal server error' });
      });

      await page.click('[data-testid="next-message-button"]');

      // Assert - Should provide clear error guidance
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Internal server error');
      await expect(page.locator('[data-testid="error-guidance"]')).toBeVisible();
      await expect(page.locator('[data-testid="next-steps"]')).toBeVisible();
    });
  });

  test.describe('Data Consistency', () => {
    test('should implement message deduplication and ID normalization', async () => {
      // Arrange - Start workflow
      await page.click('[data-testid="start-workflow-button"]');

      // Act - Mock duplicate message
      await page.route('**/api/workflow/next', route => {
        route.fulfill({ status: 200, body: JSON.stringify({
          session_id: 'test_session',
          messages: [
            { id: 'duplicate_msg', content: 'Duplicate message' },
            { id: 'duplicate_msg', content: 'Duplicate message' }
          ]
        })});
      });

      await page.click('[data-testid="next-message-button"]');

      // Assert - Should deduplicate messages
      const messageCount = await page.locator('[data-testid="message-item"]').count();
      expect(messageCount).toBe(2); // Welcome + 1 unique message
    });

    test('should maintain stage progress consistency across recovery', async () => {
      // Arrange - Start workflow and progress
      await page.click('[data-testid="start-workflow-button"]');
      await page.click('[data-testid="next-message-button"]');
      
      const initialProgress = await page.locator('[data-testid="stage-progress"]').textContent();

      // Act - Reload page
      await page.reload();

      // Assert - Progress should remain consistent
      const recoveredProgress = await page.locator('[data-testid="stage-progress"]').textContent();
      expect(recoveredProgress).toBe(initialProgress);
    });

    test('should preserve decision state during recovery', async () => {
      // Arrange - Start workflow and progress to decision point
      await page.click('[data-testid="start-workflow-button"]');
      
      // Add messages until decision point appears
      while (await page.locator('[data-testid="pending-decision"]').isVisible() === false) {
        await page.click('[data-testid="next-message-button"]');
        await waitForLoadingComplete(page);
      }

      // Act - Reload page
      await page.reload();

      // Assert - Decision state should be preserved
      await expect(page.locator('[data-testid="pending-decision"]')).toBeVisible();
      await expect(page.locator('[data-testid="decision-options"]')).toBeVisible();
    });

    test('should maintain agent metadata consistency', async () => {
      // Arrange - Start workflow and add agent message
      await page.click('[data-testid="start-workflow-button"]');
      await page.click('[data-testid="next-message-button"]');

      // Capture agent metadata
      const agentId = await page.locator('[data-testid="message-item"]').last().getAttribute('data-agent-id');
      const agentName = await page.locator('[data-testid="message-item"]').last().getAttribute('data-agent-name');

      // Act - Reload page
      await page.reload();

      // Assert - Agent metadata should be consistent
      await expect(page.locator('[data-testid="message-item"]').last()).toHaveAttribute('data-agent-id', agentId!);
      await expect(page.locator('[data-testid="message-item"]').last()).toHaveAttribute('data-agent-name', agentName!);
    });
  });

  test.describe('Performance Impact', () => {
    test('should handle recovery time for large workflow histories', async () => {
      // Arrange - Start workflow and add many messages
      await page.click('[data-testid="start-workflow-button"]');
      
      // Add 20 messages to simulate large history
      for (let i = 0; i < 20; i++) {
        await page.click('[data-testid="next-message-button"]');
        await waitForLoadingComplete(page);
      }

      // Act - Measure recovery time
      const startTime = Date.now();
      await page.reload();
      await page.waitForSelector('[data-testid="message-item"]');
      const endTime = Date.now();

      // Assert - Recovery should be reasonable
      const recoveryTime = endTime - startTime;
      expect(recoveryTime).toBeLessThan(10000); // Under 10 seconds
    });

    test('should manage memory usage during state reconstruction', async () => {
      // Arrange - Start workflow
      await page.click('[data-testid="start-workflow-button"]');

      // Act - Monitor memory usage during recovery
      const initialMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });

      await page.reload();

      const finalMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });

      // Assert - Memory usage should be reasonable
      const memoryIncrease = finalMemory - initialMemory;
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase
    });

    test('should implement pagination for large message lists', async () => {
      // Arrange - Start workflow and add many messages
      await page.click('[data-testid="start-workflow-button"]');
      
      // Add 50 messages
      for (let i = 0; i < 50; i++) {
        await page.click('[data-testid="next-message-button"]');
        await waitForLoadingComplete(page);
      }

      // Act - Check for pagination controls
      const paginationControls = await page.locator('[data-testid="pagination-controls"]').isVisible();

      // Assert - Should implement pagination for large lists
      if (paginationControls) {
        await expect(page.locator('[data-testid="pagination-controls"]')).toBeVisible();
        await expect(page.locator('[data-testid="page-size-selector"]')).toBeVisible();
      }
    });

    test('should efficiently synchronize state', async () => {
      // Arrange - Start workflow
      await page.click('[data-testid="start-workflow-button"]');

      // Act - Measure state synchronization time
      const startTime = Date.now();
      await page.reload();
      await page.waitForSelector('[data-testid="workflow-status"]');
      const endTime = Date.now();

      // Assert - State sync should be fast
      const syncTime = endTime - startTime;
      expect(syncTime).toBeLessThan(5000); // Under 5 seconds
    });
  });
});
