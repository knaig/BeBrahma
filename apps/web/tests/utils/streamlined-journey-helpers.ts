import { Page, expect } from '@playwright/test';

// Types for test data and configurations
export interface OnboardingData {
  companyName: string;
  industry: string;
  companySize: string;
  projectType: string;
  budget: string;
  timeline: string;
  description: string;
}

export interface ProjectData {
  name: string;
  description: string;
  requirements: string[];
  priority: string;
  deadline: string;
}

export interface WorkflowData {
  stage: string;
  progress: number;
  agents: string[];
  decisions: string[];
  status: string;
}

// Mock setup and configuration
export async function setupJourneyMocks(page: Page, mockType: string): Promise<void> {
  switch (mockType) {
    case 'complete-flow':
      await setupCompleteFlowMocks(page);
      break;
    case 'dashboard-testing':
      await setupDashboardMocks(page);
      break;
    case 'chat-testing':
      await setupChatMocks(page);
      break;
    case 'onboarding-testing':
      await setupOnboardingMocks(page);
      break;
    case 'loading-testing':
      await setupLoadingMocks(page);
      break;
    case 'error-testing':
      await setupErrorMocks(page);
      break;
    default:
      await setupDefaultMocks(page);
  }
}

async function setupCompleteFlowMocks(page: Page): Promise<void> {
  // Mock onboarding API
  await page.route('**/api/onboarding/step', route => {
    const data = route.request().postDataJSON();
    if (data.step === 1) {
      route.fulfill({ status: 200, body: JSON.stringify({ success: true, nextStep: 2 }) });
    } else if (data.step === 2) {
      route.fulfill({ status: 200, body: JSON.stringify({ success: true, nextStep: 3 }) });
    } else if (data.step === 3) {
      route.fulfill({ status: 200, body: JSON.stringify({ success: true, nextStep: 4 }) });
    } else if (data.step === 4) {
      route.fulfill({ status: 200, body: JSON.stringify({ success: true, completed: true }) });
    }
  });

  // Mock dashboard API
  await page.route('**/api/dashboard/status', route => {
    route.fulfill({ status: 200, body: JSON.stringify({ 
      systemStatus: 'healthy',
      services: ['onboarding', 'chat', 'workflow'],
      lastUpdated: new Date().toISOString()
    })});
  });

  // Mock chat/workflow API
  await page.route('**/api/workflow/next', route => {
    route.fulfill({ status: 200, body: JSON.stringify({
      success: true,
      message: 'Workflow progressed successfully',
      nextStage: 'requirements-gathering',
      progress: 25
    })});
  });
}

async function setupDashboardMocks(page: Page): Promise<void> {
  await page.route('**/api/dashboard/**', route => {
    if (route.request().url().includes('status')) {
      route.fulfill({ status: 200, body: JSON.stringify({ 
        systemStatus: 'healthy',
        services: ['onboarding', 'chat', 'workflow'],
        lastUpdated: new Date().toISOString()
      })});
    } else if (route.request().url().includes('profile')) {
      route.fulfill({ status: 200, body: JSON.stringify({
        companyName: 'Test Company',
        industry: 'technology',
        projectCount: 3
      })});
    }
  });
}

async function setupChatMocks(page: Page): Promise<void> {
  await page.route('**/api/workflow/**', route => {
    if (route.request().url().includes('init')) {
      route.fulfill({ status: 200, body: JSON.stringify({
        sessionId: 'test-session-123',
        workflowId: 'test-workflow-456',
        currentStage: 'initialization',
        progress: 0
      })});
    } else if (route.request().url().includes('next')) {
      route.fulfill({ status: 200, body: JSON.stringify({
        success: true,
        message: 'Agent response received',
        nextStage: 'requirements-gathering',
        progress: 25
      })});
    }
  });
}

async function setupOnboardingMocks(page: Page): Promise<void> {
  await page.route('**/api/onboarding/**', route => {
    if (route.request().method() === 'POST') {
      const data = route.request().postDataJSON();
      route.fulfill({ status: 200, body: JSON.stringify({ 
        success: true, 
        nextStep: data.step + 1,
        data: data
      })});
    } else {
      route.fulfill({ status: 200, body: JSON.stringify({ 
        currentStep: 1,
        progress: 25,
        steps: ['company-info', 'project-details', 'requirements', 'confirmation']
      })});
    }
  });
}

