import { test, expect } from '@playwright/test';
import { mockApiRoutes } from './utils/test-helpers';
import { 
  navigateOnboardingFlow, 
  navigateToDashboard, 
  startProjectFromDashboard,
  completeUserJourney,
  waitForOnboardingStepLoad,
  waitForDashboardLoad,
  waitForChatInterfaceLoad,
  validateLoadingIndicators,
  saveOnboardingProgress,
  validateSessionPersistence,
  simulatePageReload,
  clearUserSession,
  simulateOnboardingError,
  simulateDashboardError,
  simulateChatError,
  simulateNetworkInterruption,
  generateOnboardingData,
  generateProjectData,
  generateUserProfile,
  generateWorkflowContext,
  validateOnboardingCompletion,
  validateDashboardState,
  validateChatInitialization,
  validateJourneyTransitions,
  measureOnboardingPerformance,
  measureDashboardLoadTime,
  measureChatResponseTime,
  generatePerformanceReport,
  setupJourneyMocks,
  mockOnboardingServices,
  mockDashboardServices,
  mockChatServices,
  validateJourneyAccessibility,
  testKeyboardNavigation,
  validateScreenReaderCompatibility,
  checkColorContrastCompliance
} from './utils/streamlined-journey-helpers';

test.describe('Streamlined User Journey - Complete End-to-End Flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page);
    await setupJourneyMocks(page, 'complete-flow');
  });

  test('Complete new user journey from onboarding to project completion', async ({ page }) => {
    const userData = generateOnboardingData('simple-startup');
    const projectData = generateProjectData('basic');
    
    // Start onboarding flow
    await page.goto('/onboarding');
    await waitForOnboardingStepLoad(page, 1);
    
    // Complete onboarding steps
    for (let step = 1; step <= 4; step++) {
      await waitForOnboardingStepLoad(page, step);
      await validateLoadingIndicators(page, ['form-loading']);
      
      // Fill step-specific form data
      switch (step) {
        case 1: // Welcome
          await page.fill('[data-testid="company-name"]', userData.companyName);
          await page.selectOption('[data-testid="industry-select"]', userData.industry);
          break;
        case 2: // Company Info
          await page.fill('[data-testid="company-size"]', userData.companySize);
          await page.fill('[data-testid="company-description"]', userData.description);
          break;
        case 3: // Project Details
          await page.selectOption('[data-testid="project-type"]', userData.projectType);
          await page.fill('[data-testid="project-goals"]', userData.projectGoals);
          break;
        case 4: // Completion
          await page.click('[data-testid="complete-onboarding"]');
          break;
      }
      
      if (step < 4) {
        await page.click('[data-testid="next-step"]');
        await expect(page.locator(`[data-testid="step-${step + 1}"]`)).toBeVisible();
      }
    }
    
    // Validate onboarding completion and redirect
    await validateOnboardingCompletion(page, userData);
    await expect(page).toHaveURL('/dashboard');
    
    // Dashboard integration
    await waitForDashboardLoad(page);
    await validateDashboardState(page, { 
      userProfile: userData, 
      systemStatus: 'operational' 
    });
    
    // Start new project
    await startProjectFromDashboard(page);
    await expect(page).toHaveURL('/test-chat');
    
    // ChatInterface initialization
    await waitForChatInterfaceLoad(page);
    const sessionData = await validateChatInitialization(page, {
      projectType: userData.projectType,
      userContext: userData
    });
    
    // Test workflow progression
    await testWorkflowProgression(page, sessionData);
    
    // Generate performance report
    const performanceMetrics = {
      onboarding: await measureOnboardingPerformance(page),
      dashboard: await measureDashboardLoadTime(page),
      chat: await measureChatResponseTime(page)
    };
    
    const report = generatePerformanceReport(performanceMetrics);
    expect(report.totalTime).toBeLessThan(30000); // 30 seconds max
  });

  test('Enterprise project journey with complex requirements', async ({ page }) => {
    const userData = generateOnboardingData('enterprise-project');
    const projectData = generateProjectData('complex');
    
    await completeUserJourney(page, userData);
    
    // Validate enterprise-specific features
    await page.waitForSelector('[data-testid="enterprise-features"]');
    await expect(page.locator('[data-testid="stakeholder-management"]')).toBeVisible();
    
    // Test advanced workflow features
    await testAdvancedWorkflowFeatures(page, projectData);
  });

  test('Research initiative journey with academic focus', async ({ page }) => {
    const userData = generateOnboardingData('research-initiative');
    
    await completeUserJourney(page, userData);
    
    // Validate research-specific features
    await expect(page.locator('[data-testid="research-tools"]')).toBeVisible();
    await expect(page.locator('[data-testid="data-analysis"]')).toBeVisible();
  });

  test('Product launch journey for existing company', async ({ page }) => {
    const userData = generateOnboardingData('product-launch');
    
    await completeUserJourney(page, userData);
    
    // Validate product launch features
    await expect(page.locator('[data-testid="market-research"]')).toBeVisible();
    await expect(page.locator('[data-testid="launch-strategy"]')).toBeVisible();
  });
});

