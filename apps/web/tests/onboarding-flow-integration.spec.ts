import { test, expect } from '@playwright/test';
import { mockApiRoutes } from './utils/test-helpers';
import { 
  waitForOnboardingStepLoad,
  validateOnboardingCompletion,
  generateOnboardingData,
  generateUserProfile,
  setupJourneyMocks,
  mockOnboardingServices,
  simulateOnboardingError,
  simulateNetworkInterruption,
  validateJourneyAccessibility,
  testKeyboardNavigation,
  checkColorContrastCompliance
} from './utils/streamlined-journey-helpers';

test.describe('Onboarding Flow Integration - Streamlined User Journey', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page);
    await setupJourneyMocks(page, 'onboarding-testing');
  });

  test.describe('Multi-Step Onboarding Flow', () => {
    test('Complete 4-step onboarding progression', async ({ page }) => {
      await page.goto('/onboarding');
      
      // Step 1: Welcome
      await waitForOnboardingStepLoad(page, 1);
      await expect(page.locator('[data-testid="step-1"]')).toBeVisible();
      await expect(page.locator('[data-testid="welcome-title"]')).toContainText('Welcome to BeBrahma');
      
      // Step 2: Company Info
      await page.click('[data-testid="next-step"]');
      await waitForOnboardingStepLoad(page, 2);
      await expect(page.locator('[data-testid="step-2"]')).toBeVisible();
      await expect(page.locator('[data-testid="company-info-title"]')).toBeVisible();
      
      // Step 3: Project Details
      await page.click('[data-testid="next-step"]');
      await waitForOnboardingStepLoad(page, 3);
      await expect(page.locator('[data-testid="step-3"]')).toBeVisible();
      await expect(page.locator('[data-testid="project-details-title"]')).toBeVisible();
      
      // Step 4: Completion
      await page.click('[data-testid="next-step"]');
      await waitForOnboardingStepLoad(page, 4);
      await expect(page.locator('[data-testid="step-4"]')).toBeVisible();
      await expect(page.locator('[data-testid="completion-title"]')).toBeVisible();
    });

    test('Step navigation and progress indicators', async ({ page }) => {
      await page.goto('/onboarding');
      
      // Verify progress bar
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

    test('Form validation and error handling at each step', async ({ page }) => {
      await page.goto('/onboarding');
      
      // Step 1 validation
      await waitForOnboardingStepLoad(page, 1);
      await page.click('[data-testid="next-step"]');
      await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
      
      // Fill required fields
      await page.fill('[data-testid="company-name"]', 'Test Company');
      await page.selectOption('[data-testid="industry-select"]', 'technology');
      await page.click('[data-testid="next-step"]');
      
      // Step 2 validation
      await waitForOnboardingStepLoad(page, 2);
      await page.click('[data-testid="next-step"]');
      await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
      
      // Fill required fields
      await page.fill('[data-testid="company-size"]', '10-50');
      await page.fill('[data-testid="company-description"]', 'Test description');
      await page.click('[data-testid="next-step"]');
      
      // Step 3 validation
      await waitForOnboardingStepLoad(page, 3);
      await page.click('[data-testid="next-step"]');
      await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
      
      // Fill required fields
      await page.selectOption('[data-testid="project-type"]', 'startup');
      await page.fill('[data-testid="project-goals"]', 'Test goals');
      await page.click('[data-testid="next-step"]');
    });

    test('Data persistence across onboarding steps', async ({ page }) => {
      const userData = generateOnboardingData('simple-startup');
      
      await page.goto('/onboarding');
      
      // Step 1: Fill company info
      await waitForOnboardingStepLoad(page, 1);
      await page.fill('[data-testid="company-name"]', userData.companyName);
      await page.selectOption('[data-testid="industry-select"]', userData.industry);
      await page.click('[data-testid="next-step"]');
      
      // Step 2: Fill company details
      await waitForOnboardingStepLoad(page, 2);
      await page.fill('[data-testid="company-size"]', userData.companySize);
      await page.fill('[data-testid="company-description"]', userData.description);
      await page.click('[data-testid="next-step"]');
      
      // Step 3: Fill project details
      await waitForOnboardingStepLoad(page, 3);
      await page.selectOption('[data-testid="project-type"]', userData.projectType);
      await page.fill('[data-testid="project-goals"]', userData.projectGoals);
      await page.click('[data-testid="next-step"]');
      
      // Step 4: Complete onboarding
      await waitForOnboardingStepLoad(page, 4);
      await page.click('[data-testid="complete-onboarding"]');
      
      // Verify data was saved
      await validateOnboardingCompletion(page, userData);
    });
  });

  test.describe('Form Data Collection and Validation', () => {
    test('Company name and industry selection validation', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      
      // Test empty company name
      await page.click('[data-testid="next-step"]');
      await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Company name is required');
      
      // Test short company name
      await page.fill('[data-testid="company-name"]', 'A');
      await page.click('[data-testid="next-step"]');
      await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Company name must be at least 3 characters');
      
      // Test valid company name
      await page.fill('[data-testid="company-name"]', 'Valid Company Name');
      await page.selectOption('[data-testid="industry-select"]', 'technology');
      await page.click('[data-testid="next-step"]');
      
      // Should proceed to next step
      await expect(page.locator('[data-testid="step-2"]')).toBeVisible();
    });

    test('Project type and goals input handling', async ({ page }) => {
      await page.goto('/onboarding');
      
      // Navigate to project details step
      await navigateToProjectStep(page);
      
      // Test project type selection
      await page.selectOption('[data-testid="project-type"]', 'startup');
      await expect(page.locator('[data-testid="project-type"]')).toHaveValue('startup');
      
      // Test project goals input
      const testGoals = 'Launch a new AI-powered product in the market';
      await page.fill('[data-testid="project-goals"]', testGoals);
      await expect(page.locator('[data-testid="project-goals"]')).toHaveValue(testGoals);
      
      // Test goals length validation
      const longGoals = 'A'.repeat(1001);
      await page.fill('[data-testid="project-goals"]', longGoals);
      await page.click('[data-testid="next-step"]');
      
      await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Project goals too long');
    });

    test('Required field validation and error messages', async ({ page }) => {
      await page.goto('/onboarding');
      
      // Test all required fields
      const requiredFields = [
        { selector: '[data-testid="company-name"]', field: 'Company name' },
        { selector: '[data-testid="industry-select"]', field: 'Industry' },
        { selector: '[data-testid="company-size"]', field: 'Company size' },
        { selector: '[data-testid="project-type"]', field: 'Project type' },
        { selector: '[data-testid="project-goals"]', field: 'Project goals' }
      ];
      
      for (const field of requiredFields) {
        await navigateToFieldStep(page, field.selector);
        await page.click('[data-testid="next-step"]');
        
        await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
        await expect(page.locator('[data-testid="error-message"]')).toContainText(`${field.field} is required`);
      }
    });

    test('Form data formatting and sanitization', async ({ page }) => {
      await page.goto('/onboarding');
      
      // Test company name sanitization
      await waitForOnboardingStepLoad(page, 1);
      await page.fill('[data-testid="company-name"]', '  Test Company  ');
      await page.selectOption('[data-testid="industry-select"]', 'technology');
      await page.click('[data-testid="next-step"]');
      
      // Verify sanitized value
      await waitForOnboardingStepLoad(page, 2);
      const sanitizedName = await page.locator('[data-testid="company-name-display"]').textContent();
      expect(sanitizedName).toBe('Test Company');
      
      // Test description formatting
      await page.fill('[data-testid="company-description"]', 'Line 1\nLine 2\nLine 3');
      await page.click('[data-testid="next-step"]');
      
      // Verify formatted description
      await waitForOnboardingStepLoad(page, 3);
      const formattedDescription = await page.locator('[data-testid="company-description-display"]').textContent();
      expect(formattedDescription).toContain('Line 1');
      expect(formattedDescription).toContain('Line 2');
    });
  });

  test.describe('Authentication Integration', () => {
    test('Onboarding flow with Clerk authentication', async ({ page }) => {
      // Mock authenticated user
      await mockApiRoutes(page, { authenticated: true });
      
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      
      // Verify user profile displayed
      await expect(page.locator('[data-testid="user-profile"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-avatar"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-name"]')).toBeVisible();
      
      // Verify authenticated features
      await expect(page.locator('[data-testid="save-progress"]')).toBeVisible();
      await expect(page.locator('[data-testid="resume-later"]')).toBeVisible();
    });

    test('User state management during onboarding', async ({ page }) => {
      const userProfile = generateUserProfile('authenticated');
      
      // Mock authenticated user with profile
      await mockApiRoutes(page, { authenticated: true, userProfile });
      
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      
      // Verify user context loaded
      await expect(page.locator('[data-testid="user-context"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-preferences"]')).toBeVisible();
      
      // Test user-specific onboarding
      await expect(page.locator('[data-testid="personalized-welcome"]')).toContainText(userProfile.name);
      await expect(page.locator('[data-testid="user-industry"]')).toContainText(userProfile.industry);
    });

    test('Redirect behavior for unauthenticated users', async ({ page }) => {
      // Mock unauthenticated user
      await mockApiRoutes(page, { authenticated: false });
      
      await page.goto('/onboarding');
      
      // Verify redirect to sign-in
      await expect(page).toHaveURL('/sign-in');
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
      
      // Verify redirect message
      await expect(page.locator('[data-testid="redirect-message"]')).toContainText('Please sign in to continue');
    });

    test('User profile integration with onboarding data', async ({ page }) => {
      const userProfile = generateUserProfile('authenticated');
      
      // Mock authenticated user
      await mockApiRoutes(page, { authenticated: true, userProfile });
      
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      
      // Verify profile integration
      await expect(page.locator('[data-testid="profile-integration"]')).toBeVisible();
      await expect(page.locator('[data-testid="existing-data"]')).toBeVisible();
      
      // Test data pre-filling
      const companyName = await page.locator('[data-testid="company-name"]').inputValue();
      expect(companyName).toBe(userProfile.companyName || '');
      
      const industry = await page.locator('[data-testid="industry-select"]').inputValue();
      expect(industry).toBe(userProfile.industry || '');
    });
  });

  test.describe('Onboarding to Dashboard Transition', () => {
    test('Smooth transition from onboarding completion to dashboard', async ({ page }) => {
      const userData = generateOnboardingData('simple-startup');
      
      // Complete onboarding
      await page.goto('/onboarding');
      await completeOnboardingSteps(page, userData);
      
      // Verify smooth transition
      await expect(page.locator('[data-testid="transition-overlay"]')).toBeVisible();
      await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible();
      
      // Wait for dashboard redirect
      await expect(page).toHaveURL('/dashboard');
      await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();
      
      // Verify transition completed
      await expect(page.locator('[data-testid="transition-complete"]')).toBeVisible();
    });

    test('Onboarding data persistence and availability in dashboard', async ({ page }) => {
      const userData = generateOnboardingData('simple-startup');
      
      // Complete onboarding
      await page.goto('/onboarding');
      await completeOnboardingSteps(page, userData);
      
      // Verify dashboard loaded
      await expect(page).toHaveURL('/dashboard');
      
      // Verify onboarding data available
      await expect(page.locator('[data-testid="onboarding-data"]')).toBeVisible();
      await expect(page.locator('[data-testid="company-name-display"]')).toContainText(userData.companyName);
      await expect(page.locator('[data-testid="project-type-display"]')).toContainText(userData.projectType);
    });

    test('Dashboard initialization with onboarding context', async ({ page }) => {
      const userData = generateOnboardingData('enterprise-project');
      
      // Complete onboarding
      await page.goto('/onboarding');
      await completeOnboardingSteps(page, userData);
      
      // Verify dashboard initialized with context
      await expect(page).toHaveURL('/dashboard');
      await expect(page.locator('[data-testid="context-aware-dashboard"]')).toBeVisible();
      
      // Verify enterprise-specific features
      await expect(page.locator('[data-testid="enterprise-features"]')).toBeVisible();
      await expect(page.locator('[data-testid="stakeholder-management"]')).toBeVisible();
    });

    test('User preferences and settings application', async ({ page }) => {
      const userData = generateOnboardingData('simple-startup');
      
      // Complete onboarding with preferences
      await page.goto('/onboarding');
      await completeOnboardingSteps(page, userData);
      
      // Verify dashboard loaded
      await expect(page).toHaveURL('/dashboard');
      
      // Verify preferences applied
      await expect(page.locator('[data-testid="user-preferences"]')).toBeVisible();
      await expect(page.locator('[data-testid="theme-setting"]')).toHaveValue(userData.preferredTheme || 'light');
      await expect(page.locator('[data-testid="notification-setting"]')).toHaveValue(userData.notificationsEnabled ? 'true' : 'false');
    });
  });

  test.describe('Progressive Enhancement and UX', () => {
    test('Responsive design across different screen sizes', async ({ page }) => {
      // Test desktop layout
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      
      await expect(page.locator('[data-testid="desktop-layout"]')).toBeVisible();
      await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
      
      // Test tablet layout
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.reload();
      await waitForOnboardingStepLoad(page, 1);
      
      await expect(page.locator('[data-testid="tablet-layout"]')).toBeVisible();
      await expect(page.locator('[data-testid="collapsible-sidebar"]')).toBeVisible();
      
      // Test mobile layout
      await page.setViewportSize({ width: 375, height: 667 });
      await page.reload();
      await waitForOnboardingStepLoad(page, 1);
      
      await expect(page.locator('[data-testid="mobile-layout"]')).toBeVisible();
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    });

    test('Accessibility features and keyboard navigation', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      
      // Test keyboard navigation
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="company-name"]')).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="industry-select"]')).toBeFocused();
      
      // Test Enter key activation
      await page.keyboard.press('Enter');
      await expect(page.locator('[data-testid="step-2"]')).toBeVisible();
    });

    test('Loading states and progress feedback', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      
      // Test step transition loading
      await page.fill('[data-testid="company-name"]', 'Test Company');
      await page.selectOption('[data-testid="industry-select"]', 'technology');
      await page.click('[data-testid="next-step"]');
      
      await expect(page.locator('[data-testid="step-loading"]')).toBeVisible();
      await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
      
      // Wait for next step
      await expect(page.locator('[data-testid="step-2"]')).toBeVisible();
      await expect(page.locator('[data-testid="step-loading"]')).not.toBeVisible();
    });

    test('Smooth animations and transitions between steps', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      
      // Test smooth step transition
      await page.fill('[data-testid="company-name"]', 'Test Company');
      await page.selectOption('[data-testid="industry-select"]', 'technology');
      await page.click('[data-testid="next-step"]');
      
      // Verify smooth transition
      await expect(page.locator('[data-testid="transition-animation"]')).toBeVisible();
      await expect(page.locator('[data-testid="step-fade"]')).toBeVisible();
      
      // Wait for transition completion
      await expect(page.locator('[data-testid="step-2"]')).toBeVisible();
      await expect(page.locator('[data-testid="transition-complete"]')).toBeVisible();
    });
  });

  test.describe('Error Handling and Recovery', () => {
    test('Network failure handling during form submissions', async ({ page }) => {
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
    });

    test('Error recovery and retry mechanisms', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      
      // Simulate error
      await simulateOnboardingError(page, 'form-submission');
      
      // Fill form and attempt submission
      await page.fill('[data-testid="company-name"]', 'Test Company');
      await page.selectOption('[data-testid="industry-select"]', 'technology');
      await page.click('[data-testid="next-step"]');
      
      // Verify error state
      await expect(page.locator('[data-testid="submission-error"]')).toBeVisible();
      
      // Test retry
      await page.click('[data-testid="retry-button"]');
      await expect(page.locator('[data-testid="retry-loading"]')).toBeVisible();
      
      // Wait for recovery
      await expect(page.locator('[data-testid="retry-success"]')).toBeVisible();
      await expect(page.locator('[data-testid="step-2"]')).toBeVisible();
    });

    test('Partial completion and resume functionality', async ({ page }) => {
      const userData = generateOnboardingData('simple-startup');
      
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      
      // Fill step 1
      await page.fill('[data-testid="company-name"]', userData.companyName);
      await page.selectOption('[data-testid="industry-select"]', userData.industry);
      
      // Save progress
      await page.click('[data-testid="save-progress"]');
      await expect(page.locator('[data-testid="progress-saved"]')).toBeVisible();
      
      // Navigate away
      await page.goto('/dashboard');
      
      // Return to onboarding
      await page.goto('/onboarding');
      
      // Verify resume option
      await expect(page.locator('[data-testid="resume-option"]')).toBeVisible();
      await expect(page.locator('[data-testid="resume-button"]')).toBeVisible();
      
      // Resume onboarding
      await page.click('[data-testid="resume-button"]');
      await expect(page.locator('[data-testid="step-2"]')).toBeVisible();
    });

    test('Graceful degradation when services are unavailable', async ({ page }) => {
      // Mock service unavailable
      await mockApiRoutes(page, { onboardingServiceDown: true });
      
      await page.goto('/onboarding');
      
      // Verify graceful degradation
      await expect(page.locator('[data-testid="degraded-mode"]')).toBeVisible();
      await expect(page.locator('[data-testid="offline-onboarding"]')).toBeVisible();
      
      // Test offline functionality
      await expect(page.locator('[data-testid="offline-form"]')).toBeVisible();
      await expect(page.locator('[data-testid="local-storage"]')).toBeVisible();
    });
  });

  test.describe('Data Persistence and State Management', () => {
    test('Form data persistence across page reloads', async ({ page }) => {
      const userData = generateOnboardingData('simple-startup');
      
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      
      // Fill form data
      await page.fill('[data-testid="company-name"]', userData.companyName);
      await page.selectOption('[data-testid="industry-select"]', userData.industry);
      
      // Reload page
      await page.reload();
      await waitForOnboardingStepLoad(page, 1);
      
      // Verify data persisted
      await expect(page.locator('[data-testid="company-name"]')).toHaveValue(userData.companyName);
      await expect(page.locator('[data-testid="industry-select"]')).toHaveValue(userData.industry);
    });

    test('Step completion tracking and resume capability', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      
      // Complete step 1
      await page.fill('[data-testid="company-name"]', 'Test Company');
      await page.selectOption('[data-testid="industry-select"]', 'technology');
      await page.click('[data-testid="next-step"]');
      
      // Verify step 1 completed
      await expect(page.locator('[data-testid="step-1-complete"]')).toBeVisible();
      await expect(page.locator('[data-testid="step-2"]')).toBeVisible();
      
      // Navigate back to step 1
      await page.click('[data-testid="previous-step"]');
      await waitForOnboardingStepLoad(page, 1);
      
      // Verify step 1 data preserved
      await expect(page.locator('[data-testid="company-name"]')).toHaveValue('Test Company');
      await expect(page.locator('[data-testid="industry-select"]')).toHaveValue('technology');
    });

    test('Browser navigation during onboarding', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      
      // Fill step 1 and proceed
      await page.fill('[data-testid="company-name"]', 'Test Company');
      await page.selectOption('[data-testid="industry-select"]', 'technology');
      await page.click('[data-testid="next-step"]');
      
      // Navigate to step 2
      await waitForOnboardingStepLoad(page, 2);
      await expect(page.locator('[data-testid="step-2"]')).toBeVisible();
      
      // Test back button
      await page.goBack();
      await expect(page.locator('[data-testid="step-1"]')).toBeVisible();
      
      // Test forward button
      await page.goForward();
      await expect(page.locator('[data-testid="step-2"]')).toBeVisible();
    });

    test('Data cleanup and privacy considerations', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      
      // Fill sensitive data
      await page.fill('[data-testid="company-name"]', 'Test Company');
      await page.selectOption('[data-testid="industry-select"]', 'technology');
      
      // Test data cleanup
      await page.click('[data-testid="clear-data"]');
      await expect(page.locator('[data-testid="clear-confirmation"]')).toBeVisible();
      
      // Confirm cleanup
      await page.click('[data-testid="confirm-clear"]');
      
      // Verify data cleared
      await expect(page.locator('[data-testid="company-name"]')).toHaveValue('');
      await expect(page.locator('[data-testid="industry-select"]')).toHaveValue('');
      
      // Verify privacy notice
      await expect(page.locator('[data-testid="privacy-notice"]')).toBeVisible();
      await expect(page.locator('[data-testid="data-handling"]')).toBeVisible();
    });
  });

  test.describe('Integration with Project Creation', () => {
    test('Onboarding data influences project creation flow', async ({ page }) => {
      const userData = generateOnboardingData('enterprise-project');
      
      // Complete onboarding
      await page.goto('/onboarding');
      await completeOnboardingSteps(page, userData);
      
      // Verify dashboard loaded
      await expect(page).toHaveURL('/dashboard');
      
      // Start new project
      await page.click('[data-testid="start-new-project"]');
      await expect(page).toHaveURL('/test-chat');
      
      // Verify project context from onboarding
      await expect(page.locator('[data-testid="project-context"]')).toBeVisible();
      await expect(page.locator('[data-testid="company-context"]')).toContainText(userData.companyName);
      await expect(page.locator('[data-testid="project-type-context"]')).toContainText(userData.projectType);
    });

    test('Context passing from onboarding to ChatInterface', async ({ page }) => {
      const userData = generateOnboardingData('research-initiative');
      
      // Complete onboarding
      await page.goto('/onboarding');
      await completeOnboardingSteps(page, userData);
      
      // Navigate to chat interface
      await page.click('[data-testid="start-new-project"]');
      await expect(page).toHaveURL('/test-chat');
      
      // Verify context passed
      await expect(page.locator('[data-testid="onboarding-context"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-preferences"]')).toBeVisible();
      await expect(page.locator('[data-testid="project-goals"]')).toContainText(userData.projectGoals);
    });

    test('Personalized experience based on onboarding responses', async ({ page }) => {
      const userData = generateOnboardingData('product-launch');
      
      // Complete onboarding
      await page.goto('/onboarding');
      await completeOnboardingSteps(page, userData);
      
      // Navigate to chat interface
      await page.click('[data-testid="start-new-project"]');
      await expect(page).toHaveURL('/test-chat');
      
      // Verify personalized experience
      await expect(page.locator('[data-testid="personalized-welcome"]')).toBeVisible();
      await expect(page.locator('[data-testid="customized-workflow"]')).toBeVisible();
      await expect(page.locator('[data-testid="industry-specific-tools"]')).toBeVisible();
    });

    test('Workflow customization based on user preferences', async ({ page }) => {
      const userData = generateOnboardingData('startup');
      
      // Complete onboarding
      await page.goto('/onboarding');
      await completeOnboardingSteps(page, userData);
      
      // Navigate to chat interface
      await page.click('[data-testid="start-new-project"]');
      await expect(page).toHaveURL('/test-chat');
      
      // Verify workflow customization
      await expect(page.locator('[data-testid="customized-workflow"]')).toBeVisible();
      await expect(page.locator('[data-testid="startup-specific-stages"]')).toBeVisible();
      await expect(page.locator('[data-testid="accelerated-timeline"]')).toBeVisible();
    });
  });

  test.describe('Performance and User Experience', () => {
    test('Onboarding flow loading performance', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      
      const loadTime = Date.now() - startTime;
      
      // Verify performance requirements
      expect(loadTime).toBeLessThan(2000); // 2 seconds max
      
      // Verify performance metrics
      await expect(page.locator('[data-testid="performance-metrics"]')).toBeVisible();
      await expect(page.locator('[data-testid="load-time"]')).toContainText(loadTime.toString());
    });

    test('Smooth step transitions and minimal loading times', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      
      // Measure step transition time
      const transitionStart = Date.now();
      
      await page.fill('[data-testid="company-name"]', 'Test Company');
      await page.selectOption('[data-testid="industry-select"]', 'technology');
      await page.click('[data-testid="next-step"]');
      
      await expect(page.locator('[data-testid="step-2"]')).toBeVisible();
      const transitionTime = Date.now() - transitionStart;
      
      // Verify transition performance
      expect(transitionTime).toBeLessThan(1000); // 1 second max
      
      // Verify smooth transition
      await expect(page.locator('[data-testid="transition-smooth"]')).toBeVisible();
    });

    test('Memory usage and resource management', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      
      // Get initial memory usage
      const initialMemory = await page.evaluate(() => performance.memory?.usedJSHeapSize || 0);
      
      // Navigate through steps
      for (let i = 1; i <= 4; i++) {
        if (i < 4) {
          await fillStepData(page, i);
          await page.click('[data-testid="next-step"]');
          await waitForOnboardingStepLoad(page, i + 1);
        }
      }
      
      // Check memory usage
      const finalMemory = await page.evaluate(() => performance.memory?.usedJSHeapSize || 0);
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory should be reasonable
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB max
      
      // Verify resource management
      await expect(page.locator('[data-testid="resource-management"]')).toBeVisible();
      await expect(page.locator('[data-testid="memory-cleanup"]')).toBeVisible();
    });

    test('User engagement and completion rates', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      
      // Verify engagement indicators
      await expect(page.locator('[data-testid="engagement-tracker"]')).toBeVisible();
      await expect(page.locator('[data-testid="completion-rate"]')).toBeVisible();
      
      // Complete onboarding
      await completeOnboardingSteps(page, generateOnboardingData('simple-startup'));
      
      // Verify completion tracking
      await expect(page.locator('[data-testid="completion-success"]')).toBeVisible();
      await expect(page.locator('[data-testid="completion-metrics"]')).toBeVisible();
      
      // Verify engagement maintained
      await expect(page.locator('[data-testid="high-engagement"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-satisfaction"]')).toBeVisible();
    });
  });
});

