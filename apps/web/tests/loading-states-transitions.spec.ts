import { test, expect } from '@playwright/test';
import { mockApiRoutes } from './utils/test-helpers';
import { 
  waitForOnboardingStepLoad,
  waitForDashboardLoad,
  waitForChatInterfaceLoad,
  validateLoadingIndicators,
  setupJourneyMocks,
  generateOnboardingData,
  startProjectFromDashboard
} from './utils/streamlined-journey-helpers';

test.describe('Loading States and Transitions - Streamlined User Journey', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page);
    await setupJourneyMocks(page, 'loading-testing');
  });

  test.describe('Loading State Management', () => {
    test('Loading indicators during onboarding form submissions', async ({ page }) => {
      await page.goto('/onboarding');
      
      for (let step = 1; step <= 4; step++) {
        await waitForOnboardingStepLoad(page, step);
        await validateLoadingIndicators(page, ['form-loading']);
        
        if (step < 4) {
          // Fill step data
          await fillStepData(page, step);
          
          // Test loading state during submission
          await page.click('[data-testid="next-step"]');
          await expect(page.locator('[data-testid="step-loading"]')).toBeVisible();
          await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
          
          // Wait for next step to load
          await expect(page.locator(`[data-testid="step-${step + 1}"]`)).toBeVisible();
          await expect(page.locator('[data-testid="step-loading"]')).not.toBeVisible();
        }
      }
    });

    test('Dashboard loading indicators and system status display', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Test initial loading state
      await expect(page.locator('[data-testid="dashboard-loading"]')).toBeVisible();
      await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
      
      // Wait for dashboard to load
      await waitForDashboardLoad(page);
      await expect(page.locator('[data-testid="dashboard-loading"]')).not.toBeVisible();
      
      // Verify system status loaded
      await expect(page.locator('[data-testid="system-status"]')).toBeVisible();
      await expect(page.locator('[data-testid="status-indicator"]')).toHaveText('Operational');
    });

    test('ChatInterface loading states during workflow initialization', async ({ page }) => {
      await page.goto('/test-chat');
      
      // Test initial loading
      await expect(page.locator('[data-testid="chat-loading"]')).toBeVisible();
      await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
      
      // Wait for ChatInterface to load
      await waitForChatInterfaceLoad(page);
      await expect(page.locator('[data-testid="chat-loading"]')).not.toBeVisible();
      
      // Verify workflow session initialized
      await expect(page.locator('[data-testid="workflow-session"]')).toBeVisible();
    });

    test('Progress indicators during message progression and decision points', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Test message progression loading
      await page.click('[data-testid="next-message"]');
      await expect(page.locator('[data-testid="message-loading"]')).toBeVisible();
      await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
      
      // Wait for message to load
      await expect(page.locator('[data-testid="agent-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="message-loading"]')).not.toBeVisible();
      
      // Test decision point loading
      if (await page.locator('[data-testid="decision-point"]').isVisible()) {
        await expect(page.locator('[data-testid="decision-loading"]')).toBeVisible();
        await expect(page.locator('[data-testid="decision-buttons"]')).toBeVisible();
      }
    });

    test('Loading state management during API calls and transitions', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Test multiple concurrent loading states
      await page.click('[data-testid="next-message"]');
      await page.click('[data-testid="refresh-status"]');
      
      // Verify loading states are managed properly
      await expect(page.locator('[data-testid="message-loading"]')).toBeVisible();
      await expect(page.locator('[data-testid="status-loading"]')).toBeVisible();
      
      // Wait for completion
      await expect(page.locator('[data-testid="agent-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="status-updated"]')).toBeVisible();
    });
  });

  test.describe('Transition Smoothness and Performance', () => {
    test('Smooth transitions between onboarding steps', async ({ page }) => {
      await page.goto('/onboarding');
      
      for (let step = 1; step <= 4; step++) {
        await waitForOnboardingStepLoad(page, step);
        
        if (step < 4) {
          // Fill step data
          await fillStepData(page, step);
          
          // Test smooth transition
          await page.click('[data-testid="next-step"]');
          await expect(page.locator('[data-testid="transition-animation"]')).toBeVisible();
          await expect(page.locator('[data-testid="step-fade"]')).toBeVisible();
          
          // Wait for transition completion
          await expect(page.locator(`[data-testid="step-${step + 1}"]`)).toBeVisible();
          await expect(page.locator('[data-testid="transition-complete"]')).toBeVisible();
        }
      }
    });

    test('Seamless navigation from dashboard to chat interface', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Test smooth transition
      await startProjectFromDashboard(page);
      
      // Verify transition animation
      await expect(page.locator('[data-testid="transition-overlay"]')).toBeVisible();
      await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible();
      
      // Wait for transition completion
      await expect(page).toHaveURL('/test-chat');
      await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();
    });

    test('Page transitions and component mounting performance', async ({ page }) => {
      // Test onboarding page transition
      const onboardingStart = Date.now();
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      const onboardingTime = Date.now() - onboardingStart;
      
      // Test dashboard page transition
      const dashboardStart = Date.now();
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      const dashboardTime = Date.now() - dashboardStart;
      
      // Test chat interface page transition
      const chatStart = Date.now();
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      const chatTime = Date.now() - chatStart;
      
      // Verify performance requirements
      expect(onboardingTime).toBeLessThan(2000); // 2 seconds max
      expect(dashboardTime).toBeLessThan(3000); // 3 seconds max
      expect(chatTime).toBeLessThan(3000); // 3 seconds max
    });

    test('Animation smoothness and visual continuity', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      
      // Test smooth animations
      await expect(page.locator('[data-testid="onboarding-content"]')).toBeVisible();
      
      // Trigger animation
      await page.click('[data-testid="animate-trigger"]');
      
      // Verify animation smoothness
      await expect(page.locator('[data-testid="animation-running"]')).toBeVisible();
      await expect(page.locator('[data-testid="animation-complete"]')).toBeVisible();
      
      // Test transition smoothness
      await page.fill('[data-testid="company-name"]', 'Test Company');
      await page.selectOption('[data-testid="industry-select"]', 'technology');
      await page.click('[data-testid="next-step"]');
      
      await expect(page.locator('[data-testid="transition-smooth"]')).toBeVisible();
    });
  });

  test.describe('Progress Indicators and Feedback', () => {
    test('Onboarding progress indicators and step completion', async ({ page }) => {
      await page.goto('/onboarding');
      
      // Verify progress indicators
      await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible();
      await expect(page.locator('[data-testid="progress-percentage"]')).toHaveText('25%');
      
      // Navigate to step 2
      await page.click('[data-testid="next-step"]');
      await waitForOnboardingStepLoad(page, 2);
      await expect(page.locator('[data-testid="progress-percentage"]')).toHaveText('50%');
      
      // Navigate to step 3
      await page.click('[data-testid="next-step"]');
      await waitForOnboardingStepLoad(page, 3);
      await expect(page.locator('[data-testid="progress-percentage"]')).toHaveText('75%');
      
      // Navigate to step 4
      await page.click('[data-testid="next-step"]');
      await waitForOnboardingStepLoad(page, 4);
      await expect(page.locator('[data-testid="progress-percentage"]')).toHaveText('100%');
    });

    test('Workflow progress tracking in ChatInterface', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Verify progress indicators
      await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible();
      await expect(page.locator('[data-testid="progress-percentage"]')).toHaveText('0%');
      
      // Progress through stages
      for (let stage = 1; stage <= 3; stage++) {
        await page.click('[data-testid="next-message"]');
        await expect(page.locator('[data-testid="agent-message"]')).toBeVisible();
        
        // Verify progress updated
        const progress = await page.locator('[data-testid="progress-percentage"]').textContent();
        expect(parseInt(progress)).toBeGreaterThan(0);
        
        // Verify stage completion
        await expect(page.locator('[data-testid="stage-complete"]')).toBeVisible();
        
        await expect(page.locator('[data-testid="message-loading"]')).not.toBeVisible();
      }
      
      // Verify overall progress
      const finalProgress = await page.locator('[data-testid="progress-percentage"]').textContent();
      expect(parseInt(finalProgress)).toBeGreaterThan(30);
    });

    test('Real-time progress updates during agent message progression', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Enable real-time updates
      await page.click('[data-testid="enable-realtime"]');
      await expect(page.locator('[data-testid="realtime-active"]')).toBeVisible();
      
      // Progress through messages
      for (let i = 0; i < 3; i++) {
        await page.click('[data-testid="next-message"]');
        await expect(page.locator('[data-testid="agent-message"]')).toBeVisible();
        
        // Verify real-time progress update
        await expect(page.locator('[data-testid="realtime-progress"]')).toBeVisible();
        await expect(page.locator('[data-testid="progress-update"]')).toBeVisible();
        
        await expect(page.locator('[data-testid="message-loading"]')).not.toBeVisible();
      }
    });

    test('Stage completion indicators and decision point feedback', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Progress until decision point
      let decisionPointFound = false;
      for (let i = 0; i < 10 && !decisionPointFound; i++) {
        await page.click('[data-testid="next-message"]');
        await expect(page.locator('[data-testid="agent-message"]')).toBeVisible();
        
        // Check for decision point
        if (await page.locator('[data-testid="decision-point"]').isVisible()) {
          decisionPointFound = true;
          break;
        }
        
        await expect(page.locator('[data-testid="message-loading"]')).not.toBeVisible();
      }
      
      // Verify decision point feedback
      expect(decisionPointFound).toBe(true);
      await expect(page.locator('[data-testid="decision-feedback"]')).toBeVisible();
      await expect(page.locator('[data-testid="stage-completion"]')).toBeVisible();
    });
  });

  test.describe('Loading State Visual Design', () => {
    test('Loading spinner and skeleton UI implementations', async ({ page }) => {
      await page.goto('/onboarding');
      
      // Test loading spinner
      await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
      await expect(page.locator('[data-testid="spinner-animation"]')).toBeVisible();
      
      // Test skeleton UI
      await expect(page.locator('[data-testid="skeleton-ui"]')).toBeVisible();
      await expect(page.locator('[data-testid="skeleton-content"]')).toBeVisible();
      
      // Wait for content to load
      await waitForOnboardingStepLoad(page, 1);
      await expect(page.locator('[data-testid="skeleton-ui"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="actual-content"]')).toBeVisible();
    });

    test('Loading state accessibility and screen reader announcements', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Test loading state accessibility
      await expect(page.locator('[data-testid="loading-announcement"]')).toBeVisible();
      await expect(page.locator('[data-testid="sr-loading"]')).toHaveAttribute('aria-live', 'polite');
      
      // Wait for dashboard to load
      await waitForDashboardLoad(page);
      
      // Verify loading complete announcement
      await expect(page.locator('[data-testid="loading-complete"]')).toBeVisible();
      await expect(page.locator('[data-testid="sr-complete"]')).toHaveAttribute('aria-live', 'polite');
    });

    test('Loading state theming and dark/light mode compatibility', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Test light theme loading states
      await expect(page.locator('[data-testid="light-theme"]')).toBeVisible();
      await expect(page.locator('[data-testid="light-loading"]')).toBeVisible();
      
      // Switch to dark theme
      await page.click('[data-testid="theme-toggle"]');
      await page.waitForTimeout(100);
      
      // Verify dark theme loading states
      await expect(page.locator('[data-testid="dark-theme"]')).toBeVisible();
      await expect(page.locator('[data-testid="dark-loading"]')).toBeVisible();
    });

    test('Loading state positioning and layout stability', async ({ page }) => {
      await page.goto('/onboarding');
      
      // Test loading state positioning
      await expect(page.locator('[data-testid="loading-container"]')).toBeVisible();
      await expect(page.locator('[data-testid="loading-position"]')).toBeVisible();
      
      // Verify layout stability during loading
      const loadingPosition = await page.locator('[data-testid="loading-container"]').boundingBox();
      
      // Wait for content to load
      await waitForOnboardingStepLoad(page, 1);
      
      // Verify layout maintained
      await expect(page.locator('[data-testid="content-container"]')).toBeVisible();
      await expect(page.locator('[data-testid="layout-stable"]')).toBeVisible();
    });
  });

  test.describe('Async Operation Handling', () => {
    test('Concurrent loading states and multiple API calls', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Test concurrent operations
      const operations = [
        () => page.click('[data-testid="next-message"]'),
        () => page.click('[data-testid="refresh-status"]'),
        () => page.click('[data-testid="update-preferences"]')
      ];
      
      // Execute concurrently
      await Promise.all(operations.map(operation => operation()));
      
      // Verify concurrent loading states
      await expect(page.locator('[data-testid="concurrent-loading"]')).toBeVisible();
      await expect(page.locator('[data-testid="loading-coordinator"]')).toBeVisible();
      
      // Wait for all operations to complete
      await expect(page.locator('[data-testid="all-operations-complete"]')).toBeVisible();
    });

    test('Loading state cancellation and cleanup', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Start loading operation
      await page.click('[data-testid="next-message"]');
      await expect(page.locator('[data-testid="message-loading"]')).toBeVisible();
      
      // Cancel operation
      await page.click('[data-testid="cancel-operation"]');
      await expect(page.locator('[data-testid="operation-cancelled"]')).toBeVisible();
      await expect(page.locator('[data-testid="message-loading"]')).not.toBeVisible();
      
      // Verify cleanup
      await expect(page.locator('[data-testid="cleanup-complete"]')).toBeVisible();
      await expect(page.locator('[data-testid="state-reset"]')).toBeVisible();
    });

    test('Loading state timeout handling and error transitions', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Simulate timeout
      await page.route('**/api/workflow/next', route => 
        route.fulfill({ status: 408, body: 'Request Timeout' })
      );
      
      // Attempt operation
      await page.click('[data-testid="next-message"]');
      await expect(page.locator('[data-testid="message-loading"]')).toBeVisible();
      
      // Wait for timeout
      await expect(page.locator('[data-testid="timeout-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-transition"]')).toBeVisible();
      
      // Restore route
      await page.unroute('**/api/workflow/next');
    });

    test('Loading state memory management and performance', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Get initial memory usage
      const initialMemory = await page.evaluate(() => performance.memory?.usedJSHeapSize || 0);
      
      // Perform multiple loading operations
      for (let i = 0; i < 10; i++) {
        await page.click('[data-testid="next-message"]');
        await expect(page.locator('[data-testid="agent-message"]')).toBeVisible();
        await expect(page.locator('[data-testid="message-loading"]')).not.toBeVisible();
      }
      
      // Check memory usage
      const finalMemory = await page.evaluate(() => performance.memory?.usedJSHeapSize || 0);
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory should be reasonable
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // 100MB max
      
      // Verify memory management
      await expect(page.locator('[data-testid="memory-management"]')).toBeVisible();
      await expect(page.locator('[data-testid="garbage-collection"]')).toBeVisible();
    });
  });

  test.describe('User Experience During Loading', () => {
    test('User interaction blocking during critical loading operations', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      
      // Fill form and submit
      await page.fill('[data-testid="company-name"]', 'Test Company');
      await page.selectOption('[data-testid="industry-select"]', 'technology');
      await page.click('[data-testid="next-step"]');
      
      // Verify loading state
      await expect(page.locator('[data-testid="step-loading"]')).toBeVisible();
      
      // Test interaction blocking
      await expect(page.locator('[data-testid="form-inputs"]')).toBeDisabled();
      await expect(page.locator('[data-testid="navigation-buttons"]')).toBeDisabled();
      
      // Wait for completion
      await expect(page.locator('[data-testid="step-2"]')).toBeVisible();
      
      // Verify interactions restored
      await expect(page.locator('[data-testid="form-inputs"]')).toBeEnabled();
      await expect(page.locator('[data-testid="navigation-buttons"]')).toBeEnabled();
    });

    test('Partial UI availability during background loading', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Verify partial UI available during loading
      await expect(page.locator('[data-testid="partial-content"]')).toBeVisible();
      await expect(page.locator('[data-testid="navigation-menu"]')).toBeEnabled();
      await expect(page.locator('[data-testid="user-profile"]')).toBeVisible();
      
      // Wait for full dashboard to load
      await waitForDashboardLoad(page);
      
      // Verify full UI available
      await expect(page.locator('[data-testid="full-content"]')).toBeVisible();
      await expect(page.locator('[data-testid="system-status"]')).toBeVisible();
    });

    test('Loading state messaging and user guidance', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      
      // Test loading messages
      await page.fill('[data-testid="company-name"]', 'Test Company');
      await page.selectOption('[data-testid="industry-select"]', 'technology');
      await page.click('[data-testid="next-step"]');
      
      // Verify loading message
      await expect(page.locator('[data-testid="loading-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-guidance"]')).toBeVisible();
      
      // Wait for completion
      await expect(page.locator('[data-testid="step-2"]')).toBeVisible();
      
      // Verify completion message
      await expect(page.locator('[data-testid="completion-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="next-steps"]')).toBeVisible();
    });

    test('Loading state duration and user patience thresholds', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      
      // Test loading duration
      const loadingStart = Date.now();
      
      await page.fill('[data-testid="company-name"]', 'Test Company');
      await page.selectOption('[data-testid="industry-select"]', 'technology');
      await page.click('[data-testid="next-step"]');
      
      await expect(page.locator('[data-testid="step-loading"]')).toBeVisible();
      
      // Wait for completion
      await expect(page.locator('[data-testid="step-2"]')).toBeVisible();
      
      const loadingDuration = Date.now() - loadingStart;
      
      // Verify loading duration is reasonable
      expect(loadingDuration).toBeLessThan(5000); // 5 seconds max
      
      // Verify user satisfaction
      await expect(page.locator('[data-testid="user-satisfaction"]')).toBeVisible();
      await expect(page.locator('[data-testid="patience-maintained"]')).toBeVisible();
    });
  });

  test.describe('Error State Transitions', () => {
    test('Smooth transitions from loading to error states', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Simulate error
      await page.route('**/api/workflow/next', route => 
        route.fulfill({ status: 500, body: 'Internal Server Error' })
      );
      
      // Attempt operation
      await page.click('[data-testid="next-message"]');
      await expect(page.locator('[data-testid="message-loading"]')).toBeVisible();
      
      // Wait for error transition
      await expect(page.locator('[data-testid="error-state"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-transition"]')).toBeVisible();
      
      // Restore route
      await page.unroute('**/api/workflow/next');
    });

    test('Error recovery and retry loading mechanisms', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Simulate error
      await page.route('**/api/workflow/next', route => 
        route.fulfill({ status: 500, body: 'Internal Server Error' })
      );
      
      // Attempt operation
      await page.click('[data-testid="next-message"]');
      await expect(page.locator('[data-testid="error-state"]')).toBeVisible();
      
      // Test retry
      await page.click('[data-testid="retry-button"]');
      await expect(page.locator('[data-testid="retry-loading"]')).toBeVisible();
      
      // Restore route and wait for success
      await page.unroute('**/api/workflow/next');
      await expect(page.locator('[data-testid="retry-success"]')).toBeVisible();
    });

    test('Loading state behavior during network failures', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      
      // Simulate network failure
      await page.route('**/api/onboarding/step', route => route.abort());
      
      // Fill form and attempt submission
      await page.fill('[data-testid="company-name"]', 'Test Company');
      await page.selectOption('[data-testid="industry-select"]', 'technology');
      await page.click('[data-testid="next-step"]');
      
      // Verify loading state
      await expect(page.locator('[data-testid="step-loading"]')).toBeVisible();
      
      // Wait for network error
      await expect(page.locator('[data-testid="network-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="loading-to-error"]')).toBeVisible();
      
      // Restore route
      await page.unroute('**/api/onboarding/step');
    });

    test('Graceful degradation from loading to fallback states', async ({ page }) => {
      // Mock service unavailable
      await mockApiRoutes(page, { allServicesDown: true });
      
      await page.goto('/dashboard');
      
      // Verify loading state
      await expect(page.locator('[data-testid="dashboard-loading"]')).toBeVisible();
      
      // Wait for fallback state
      await expect(page.locator('[data-testid="fallback-state"]')).toBeVisible();
      await expect(page.locator('[data-testid="graceful-degradation"]')).toBeVisible();
      
      // Verify fallback functionality
      await expect(page.locator('[data-testid="offline-mode"]')).toBeVisible();
      await expect(page.locator('[data-testid="cached-data"]')).toBeVisible();
    });
  });

  test.describe('Mobile and Responsive Loading', () => {
    test('Loading states on mobile devices and small screens', async ({ page }) => {
      // Test mobile layout
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      
      // Verify mobile loading states
      await expect(page.locator('[data-testid="mobile-loading"]')).toBeVisible();
      await expect(page.locator('[data-testid="mobile-spinner"]')).toBeVisible();
      
      // Test mobile form submission
      await page.fill('[data-testid="company-name"]', 'Test Company');
      await page.selectOption('[data-testid="industry-select"]', 'technology');
      await page.click('[data-testid="next-step"]');
      
      // Verify mobile loading transition
      await expect(page.locator('[data-testid="mobile-transition"]')).toBeVisible();
      await expect(page.locator('[data-testid="step-2"]')).toBeVisible();
    });

    test('Touch interaction handling during loading', async ({ page }) => {
      // Test mobile layout
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/dashboard');
      
      // Verify touch-friendly loading states
      await expect(page.locator('[data-testid="touch-loading"]')).toBeVisible();
      await expect(page.locator('[data-testid="touch-spinner"]')).toBeVisible();
      
      // Test touch interactions during loading
      await page.touchscreen.tap(200, 300); // Tap on loading area
      await expect(page.locator('[data-testid="touch-handled"]')).toBeVisible();
      
      // Wait for loading completion
      await waitForDashboardLoad(page);
      await expect(page.locator('[data-testid="touch-complete"]')).toBeVisible();
    });

    test('Loading state performance on slower devices', async ({ page }) => {
      // Simulate slower device
      await page.route('**/*', route => {
        route.continue();
        // Add artificial delay
        return new Promise(resolve => setTimeout(resolve, 100));
      });
      
      await page.goto('/onboarding');
      
      // Test loading performance
      const loadingStart = Date.now();
      await waitForOnboardingStepLoad(page, 1);
      const loadingTime = Date.now() - loadingStart;
      
      // Verify performance is acceptable even on slower devices
      expect(loadingTime).toBeLessThan(10000); // 10 seconds max
      
      // Verify loading states are responsive
      await expect(page.locator('[data-testid="responsive-loading"]')).toBeVisible();
      await expect(page.locator('[data-testid="performance-optimized"]')).toBeVisible();
      
      // Remove artificial delay
      await page.unroute('**/*');
    });

    test('Responsive loading indicator sizing and positioning', async ({ page }) => {
      // Test different viewport sizes
      const viewports = [
        { width: 1920, height: 1080, name: 'desktop' },
        { width: 768, height: 1024, name: 'tablet' },
        { width: 375, height: 667, name: 'mobile' }
      ];
      
      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.goto('/onboarding');
        await waitForOnboardingStepLoad(page, 1);
        
        // Verify responsive loading indicators
        await expect(page.locator(`[data-testid="${viewport.name}-loading"]`)).toBeVisible();
        await expect(page.locator(`[data-testid="${viewport.name}-spinner"]`)).toBeVisible();
        
        // Verify proper sizing and positioning
        await expect(page.locator('[data-testid="responsive-sizing"]')).toBeVisible();
        await expect(page.locator('[data-testid="proper-positioning"]')).toBeVisible();
      }
    });
  });

  test.describe('Loading State Integration', () => {
    test('Loading state coordination across multiple components', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Test multiple component loading
      await expect(page.locator('[data-testid="dashboard-loading"]')).toBeVisible();
      await expect(page.locator('[data-testid="system-status-loading"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-profile-loading"]')).toBeVisible();
      
      // Wait for all components to load
      await waitForDashboardLoad(page);
      
      // Verify coordinated loading completion
      await expect(page.locator('[data-testid="all-components-loaded"]')).toBeVisible();
      await expect(page.locator('[data-testid="loading-coordination"]')).toBeVisible();
    });

    test('Loading state propagation in nested component hierarchies', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Test nested component loading
      await expect(page.locator('[data-testid="chat-loading"]')).toBeVisible();
      await expect(page.locator('[data-testid="message-area-loading"]')).toBeVisible();
      await expect(page.locator('[data-testid="sidebar-loading"]')).toBeVisible();
      
      // Test loading propagation
      await page.click('[data-testid="next-message"]');
      await expect(page.locator('[data-testid="message-loading"]')).toBeVisible();
      await expect(page.locator('[data-testid="sidebar-update-loading"]')).toBeVisible();
      
      // Wait for completion
      await expect(page.locator('[data-testid="agent-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="all-nested-loaded"]')).toBeVisible();
    });

    test('Global loading state management and local component loading', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Test global loading state
      await expect(page.locator('[data-testid="global-loading"]')).toBeVisible();
      await expect(page.locator('[data-testid="app-loading"]')).toBeVisible();
      
      // Wait for global loading to complete
      await waitForDashboardLoad(page);
      await expect(page.locator('[data-testid="global-loading"]')).not.toBeVisible();
      
      // Test local component loading
      await page.click('[data-testid="refresh-status"]');
      await expect(page.locator('[data-testid="local-loading"]')).toBeVisible();
      await expect(page.locator('[data-testid="global-loading"]')).not.toBeVisible();
      
      // Wait for local loading to complete
      await expect(page.locator('[data-testid="status-updated"]')).toBeVisible();
      await expect(page.locator('[data-testid="local-loading"]')).not.toBeVisible();
    });

    test('Loading state consistency across the application', async ({ page }) => {
      // Test loading consistency across different pages
      const pages = ['/onboarding', '/dashboard', '/test-chat'];
      
      for (const pagePath of pages) {
        await page.goto(pagePath);
        
        // Verify consistent loading patterns
        await expect(page.locator('[data-testid="consistent-loading"]')).toBeVisible();
        await expect(page.locator('[data-testid="standard-spinner"]')).toBeVisible();
        await expect(page.locator('[data-testid="loading-message"]')).toBeVisible();
        
        // Wait for page to load
        if (pagePath === '/onboarding') {
          await waitForOnboardingStepLoad(page, 1);
        } else if (pagePath === '/dashboard') {
          await waitForDashboardLoad(page);
        } else if (pagePath === '/test-chat') {
          await waitForChatInterfaceLoad(page);
        }
        
        // Verify consistent completion patterns
        await expect(page.locator('[data-testid="consistent-completion"]')).toBeVisible();
        await expect(page.locator('[data-testid="standard-success"]')).toBeVisible();
      }
    });
  });

  test.describe('Performance Optimization', () => {
    test('Loading state rendering performance and efficiency', async ({ page }) => {
      await page.goto('/onboarding');
      
      // Measure loading state rendering performance
      const renderStart = Date.now();
      await waitForOnboardingStepLoad(page, 1);
      const renderTime = Date.now() - renderStart;
      
      // Verify performance requirements
      expect(renderTime).toBeLessThan(1000); // 1 second max
      
      // Verify efficient rendering
      await expect(page.locator('[data-testid="efficient-rendering"]')).toBeVisible();
      await expect(page.locator('[data-testid="render-performance"]')).toBeVisible();
    });

    test('Minimal resource usage during loading operations', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Get initial resource usage
      const initialMemory = await page.evaluate(() => performance.memory?.usedJSHeapSize || 0);
      const initialCPU = await page.evaluate(() => performance.now());
      
      // Perform loading operations
      for (let i = 0; i < 5; i++) {
        await page.click('[data-testid="next-message"]');
        await expect(page.locator('[data-testid="agent-message"]')).toBeVisible();
        await expect(page.locator('[data-testid="message-loading"]')).not.toBeVisible();
      }
      
      // Check resource usage
      const finalMemory = await page.evaluate(() => performance.memory?.usedJSHeapSize || 0);
      const finalCPU = await page.evaluate(() => performance.now());
      
      const memoryIncrease = finalMemory - initialMemory;
      const cpuUsage = finalCPU - initialCPU;
      
      // Verify minimal resource usage
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB max
      expect(cpuUsage).toBeLessThan(1000); // 1 second max
      
      // Verify optimization indicators
      await expect(page.locator('[data-testid="resource-optimized"]')).toBeVisible();
      await expect(page.locator('[data-testid="efficient-loading"]')).toBeVisible();
    });

    test('Loading state caching and optimization strategies', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      
      // Test loading state caching
      await expect(page.locator('[data-testid="cached-loading"]')).toBeVisible();
      await expect(page.locator('[data-testid="optimization-active"]')).toBeVisible();
      
      // Navigate to next step
      await page.fill('[data-testid="company-name"]', 'Test Company');
      await page.selectOption('[data-testid="industry-select"]', 'technology');
      await page.click('[data-testid="next-step"]');
      
      // Verify cached loading states
      await expect(page.locator('[data-testid="step-2"]')).toBeVisible();
      await expect(page.locator('[data-testid="cached-completion"]')).toBeVisible();
      
      // Test optimization strategies
      await expect(page.locator('[data-testid="lazy-loading"]')).toBeVisible();
      await expect(page.locator('[data-testid="progressive-enhancement"]')).toBeVisible();
    });

    test('Loading state impact on overall application performance', async ({ page }) => {
      // Test overall application performance
      const appStart = Date.now();
      
      // Navigate through complete journey
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      
      await page.fill('[data-testid="company-name"]', 'Test Company');
      await page.selectOption('[data-testid="industry-select"]', 'technology');
      await page.click('[data-testid="next-step"]');
      
      await waitForOnboardingStepLoad(page, 2);
      await page.fill('[data-testid="company-size"]', '10-50');
      await page.fill('[data-testid="company-description"]', 'Test description');
      await page.click('[data-testid="next-step"]');
      
      await waitForOnboardingStepLoad(page, 3);
      await page.selectOption('[data-testid="project-type"]', 'startup');
      await page.fill('[data-testid="project-goals"]', 'Test goals');
      await page.click('[data-testid="next-step"]');
      
      await waitForOnboardingStepLoad(page, 4);
      await page.click('[data-testid="complete-onboarding"]');
      
      await expect(page).toHaveURL('/dashboard');
      await waitForDashboardLoad(page);
      
      await startProjectFromDashboard(page);
      await expect(page).toHaveURL('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      const totalTime = Date.now() - appStart;
      
      // Verify overall performance
      expect(totalTime).toBeLessThan(30000); // 30 seconds max
      
      // Verify performance metrics
      await expect(page.locator('[data-testid="performance-metrics"]')).toBeVisible();
      await expect(page.locator('[data-testid="loading-efficiency"]')).toBeVisible();
    });
  });
});

// Helper function to fill step data
async function fillStepData(page: any, step: number) {
  switch (step) {
    case 1:
      await page.fill('[data-testid="company-name"]', 'Test Company');
      await page.selectOption('[data-testid="industry-select"]', 'technology');
      break;
    case 2:
      await page.fill('[data-testid="company-size"]', '10-50');
      await page.fill('[data-testid="company-description"]', 'Test description');
      break;
    case 3:
      await page.selectOption('[data-testid="project-type"]', 'startup');
      await page.fill('[data-testid="project-goals"]', 'Test goals');
      break;
  }
}