test.describe('Streamlined User Journey - Navigation and Transitions', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page);
    await setupJourneyMocks(page, 'navigation-testing');
  });

  test('Smooth transitions between onboarding steps', async ({ page }) => {
    await page.goto('/onboarding');
    
    for (let step = 1; step <= 4; step++) {
      await waitForOnboardingStepLoad(page, step);
      
      // Test form validation
      if (step < 4) {
        await page.click('[data-testid="next-step"]');
        await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
        
        // Fill required fields
        await fillStepData(page, step);
        await page.click('[data-testid="next-step"]');
        
        // Verify smooth transition
        await expect(page.locator(`[data-testid="step-${step + 1}"]`)).toBeVisible();
        await expect(page.locator(`[data-testid="step-${step}"]`)).not.toBeVisible();
      }
    }
  });

  test('Dashboard loading and component rendering after onboarding', async ({ page }) => {
    const userData = generateOnboardingData('simple-startup');
    
    // Complete onboarding
    await page.goto('/onboarding');
    await completeOnboardingSteps(page, userData);
    
    // Verify dashboard redirect
    await expect(page).toHaveURL('/dashboard');
    
    // Test dashboard components
    await waitForDashboardLoad(page);
    await expect(page.locator('[data-testid="ai-cofounder-system"]')).toBeVisible();
    await expect(page.locator('[data-testid="quick-actions"]')).toBeVisible();
    await expect(page.locator('[data-testid="system-status"]')).toBeVisible();
  });

  test('Project creation button functionality and redirect behavior', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForDashboardLoad(page);
    
    // Test project creation button
    const startButton = page.locator('[data-testid="start-new-project"]');
    await expect(startButton).toBeVisible();
    await expect(startButton).toBeEnabled();
    
    // Click and verify navigation
    await startButton.click();
    await expect(page).toHaveURL('/test-chat');
    
    // Verify ChatInterface loaded
    await waitForChatInterfaceLoad(page);
    await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();
  });

  test('ChatInterface initialization and welcome message display', async ({ page }) => {
    await page.goto('/test-chat');
    
    await waitForChatInterfaceLoad(page);
    
    // Verify welcome message
    await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="workflow-session"]')).toBeVisible();
    
    // Verify input components
    await expect(page.locator('[data-testid="message-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="send-button"]')).toBeEnabled();
  });

  test('Browser back/forward navigation behavior across journey', async ({ page }) => {
    const userData = generateOnboardingData('simple-startup');
    
    // Navigate through journey
    await page.goto('/onboarding');
    await completeOnboardingSteps(page, userData);
    await expect(page).toHaveURL('/dashboard');
    
    await startProjectFromDashboard(page);
    await expect(page).toHaveURL('/test-chat');
    
    // Test back navigation
    await page.goBack();
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();
    
    // Test forward navigation
    await page.goForward();
    await expect(page).toHaveURL('/test-chat');
    await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();
  });
});

