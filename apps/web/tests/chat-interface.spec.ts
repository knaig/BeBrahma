import { test, expect } from '@playwright/test';
import { mockApiRoutes } from './utils/test-helpers';
import {
  waitForChatInterfaceLoad,
  validateChatInitialization,
  setupJourneyMocks,
  testWorkflowProgression,
  testAdvancedWorkflowFeatures,
  testRealTimeFeatures,
  testUserInteraction,
  testSessionManagement,
  testErrorHandling,
  testUIState,
  testPerformance,
  testScalability,
  checkColorContrastCompliance,
  testKeyboardNavigation,
  testScreenReaderCompatibility,
  testMemoryUsage,
  testRenderingPerformance
} from './utils/streamlined-journey-helpers';
import { testWorkflowOrchestration, validateAgentCoordination, testDecisionPointOrchestration, validateStageTransitions } from './utils/end-to-end-test-helpers';

test.describe('ChatInterface - Streamlined User Journey Integration', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page);
    await setupJourneyMocks(page, 'chat-testing');
  });

  test.describe('Unified Chat Interface Initialization', () => {
    test('ChatInterface component mounting and initial state setup', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      await validateChatInitialization(page);
      
      // Verify core chat interface elements
      await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();
      await expect(page.locator('[data-testid="chat-header"]')).toBeVisible();
      await expect(page.locator('[data-testid="message-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="workflow-status"]')).toBeVisible();
    });

    test('Welcome message and initial workflow state display correctly', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Verify welcome message
      await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="workflow-description"]')).toBeVisible();
      
      // Verify initial workflow state
      await expect(page.locator('[data-testid="workflow-stage"]')).toBeVisible();
      await expect(page.locator('[data-testid="progress-percentage"]')).toBeVisible();
    });

    test('LangGraph backend integration and workflow initialization', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Verify LangGraph integration
      await expect(page.locator('[data-testid="langgraph-status"]')).toBeVisible();
      await expect(page.locator('[data-testid="workflow-engine"]')).toBeVisible();
      
      // Verify workflow initialization
      await expect(page.locator('[data-testid="workflow-init"]')).toBeVisible();
      await expect(page.locator('[data-testid="agent-coordinator"]')).toBeVisible();
      
      // Verify refactored architecture integration
      await expect(page.locator('[data-testid="langgraph-client"]')).toBeVisible();
      await expect(page.locator('[data-testid="backend-orchestration"]')).toBeVisible();
    });

    test('UI state management and component lifecycle', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      await testUIState(page);
    });
  });

  test.describe('Multi-Agent Workflow Coordination', () => {
    test('Workflow progression through different stages and agents', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      await testWorkflowProgression(page);
    });

    test('Advanced workflow features and agent coordination', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      await testAdvancedWorkflowFeatures(page);
    });

    test('Complete 7-stage workflow orchestration through LangGraph backend', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      const stages = [
        'Problem Capture',
        'Requirements Analysis', 
        'Solution Design',
        'Implementation Planning',
        'Quality Assurance',
        'Deployment Strategy',
        'Monitoring Setup'
      ];
      
      await testWorkflowOrchestration(page, stages);
      
      // Verify all stages completed
      for (const stage of stages) {
        await expect(page.locator(`[data-testid="stage-${stage.toLowerCase().replace(/\s+/g, '-')}"]`)).toBeVisible();
      }
    });

    test('Multi-agent coordination through backend orchestration', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      const agents = ['Business Analyst', 'Solution Architect', 'Smart Planner', 'Developer', 'QA Tester'];
      const messages = [
        { agent: 'Business Analyst', content: 'Analyzing requirements...' },
        { agent: 'Solution Architect', content: 'Designing architecture...' },
        { agent: 'Smart Planner', content: 'Planning implementation...' }
      ];
      
      await validateAgentCoordination(page, agents, messages);
      
      // Verify agent coordination
      await expect(page.locator('[data-testid="agent-coordination"]')).toBeVisible();
      await expect(page.locator('[data-testid="coordination-status"]')).toBeVisible();
    });

    test('Decision point handling and user interaction during workflow', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Progress to decision point
      await page.click('[data-testid="next-message"]');
      await expect(page.locator('[data-testid="agent-message"]')).toBeVisible();
      
      // Verify decision point
      await expect(page.locator('[data-testid="decision-point"]')).toBeVisible();
      await expect(page.locator('[data-testid="decision-options"]')).toBeVisible();
      
      // Test decision selection
    });

    test('Decision point orchestration across complete architecture', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      const decisions = [
        { type: 'approve', context: 'Requirements analysis completed' },
        { type: 'refine', context: 'Solution architecture needs security focus' },
        { type: 'reject', context: 'Implementation plan exceeds timeline' }
      ];
      
      await testDecisionPointOrchestration(page, decisions);
      
      // Verify decision processing
      await expect(page.locator('[data-testid="decision-processing"]')).toBeVisible();
      await expect(page.locator('[data-testid="processing-status"]')).toBeVisible();
    });

    test('Workflow stage transitions and progress tracking', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      const transitions = [
        { from: 'Problem Capture', to: 'Requirements Analysis', trigger: 'user_approval' },
        { from: 'Requirements Analysis', to: 'Solution Design', trigger: 'requirements_completion' },
        { from: 'Solution Design', to: 'Implementation Planning', trigger: 'architecture_approval' }
      ];
      
      await validateStageTransitions(page, transitions);
      
      // Verify stage transitions
      await expect(page.locator('[data-testid="stage-transitions"]')).toBeVisible();
      await expect(page.locator('[data-testid="transition-status"]')).toBeVisible();
    });
      await page.click('[data-testid="decision-option-1"]');
      await expect(page.locator('[data-testid="decision-selected"]')).toBeVisible();
    });

    test('Agent communication and message flow management', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Verify agent communication
      await expect(page.locator('[data-testid="agent-communication"]')).toBeVisible();
      await expect(page.locator('[data-testid="message-flow"]')).toBeVisible();
      
      // Test message progression
      await page.click('[data-testid="next-message"]');
      await expect(page.locator('[data-testid="agent-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="workflow-progress"]')).toBeVisible();
    });
  });

  test.describe('Real-Time Features and Updates', () => {
    test('Real-time message updates and live progress tracking', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      await testRealTimeFeatures(page);
    });

    test('Live workflow status updates and progress indicators', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Verify live updates
      await expect(page.locator('[data-testid="live-updates"]')).toBeVisible();
      await expect(page.locator('[data-testid="progress-indicator"]')).toBeVisible();
      
      // Test progress updates
      await page.click('[data-testid="next-message"]');
      await expect(page.locator('[data-testid="progress-update"]')).toBeVisible();
      await expect(page.locator('[data-testid="stage-transition"]')).toBeVisible();
    });

    test('WebSocket integration and real-time communication', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Verify WebSocket connection
      await expect(page.locator('[data-testid="websocket-status"]')).toBeVisible();
      await expect(page.locator('[data-testid="connection-indicator"]')).toBeVisible();
      
      // Test real-time communication
      await expect(page.locator('[data-testid="real-time-chat"]')).toBeVisible();
      await expect(page.locator('[data-testid="instant-updates"]')).toBeVisible();
    });
  });

  test.describe('User Interaction and Input Handling', () => {
    test('User message input and submission functionality', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      await testUserInteraction(page);
    });

    test('Keyboard shortcuts and accessibility features', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Test keyboard navigation
      await testKeyboardNavigation(page);
      
      // Test screen reader compatibility
      await testScreenReaderCompatibility(page);
    });

    test('Message validation and error handling for user input', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Test empty message handling
      await page.locator('[data-testid="message-input"]').press('Enter');
      await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
      
      // Test invalid input handling
      await page.locator('[data-testid="message-input"]').fill('<script>alert("xss")</script>');
      await page.locator('[data-testid="send-button"]').click();
      await expect(page.locator('[data-testid="input-validation"]')).toBeVisible();
    });
  });

  test.describe('Session Management and Persistence', () => {
    test('Session persistence and workflow state management', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      await testSessionManagement(page);
    });

    test('Cross-tab synchronization and session consistency', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Get current workflow state
      const workflowStage = await page.locator('[data-testid="workflow-stage"]').textContent();
      const progress = await page.locator('[data-testid="progress-percentage"]').textContent();
      
      // Open new tab
      const newPage = await page.context().newPage();
      await newPage.goto('/test-chat');
      await waitForChatInterfaceLoad(newPage);
      
      // Verify state synchronization
      const newStage = await newPage.locator('[data-testid="workflow-stage"]').textContent();
      const newProgress = await newPage.locator('[data-testid="progress-percentage"]').textContent();
      
      expect(newStage).toBe(workflowStage);
      expect(newProgress).toBe(progress);
      
      await newPage.close();
    });

    test('Workflow resumption and state restoration after interruption', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Progress through workflow
      await page.click('[data-testid="next-message"]');
      await expect(page.locator('[data-testid="agent-message"]')).toBeVisible();
      
      // Get workflow state
      const workflowStage = await page.locator('[data-testid="workflow-stage"]').textContent();
      
      // Reload page
      await page.reload();
      await waitForChatInterfaceLoad(page);
      
      // Verify state restoration
      const restoredStage = await page.locator('[data-testid="workflow-stage"]').textContent();
      expect(restoredStage).toBe(workflowStage);
    });
  });

  test.describe('Error Handling and Recovery', () => {
    test('Error handling during workflow execution and recovery mechanisms', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      await testErrorHandling(page);
    });

    test('Network failure handling and offline mode functionality', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Simulate network failure
      await page.route('**/api/workflow/next', route => 
        route.fulfill({ status: 500, body: 'Network Error' })
      );
      
      // Attempt workflow progression
      await page.click('[data-testid="next-message"]');
      
      // Verify error handling
      await expect(page.locator('[data-testid="error-state"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      
      // Test offline mode
      await expect(page.locator('[data-testid="offline-mode"]')).toBeVisible();
      await expect(page.locator('[data-testid="local-storage"]')).toBeVisible();
      
      // Restore route
      await page.unroute('**/api/workflow/next');
    });

    test('Graceful degradation and fallback options during service outages', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Mock service outage
      await page.route('**/api/workflow/**', route => 
        route.fulfill({ status: 503, body: 'Service Unavailable' })
      );
      
      // Verify graceful degradation
      await expect(page.locator('[data-testid="degraded-mode"]')).toBeVisible();
      await expect(page.locator('[data-testid="fallback-options"]')).toBeVisible();
      
      // Restore route
      await page.unroute('**/api/workflow/**');
    });
  });

  test.describe('UI State and User Experience', () => {
    test('UI state management and component lifecycle handling', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      await testUIState(page);
    });

    test('Loading states and progress indicators during workflow execution', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Test loading states
      await expect(page.locator('[data-testid="loading-states"]')).toBeVisible();
      await expect(page.locator('[data-testid="progress-indicators"]')).toBeVisible();
      
      // Test workflow progression loading
      await page.click('[data-testid="next-message"]');
      await expect(page.locator('[data-testid="workflow-loading"]')).toBeVisible();
      await expect(page.locator('[data-testid="agent-processing"]')).toBeVisible();
    });

    test('Responsive design and mobile compatibility', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Test mobile layout
      await page.setViewportSize({ width: 375, height: 667 });
      await expect(page.locator('[data-testid="mobile-layout"]')).toBeVisible();
      
      // Test tablet layout
      await page.setViewportSize({ width: 768, height: 1024 });
      await expect(page.locator('[data-testid="tablet-layout"]')).toBeVisible();
      
      // Test desktop layout
      await page.setViewportSize({ width: 1920, height: 1080 });
      await expect(page.locator('[data-testid="desktop-layout"]')).toBeVisible();
    });
  });

  test.describe('Performance and Scalability', () => {
    test('Performance optimization and resource management', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      await testPerformance(page);
    });

    test('Scalability testing and memory usage optimization', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      await testScalability(page);
    });

    test('Memory usage monitoring and optimization during long workflows', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      await testMemoryUsage(page);
    });

    test('Rendering performance and animation smoothness', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      await testRenderingPerformance(page);
    });
  });

  test.describe('Accessibility and Compliance', () => {
    test('WCAG 2.1 AA compliance and accessibility features', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Test color contrast compliance
      await checkColorContrastCompliance(page);
      
      // Test keyboard navigation
      await testKeyboardNavigation(page);
      
      // Test screen reader compatibility
      await testScreenReaderCompatibility(page);
    });

    test('Keyboard navigation and focus management', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Test tab navigation
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="focused-element"]')).toBeVisible();
      
      // Test arrow key navigation
      await page.keyboard.press('ArrowDown');
      await expect(page.locator('[data-testid="selected-option"]')).toBeVisible();
    });

    test('Screen reader compatibility and ARIA labeling', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Test ARIA labels
      await expect(page.locator('[data-testid="aria-label"]')).toHaveAttribute('aria-label');
      
      // Test screen reader announcements
      await expect(page.locator('[data-testid="sr-announcement"]')).toHaveAttribute('aria-live');
    });
  });

  test.describe('Backend Integration Validation', () => {
    test('API communication and request/response handling through backend services', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Test API communication flow
      await page.click('[data-testid="test-api-communication"]');
      await expect(page.locator('[data-testid="api-status"]')).toContainText('Successful');
      
      // Verify request/response handling
      await expect(page.locator('[data-testid="request-payload"]')).toBeVisible();
      await expect(page.locator('[data-testid="response-data"]')).toBeVisible();
      
      // Validate data transformation
      await expect(page.locator('[data-testid="data-transformation"]')).toContainText('Valid');
    });

    test('Error handling and retry mechanisms for backend service failures', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Simulate backend service failure
      await page.route('**/api/langgraph/**', route => 
        route.fulfill({ status: 503, body: 'Service Unavailable' })
      );
      
      // Attempt workflow operation
      await page.click('[data-testid="start-workflow"]');
      
      // Verify error handling
      await expect(page.locator('[data-testid="service-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="retry-mechanism"]')).toBeVisible();
      
      // Test retry functionality
      await page.click('[data-testid="retry-button"]');
      await expect(page.locator('[data-testid="retry-status"]')).toContainText('Retrying');
      
      // Restore route
      await page.unroute('**/api/langgraph/**');
    });

    test('Session management and persistence through backend orchestration', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Start workflow session
      await page.click('[data-testid="start-workflow"]');
      await expect(page.locator('[data-testid="session-id"]')).toBeVisible();
      
      // Get session data
      const sessionId = await page.locator('[data-testid="session-id"]').textContent();
      const workflowState = await page.locator('[data-testid="workflow-state"]').textContent();
      
      // Navigate away and back
      await page.goto('/dashboard');
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Verify session persistence
      const restoredSessionId = await page.locator('[data-testid="session-id"]').textContent();
      const restoredState = await page.locator('[data-testid="workflow-state"]').textContent();
      
      expect(restoredSessionId).toBe(sessionId);
      expect(restoredState).toBe(workflowState);
    });

    test('Timeout handling and performance degradation management', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Simulate slow backend response
      await page.route('**/api/crewai/**', route => 
        route.fulfill({ 
          status: 200, 
          body: JSON.stringify({ response: 'delayed' }),
          delay: 10000 
        })
      );
      
      // Start operation with timeout
      await page.click('[data-testid="start-timeout-test"]');
      
      // Verify timeout handling
      await expect(page.locator('[data-testid="timeout-warning"]')).toBeVisible();
      await expect(page.locator('[data-testid="degraded-mode"]')).toBeVisible();
      
      // Restore route
      await page.unroute('**/api/crewai/**');
    });

    test('Service discovery and fallback mechanisms', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Test service discovery
      await page.click('[data-testid="test-service-discovery"]');
      await expect(page.locator('[data-testid="discovery-status"]')).toContainText('Active');
      
      // Simulate primary service failure
      await page.route('**/api/langgraph/**', route => 
        route.fulfill({ status: 503, body: 'Service Unavailable' })
      );
      
      // Verify fallback activation
      await page.click('[data-testid="test-fallback"]');
      await expect(page.locator('[data-testid="fallback-active"]')).toBeVisible();
      await expect(page.locator('[data-testid="secondary-service"]')).toBeVisible();
      
      // Restore route
      await page.unroute('**/api/langgraph/**');
    });

    test('Data consistency and synchronization across backend services', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Test data consistency validation
      await page.click('[data-testid="test-data-consistency"]');
      await expect(page.locator('[data-testid="consistency-status"]')).toContainText('Consistent');
      
      // Verify cross-service synchronization
      await expect(page.locator('[data-testid="langgraph-sync"]')).toContainText('Synchronized');
      await expect(page.locator('[data-testid="crewai-sync"]')).toContainText('Synchronized');
      await expect(page.locator('[data-testid="api-proxy-sync"]')).toContainText('Synchronized');
      
      // Test data integrity
      await expect(page.locator('[data-testid="data-integrity"]')).toContainText('Valid');
    });
  });

  test.describe('Integration with Streamlined Journey', () => {
    test('Seamless integration with dashboard and onboarding flow', async ({ page }) => {
      // Navigate from dashboard to chat interface
      await page.goto('/dashboard');
      await page.click('[data-testid="start-project"]');
      await expect(page.locator('[data-testid="project-setup"]')).toBeVisible();
      
      await page.click('[data-testid="begin-workflow"]');
      await expect(page).toHaveURL('/test-chat');
      
      // Verify chat interface loads correctly
      await waitForChatInterfaceLoad(page);
      await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();
    });

    test('Workflow progression and completion within unified interface', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Progress through complete workflow
      await testWorkflowProgression(page);
      
      // Verify workflow completion
      await expect(page.locator('[data-testid="workflow-complete"]')).toBeVisible();
      await expect(page.locator('[data-testid="completion-summary"]')).toBeVisible();
    });
  });
});