async function setupLoadingMocks(page: Page): Promise<void> {
  // Add artificial delays to test loading states
  await page.route('**/api/**', route => {
    setTimeout(() => route.continue(), 2000);
  });
}

async function setupErrorMocks(page: Page): Promise<void> {
  // Mock various error scenarios
  await page.route('**/api/onboarding/step', route => {
    route.fulfill({ status: 500, body: 'Internal Server Error' });
  });
}

async function setupDefaultMocks(page: Page): Promise<void> {
  // Default mock setup
  await page.route('**/api/**', route => route.continue());
}

// Navigation and flow helpers
export async function navigateOnboardingFlow(page: Page, userData: OnboardingData): Promise<void> {
  await page.goto('/onboarding');
  
  // Step 1: Company Information
  await waitForOnboardingStepLoad(page, 1);
  await page.fill('[data-testid="company-name"]', userData.companyName);
  await page.selectOption('[data-testid="industry-select"]', userData.industry);
  await page.click('[data-testid="next-step"]');
  
  // Step 2: Project Details
  await waitForOnboardingStepLoad(page, 2);
  await page.fill('[data-testid="project-name"]', userData.projectType);
  await page.selectOption('[data-testid="company-size"]', userData.companySize);
  await page.click('[data-testid="next-step"]');
  
  // Step 3: Requirements
  await waitForOnboardingStepLoad(page, 3);
  await page.fill('[data-testid="project-description"]', userData.description);
  await page.selectOption('[data-testid="budget-range"]', userData.budget);
  await page.selectOption('[data-testid="timeline"]', userData.timeline);
  await page.click('[data-testid="next-step"]');
  
  // Step 4: Confirmation
  await waitForOnboardingStepLoad(page, 4);
  await page.click('[data-testid="confirm-submission"]');
}

export async function navigateToDashboard(page: Page): Promise<void> {
  await page.goto('/dashboard');
  await waitForDashboardLoad(page);
}

export async function startProjectFromDashboard(page: Page, projectData: ProjectData): Promise<void> {
  await page.click('[data-testid="create-project"]');
  await page.fill('[data-testid="project-name"]', projectData.name);
  await page.fill('[data-testid="project-description"]', projectData.description);
  await page.click('[data-testid="start-project"]');
}

export async function completeUserJourney(page: Page, userData: OnboardingData, projectData: ProjectData): Promise<void> {
  // Complete onboarding
  await navigateOnboardingFlow(page, userData);
  
  // Navigate to dashboard
  await navigateToDashboard(page);
  
  // Start project
  await startProjectFromDashboard(page, projectData);
  
  // Verify project started
  await expect(page.locator('[data-testid="project-started"]')).toBeVisible();
}

// Wait and validation helpers
export async function waitForOnboardingStepLoad(page: Page, stepNumber: number): Promise<void> {
  await expect(page.locator(`[data-testid="step-${stepNumber}"]`)).toBeVisible();
  await expect(page.locator('[data-testid="step-loading"]')).not.toBeVisible();
}

export async function waitForDashboardLoad(page: Page): Promise<void> {
  await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();
  await expect(page.locator('[data-testid="dashboard-loading"]')).not.toBeVisible();
}

export async function waitForChatInterfaceLoad(page: Page): Promise<void> {
  await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();
  await expect(page.locator('[data-testid="chat-loading"]')).not.toBeVisible();
}

export async function validateDashboardState(page: Page): Promise<void> {
  await expect(page.locator('[data-testid="dashboard-header"]')).toBeVisible();
  await expect(page.locator('[data-testid="system-status"]')).toBeVisible();
  await expect(page.locator('[data-testid="quick-actions"]')).toBeVisible();
  await expect(page.locator('[data-testid="recent-projects"]')).toBeVisible();
}

export async function validateChatInitialization(page: Page): Promise<void> {
  await expect(page.locator('[data-testid="chat-header"]')).toBeVisible();
  await expect(page.locator('[data-testid="message-input"]')).toBeVisible();
  await expect(page.locator('[data-testid="workflow-status"]')).toBeVisible();
}