test.describe('Streamlined User Journey - Loading States and Progress Indicators', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page);
    await setupJourneyMocks(page, 'loading-testing');
  });

  test('Loading states during onboarding form submissions', async ({ page }) => {
    await page.goto('/onboarding');
    
    for (let step = 1; step <= 4; step++) {
      await waitForOnboardingStepLoad(page, step);
      
      if (step < 4) {
        await fillStepData(page, step);
        
        // Test loading state during submission
        await page.click('[data-testid="next-step"]');
        await expect(page.locator('[data-testid="step-loading"]')).toBeVisible();
        
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

test.describe('Streamlined User Journey - State Persistence and Recovery', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page);
    await setupJourneyMocks(page, 'persistence-testing');
  });

  test('Onboarding form data persistence across page reloads', async ({ page }) => {
    const userData = generateOnboardingData('simple-startup');
    
    await page.goto('/onboarding');
    
    // Fill first step
    await waitForOnboardingStepLoad(page, 1);
    await page.fill('[data-testid="company-name"]', userData.companyName);
    await page.selectOption('[data-testid="industry-select"]', userData.industry);
    
    // Save progress
    await saveOnboardingProgress(page, { step: 1, data: userData });
    
    // Reload page
    await simulatePageReload(page);
    
    // Verify data persisted
    await expect(page.locator('[data-testid="company-name"]')).toHaveValue(userData.companyName);
    await expect(page.locator('[data-testid="industry-select"]')).toHaveValue(userData.industry);
  });

  test('Dashboard state maintenance during navigation', async ({ page }) => {
    const userData = generateOnboardingData('simple-startup');
    
    // Complete onboarding and reach dashboard
    await page.goto('/onboarding');
    await completeOnboardingSteps(page, userData);
    await expect(page).toHaveURL('/dashboard');
    
    // Navigate to chat and back
    await startProjectFromDashboard(page);
    await page.goBack();
    
    // Verify dashboard state maintained
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="user-profile"]')).toContainText(userData.companyName);
  });

  test('ChatInterface session persistence and recovery', async ({ page }) => {
    await page.goto('/test-chat');
    await waitForChatInterfaceLoad(page);
    
    // Get session ID
    const sessionId = await page.locator('[data-testid="session-id"]').textContent();
    
    // Reload page
    await simulatePageReload(page);
    
    // Verify session recovered
    await waitForChatInterfaceLoad(page);
    const recoveredSessionId = await page.locator('[data-testid="session-id"]').textContent();
    expect(recoveredSessionId).toBe(sessionId);
    
    // Verify message history preserved
    await expect(page.locator('[data-testid="message-history"]')).toBeVisible();
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
    await simulatePageReload(page);
    
    // Verify workflow state preserved
    await waitForChatInterfaceLoad(page);
    const recoveredStage = await page.locator('[data-testid="workflow-stage"]').textContent();
    expect(recoveredStage).toBe(workflowStage);
  });

  test('User authentication state maintenance throughout journey', async ({ page }) => {
    // Mock authenticated user
    await mockApiRoutes(page, { authenticated: true });
    
    await page.goto('/onboarding');
    await expect(page.locator('[data-testid="user-profile"]')).toBeVisible();
    
    // Navigate through journey
    await completeOnboardingSteps(page, generateOnboardingData('simple-startup'));
    await expect(page.locator('[data-testid="user-profile"]')).toBeVisible();
    
    await startProjectFromDashboard(page);
    await expect(page.locator('[data-testid="user-profile"]')).toBeVisible();
  });
});

