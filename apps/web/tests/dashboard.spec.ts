import { test, expect } from '@playwright/test';
import { mockApiRoutes } from './utils/test-helpers';
import {
  waitForDashboardLoad,
  validateDashboardState,
  setupJourneyMocks,
  generateOnboardingData,
  testThemeToggle,
  testResponsiveLayout,
  testSystemStatus,
  testProjectCreationFlow,
  testQuickActions,
  testNavigation,
  testUserExperience,
  testAuthenticationIntegration,
  testErrorHandling,
  testPerformance,
  checkColorContrastCompliance
} from './utils/streamlined-journey-helpers';

test.describe('Dashboard - Streamlined User Journey Integration', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page);
    await setupJourneyMocks(page, 'dashboard-testing');
  });

  test.describe('Dashboard Component Rendering', () => {
    test('Dashboard page loads correctly with all main sections', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      await validateDashboardState(page);
      
      // Verify main dashboard sections
      await expect(page.locator('[data-testid="dashboard-header"]')).toBeVisible();
      await expect(page.locator('[data-testid="system-status"]')).toBeVisible();
      await expect(page.locator('[data-testid="quick-actions"]')).toBeVisible();
      await expect(page.locator('[data-testid="recent-projects"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-profile"]')).toBeVisible();
    });

    test('Dashboard components initialize with proper state', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Verify component initialization
      await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();
      await expect(page.locator('[data-testid="loading-state"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="error-state"]')).not.toBeVisible();
    });
  });

  test.describe('Theme Integration and Responsiveness', () => {
    test('Theme toggling works correctly and persists across sessions', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      await testThemeToggle(page);
    });

    test('Dashboard responsive layout adapts to different viewport sizes', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      await testResponsiveLayout(page);
    });

    test('Color contrast compliance for accessibility', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      await checkColorContrastCompliance(page);
    });
  });

  test.describe('System Status and Monitoring', () => {
    test('System status indicators display real-time information', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      await testSystemStatus(page);
    });

    test('System status updates automatically and shows current health', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Verify system status updates
      await expect(page.locator('[data-testid="system-status"]')).toBeVisible();
      await expect(page.locator('[data-testid="status-indicator"]')).toBeVisible();
      await expect(page.locator('[data-testid="last-updated"]')).toBeVisible();
      
      // Test refresh functionality
      await page.click('[data-testid="refresh-status"]');
      await expect(page.locator('[data-testid="status-updating"]')).toBeVisible();
      await expect(page.locator('[data-testid="status-updated"]')).toBeVisible();
    });
  });

  test.describe('Project Creation and Management', () => {
    test('Project creation flow integrates seamlessly with dashboard', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      await testProjectCreationFlow(page);
    });

    test('Recent projects display and navigation works correctly', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Verify recent projects section
      await expect(page.locator('[data-testid="recent-projects"]')).toBeVisible();
      await expect(page.locator('[data-testid="project-list"]')).toBeVisible();
      
      // Test project navigation
      if (await page.locator('[data-testid="project-item"]').count() > 0) {
        await page.click('[data-testid="project-item"]');
        await expect(page.locator('[data-testid="project-details"]')).toBeVisible();
      }
    });
  });

  test.describe('Quick Actions and Navigation', () => {
    test('Quick actions provide immediate access to key functions', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      await testQuickActions(page);
    });

    test('Navigation between dashboard sections is smooth and intuitive', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      await testNavigation(page);
    });
  });

  test.describe('User Experience and Interface', () => {
    test('Dashboard provides intuitive and engaging user experience', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      await testUserExperience(page);
    });

    test('Dashboard accessibility features work correctly', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Test keyboard navigation
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="focused-element"]')).toBeVisible();
      
      // Test screen reader compatibility
      await expect(page.locator('[data-testid="aria-label"]')).toHaveAttribute('aria-label');
    });
  });

  test.describe('Authentication and User Integration', () => {
    test('Dashboard integrates properly with authentication system', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      await testAuthenticationIntegration(page);
    });

    test('User profile and preferences are displayed correctly', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Verify user profile section
      await expect(page.locator('[data-testid="user-profile"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-avatar"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-name"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-email"]')).toBeVisible();
    });
  });

  test.describe('Error Handling and Recovery', () => {
    test('Dashboard handles errors gracefully and provides recovery options', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      await testErrorHandling(page);
    });

    test('Dashboard recovers from network interruptions and API failures', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Simulate network error
      await page.route('**/api/dashboard/status', route => 
        route.fulfill({ status: 500, body: 'Internal Server Error' })
      );
      
      // Refresh dashboard
      await page.click('[data-testid="refresh-status"]');
      
      // Verify error handling
      await expect(page.locator('[data-testid="error-state"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Unable to load system status');
      
      // Test recovery
      await page.click('[data-testid="retry-button"]');
      await expect(page.locator('[data-testid="retry-loading"]')).toBeVisible();
      
      // Restore route
      await page.unroute('**/api/dashboard/status');
    });
  });

  test.describe('Performance and Optimization', () => {
    test('Dashboard loads quickly and performs efficiently', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      await testPerformance(page);
    });

    test('Dashboard memory usage and rendering performance are optimized', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Test memory usage
      await testMemoryUsage(page);
      
      // Test rendering performance
      await testRenderingPerformance(page);
    });
  });

  test.describe('Integration with Streamlined Journey', () => {
    test('Dashboard integrates seamlessly with onboarding flow', async ({ page }) => {
      const userData = generateOnboardingData('simple-startup');
      
      // Complete onboarding to reach dashboard
      await page.goto('/onboarding');
      // ... complete onboarding steps (simplified for this test)
      await expect(page).toHaveURL('/dashboard');
      
      // Verify dashboard state reflects onboarding completion
      await waitForDashboardLoad(page);
      await expect(page.locator('[data-testid="onboarding-complete"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-profile"]')).toContainText(userData.companyName);
    });

    test('Dashboard provides clear path to ChatInterface for project work', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Verify path to ChatInterface
      await expect(page.locator('[data-testid="start-project"]')).toBeVisible();
      await expect(page.locator('[data-testid="chat-interface-link"]')).toBeVisible();
      
      // Test navigation to ChatInterface
      await page.click('[data-testid="start-project"]');
      await expect(page.locator('[data-testid="project-setup"]')).toBeVisible();
      
      await page.click('[data-testid="begin-workflow"]');
      await expect(page).toHaveURL('/test-chat');
    });
  });
});