// Data generation helpers
export function generateOnboardingData(type: string): OnboardingData {
  const dataSets = {
    'simple-startup': {
      companyName: 'TechStart Inc',
      industry: 'technology',
      companySize: '1-10',
      projectType: 'web-application',
      budget: '10k-50k',
      timeline: '3-6-months',
      description: 'Building a modern web application for our startup'
    },
    'enterprise': {
      companyName: 'Enterprise Corp',
      industry: 'finance',
      companySize: '1000+',
      projectType: 'enterprise-solution',
      budget: '100k+',
      timeline: '6-12-months',
      description: 'Enterprise-grade solution for financial services'
    },
    'small-business': {
      companyName: 'Local Business LLC',
      industry: 'retail',
      companySize: '11-50',
      projectType: 'ecommerce',
      budget: '5k-25k',
      timeline: '1-3-months',
      description: 'E-commerce platform for local retail business'
    }
  };
  
  return dataSets[type] || dataSets['simple-startup'];
}

export function generateProjectData(type: string): ProjectData {
  const dataSets = {
    'basic': {
      name: 'Basic Web App',
      description: 'Simple web application with basic functionality',
      requirements: ['user authentication', 'data storage', 'responsive design'],
      priority: 'medium',
      deadline: '2024-06-30'
    },
    'complex': {
      name: 'Complex Enterprise Solution',
      description: 'Multi-module enterprise solution with advanced features',
      requirements: ['multi-tenant architecture', 'advanced analytics', 'API integration', 'security compliance'],
      priority: 'high',
      deadline: '2024-12-31'
    },
    'quick': {
      name: 'Quick MVP',
      description: 'Minimum viable product for rapid market validation',
      requirements: ['core features', 'basic UI', 'data persistence'],
      priority: 'high',
      deadline: '2024-04-30'
    }
  };
  
  return dataSets[type] || dataSets['basic'];
}

export function generateWorkflowData(stage: string): WorkflowData {
  const stages = {
    'initialization': { progress: 0, agents: ['coordinator'], decisions: [], status: 'starting' },
    'requirements-gathering': { progress: 25, agents: ['analyst', 'coordinator'], decisions: ['scope-defined'], status: 'active' },
    'planning': { progress: 50, agents: ['planner', 'coordinator'], decisions: ['scope-defined', 'timeline-set'], status: 'active' },
    'execution': { progress: 75, agents: ['developer', 'coordinator'], decisions: ['scope-defined', 'timeline-set', 'plan-approved'], status: 'active' },
    'completion': { progress: 100, agents: ['coordinator'], decisions: ['scope-defined', 'timeline-set', 'plan-approved', 'project-completed'], status: 'completed' }
  };
  
  const stageData = stages[stage] || stages['initialization'];
  return {
    stage,
    progress: stageData.progress,
    agents: stageData.agents,
    decisions: stageData.decisions,
    status: stageData.status
  };
}

// Workflow progression helpers
export async function testWorkflowProgression(page: Page): Promise<void> {
  // Test workflow initialization
  await expect(page.locator('[data-testid="workflow-init"]')).toBeVisible();
  
  // Progress through workflow stages
  await page.click('[data-testid="next-message"]');
  await expect(page.locator('[data-testid="agent-message"]')).toBeVisible();
  
  // Verify workflow state
  await expect(page.locator('[data-testid="workflow-stage"]')).toContainText('requirements-gathering');
  await expect(page.locator('[data-testid="progress-percentage"]')).toContainText('25%');
}

export async function testAdvancedWorkflowFeatures(page: Page): Promise<void> {
  // Test decision points
  await expect(page.locator('[data-testid="decision-point"]')).toBeVisible();
  await page.click('[data-testid="decision-option-1"]');
  
  // Test agent coordination
  await expect(page.locator('[data-testid="agent-coordination"]')).toBeVisible();
  await expect(page.locator('[data-testid="multi-agent-chat"]')).toBeVisible();
  
  // Test workflow branching
  await expect(page.locator('[data-testid="workflow-branch"]')).toBeVisible();
  await page.click('[data-testid="branch-option-a"]');
}

