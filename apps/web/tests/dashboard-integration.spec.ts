import { test, expect } from '@playwright/test';
import { mockApiRoutes } from './utils/test-helpers';
import { 
  waitForDashboardLoad,
  validateDashboardState,
  startProjectFromDashboard,
  simulateDashboardError,
  generateOnboardingData,
  generateUserProfile,
  setupJourneyMocks,
  mockDashboardServices,
  validateJourneyAccessibility,
  testKeyboardNavigation,
  checkColorContrastCompliance
} from './utils/streamlined-journey-helpers';

test.describe('Dashboard Integration - Streamlined User Journey', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page);
    await setupJourneyMocks(page, 'dashboard-testing');
  });

  test.describe('Dashboard Component Rendering', () => {
    test('Dashboard page loads correctly with all main sections', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Verify main dashboard sections
      await expect(page.locator('[data-testid="ai-cofounder-system"]')).toBeVisible();
      await expect(page.locator('[data-testid="quick-actions"]')).toBeVisible();
      await expect(page.locator('[data-testid="system-status"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-profile"]')).toBeVisible();
      
      // Verify dashboard title and description
      await expect(page.locator('h1')).toContainText('AI Co-Founder System');
      await expect(page.locator('[data-testid="dashboard-description"]')).toBeVisible();
    });

    test('Theme toggle functionality and dark/light mode transitions', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Find theme toggle button
      const themeToggle = page.locator('[data-testid="theme-toggle"]');
      await expect(themeToggle).toBeVisible();
      
      // Get initial theme
      const initialTheme = await page.locator('html').getAttribute('data-theme');
      
      // Toggle theme
      await themeToggle.click();
      
      // Wait for theme change
      await page.waitForTimeout(100);
      
      // Verify theme changed
      const newTheme = await page.locator('html').getAttribute('data-theme');
      expect(newTheme).not.toBe(initialTheme);
      
      // Toggle back
      await themeToggle.click();
      await page.waitForTimeout(100);
      
      const finalTheme = await page.locator('html').getAttribute('data-theme');
      expect(finalTheme).toBe(initialTheme);
    });

    test('Responsive layout across different viewport sizes', async ({ page }) => {
      // Test desktop layout
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Verify desktop layout elements
      await expect(page.locator('[data-testid="desktop-layout"]')).toBeVisible();
      await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
      
      // Test tablet layout
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.reload();
      await waitForDashboardLoad(page);
      
      // Verify tablet layout adjustments
      await expect(page.locator('[data-testid="tablet-layout"]')).toBeVisible();
      await expect(page.locator('[data-testid="collapsible-sidebar"]')).toBeVisible();
      
      // Test mobile layout
      await page.setViewportSize({ width: 375, height: 667 });
      await page.reload();
      await waitForDashboardLoad(page);
      
      // Verify mobile layout adjustments
      await expect(page.locator('[data-testid="mobile-layout"]')).toBeVisible();
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    });

    test('System status indicators and real-time status updates', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Verify system status section
      const systemStatus = page.locator('[data-testid="system-status"]');
      await expect(systemStatus).toBeVisible();
      
      // Check individual status indicators
      await expect(page.locator('[data-testid="frontend-status"]')).toBeVisible();
      await expect(page.locator('[data-testid="backend-status"]')).toBeVisible();
      await expect(page.locator('[data-testid="ai-agents-status"]')).toBeVisible();
      await expect(page.locator('[data-testid="database-status"]')).toBeVisible();
      
      // Verify status values
      await expect(page.locator('[data-testid="frontend-status"]')).toHaveText('Operational');
      await expect(page.locator('[data-testid="backend-status"]')).toHaveText('Operational');
      await expect(page.locator('[data-testid="ai-agents-status"]')).toHaveText('Operational');
      await expect(page.locator('[data-testid="database-status"]')).toHaveText('Operational');
      
      // Test real-time updates
      await page.click('[data-testid="refresh-status"]');
      await expect(page.locator('[data-testid="status-updating"]')).toBeVisible();
      await expect(page.locator('[data-testid="status-updated"]')).toBeVisible();
    });
  });

  test.describe('Project Creation Flow', () => {
    test('Start New Project button functionality and navigation', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Verify start project button
      const startButton = page.locator('[data-testid="start-new-project"]');
      await expect(startButton).toBeVisible();
      await expect(startButton).toBeEnabled();
      await expect(startButton).toHaveText('Start New Project');
      
      // Click button and verify navigation
      await startButton.click();
      await expect(page).toHaveURL('/test-chat');
      
      // Verify ChatInterface loaded
      await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();
    });

    test('Test Chat Interface link navigation and page loading', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Find test chat link
      const testChatLink = page.locator('[data-testid="test-chat-link"]');
      await expect(testChatLink).toBeVisible();
      await expect(testChatLink).toHaveText('Test Chat Interface');
      
      // Click link and verify navigation
      await testChatLink.click();
      await expect(page).toHaveURL('/test-chat');
      
      // Verify page loaded correctly
      await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();
    });

    test('Quick Actions buttons and their behaviors', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Verify quick actions section
      const quickActions = page.locator('[data-testid="quick-actions"]');
      await expect(quickActions).toBeVisible();
      
      // Test View Analytics button
      const analyticsButton = page.locator('[data-testid="view-analytics"]');
      await expect(analyticsButton).toBeVisible();
      await expect(analyticsButton).toHaveText('View Analytics');
      
      // Test Settings button
      const settingsButton = page.locator('[data-testid="settings"]');
      await expect(settingsButton).toBeVisible();
      await expect(settingsButton).toHaveText('Settings');
      
      // Test button interactions
      await analyticsButton.click();
      await expect(page.locator('[data-testid="analytics-page"]')).toBeVisible();
      
      await page.goBack();
      await waitForDashboardLoad(page);
      
      await settingsButton.click();
      await expect(page.locator('[data-testid="settings-page"]')).toBeVisible();
    });

    test('Project creation state management and session initialization', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Start new project
      await startProjectFromDashboard(page);
      await expect(page).toHaveURL('/test-chat');
      
      // Verify session initialized
      await expect(page.locator('[data-testid="workflow-session"]')).toBeVisible();
      await expect(page.locator('[data-testid="session-id"]')).toBeVisible();
      
      // Verify project context loaded
      await expect(page.locator('[data-testid="project-context"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-preferences"]')).toBeVisible();
    });
  });

  test.describe('Dashboard Navigation and UX', () => {
    test('Smooth transitions from dashboard to chat interface', async ({ page }) => {
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

    test('Loading states during navigation and component mounting', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Test initial loading state
      await expect(page.locator('[data-testid="dashboard-loading"]')).toBeVisible();
      await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
      
      // Wait for dashboard to load
      await waitForDashboardLoad(page);
      await expect(page.locator('[data-testid="dashboard-loading"]')).not.toBeVisible();
      
      // Test navigation loading
      await startProjectFromDashboard(page);
      await expect(page.locator('[data-testid="navigation-loading"]')).toBeVisible();
      
      // Wait for navigation completion
      await expect(page).toHaveURL('/test-chat');
      await expect(page.locator('[data-testid="navigation-loading"]')).not.toBeVisible();
    });

    test('Browser navigation from chat interface to dashboard', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Navigate to chat
      await startProjectFromDashboard(page);
      await expect(page).toHaveURL('/test-chat');
      
      // Test back button
      await page.goBack();
      await expect(page).toHaveURL('/dashboard');
      await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();
      
      // Test forward button
      await page.goForward();
      await expect(page).toHaveURL('/test-chat');
      await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();
    });

    test('Dashboard state preservation during navigation cycles', async ({ page }) => {
      const userData = generateOnboardingData('simple-startup');
      
      // Complete onboarding to reach dashboard
      await page.goto('/onboarding');
      // ... complete onboarding steps
      await expect(page).toHaveURL('/dashboard');
      
      // Navigate to chat and back multiple times
      for (let i = 0; i < 3; i++) {
        await startProjectFromDashboard(page);
        await expect(page).toHaveURL('/test-chat');
        
        await page.goBack();
        await expect(page).toHaveURL('/dashboard');
        await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();
      }
      
      // Verify dashboard state maintained
      await expect(page.locator('[data-testid="user-profile"]')).toContainText(userData.companyName);
    });
  });

  test.describe('Theme and Accessibility', () => {
    test('Theme persistence across dashboard and chat interface navigation', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Set theme to dark
      const themeToggle = page.locator('[data-testid="theme-toggle"]');
      await themeToggle.click();
      await page.waitForTimeout(100);
      
      const dashboardTheme = await page.locator('html').getAttribute('data-theme');
      expect(dashboardTheme).toBe('dark');
      
      // Navigate to chat interface
      await startProjectFromDashboard(page);
      await expect(page).toHaveURL('/test-chat');
      
      // Verify theme persisted
      const chatTheme = await page.locator('html').getAttribute('data-theme');
      expect(chatTheme).toBe('dark');
      
      // Navigate back to dashboard
      await page.goBack();
      await waitForDashboardLoad(page);
      
      // Verify theme still persisted
      const finalTheme = await page.locator('html').getAttribute('data-theme');
      expect(finalTheme).toBe('dark');
    });

    test('Accessibility features and keyboard navigation', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Test keyboard navigation
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="start-new-project"]')).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="test-chat-link"]')).toBeFocused();
      
      // Test Enter key activation
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL('/test-chat');
    });

    test('Theme toggle propagation to all dashboard components', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Get initial theme state of components
      const initialCardTheme = await page.locator('[data-testid="dashboard-card"]').getAttribute('data-theme');
      const initialButtonTheme = await page.locator('[data-testid="start-new-project"]').getAttribute('data-theme');
      
      // Toggle theme
      const themeToggle = page.locator('[data-testid="theme-toggle"]');
      await themeToggle.click();
      await page.waitForTimeout(100);
      
      // Verify all components updated
      const newCardTheme = await page.locator('[data-testid="dashboard-card"]').getAttribute('data-theme');
      const newButtonTheme = await page.locator('[data-testid="start-new-project"]').getAttribute('data-theme');
      
      expect(newCardTheme).not.toBe(initialCardTheme);
      expect(newButtonTheme).not.toBe(initialButtonTheme);
    });

    test('Color contrast compliance in both themes', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Test light theme contrast
      const lightThemeContrast = await checkColorContrastCompliance(page, 'light');
      expect(lightThemeContrast.passed).toBe(true);
      
      // Switch to dark theme
      const themeToggle = page.locator('[data-testid="theme-toggle"]');
      await themeToggle.click();
      await page.waitForTimeout(100);
      
      // Test dark theme contrast
      const darkThemeContrast = await checkColorContrastCompliance(page, 'dark');
      expect(darkThemeContrast.passed).toBe(true);
    });
  });

  test.describe('Integration with Authentication', () => {
    test('Dashboard access with authenticated users', async ({ page }) => {
      // Mock authenticated user
      await mockApiRoutes(page, { authenticated: true });
      
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Verify user profile displayed
      await expect(page.locator('[data-testid="user-profile"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-avatar"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-name"]')).toBeVisible();
      
      // Verify authenticated features available
      await expect(page.locator('[data-testid="user-settings"]')).toBeVisible();
      await expect(page.locator('[data-testid="logout-button"]')).toBeVisible();
    });

    test('Redirect behavior for unauthenticated users', async ({ page }) => {
      // Mock unauthenticated user
      await mockApiRoutes(page, { authenticated: false });
      
      await page.goto('/dashboard');
      
      // Verify redirect to login
      await expect(page).toHaveURL('/sign-in');
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
    });

    test('User profile display and authentication state management', async ({ page }) => {
      const userProfile = generateUserProfile('authenticated');
      
      // Mock authenticated user with profile
      await mockApiRoutes(page, { authenticated: true, userProfile });
      
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Verify profile information
      await expect(page.locator('[data-testid="user-name"]')).toContainText(userProfile.name);
      await expect(page.locator('[data-testid="user-email"]')).toContainText(userProfile.email);
      await expect(page.locator('[data-testid="user-role"]')).toContainText(userProfile.role);
    });

    test('Session handling across dashboard interactions', async ({ page }) => {
      // Mock authenticated user
      await mockApiRoutes(page, { authenticated: true });
      
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Perform dashboard actions
      await page.click('[data-testid="refresh-status"]');
      await expect(page.locator('[data-testid="status-updated"]')).toBeVisible();
      
      // Verify session maintained
      await expect(page.locator('[data-testid="user-profile"]')).toBeVisible();
      await expect(page.locator('[data-testid="authenticated-indicator"]')).toBeVisible();
    });
  });

  test.describe('Error Handling and Resilience', () => {
    test('Dashboard behavior when backend services are unavailable', async ({ page }) => {
      await simulateDashboardError(page, 'all-services');
      await page.goto('/dashboard');
      
      // Verify error state
      await expect(page.locator('[data-testid="error-state"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Services temporarily unavailable');
      
      // Verify fallback content
      await expect(page.locator('[data-testid="offline-mode"]')).toBeVisible();
      await expect(page.locator('[data-testid="cached-data"]')).toBeVisible();
    });

    test('Error message display and recovery mechanisms', async ({ page }) => {
      await simulateDashboardError(page, 'system-status');
      await page.goto('/dashboard');
      
      // Verify error display
      await expect(page.locator('[data-testid="error-banner"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-details"]')).toBeVisible();
      
      // Test retry mechanism
      const retryButton = page.locator('[data-testid="retry-button"]');
      await expect(retryButton).toBeVisible();
      await expect(retryButton).toBeEnabled();
      
      await retryButton.click();
      await expect(page.locator('[data-testid="retry-loading"]')).toBeVisible();
      
      // Wait for recovery
      await expect(page.locator('[data-testid="system-status"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-banner"]')).not.toBeVisible();
    });

    test('Graceful degradation of system status indicators', async ({ page }) => {
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

    test('Fallback behavior for failed navigation attempts', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Simulate navigation failure
      await page.route('**/test-chat', route => route.abort());
      
      // Attempt navigation
      await startProjectFromDashboard(page);
      
      // Verify fallback behavior
      await expect(page.locator('[data-testid="navigation-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="retry-navigation"]')).toBeVisible();
      
      // Test retry
      await page.unroute('**/test-chat');
      await page.click('[data-testid="retry-navigation"]');
      await expect(page).toHaveURL('/test-chat');
    });
  });

  test.describe('Performance and Loading', () => {
    test('Dashboard loading performance and initial render time', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      const loadTime = Date.now() - startTime;
      
      // Verify performance requirements
      expect(loadTime).toBeLessThan(3000); // 3 seconds max
      
      // Verify performance metrics
      await expect(page.locator('[data-testid="performance-metrics"]')).toBeVisible();
      await expect(page.locator('[data-testid="load-time"]')).toContainText(loadTime.toString());
    });

    test('Efficient component mounting and state initialization', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Monitor component mounting
      await expect(page.locator('[data-testid="dashboard-loading"]')).toBeVisible();
      
      // Wait for components to mount
      await waitForDashboardLoad(page);
      
      // Verify efficient mounting
      await expect(page.locator('[data-testid="mount-performance"]')).toBeVisible();
      await expect(page.locator('[data-testid="mount-time"]')).toContainText('ms');
      
      // Verify state initialized
      await expect(page.locator('[data-testid="state-initialized"]')).toBeVisible();
    });

    test('Memory usage during extended dashboard sessions', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Get initial memory usage
      const initialMemory = await page.evaluate(() => performance.memory?.usedJSHeapSize || 0);
      
      // Perform multiple actions
      for (let i = 0; i < 10; i++) {
        await page.click('[data-testid="refresh-status"]');
        await page.waitForTimeout(100);
      }
      
      // Get final memory usage
      const finalMemory = await page.evaluate(() => performance.memory?.usedJSHeapSize || 0);
      
      // Verify memory usage is reasonable
      const memoryIncrease = finalMemory - initialMemory;
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB max increase
    });

    test('Smooth animations and transitions', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Test smooth animations
      await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();
      
      // Trigger animation
      await page.click('[data-testid="animate-trigger"]');
      
      // Verify animation smoothness
      await expect(page.locator('[data-testid="animation-running"]')).toBeVisible();
      await expect(page.locator('[data-testid="animation-complete"]')).toBeVisible();
      
      // Test transition smoothness
      await startProjectFromDashboard(page);
      await expect(page.locator('[data-testid="transition-smooth"]')).toBeVisible();
    });
  });
});