test.describe('Streamlined User Journey - Error Handling and Graceful Degradation', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page);
    await setupJourneyMocks(page, 'error-testing');
  });

  test('Onboarding form validation and error display', async ({ page }) => {
    await page.goto('/onboarding');
    
    // Test required field validation
    await waitForOnboardingStepLoad(page, 1);
    await page.click('[data-testid="next-step"]');
    
    await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Company name is required');
    
    // Test field-specific validation
    await page.fill('[data-testid="company-name"]', 'A');
    await page.click('[data-testid="next-step"]');
    
    await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Company name must be at least 3 characters');
  });

  test('Dashboard error handling for system status failures', async ({ page }) => {
    await simulateDashboardError(page, 'system-status');
    await page.goto('/dashboard');
    
    // Verify error state
    await expect(page.locator('[data-testid="error-state"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Unable to load system status');
    
    // Test retry mechanism
    await page.click('[data-testid="retry-button"]');
    await expect(page.locator('[data-testid="system-status"]')).toBeVisible();
  });

  test('ChatInterface error recovery and retry mechanisms', async ({ page }) => {
    await simulateChatError(page, 'workflow-init');
    await page.goto('/test-chat');
    
    // Verify error state
    await expect(page.locator('[data-testid="error-state"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Failed to initialize workflow');
    
    // Test retry
    await page.click('[data-testid="retry-button"]');
    await waitForChatInterfaceLoad(page);
    await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();
  });

  test('Network failure handling across all journey components', async ({ page }) => {
    const userData = generateOnboardingData('simple-startup');
    
    // Test onboarding network failure
    await simulateNetworkInterruption(page, 5000);
    await page.goto('/onboarding');
    await waitForOnboardingStepLoad(page, 1);
    
    await fillStepData(page, 1);
    await page.click('[data-testid="next-step"]');
    
    await expect(page.locator('[data-testid="network-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    
    // Test recovery
    await page.click('[data-testid="retry-button"]');
    await expect(page.locator('[data-testid="step-2"]')).toBeVisible();
  });

  test('Graceful degradation when backend services are unavailable', async ({ page }) => {
    // Mock all services as unavailable
    await mockApiRoutes(page, { allServicesDown: true });
    
    await page.goto('/dashboard');
    
    // Verify graceful degradation
    await expect(page.locator('[data-testid="degraded-mode"]')).toBeVisible();
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
    
    // Test offline functionality
    await expect(page.locator('[data-testid="offline-actions"]')).toBeVisible();
    await expect(page.locator('[data-testid="local-storage"]')).toBeVisible();
  });
});

// Helper functions
async function testWorkflowProgression(page: any, sessionData: any) {
  // Test step-by-step progression
  for (let stage = 1; stage <= 7; stage++) {
    await page.click('[data-testid="next-message"]');
    await expect(page.locator('[data-testid="agent-message"]')).toBeVisible();
    
    // Verify agent metadata
    await expect(page.locator('[data-testid="agent-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="agent-title"]')).toBeVisible();
    
    // Check for decision points
    if (await page.locator('[data-testid="decision-point"]').isVisible()) {
      await expect(page.locator('[data-testid="decision-buttons"]')).toBeVisible();
      await page.click('[data-testid="approve-decision"]');
      await expect(page.locator('[data-testid="decision-feedback"]')).toBeVisible();
    }
  }
}

async function testAdvancedWorkflowFeatures(page: any, projectData: any) {
  // Test advanced features for enterprise projects
  await expect(page.locator('[data-testid="stakeholder-management"]')).toBeVisible();
  await expect(page.locator('[data-testid="advanced-analytics"]')).toBeVisible();
  
  // Test custom workflow stages
  await page.click('[data-testid="custom-stage"]');
  await expect(page.locator('[data-testid="custom-workflow"]')).toBeVisible();
}

async function completeOnboardingSteps(page: any, userData: any) {
  for (let step = 1; step <= 4; step++) {
    await waitForOnboardingStepLoad(page, step);
    await fillStepData(page, step);
    
    if (step < 4) {
      await page.click('[data-testid="next-step"]');
    }
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