// Error simulation helpers
export async function simulateOnboardingError(page: Page, errorType: string): Promise<void> {
  switch (errorType) {
    case 'validation':
      await page.route('**/api/onboarding/step', route => {
        route.fulfill({ status: 400, body: JSON.stringify({ 
          error: 'Validation failed',
          details: ['Company name is required', 'Industry selection is required']
        })});
      });
      break;
    case 'server':
      await page.route('**/api/onboarding/step', route => {
        route.fulfill({ status: 500, body: 'Internal Server Error' });
      });
      break;
    case 'network':
      await page.route('**/api/onboarding/step', route => {
        route.fulfill({ status: 0, body: 'Network Error' });
      });
      break;
  }
}

export async function simulateDashboardError(page: Page, errorType: string): Promise<void> {
  switch (errorType) {
    case 'system-status':
      await page.route('**/api/dashboard/status', route => {
        route.fulfill({ status: 503, body: 'Service Unavailable' });
      });
      break;
    case 'partial-status':
      await page.route('**/api/dashboard/status', route => {
        route.fulfill({ status: 200, body: JSON.stringify({ 
          systemStatus: 'degraded',
          services: ['onboarding'],
          unavailable: ['chat', 'workflow'],
          lastUpdated: new Date().toISOString()
        })});
      });
      break;
  }
}

export async function simulateChatError(page: Page, errorType: string): Promise<void> {
  switch (errorType) {
    case 'workflow-init':
      await page.route('**/api/workflow/init', route => {
        route.fulfill({ status: 500, body: 'Failed to initialize workflow' });
      });
      break;
    case 'recoverable-error':
      await page.route('**/api/workflow/next', route => {
        route.fulfill({ status: 500, body: 'Temporary error' });
      });
      break;
    case 'operation-failure':
      await page.route('**/api/workflow/next', route => {
        route.fulfill({ status: 400, body: 'Operation failed' });
      });
      break;
    case 'test-error':
      await page.route('**/api/workflow/**', route => {
        route.fulfill({ status: 500, body: 'Test error' });
      });
      break;
    case 'reportable-error':
      await page.route('**/api/workflow/**', route => {
        route.fulfill({ status: 500, body: 'Reportable error' });
      });
      break;
    case 'critical-error':
      await page.route('**/api/workflow/**', route => {
        route.fulfill({ status: 500, body: 'Critical system error' });
      });
      break;
  }
}

export async function simulateNetworkInterruption(page: Page, duration: number): Promise<void> {
  // Simulate network interruption by blocking API calls
  await page.route('**/api/**', route => {
    setTimeout(() => route.continue(), duration);
  });
}

// Loading state helpers
export async function validateLoadingIndicators(page: Page): Promise<void> {
  await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
  await expect(page.locator('[data-testid="loading-text"]')).toBeVisible();
  await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible();
}

export async function testLoadingStateTransitions(page: Page): Promise<void> {
  // Test loading to loaded transition
  await expect(page.locator('[data-testid="loading-state"]')).toBeVisible();
  await expect(page.locator('[data-testid="loaded-state"]')).not.toBeVisible();
  
  // Wait for loading to complete
  await expect(page.locator('[data-testid="loading-state"]')).not.toBeVisible();
  await expect(page.locator('[data-testid="loaded-state"]')).toBeVisible();
}

// State persistence helpers
export async function testStatePersistence(page: Page): Promise<void> {
  // Get current state
  const currentState = await page.locator('[data-testid="current-state"]').textContent();
  
  // Reload page
  await page.reload();
  
  // Verify state persisted
  const persistedState = await page.locator('[data-testid="current-state"]').textContent();
  expect(persistedState).toBe(currentState);
}

export async function testSessionRecovery(page: Page): Promise<void> {
  // Get session ID
  const sessionId = await page.locator('[data-testid="session-id"]').textContent();
  
  // Simulate session interruption
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  
  // Reload page
  await page.reload();
  
  // Verify session recovered
  const recoveredSessionId = await page.locator('[data-testid="session-id"]').textContent();
  expect(recoveredSessionId).toBe(sessionId);
}

