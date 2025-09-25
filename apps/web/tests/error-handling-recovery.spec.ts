import { test, expect } from '@playwright/test';
import { mockApiRoutes } from './utils/test-helpers';
import { 
  waitForOnboardingStepLoad,
  waitForDashboardLoad,
  waitForChatInterfaceLoad,
  setupJourneyMocks,
  simulateOnboardingError,
  simulateDashboardError,
  simulateChatError,
  simulateNetworkInterruption,
  generateOnboardingData
} from './utils/streamlined-journey-helpers';

test.describe('Error Handling and Recovery - Streamlined User Journey', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page);
    await setupJourneyMocks(page, 'error-testing');
  });

  test.describe('Network Failure Handling', () => {
    test('Onboarding form submission failures and retry mechanisms', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      
      // Simulate network failure
      await simulateNetworkInterruption(page, 5000);
      
      // Fill form and attempt submission
      await page.fill('[data-testid="company-name"]', 'Test Company');
      await page.selectOption('[data-testid="industry-select"]', 'technology');
      await page.click('[data-testid="next-step"]');
      
      // Verify error handling
      await expect(page.locator('[data-testid="network-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Network connection lost');
      
      // Verify retry mechanism
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="retry-button"]')).toBeEnabled();
      
      // Test retry
      await page.click('[data-testid="retry-button"]');
      await expect(page.locator('[data-testid="retry-loading"]')).toBeVisible();
      
      // Wait for recovery
      await expect(page.locator('[data-testid="step-2"]')).toBeVisible();
    });

    test('Dashboard behavior when system status APIs are unavailable', async ({ page }) => {
      await simulateDashboardError(page, 'system-status');
      await page.goto('/dashboard');
      
      // Verify error state
      await expect(page.locator('[data-testid="error-state"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Unable to load system status');
      
      // Test retry mechanism
      await page.click('[data-testid="retry-button"]');
      await expect(page.locator('[data-testid="retry-loading"]')).toBeVisible();
      
      // Wait for recovery
      await expect(page.locator('[data-testid="system-status"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-state"]')).not.toBeVisible();
    });

    test('ChatInterface error handling during workflow API failures', async ({ page }) => {
      await simulateChatError(page, 'workflow-init');
      await page.goto('/test-chat');
      
      // Verify error state
      await expect(page.locator('[data-testid="error-state"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Failed to initialize workflow');
      
      // Test retry
      await page.click('[data-testid="retry-button"]');
      await expect(page.locator('[data-testid="retry-loading"]')).toBeVisible();
      
      // Wait for recovery
      await waitForChatInterfaceLoad(page);
      await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();
    });

    test('Graceful degradation when LangGraph service is down', async ({ page }) => {
      // Mock LangGraph service down
      await mockApiRoutes(page, { langgraphServiceDown: true });
      
      await page.goto('/test-chat');
      
      // Verify graceful degradation
      await expect(page.locator('[data-testid="degraded-mode"]')).toBeVisible();
      await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
      
      // Test offline functionality
      await expect(page.locator('[data-testid="offline-actions"]')).toBeVisible();
      await expect(page.locator('[data-testid="local-storage"]')).toBeVisible();
    });
  });

  test.describe('Session Recovery and Persistence', () => {
    test('Onboarding session recovery after network interruption', async ({ page }) => {
      const userData = generateOnboardingData('simple-startup');
      
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      
      // Fill step 1
      await page.fill('[data-testid="company-name"]', userData.companyName);
      await page.selectOption('[data-testid="industry-select"]', 'technology');
      
      // Save progress
      await page.click('[data-testid="save-progress"]');
      await expect(page.locator('[data-testid="progress-saved"]')).toBeVisible();
      
      // Simulate network interruption
      await simulateNetworkInterruption(page, 3000);
      
      // Attempt to proceed
      await page.click('[data-testid="next-step"]');
      await expect(page.locator('[data-testid="network-error"]')).toBeVisible();
      
      // Test recovery
      await page.click('[data-testid="retry-button"]');
      await expect(page.locator('[data-testid="step-2"]')).toBeVisible();
      
      // Verify data persisted
      await expect(page.locator('[data-testid="company-name-display"]')).toContainText(userData.companyName);
    });

    test('Dashboard state recovery after page reload', async ({ page }) => {
      const userData = generateOnboardingData('simple-startup');
      
      // Complete onboarding to reach dashboard
      await page.goto('/onboarding');
      // ... complete onboarding steps
      await expect(page).toHaveURL('/dashboard');
      
      // Perform dashboard actions
      await page.click('[data-testid="refresh-status"]');
      await expect(page.locator('[data-testid="status-updated"]')).toBeVisible();
      
      // Reload page
      await page.reload();
      await waitForDashboardLoad(page);
      
      // Verify state recovered
      await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-profile"]')).toContainText(userData.companyName);
    });

    test('ChatInterface session recovery and workflow state restoration', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Progress through workflow
      await page.click('[data-testid="next-message"]');
      await expect(page.locator('[data-testid="agent-message"]')).toBeVisible();
      
      // Get workflow state
      const workflowStage = await page.locator('[data-testid="workflow-stage"]').textContent();
      const progress = await page.locator('[data-testid="progress-percentage"]').textContent();
      
      // Reload page
      await page.reload();
      await waitForChatInterfaceLoad(page);
      
      // Verify state restored
      const recoveredStage = await page.locator('[data-testid="workflow-stage"]').textContent();
      const recoveredProgress = await page.locator('[data-testid="progress-percentage"]').textContent();
      
      expect(recoveredStage).toBe(workflowStage);
      expect(recoveredProgress).toBe(progress);
      
      // Verify message history restored
      await expect(page.locator('[data-testid="message-history"]')).toBeVisible();
      await expect(page.locator('[data-testid="agent-message"]')).toBeVisible();
    });

    test('Workflow state preservation across browser refresh', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Progress through workflow
      await page.click('[data-testid="next-message"]');
      await expect(page.locator('[data-testid="agent-message"]')).toBeVisible();
      
      // Get workflow state
      const workflowStage = await page.locator('[data-testid="workflow-stage"]').textContent();
      
      // Refresh page
      await page.reload();
      
      // Verify workflow state preserved
      await waitForChatInterfaceLoad(page);
      const recoveredStage = await page.locator('[data-testid="workflow-stage"]').textContent();
      expect(recoveredStage).toBe(workflowStage);
    });
  });

  test.describe('User-Friendly Error Messages', () => {
    test('Error message display and formatting across all components', async ({ page }) => {
      // Test onboarding error messages
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      
      await page.click('[data-testid="next-step"]');
      await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Company name is required');
      
      // Test dashboard error messages
      await simulateDashboardError(page, 'system-status');
      await page.goto('/dashboard');
      
      await expect(page.locator('[data-testid="error-banner"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-details"]')).toBeVisible();
      
      // Test chat interface error messages
      await simulateChatError(page, 'workflow-init');
      await page.goto('/test-chat');
      
      await expect(page.locator('[data-testid="error-state"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    });

    test('Error message accessibility and screen reader compatibility', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      
      // Test error accessibility
      await page.click('[data-testid="next-step"]');
      await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
      
      // Verify screen reader compatibility
      await expect(page.locator('[data-testid="sr-error"]')).toHaveAttribute('aria-live', 'polite');
      await expect(page.locator('[data-testid="sr-error"]')).toHaveAttribute('role', 'alert');
      
      // Verify error announcement
      await expect(page.locator('[data-testid="error-announcement"]')).toBeVisible();
      await expect(page.locator('[data-testid="sr-focus"]')).toBeVisible();
    });

    test('Error message theming and visual consistency', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Test light theme error styling
      await expect(page.locator('[data-testid="light-theme"]')).toBeVisible();
      await expect(page.locator('[data-testid="light-error"]')).toBeVisible();
      
      // Switch to dark theme
      await page.click('[data-testid="theme-toggle"]');
      await page.waitForTimeout(100);
      
      // Verify dark theme error styling
      await expect(page.locator('[data-testid="dark-theme"]')).toBeVisible();
      await expect(page.locator('[data-testid="dark-error"]')).toBeVisible();
      
      // Verify theme consistency
      await expect(page.locator('[data-testid="theme-consistent"]')).toBeVisible();
    });

    test('Error message actionability and user guidance', async ({ page }) => {
      await page.goto('/test-chat');
      await simulateChatError(page, 'workflow-init');
      
      // Verify error message with actions
      await expect(page.locator('[data-testid="error-state"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-actions"]')).toBeVisible();
      
      // Verify user guidance
      await expect(page.locator('[data-testid="error-help"]')).toBeVisible();
      await expect(page.locator('[data-testid="support-link"]')).toBeVisible();
      
      // Verify actionable buttons
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="restart-button"]')).toBeVisible();
    });
  });

  test.describe('Retry and Recovery Mechanisms', () => {
    test('Automatic retry logic for failed API calls', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Simulate temporary API failure
      await page.route('**/api/workflow/next', route => 
        route.fulfill({ status: 500, body: 'Internal Server Error' })
      );
      
      // Attempt operation
      await page.click('[data-testid="next-message"]');
      await expect(page.locator('[data-testid="error-state"]')).toBeVisible();
      
      // Verify automatic retry
      await expect(page.locator('[data-testid="auto-retry"]')).toBeVisible();
      await expect(page.locator('[data-testid="retry-count"]')).toHaveText('1');
      
      // Wait for retry completion
      await expect(page.locator('[data-testid="retry-success"]')).toBeVisible();
      
      // Restore route
      await page.unroute('**/api/workflow/next');
    });

    test('Manual retry options and user-initiated recovery', async ({ page }) => {
      await page.goto('/test-chat');
      await simulateChatError(page, 'workflow-init');
      
      // Verify manual retry options
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="retry-button"]')).toBeEnabled();
      
      // Test manual retry
      await page.click('[data-testid="retry-button"]');
      await expect(page.locator('[data-testid="retry-loading"]')).toBeVisible();
      
      // Wait for recovery
      await expect(page.locator('[data-testid="retry-success"]')).toBeVisible();
      await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();
    });

    test('Exponential backoff and rate limiting during retries', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Simulate persistent API failure
      await page.route('**/api/workflow/next', route => 
        route.fulfill({ status: 500, body: 'Internal Server Error' })
      );
      
      // Attempt operation
      await page.click('[data-testid="next-message"]');
      await expect(page.locator('[data-testid="error-state"]')).toBeVisible();
      
      // Verify exponential backoff
      await expect(page.locator('[data-testid="backoff-active"]')).toBeVisible();
      await expect(page.locator('[data-testid="retry-delay"]')).toBeVisible();
      
      // Verify rate limiting
      await expect(page.locator('[data-testid="rate-limit"]')).toBeVisible();
      await expect(page.locator('[data-testid="retry-schedule"]')).toBeVisible();
      
      // Restore route
      await page.unroute('**/api/workflow/next');
    });

    test('Recovery success feedback and state restoration', async ({ page }) => {
      await page.goto('/test-chat');
      await simulateChatError(page, 'workflow-init');
      
      // Attempt recovery
      await page.click('[data-testid="retry-button"]');
      await expect(page.locator('[data-testid="retry-loading"]')).toBeVisible();
      
      // Wait for recovery
      await expect(page.locator('[data-testid="recovery-success"]')).toBeVisible();
      await expect(page.locator('[data-testid="state-restored"]')).toBeVisible();
      
      // Verify workflow can continue
      await expect(page.locator('[data-testid="next-message"]')).toBeEnabled();
    });
  });

  test.describe('Partial Failure Scenarios', () => {
    test('Onboarding with partial form submission failures', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      
      // Fill step 1
      await page.fill('[data-testid="company-name"]', 'Test Company');
      await page.selectOption('[data-testid="industry-select"]', 'technology');
      
      // Simulate partial failure
      await page.route('**/api/onboarding/step', route => {
        if (route.request().postDataJSON()?.step === 1) {
          route.fulfill({ status: 500, body: 'Server Error' });
        } else {
          route.continue();
        }
      });
      
      // Attempt submission
      await page.click('[data-testid="next-step"]');
      await expect(page.locator('[data-testid="submission-error"]')).toBeVisible();
      
      // Test partial recovery
      await page.click('[data-testid="retry-button"]');
      await expect(page.locator('[data-testid="step-2"]')).toBeVisible();
      
      // Restore route
      await page.unroute('**/api/onboarding/step');
    });

    test('Dashboard with some system status indicators failing', async ({ page }) => {
      await simulateDashboardError(page, 'partial-status');
      await page.goto('/dashboard');
      
      // Verify partial status display
      await expect(page.locator('[data-testid="system-status"]')).toBeVisible();
      
      // Check which services are available
      const availableServices = page.locator('[data-testid="status-available"]');
      const unavailableServices = page.locator('[data-testid="status-unavailable"]');
      
      await expect(availableServices).toBeVisible();
      await expect(unavailableServices).toBeVisible();
      
      // Verify degradation message
      await expect(page.locator('[data-testid="degradation-notice"]')).toBeVisible();
    });

    test('ChatInterface with partial workflow service availability', async ({ page }) => {
      // Mock partial service availability
      await mockApiRoutes(page, { partialWorkflowService: true });
      
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Verify partial functionality
      await expect(page.locator('[data-testid="partial-functionality"]')).toBeVisible();
      await expect(page.locator('[data-testid="degraded-features"]')).toBeVisible();
      
      // Test available features
      await expect(page.locator('[data-testid="basic-chat"]')).toBeVisible();
      await expect(page.locator('[data-testid="message-input"]')).toBeEnabled();
      
      // Test unavailable features
      await expect(page.locator('[data-testid="workflow-unavailable"]')).toBeVisible();
      await expect(page.locator('[data-testid="next-message"]')).toBeDisabled();
    });

    test('Mixed success/failure scenarios and user communication', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Simulate mixed scenario
      await page.route('**/api/dashboard/status', route => route.continue());
      await page.route('**/api/dashboard/profile', route => 
        route.fulfill({ status: 500, body: 'Profile Service Error' })
      );
      
      // Refresh dashboard
      await page.click('[data-testid="refresh-status"]');
      
      // Verify mixed results
      await expect(page.locator('[data-testid="mixed-results"]')).toBeVisible();
      await expect(page.locator('[data-testid="partial-success"]')).toBeVisible();
      await expect(page.locator('[data-testid="partial-failure"]')).toBeVisible();
      
      // Verify user communication
      await expect(page.locator('[data-testid="status-summary"]')).toBeVisible();
      await expect(page.locator('[data-testid="failure-details"]')).toBeVisible();
      
      // Restore routes
      await page.unroute('**/api/dashboard/profile');
    });
  });

  test.describe('Timeout Handling', () => {
    test('Request timeout scenarios across all components', async ({ page }) => {
      // Test onboarding timeout
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      
      await page.route('**/api/onboarding/step', route => 
        route.fulfill({ status: 408, body: 'Request Timeout' })
      );
      
      await page.fill('[data-testid="company-name"]', 'Test Company');
      await page.selectOption('[data-testid="industry-select"]', 'technology');
      await page.click('[data-testid="next-step"]');
      
      await expect(page.locator('[data-testid="timeout-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="timeout-message"]')).toContainText('Request timed out');
      
      // Restore route
      await page.unroute('**/api/onboarding/step');
    });

    test('Timeout error messages and recovery options', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Simulate timeout
      await page.route('**/api/workflow/next', route => 
        route.fulfill({ status: 408, body: 'Request Timeout' })
      );
      
      // Attempt operation
      await page.click('[data-testid="next-message"]');
      
      // Verify timeout handling
      await expect(page.locator('[data-testid="timeout-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="timeout-message"]')).toContainText('Request timed out');
      
      // Verify recovery options
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="extend-timeout"]')).toBeVisible();
      
      // Restore route
      await page.unroute('**/api/workflow/next');
    });

    test('User notification of long-running operations', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Simulate long-running operation
      await page.route('**/api/workflow/next', route => {
        // Add artificial delay
        setTimeout(() => route.continue(), 3000);
      });
      
      // Start operation
      await page.click('[data-testid="next-message"]');
      await expect(page.locator('[data-testid="message-loading"]')).toBeVisible();
      
      // Verify timeout notification
      await expect(page.locator('[data-testid="timeout-notification"]')).toBeVisible();
      await expect(page.locator('[data-testid="long-operation"]')).toBeVisible();
      
      // Wait for completion
      await expect(page.locator('[data-testid="agent-message"]')).toBeVisible();
      
      // Remove artificial delay
      await page.unroute('**/api/workflow/next');
    });

    test('Timeout configuration and user experience impact', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Test timeout configuration
      await expect(page.locator('[data-testid="timeout-config"]')).toBeVisible();
      await expect(page.locator('[data-testid="timeout-value"]')).toHaveText('30s');
      
      // Test user experience impact
      await expect(page.locator('[data-testid="user-experience"]')).toBeVisible();
      await expect(page.locator('[data-testid="timeout-impact"]')).toBeVisible();
    });
  });

  test.describe('Data Integrity and Consistency', () => {
    test('Data preservation during error scenarios', async ({ page }) => {
      const userData = generateOnboardingData('simple-startup');
      
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      
      // Fill form data
      await page.fill('[data-testid="company-name"]', userData.companyName);
      await page.selectOption('[data-testid="industry-select"]', userData.industry);
      
      // Simulate error during submission
      await page.route('**/api/onboarding/step', route => 
        route.fulfill({ status: 500, body: 'Server Error' })
      );
      
      await page.click('[data-testid="next-step"]');
      await expect(page.locator('[data-testid="submission-error"]')).toBeVisible();
      
      // Verify data preserved
      await expect(page.locator('[data-testid="company-name"]')).toHaveValue(userData.companyName);
      await expect(page.locator('[data-testid="industry-select"]')).toHaveValue(userData.industry);
      
      // Restore route
      await page.unroute('**/api/onboarding/step');
    });

    test('State consistency after error recovery', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Get initial state
      const initialSessionId = await page.locator('[data-testid="session-id"]').textContent();
      const initialStage = await page.locator('[data-testid="workflow-stage"]').textContent();
      
      // Simulate error
      await simulateChatError(page, 'recoverable-error');
      
      // Attempt recovery
      await page.click('[data-testid="attempt-recovery"]');
      await expect(page.locator('[data-testid="recovery-loading"]')).toBeVisible();
      
      // Wait for recovery
      await expect(page.locator('[data-testid="recovery-success"]')).toBeVisible();
      
      // Verify state consistency
      const recoveredSessionId = await page.locator('[data-testid="session-id"]').textContent();
      const recoveredStage = await page.locator('[data-testid="workflow-stage"]').textContent();
      
      expect(recoveredSessionId).toBe(initialSessionId);
      expect(recoveredStage).toBe(initialStage);
    });

    test('Data validation and corruption prevention', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      
      // Test data validation
      await page.fill('[data-testid="company-name"]', '<script>alert("xss")</script>');
      await page.selectOption('[data-testid="industry-select"]', 'technology');
      await page.click('[data-testid="next-step"]');
      
      // Verify validation prevents malicious data
      await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid characters');
      
      // Test corruption prevention
      await expect(page.locator('[data-testid="data-integrity"]')).toBeVisible();
      await expect(page.locator('[data-testid="corruption-prevention"]')).toBeVisible();
    });

    test('Rollback mechanisms for failed operations', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Progress through workflow
      await page.click('[data-testid="next-message"]');
      await expect(page.locator('[data-testid="agent-message"]')).toBeVisible();
      
      // Get current state
      const currentStage = await page.locator('[data-testid="workflow-stage"]').textContent();
      const currentProgress = await page.locator('[data-testid="progress-percentage"]').textContent();
      
      // Simulate operation failure
      await simulateChatError(page, 'operation-failure');
      
      // Verify rollback
      await expect(page.locator('[data-testid="rollback-active"]')).toBeVisible();
      await expect(page.locator('[data-testid="state-restored"]')).toBeVisible();
      
      // Verify state rolled back
      const rolledBackStage = await page.locator('[data-testid="workflow-stage"]').textContent();
      const rolledBackProgress = await page.locator('[data-testid="progress-percentage"]').textContent();
      
      expect(rolledBackStage).toBe(currentStage);
      expect(rolledBackProgress).toBe(currentProgress);
    });
  });

  test.describe('Error Boundary Implementation', () => {
    test('React error boundary functionality across components', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Test error boundary
      await expect(page.locator('[data-testid="error-boundary"]')).toBeVisible();
      await expect(page.locator('[data-testid="boundary-active"]')).toBeVisible();
      
      // Simulate component error
      await page.click('[data-testid="trigger-error"]');
      
      // Verify error boundary caught error
      await expect(page.locator('[data-testid="error-caught"]')).toBeVisible();
      await expect(page.locator('[data-testid="boundary-fallback"]')).toBeVisible();
    });

    test('Error boundary fallback UI and user guidance', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Trigger error boundary
      await page.click('[data-testid="trigger-error"]');
      
      // Verify fallback UI
      await expect(page.locator('[data-testid="fallback-ui"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-guidance"]')).toBeVisible();
      
      // Verify recovery options
      await expect(page.locator('[data-testid="reload-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="report-error"]')).toBeVisible();
    });

    test('Error boundary recovery and component remounting', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Trigger error boundary
      await page.click('[data-testid="trigger-error"]');
      await expect(page.locator('[data-testid="error-caught"]')).toBeVisible();
      
      // Test recovery
      await page.click('[data-testid="recover-button"]');
      await expect(page.locator('[data-testid="recovery-loading"]')).toBeVisible();
      
      // Wait for recovery
      await expect(page.locator('[data-testid="component-remounted"]')).toBeVisible();
      await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();
    });

    test('Error boundary logging and monitoring integration', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      
      // Test error boundary logging
      await expect(page.locator('[data-testid="error-logging"]')).toBeVisible();
      await expect(page.locator('[data-testid="monitoring-active"]')).toBeVisible();
      
      // Trigger error
      await page.click('[data-testid="trigger-error"]');
      
      // Verify logging
      await expect(page.locator('[data-testid="error-logged"]')).toBeVisible();
      await expect(page.locator('[data-testid="monitoring-alert"]')).toBeVisible();
    });
  });

  test.describe('Progressive Enhancement', () => {
    test('Application functionality with JavaScript disabled', async ({ page }) => {
      // Disable JavaScript
      await page.addInitScript(() => {
        // Simulate JavaScript disabled
        window.addEventListener('error', (e) => {
          if (e.message.includes('JavaScript')) {
            e.preventDefault();
          }
        });
      });
      
      await page.goto('/onboarding');
      
      // Verify core functionality available
      await expect(page.locator('[data-testid="core-functionality"]')).toBeVisible();
      await expect(page.locator('[data-testid="basic-forms"]')).toBeVisible();
      
      // Verify graceful degradation
      await expect(page.locator('[data-testid="graceful-degradation"]')).toBeVisible();
      await expect(page.locator('[data-testid="enhancement-notice"]')).toBeVisible();
    });

    test('Graceful degradation of interactive features', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Test interactive features
      await expect(page.locator('[data-testid="interactive-features"]')).toBeVisible();
      await expect(page.locator('[data-testid="enhanced-ux"]')).toBeVisible();
      
      // Simulate feature failure
      await page.click('[data-testid="disable-features"]');
      
      // Verify graceful degradation
      await expect(page.locator('[data-testid="basic-functionality"]')).toBeVisible();
      await expect(page.locator('[data-testid="degraded-ux"]')).toBeVisible();
    });

    test('Core functionality availability during service outages', async ({ page }) => {
      // Mock all services down
      await mockApiRoutes(page, { allServicesDown: true });
      
      await page.goto('/dashboard');
      
      // Verify core functionality
      await expect(page.locator('[data-testid="core-functionality"]')).toBeVisible();
      await expect(page.locator('[data-testid="basic-navigation"]')).toBeVisible();
      
      // Verify offline capabilities
      await expect(page.locator('[data-testid="offline-mode"]')).toBeVisible();
      await expect(page.locator('[data-testid="local-storage"]')).toBeVisible();
    });

    test('Offline capability and local data management', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      
      // Test offline capabilities
      await expect(page.locator('[data-testid="offline-capability"]')).toBeVisible();
      await expect(page.locator('[data-testid="local-storage"]')).toBeVisible();
      
      // Fill form data
      await page.fill('[data-testid="company-name"]', 'Test Company');
      await page.selectOption('[data-testid="industry-select"]', 'technology');
      
      // Verify local storage
      await expect(page.locator('[data-testid="data-saved-locally"]')).toBeVisible();
      await expect(page.locator('[data-testid="local-persistence"]')).toBeVisible();
    });
  });

  test.describe('Error Analytics and Monitoring', () => {
    test('Error logging and reporting mechanisms', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Test error logging
      await expect(page.locator('[data-testid="error-logging"]')).toBeVisible();
      await expect(page.locator('[data-testid="logging-active"]')).toBeVisible();
      
      // Trigger error
      await simulateChatError(page, 'test-error');
      
      // Verify error logged
      await expect(page.locator('[data-testid="error-logged"]')).toBeVisible();
      await expect(page.locator('[data-testid="log-entry"]')).toBeVisible();
    });

    test('Error categorization and severity classification', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Test error categorization
      await expect(page.locator('[data-testid="error-categories"]')).toBeVisible();
      await expect(page.locator('[data-testid="severity-levels"]')).toBeVisible();
      
      // Test different error types
      const errorTypes = ['network', 'validation', 'server', 'timeout'];
      
      for (const errorType of errorTypes) {
        await page.click(`[data-testid="trigger-${errorType}-error"]`);
        await expect(page.locator(`[data-testid="${errorType}-category"]`)).toBeVisible();
        await expect(page.locator(`[data-testid="${errorType}-severity"]`)).toBeVisible();
      }
    });

    test('Error context capture and debugging information', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      
      // Test error context
      await expect(page.locator('[data-testid="error-context"]')).toBeVisible();
      await expect(page.locator('[data-testid="debug-info"]')).toBeVisible();
      
      // Trigger error
      await page.click('[data-testid="next-step"]');
      await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
      
      // Verify context captured
      await expect(page.locator('[data-testid="context-captured"]')).toBeVisible();
      await expect(page.locator('[data-testid="debug-details"]')).toBeVisible();
    });

    test('Error monitoring integration and alerting', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Test monitoring integration
      await expect(page.locator('[data-testid="monitoring-integration"]')).toBeVisible();
      await expect(page.locator('[data-testid="alerting-active"]')).toBeVisible();
      
      // Trigger critical error
      await simulateChatError(page, 'critical-error');
      
      // Verify alerting
      await expect(page.locator('[data-testid="alert-triggered"]')).toBeVisible();
      await expect(page.locator('[data-testid="notification-sent"]')).toBeVisible();
    });
  });

  test.describe('User Education and Support', () => {
    test('Error help documentation and troubleshooting guides', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Test help documentation
      await expect(page.locator('[data-testid="help-documentation"]')).toBeVisible();
      await expect(page.locator('[data-testid="troubleshooting"]')).toBeVisible();
      
      // Access help
      await page.click('[data-testid="help-button"]');
      await expect(page.locator('[data-testid="help-panel"]')).toBeVisible();
      await expect(page.locator('[data-testid="troubleshooting-guide"]')).toBeVisible();
    });

    test('Error context-sensitive help and support options', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      
      // Test context-sensitive help
      await expect(page.locator('[data-testid="context-help"]')).toBeVisible();
      await expect(page.locator('[data-testid="smart-suggestions"]')).toBeVisible();
      
      // Trigger error
      await page.click('[data-testid="next-step"]');
      await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
      
      // Verify context help
      await expect(page.locator('[data-testid="error-specific-help"]')).toBeVisible();
      await expect(page.locator('[data-testid="relevant-solutions"]')).toBeVisible();
    });

    test('Error reporting and feedback collection mechanisms', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Test error reporting
      await expect(page.locator('[data-testid="error-reporting"]')).toBeVisible();
      await expect(page.locator('[data-testid="feedback-collection"]')).toBeVisible();
      
      // Trigger error
      await simulateChatError(page, 'reportable-error');
      
      // Verify reporting mechanism
      await expect(page.locator('[data-testid="report-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="feedback-form"]')).toBeVisible();
    });

    test('User empowerment and self-service recovery options', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Test self-service options
      await expect(page.locator('[data-testid="self-service"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-empowerment"]')).toBeVisible();
      
      // Access self-service tools
      await page.click('[data-testid="self-service-button"]');
      await expect(page.locator('[data-testid="recovery-tools"]')).toBeVisible();
      await expect(page.locator('[data-testid="diagnostic-tools"]')).toBeVisible();
    });
  });
});