// Helper functions
async function navigateToProjectStep(page: any) {
  // Navigate through steps 1 and 2
  await waitForOnboardingStepLoad(page, 1);
  await page.fill('[data-testid="company-name"]', 'Test Company');
  await page.selectOption('[data-testid="industry-select"]', 'technology');
  await page.click('[data-testid="next-step"]');
  
  await waitForOnboardingStepLoad(page, 2);
  await page.fill('[data-testid="company-size"]', '10-50');
  await page.fill('[data-testid="company-description"]', 'Test description');
  await page.click('[data-testid="next-step"]');
  
  await waitForOnboardingStepLoad(page, 3);
}

async function navigateToFieldStep(page: any, fieldSelector: string) {
  if (fieldSelector.includes('company-name') || fieldSelector.includes('industry-select')) {
    await waitForOnboardingStepLoad(page, 1);
  } else if (fieldSelector.includes('company-size')) {
    await navigateToProjectStep(page);
  } else if (fieldSelector.includes('project-type') || fieldSelector.includes('project-goals')) {
    await navigateToProjectStep(page);
  }
}

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

async function completeOnboardingSteps(page: any, userData: any) {
  for (let step = 1; step <= 4; step++) {
    await waitForOnboardingStepLoad(page, step);
    await fillStepData(page, step);
    
    if (step < 4) {
      await page.click('[data-testid="next-step"]');
    } else {
      await page.click('[data-testid="complete-onboarding"]');
    }
  }
}