// Form interaction helpers
export async function fillStepData(page: Page, step: number, data: any): Promise<void> {
  switch (step) {
    case 1:
      await page.fill('[data-testid="company-name"]', data.companyName);
      await page.selectOption('[data-testid="industry-select"]', data.industry);
      break;
    case 2:
      await page.fill('[data-testid="project-name"]', data.projectType);
      await page.selectOption('[data-testid="company-size"]', data.companySize);
      break;
    case 3:
      await page.fill('[data-testid="project-description"]', data.description);
      await page.selectOption('[data-testid="budget-range"]', data.budget);
      await page.selectOption('[data-testid="timeline"]', data.timeline);
      break;
  }
}

export async function completeOnboardingSteps(page: Page, userData: OnboardingData): Promise<void> {
  for (let step = 1; step <= 4; step++) {
    await waitForOnboardingStepLoad(page, step);
    await fillStepData(page, step, userData);
    await page.click('[data-testid="next-step"]');
  }
}

// Navigation helpers
export async function navigateToProjectStep(page: Page, step: string): Promise<void> {
  await page.click(`[data-testid="navigate-${step}"]`);
  await expect(page.locator(`[data-testid="${step}-step"]`)).toBeVisible();
}

export async function navigateToFieldStep(page: Page, field: string): Promise<void> {
  await page.click(`[data-testid="field-${field}"]`);
  await expect(page.locator(`[data-testid="${field}-input"]`)).toBeFocused();
}

// Progress tracking helpers
export async function progressToDecisionPoint(page: Page): Promise<void> {
  // Progress through workflow until decision point
  while (await page.locator('[data-testid="decision-point"]').isVisible() === false) {
    await page.click('[data-testid="next-message"]');
    await page.waitForTimeout(1000);
  }
  
  await expect(page.locator('[data-testid="decision-point"]')).toBeVisible();
}

// Accessibility helpers
export async function checkColorContrastCompliance(page: Page): Promise<void> {
  // Check color contrast for accessibility
  await expect(page.locator('[data-testid="color-contrast"]')).toBeVisible();
  await expect(page.locator('[data-testid="wcag-compliant"]')).toBeVisible();
}

export async function testKeyboardNavigation(page: Page): Promise<void> {
  // Test tab navigation
  await page.keyboard.press('Tab');
  await expect(page.locator('[data-testid="focused-element"]')).toBeVisible();
  
  // Test arrow key navigation
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('[data-testid="selected-option"]')).toBeVisible();
}

export async function testScreenReaderCompatibility(page: Page): Promise<void> {
  // Test ARIA labels
  await expect(page.locator('[data-testid="aria-label"]')).toHaveAttribute('aria-label');
  
  // Test screen reader announcements
  await expect(page.locator('[data-testid="sr-announcement"]')).toHaveAttribute('aria-live');
}

// Performance helpers
export async function measurePageLoadTime(page: Page): Promise<number> {
  const startTime = Date.now();
  await page.waitForLoadState('networkidle');
  return Date.now() - startTime;
}

export async function testMemoryUsage(page: Page): Promise<void> {
  // Test memory usage during operations
  await expect(page.locator('[data-testid="memory-usage"]')).toBeVisible();
  await expect(page.locator('[data-testid="memory-optimized"]')).toBeVisible();
}

export async function testRenderingPerformance(page: Page): Promise<void> {
  // Test rendering performance
  await expect(page.locator('[data-testid="render-performance"]')).toBeVisible();
  await expect(page.locator('[data-testid="smooth-animations"]')).toBeVisible();
}

// Responsive design helpers
export async function testResponsiveLayout(page: Page): Promise<void> {
  // Test mobile layout
  await page.setViewportSize({ width: 375, height: 667 });
  await expect(page.locator('[data-testid="mobile-layout"]')).toBeVisible();
  
  // Test tablet layout
  await page.setViewportSize({ width: 768, height: 1024 });
  await expect(page.locator('[data-testid="tablet-layout"]')).toBeVisible();
  
  // Test desktop layout
  await page.setViewportSize({ width: 1920, height: 1080 });
  await expect(page.locator('[data-testid="desktop-layout"]')).toBeVisible();
}

