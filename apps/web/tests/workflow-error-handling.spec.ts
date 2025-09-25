import { test, expect, Page } from '@playwright/test';
import { mockApiRoutes, waitForLoadingComplete } from './utils/test-helpers';

test.describe('Workflow Error Handling', () => {
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

  test.describe('API Error Handling', () => {
    test('should handle 400 Bad Request responses (invalid payloads)', async () => {
      // Arrange - Mock bad request error
      await page.route('**/api/workflow/start', route => {
        route.fulfill({ 
          status: 400, 
          body: JSON.stringify({ detail: 'Invalid request payload' })
        });
      });

      // Act - Try to start workflow with invalid data
      await page.click('[data-testid="start-workflow-button"]');

      // Assert
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid');
      await expect(page.locator('[data-testid="error-type"]')).toContainText('400');
    });

    test('should handle 404 Not Found responses (session not found)', async () => {
      // Arrange - Start workflow first
      await page.click('[data-testid="start-workflow-button"]');
      const sessionId = await page.locator('[data-testid="session-id"]').textContent();

      // Mock session not found
      await page.route(`**/api/workflow/status/${sessionId}`, route => {
        route.fulfill({ 
          status: 404, 
          body: JSON.stringify({ detail: 'Session not found' })
        });
      });

      // Act - Try to get status
      await page.reload();

      // Assert
      await expect(page.locator('[data-testid="error-message"]')).toContainText('not found');
      await expect(page.locator('[data-testid="error-type"]')).toContainText('404');
    });

    test('should handle 500 Internal Server Error responses (service failures)', async () => {
      // Arrange - Mock internal server error
      await page.route('**/api/workflow/start', route => {
        route.fulfill({ 
          status: 500, 
          body: JSON.stringify({ detail: 'Internal server error' })
        });
      });

      // Act - Try to start workflow
      await page.click('[data-testid="start-workflow-button"]');

      // Assert
      await expect(page.locator('[data-testid="error-message"]')).toContainText('server error');
      await expect(page.locator('[data-testid="error-type"]')).toContainText('500');
    });

    test('should handle 503 Service Unavailable responses (service down)', async () => {
      // Arrange - Mock service unavailable
      await page.route('**/api/workflow/start', route => {
        route.fulfill({ 
          status: 503, 
          body: JSON.stringify({ detail: 'Service unavailable' })
        });
      });

      // Act - Try to start workflow
      await page.click('[data-testid="start-workflow-button"]');

      // Assert
      await expect(page.locator('[data-testid="error-message"]')).toContainText('unavailable');
      await expect(page.locator('[data-testid="error-type"]')).toContainText('503');
    });

    test('should handle network timeout errors (10 second limit)', async () => {
      // Arrange - Mock timeout
      await page.route('**/api/workflow/start', route => {
        route.fulfill({ 
          status: 408, 
          body: JSON.stringify({ detail: 'Request timeout' })
        });
      });

      // Act - Try to start workflow
      await page.click('[data-testid="start-workflow-button"]');

      // Assert
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Request timeout');
      await expect(page.locator('[data-testid="error-type"]')).toContainText('408');
    });
  });

  test.describe('Workflow Service Errors', () => {
    test('should handle CrewAI service unavailable scenarios', async () => {
      // Arrange - Start workflow first
      await page.click('[data-testid="start-workflow-button"]');

      // Mock CrewAI service error
      await page.route('**/api/workflow/next', route => {
        route.fulfill({ 
          status: 500, 
          body: JSON.stringify({ detail: 'CrewAI service unavailable' })
        });
      });

      // Act - Try to get next message
      await page.click('[data-testid="next-message-button"]');

      // Assert
      await expect(page.locator('[data-testid="error-message"]')).toContainText('CrewAI service unavailable');
      await expect(page.locator('[data-testid="crewai-error-indicator"]')).toBeVisible();
    });

    test('should handle invalid workflow state transitions', async () => {
      // Arrange - Start workflow
      await page.click('[data-testid="start-workflow-button"]');

      // Mock invalid state transition
      await page.route('**/api/workflow/next', route => {
        route.fulfill({ 
          status: 400, 
          body: JSON.stringify({ detail: 'Invalid workflow state transition' })
        });
      });

      // Act - Try to progress workflow
      await page.click('[data-testid="next-message-button"]');

      // Assert
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid workflow state transition');
      await expect(page.locator('[data-testid="state-error-indicator"]')).toBeVisible();
    });

    test('should handle decision processing failures', async () => {
      // Arrange - Start workflow and progress to decision point
      await page.click('[data-testid="start-workflow-button"]');
      
      // Add messages until decision point appears
      while (await page.locator('[data-testid="pending-decision"]').isVisible() === false) {
        await page.click('[data-testid="next-message-button"]');
        await waitForLoadingComplete(page);
      }

      // Mock decision processing error
      await page.route('**/api/workflow/decision', route => {
        route.fulfill({ 
          status: 500, 
          body: JSON.stringify({ detail: 'Decision processing failed' })
        });
      });

      // Act - Try to make decision
      await page.click('[data-testid="decision-approve-button"]');

      // Assert
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Decision processing failed');
      await expect(page.locator('[data-testid="decision-error-indicator"]')).toBeVisible();
    });

    test('should handle stage validation errors', async () => {
      // Arrange - Start workflow
      await page.click('[data-testid="start-workflow-button"]');

      // Mock stage validation error
      await page.route('**/api/workflow/next', route => {
        route.fulfill({ 
          status: 400, 
          body: JSON.stringify({ detail: 'Stage validation failed' })
        });
      });

      // Act - Try to progress workflow
      await page.click('[data-testid="next-message-button"]');

      // Assert
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Stage validation failed');
      await expect(page.locator('[data-testid="validation-error-indicator"]')).toBeVisible();
    });

    test('should handle message parsing failures', async () => {
      // Arrange - Start workflow
      await page.click('[data-testid="start-workflow-button"]');

      // Mock message parsing error
      await page.route('**/api/workflow/next', route => {
        route.fulfill({ 
          status: 500, 
          body: JSON.stringify({ detail: 'Message parsing failed' })
        });
      });

      // Act - Try to get next message
      await page.click('[data-testid="next-message-button"]');

      // Assert
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Message parsing failed');
      await expect(page.locator('[data-testid="parsing-error-indicator"]')).toBeVisible();
    });
  });

  test.describe('Client-Side Error Handling', () => {
    test('should implement LangGraph client retry logic and exponential backoff', async () => {
      // Arrange - Start workflow
      await page.click('[data-testid="start-workflow-button"]');

      // Mock intermittent failures
      let callCount = 0;
      await page.route('**/api/workflow/next', route => {
        callCount++;
        if (callCount < 3) {
          route.fulfill({ status: 500, body: 'Temporary failure' });
        } else {
          route.fulfill({ status: 200, body: JSON.stringify({
            session_id: 'test_session',
            messages: [{ id: 'msg_1', content: 'Success after retry' }]
          })});
        }
      });

      // Act - Try to get next message
      await page.click('[data-testid="next-message-button"]');

      // Assert - Should retry and eventually succeed
      await expect(page.locator('[data-testid="retry-indicator"]')).toBeVisible();
      await expect(page.locator('[data-testid="message-item"]')).toHaveCount(2);
    });

    test('should propagate errors to ChatInterface component', async () => {
      // Arrange - Start workflow
      await page.click('[data-testid="start-workflow-button"]');

      // Mock error
      await page.route('**/api/workflow/next', route => {
        route.fulfill({ 
          status: 500, 
          body: JSON.stringify({ detail: 'Client error' })
        });
      });

      // Act - Try to progress workflow
      await page.click('[data-testid="next-message-button"]');

      // Assert - Error should be displayed in ChatInterface
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-container"]')).toBeVisible();
    });

    test('should display user-friendly error messages', async () => {
      // Arrange - Start workflow
      await page.click('[data-testid="start-workflow-button"]');

      // Mock technical error
      await page.route('**/api/workflow/next', route => {
        route.fulfill({ 
          status: 500, 
          body: JSON.stringify({ detail: 'Technical error: Database connection failed' })
        });
      });

      // Act - Try to progress workflow
      await page.click('[data-testid="next-message-button"]');

      // Assert - Should show user-friendly message
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Something went wrong');
      await expect(page.locator('[data-testid="technical-details"]')).toContainText('Database connection failed');
    });

    test('should provide error recovery and retry mechanisms', async () => {
      // Arrange - Start workflow
      await page.click('[data-testid="start-workflow-button"]');

      // Mock error
      await page.route('**/api/workflow/next', route => {
        route.fulfill({ 
          status: 500, 
          body: JSON.stringify({ detail: 'Recoverable error' })
        });
      });

      // Act - Try to progress workflow
      await page.click('[data-testid="next-message-button"]');

      // Assert - Should provide recovery options
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="recovery-options"]')).toBeVisible();
    });
  });

  test.describe('Session Management Errors', () => {
    test('should handle invalid session ID handling', async () => {
      // Arrange - Mock invalid session
      await page.route('**/api/workflow/status/invalid_session', route => {
        route.fulfill({ 
          status: 400, 
          body: JSON.stringify({ detail: 'Invalid session ID format' })
        });
      });

      // Act - Try to access invalid session
      await page.goto('/chat?session=invalid_session');

      // Assert
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid session ID format');
      await expect(page.locator('[data-testid="session-error-indicator"]')).toBeVisible();
    });

    test('should handle expired session scenarios', async () => {
      // Arrange - Start workflow
      await page.click('[data-testid="start-workflow-button"]');
      const sessionId = await page.locator('[data-testid="session-id"]').textContent();

      // Mock expired session
      await page.route(`**/api/workflow/status/${sessionId}`, route => {
        route.fulfill({ 
          status: 410, 
          body: JSON.stringify({ detail: 'Session expired' })
        });
      });

      // Act - Try to access expired session
      await page.reload();

      // Assert
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Session expired');
      await expect(page.locator('[data-testid="session-expired-indicator"]')).toBeVisible();
    });

    test('should handle concurrent session modification conflicts', async () => {
      // Arrange - Start workflow
      await page.click('[data-testid="start-workflow-button"]');
      const sessionId = await page.locator('[data-testid="session-id"]').textContent();

      // Mock conflict
      await page.route(`**/api/workflow/next`, route => {
        route.fulfill({ 
          status: 409, 
          body: JSON.stringify({ detail: 'Concurrent modification detected' })
        });
      });

      // Act - Try to modify session
      await page.click('[data-testid="next-message-button"]');

      // Assert
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Concurrent modification detected');
      await expect(page.locator('[data-testid="conflict-resolution"]')).toBeVisible();
    });

    test('should handle session cleanup after errors', async () => {
      // Arrange - Start workflow
      await page.click('[data-testid="start-workflow-button"]');
      const sessionId = await page.locator('[data-testid="session-id"]').textContent();

      // Mock session error
      await page.route(`**/api/workflow/status/${sessionId}`, route => {
        route.fulfill({ 
          status: 500, 
          body: JSON.stringify({ detail: 'Session corrupted' })
        });
      });

      // Act - Try to access corrupted session
      await page.reload();

      // Assert - Should cleanup corrupted session
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Session corrupted');
      await expect(page.locator('[data-testid="cleanup-session-button"]')).toBeVisible();
    });
  });

  test.describe('UI Error States', () => {
    test('should handle loading state handling during errors', async () => {
      // Arrange - Start workflow
      await page.click('[data-testid="start-workflow-button"]');

      // Mock error with delay
      await page.route('**/api/workflow/next', route => {
        route.fulfill({ 
          status: 500, 
          body: JSON.stringify({ detail: 'Error after loading' })
        });
      });

      // Act - Click next message
      await page.click('[data-testid="next-message-button"]');

      // Assert - Should show loading then error
      await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    });

    test('should display error message display in ChatInterface', async () => {
      // Arrange - Start workflow
      await page.click('[data-testid="start-workflow-button"]');

      // Mock error
      await page.route('**/api/workflow/next', route => {
        route.fulfill({ 
          status: 500, 
          body: JSON.stringify({ detail: 'UI error test' })
        });
      });

      // Act - Trigger error
      await page.click('[data-testid="next-message-button"]');

      // Assert - Error should be properly displayed
      await expect(page.locator('[data-testid="error-container"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText('UI error test');
      await expect(page.locator('[data-testid="error-timestamp"]')).toBeVisible();
    });

    test('should disable UI controls during errors', async () => {
      // Arrange - Start workflow
      await page.click('[data-testid="start-workflow-button"]');

      // Mock error
      await page.route('**/api/workflow/next', route => {
        route.fulfill({ 
          status: 500, 
          body: JSON.stringify({ detail: 'Control disable test' })
        });
      });

      // Act - Trigger error
      await page.click('[data-testid="next-message-button"]');

      // Assert - Controls should be disabled
      await expect(page.locator('[data-testid="next-message-button"]')).toBeDisabled();
      await expect(page.locator('[data-testid="decision-approve-button"]')).toBeDisabled();
    });

    test('should provide error recovery UI (retry buttons, refresh options)', async () => {
      // Arrange - Start workflow
      await page.click('[data-testid="start-workflow-button"]');

      // Mock error
      await page.route('**/api/workflow/next', route => {
        route.fulfill({ 
          status: 500, 
          body: JSON.stringify({ detail: 'Recovery UI test' })
        });
      });

      // Act - Trigger error
      await page.click('[data-testid="next-message-button"]');

      // Assert - Recovery options should be available
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="refresh-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="restart-workflow-button"]')).toBeVisible();
    });
  });

  test.describe('Data Validation Errors', () => {
    test('should handle malformed API responses', async () => {
      // Arrange - Start workflow
      await page.click('[data-testid="start-workflow-button"]');

      // Mock malformed response
      await page.route('**/api/workflow/next', route => {
        route.fulfill({ 
          status: 200, 
          body: 'Invalid JSON response'
        });
      });

      // Act - Try to get next message
      await page.click('[data-testid="next-message-button"]');

      // Assert
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid response format');
      await expect(page.locator('[data-testid="parsing-error-indicator"]')).toBeVisible();
    });

    test('should handle missing required fields in responses', async () => {
      // Arrange - Start workflow
      await page.click('[data-testid="start-workflow-button"]');

      // Mock incomplete response
      await page.route('**/api/workflow/next', route => {
        route.fulfill({ 
          status: 200, 
          body: JSON.stringify({ session_id: 'test' }) // Missing required fields
        });
      });

      // Act - Try to get next message
      await page.click('[data-testid="next-message-button"]');

      // Assert
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Missing required fields');
      await expect(page.locator('[data-testid="validation-error-indicator"]')).toBeVisible();
    });

    test('should handle type validation errors', async () => {
      // Arrange - Start workflow
      await page.click('[data-testid="start-workflow-button"]');

      // Mock type mismatch
      await page.route('**/api/workflow/next', route => {
        route.fulfill({ 
          status: 200, 
          body: JSON.stringify({ 
            session_id: 123, // Should be string
            current_stage: 'INVALID_STAGE' // Should be valid enum
          })
        });
      });

      // Act - Try to get next message
      await page.click('[data-testid="next-message-button"]');

      // Assert
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Type validation failed');
      await expect(page.locator('[data-testid="type-error-indicator"]')).toBeVisible();
    });

    test('should handle schema validation failures', async () => {
      // Arrange - Start workflow
      await page.click('[data-testid="start-workflow-button"]');

      // Mock schema violation
      await page.route('**/api/workflow/next', route => {
        route.fulfill({ 
          status: 200, 
          body: JSON.stringify({ 
            session_id: 'test',
            current_stage: 'PROBLEM_CAPTURE',
            invalid_field: 'should not exist'
          })
        });
      });

      // Act - Try to get next message
      await page.click('[data-testid="next-message-button"]');

      // Assert
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Schema validation failed');
      await expect(page.locator('[data-testid="schema-error-indicator"]')).toBeVisible();
    });
  });

  test.describe('Timeout Scenarios', () => {
    test('should handle request timeout handling (10 second limit)', async () => {
      // Arrange - Start workflow
      await page.click('[data-testid="start-workflow-button"]');

      // Mock timeout
      await page.route('**/api/workflow/next', route => {
        route.fulfill({ 
          status: 408, 
          body: JSON.stringify({ detail: 'Request timeout' })
        });
      });

      // Act - Try to get next message
      await page.click('[data-testid="next-message-button"]');

      // Assert
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Request timeout');
      await expect(page.locator('[data-testid="timeout-error-indicator"]')).toBeVisible();
    });

    test('should handle long-running workflow step timeouts', async () => {
      // Arrange - Start workflow
      await page.click('[data-testid="start-workflow-button"]');

      // Mock long-running step
      await page.route('**/api/workflow/next', route => {
        route.fulfill({ 
          status: 408, 
          body: JSON.stringify({ detail: 'Workflow step timeout' })
        });
      });

      // Act - Try to progress workflow
      await page.click('[data-testid="next-message-button"]');

      // Assert
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Workflow step timeout');
      await expect(page.locator('[data-testid="step-timeout-indicator"]')).toBeVisible();
    });

    test('should handle CrewAI service response timeouts', async () => {
      // Arrange - Start workflow
      await page.click('[data-testid="start-workflow-button"]');

      // Mock CrewAI timeout
      await page.route('**/api/workflow/next', route => {
        route.fulfill({ 
          status: 408, 
          body: JSON.stringify({ detail: 'CrewAI service timeout' })
        });
      });

      // Act - Try to get next message
      await page.click('[data-testid="next-message-button"]');

      // Assert
      await expect(page.locator('[data-testid="error-message"]')).toContainText('CrewAI service timeout');
      await expect(page.locator('[data-testid="crewai-timeout-indicator"]')).toBeVisible();
    });

    test('should handle client-side timeout recovery', async () => {
      // Arrange - Start workflow
      await page.click('[data-testid="start-workflow-button"]');

      // Mock timeout then recovery
      await page.route('**/api/workflow/next', route => {
        route.fulfill({ 
          status: 408, 
          body: JSON.stringify({ detail: 'Timeout for recovery test' })
        });
      });

      // Act - Trigger timeout
      await page.click('[data-testid="next-message-button"]');
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();

      // Restore normal operation
      await page.unroute('**/api/workflow/next');
      await page.click('[data-testid="retry-button"]');

      // Assert - Should recover from timeout
      await expect(page.locator('[data-testid="error-message"]')).not.toBeVisible();
    });
  });

  test.describe('Error Logging and Monitoring', () => {
    test('should implement error logging for debugging', async () => {
      // Arrange - Start workflow
      await page.click('[data-testid="start-workflow-button"]');

      // Mock error
      await page.route('**/api/workflow/next', route => {
        route.fulfill({ 
          status: 500, 
          body: JSON.stringify({ detail: 'Error for logging test' })
        });
      });

      // Act - Trigger error
      await page.click('[data-testid="next-message-button"]');

      // Assert - Should log error details
      const consoleLogs = await page.evaluate(() => {
        return (window as any).errorLogs || [];
      });

      expect(consoleLogs.length).toBeGreaterThan(0);
      expect(consoleLogs[0]).toContain('Error for logging test');
    });

    test('should implement error reporting and analytics', async () => {
      // Arrange - Start workflow
      await page.click('[data-testid="start-workflow-button"]');

      // Mock error
      await page.route('**/api/workflow/next', route => {
        route.fulfill({ 
          status: 500, 
          body: JSON.stringify({ detail: 'Error for analytics test' })
        });
      });

      // Act - Trigger error
      await page.click('[data-testid="next-message-button"]');

      // Assert - Should report error to analytics
      const analyticsEvents = await page.evaluate(() => {
        return (window as any).analyticsEvents || [];
      });

      expect(analyticsEvents.length).toBeGreaterThan(0);
      expect(analyticsEvents[0].type).toBe('error');
    });

    test('should implement error categorization and tracking', async () => {
      // Arrange - Start workflow
      await page.click('[data-testid="start-workflow-button"]');

      // Mock different error types
      const errorTypes = ['network', 'validation', 'server', 'timeout'];
      
      for (const errorType of errorTypes) {
        await page.route('**/api/workflow/next', route => {
          route.fulfill({ 
            status: 500, 
            body: JSON.stringify({ detail: `${errorType} error`, type: errorType })
          });
        });

        // Act - Trigger error
        await page.click('[data-testid="next-message-button"]');

        // Assert - Should categorize error correctly
        await expect(page.locator('[data-testid="error-category"]')).toContainText(errorType);
        
        // Clear error for next iteration
        await page.click('[data-testid="dismiss-error-button"]');
      }
    });

    test('should monitor performance impact of error handling', async () => {
      // Arrange - Start workflow
      await page.click('[data-testid="start-workflow-button"]');

      // Mock error
      await page.route('**/api/workflow/next', route => {
        route.fulfill({ 
          status: 500, 
          body: JSON.stringify({ detail: 'Performance test error' })
        });
      });

      // Act - Measure error handling performance
      const startTime = Date.now();
      await page.click('[data-testid="next-message-button"]');
      await page.waitForSelector('[data-testid="error-message"]');
      const endTime = Date.now();

      // Assert - Error handling should be performant
      const errorHandlingTime = endTime - startTime;
      expect(errorHandlingTime).toBeLessThan(2000); // Under 2 seconds
    });
  });
});
