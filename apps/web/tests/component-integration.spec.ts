import { test, expect } from '@playwright/test';
import { mockApiRoutes } from './utils/test-helpers';
import {
  setupJourneyMocks,
  waitForDashboardLoad,
  waitForChatInterfaceLoad,
  waitForOnboardingStepLoad,
  testThemeToggle,
  testThemeConsistency,
  testStatePersistence,
  testSessionRecovery,
  testPerformance,
  testMemoryUsage,
  testRenderingPerformance,
  generateOnboardingData,
  generateProjectData,
  completeUserJourney
} from './utils/streamlined-journey-helpers';

test.describe('Component Integration - Streamlined User Journey', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page);
    await setupJourneyMocks(page, 'integration-testing');
  });

  test.describe('Cross-Component Navigation and State Management', () => {
    test('Seamless navigation between all major components preserves state', async ({ page }) => {
      // Start with onboarding
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      
      // Fill step 1 data
      const userData = generateOnboardingData('simple-startup');
      await page.fill('[data-testid="company-name"]', userData.companyName);
      await page.selectOption('[data-testid="industry-select"]', userData.industry);
      
      // Navigate to dashboard
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Verify onboarding data reflected in dashboard
      await expect(page.locator('[data-testid="user-profile"]')).toContainText(userData.companyName);
      
      // Navigate to chat interface
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Verify user context maintained
      await expect(page.locator('[data-testid="user-context"]')).toContainText(userData.companyName);
    });

    test('Theme consistency maintained across all component transitions', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Set dark theme
      await page.click('[data-testid="theme-toggle"]');
      await page.waitForTimeout(100);
      await expect(page.locator('[data-testid="dark-theme"]')).toBeVisible();
      
      // Navigate through all components
      const components = ['/onboarding', '/dashboard', '/test-chat'];
      
      for (const component of components) {
        await page.goto(component);
        
        if (component === '/dashboard') {
          await waitForDashboardLoad(page);
        } else if (component === '/test-chat') {
          await waitForChatInterfaceLoad(page);
        }
        
        // Verify theme consistency
        await expect(page.locator('[data-testid="dark-theme"]')).toBeVisible();
      }
    });

    test('User session and authentication state preserved across navigation', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Verify authenticated state
      await expect(page.locator('[data-testid="authenticated-user"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-session"]')).toBeVisible();
      
      // Navigate to chat interface
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Verify session maintained
      await expect(page.locator('[data-testid="authenticated-user"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-session"]')).toBeVisible();
      
      // Navigate back to dashboard
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Verify session still maintained
      await expect(page.locator('[data-testid="authenticated-user"]')).toBeVisible();
    });
  });

  test.describe('Data Flow and State Synchronization', () => {
    test('User data flows seamlessly from onboarding to workflow execution', async ({ page }) => {
      const userData = generateOnboardingData('enterprise');
      const projectData = generateProjectData('complex');
      
      // Complete onboarding
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      
      // Fill onboarding data
      await page.fill('[data-testid="company-name"]', userData.companyName);
      await page.selectOption('[data-testid="industry-select"]', userData.industry);
      await page.selectOption('[data-testid="company-size"]', userData.companySize);
      await page.click('[data-testid="next-step"]');
      
      // Complete remaining steps
      await waitForOnboardingStepLoad(page, 2);
      await page.fill('[data-testid="project-name"]', projectData.name);
      await page.selectOption('[data-testid="company-size"]', userData.companySize);
      await page.click('[data-testid="next-step"]');
      
      await waitForOnboardingStepLoad(page, 3);
      await page.fill('[data-testid="project-description"]', projectData.description);
      await page.selectOption('[data-testid="budget-range"]', userData.budget);
      await page.selectOption('[data-testid="timeline"]', userData.timeline);
      await page.click('[data-testid="next-step"]');
      
      await waitForOnboardingStepLoad(page, 4);
      await page.click('[data-testid="confirm-submission"]');
      
      // Verify transition to dashboard
      await expect(page).toHaveURL('/dashboard');
      await waitForDashboardLoad(page);
      
      // Verify data reflected in dashboard
      await expect(page.locator('[data-testid="user-profile"]')).toContainText(userData.companyName);
      await expect(page.locator('[data-testid="project-summary"]')).toContainText(projectData.name);
    });

    test('Workflow state synchronization between dashboard and chat interface', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Start project from dashboard
      await page.click('[data-testid="start-project"]');
      await expect(page.locator('[data-testid="project-setup"]')).toBeVisible();
      
      // Navigate to chat interface
      await page.click('[data-testid="begin-workflow"]');
      await expect(page).toHaveURL('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Verify project context maintained
      await expect(page.locator('[data-testid="project-context"]')).toBeVisible();
      await expect(page.locator('[data-testid="workflow-init"]')).toBeVisible();
    });

    test('Real-time updates synchronized across all active components', async ({ page }) => {
      // Open dashboard in one tab
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Open chat interface in another tab
      const chatPage = await page.context().newPage();
      await chatPage.goto('/test-chat');
      await waitForChatInterfaceLoad(chatPage);
      
      // Progress workflow in chat interface
      await chatPage.click('[data-testid="next-message"]');
      await expect(chatPage.locator('[data-testid="agent-message"]')).toBeVisible();
      
      // Verify dashboard reflects updates
      await page.reload();
      await waitForDashboardLoad(page);
      await expect(page.locator('[data-testid="workflow-update"]')).toBeVisible();
      
      await chatPage.close();
    });
  });

  test.describe('Performance and Resource Management', () => {
    test('Component integration maintains optimal performance across transitions', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      await testPerformance(page);
      
      // Navigate to chat interface
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      await testPerformance(page);
      
      // Navigate back to dashboard
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      await testPerformance(page);
    });

    test('Memory usage optimized during component transitions', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      await testMemoryUsage(page);
      
      // Navigate to chat interface
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      await testMemoryUsage(page);
      
      // Navigate back to dashboard
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      await testMemoryUsage(page);
    });

    test('Rendering performance consistent across all component states', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      await testRenderingPerformance(page);
      
      // Navigate to chat interface
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      await testRenderingPerformance(page);
      
      // Navigate back to dashboard
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      await testRenderingPerformance(page);
    });
  });

  test.describe('Error Handling and Recovery Across Components', () => {
    test('Error states handled consistently across all components', async ({ page }) => {
      // Simulate error in dashboard
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      await page.route('**/api/dashboard/status', route => 
        route.fulfill({ status: 500, body: 'Internal Server Error' })
      );
      
      await page.click('[data-testid="refresh-status"]');
      await expect(page.locator('[data-testid="error-state"]')).toBeVisible();
      
      // Navigate to chat interface
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Verify error handling consistent
      await expect(page.locator('[data-testid="error-handling"]')).toBeVisible();
      
      // Restore route
      await page.unroute('**/api/dashboard/status');
    });

    test('Recovery mechanisms work seamlessly across component boundaries', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Simulate network error
      await page.route('**/api/dashboard/status', route => 
        route.fulfill({ status: 0, body: 'Network Error' })
      );
      
      await page.click('[data-testid="refresh-status"]');
      await expect(page.locator('[data-testid="network-error"]')).toBeVisible();
      
      // Test recovery
      await page.click('[data-testid="retry-button"]');
      await expect(page.locator('[data-testid="retry-loading"]')).toBeVisible();
      
      // Restore route
      await page.unroute('**/api/dashboard/status');
    });
  });

  test.describe('Complete User Journey Integration', () => {
    test('End-to-end user journey with all components working seamlessly', async ({ page }) => {
      const userData = generateOnboardingData('startup');
      const projectData = generateProjectData('basic');
      
      // Complete entire user journey
      await completeUserJourney(page, userData, projectData);
      
      // Verify successful completion
      await expect(page.locator('[data-testid="journey-complete"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-indicator"]')).toBeVisible();
    });

    test('Component integration supports complex workflow scenarios', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Start complex project
      await page.click('[data-testid="create-project"]');
      await page.fill('[data-testid="project-name"]', 'Complex Integration Test');
      await page.fill('[data-testid="project-description"]', 'Testing complex workflow integration');
      await page.click('[data-testid="start-project"]');
      
      // Navigate to chat interface
      await page.click('[data-testid="begin-workflow"]');
      await expect(page).toHaveURL('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Progress through workflow
      await page.click('[data-testid="next-message"]');
      await expect(page.locator('[data-testid="agent-message"]')).toBeVisible();
      
      // Verify complex workflow support
      await expect(page.locator('[data-testid="complex-workflow"]')).toBeVisible();
      await expect(page.locator('[data-testid="integration-support"]')).toBeVisible();
    });

    test('Cross-component data validation and integrity maintenance', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      
      // Fill invalid data
      await page.fill('[data-testid="company-name"]', '<script>alert("xss")</script>');
      await page.selectOption('[data-testid="industry-select"]', 'technology');
      await page.click('[data-testid="next-step"]');
      
      // Verify validation
      await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
      
      // Fix data and continue
      await page.fill('[data-testid="company-name"]', 'Valid Company Name');
      await page.click('[data-testid="next-step"]');
      
      // Verify progression
      await waitForOnboardingStepLoad(page, 2);
      await expect(page.locator('[data-testid="step-2"]')).toBeVisible();
    });
  });
});