export async function testTouchInteractions(page: Page): Promise<void> {
  // Test touch interactions for mobile
  await page.setViewportSize({ width: 375, height: 667 });
  
  // Test touch gestures
  await page.touchscreen.tap(200, 300);
  await expect(page.locator('[data-testid="touch-responsive"]')).toBeVisible();
}

// Theme and styling helpers
export async function testThemeToggle(page: Page): Promise<void> {
  // Test light theme
  await expect(page.locator('[data-testid="light-theme"]')).toBeVisible();
  
  // Toggle to dark theme
  await page.click('[data-testid="theme-toggle"]');
  await page.waitForTimeout(100);
  await expect(page.locator('[data-testid="dark-theme"]')).toBeVisible();
  
  // Toggle back to light theme
  await page.click('[data-testid="theme-toggle"]');
  await page.waitForTimeout(100);
  await expect(page.locator('[data-testid="light-theme"]')).toBeVisible();
}

export async function testThemeConsistency(page: Page): Promise<void> {
  // Test theme consistency across components
  await expect(page.locator('[data-testid="theme-consistent"]')).toBeVisible();
  await expect(page.locator('[data-testid="color-scheme"]')).toBeVisible();
}

// Error boundary helpers
export async function testErrorBoundary(page: Page): Promise<void> {
  // Test error boundary functionality
  await expect(page.locator('[data-testid="error-boundary"]')).toBeVisible();
  
  // Trigger error
  await page.click('[data-testid="trigger-error"]');
  
  // Verify error caught
  await expect(page.locator('[data-testid="error-caught"]')).toBeVisible();
  await expect(page.locator('[data-testid="fallback-ui"]')).toBeVisible();
}

// Recovery helpers
export async function testRecoveryMechanisms(page: Page): Promise<void> {
  // Test automatic recovery
  await expect(page.locator('[data-testid="auto-recovery"]')).toBeVisible();
  
  // Test manual recovery
  await page.click('[data-testid="manual-recovery"]');
  await expect(page.locator('[data-testid="recovery-loading"]')).toBeVisible();
  
  // Wait for recovery
  await expect(page.locator('[data-testid="recovery-success"]')).toBeVisible();
}

// Utility functions
export function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateTestEmail(): string {
  return `test-${generateRandomString(8)}@example.com`;
}

export function generateTestPhone(): string {
  return `+1-555-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`;
}

export async function waitForTimeout(page: Page, timeout: number): Promise<void> {
  await page.waitForTimeout(timeout);
}

export async function takeScreenshot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `./screenshots/${name}.png` });
}

export async function logTestInfo(page: Page, info: string): Promise<void> {
  console.log(`[${new Date().toISOString()}] ${info}`);
}

// Export all helper functions
export {
  setupJourneyMocks,
  navigateOnboardingFlow,
  navigateToDashboard,
  startProjectFromDashboard,
  completeUserJourney,
  waitForOnboardingStepLoad,
  waitForDashboardLoad,
  waitForChatInterfaceLoad,
  validateDashboardState,
  validateChatInitialization,
  generateOnboardingData,
  generateProjectData,
  generateWorkflowData,
  testWorkflowProgression,
  testAdvancedWorkflowFeatures,
  simulateOnboardingError,
  simulateDashboardError,
  simulateChatError,
  simulateNetworkInterruption,
  validateLoadingIndicators,
  testLoadingStateTransitions,
  testStatePersistence,
  testSessionRecovery,
  fillStepData,
  completeOnboardingSteps,
  navigateToProjectStep,
  navigateToFieldStep,
  progressToDecisionPoint,
  checkColorContrastCompliance,
  testKeyboardNavigation,
  testScreenReaderCompatibility,
  measurePageLoadTime,
  testMemoryUsage,
  testRenderingPerformance,
  testResponsiveLayout,
  testTouchInteractions,
  testThemeToggle,
  testThemeConsistency,
  testErrorBoundary,
  testRecoveryMechanisms,
  generateRandomString,
  generateTestEmail,
  generateTestPhone,
  waitForTimeout,
  takeScreenshot,
  logTestInfo
};
