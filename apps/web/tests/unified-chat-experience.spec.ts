import { test, expect } from '@playwright/test';
import { mockApiRoutes } from './utils/test-helpers';
import { 
  waitForChatInterfaceLoad,
  validateChatInitialization,
  generateOnboardingData,
  generateProjectData,
  generateWorkflowContext,
  setupJourneyMocks,
  mockChatServices,
  simulateChatError,
  simulateNetworkInterruption,
  validateJourneyAccessibility,
  testKeyboardNavigation,
  checkColorContrastCompliance
} from './utils/streamlined-journey-helpers';

test.describe('Unified Chat Experience - Streamlined User Journey', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page);
    await setupJourneyMocks(page, 'chat-testing');
  });

  test.describe('Unified Chat Interface Initialization', () => {
    test('ChatInterface component mounting and initial state setup', async ({ page }) => {
      await page.goto('/test-chat');
      
      // Test initial loading state
      await expect(page.locator('[data-testid="chat-loading"]')).toBeVisible();
      await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
      
      // Wait for ChatInterface to load
      await waitForChatInterfaceLoad(page);
      
      // Verify component mounted
      await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();
      await expect(page.locator('[data-testid="chat-container"]')).toBeVisible();
      
      // Verify initial state
      await expect(page.locator('[data-testid="initial-state"]')).toBeVisible();
      await expect(page.locator('[data-testid="session-ready"]')).toBeVisible();
    });

    test('Welcome message display and workflow session initialization', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Verify welcome message
      await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="welcome-title"]')).toContainText('Welcome to BeBrahma');
      await expect(page.locator('[data-testid="welcome-description"]')).toBeVisible();
      
      // Verify workflow session initialized
      await expect(page.locator('[data-testid="workflow-session"]')).toBeVisible();
      await expect(page.locator('[data-testid="session-id"]')).toBeVisible();
      await expect(page.locator('[data-testid="session-status"]')).toHaveText('Ready');
    });

    test('LangGraph backend integration and API connectivity', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Verify backend connection
      await expect(page.locator('[data-testid="backend-status"]')).toBeVisible();
      await expect(page.locator('[data-testid="connection-status"]')).toHaveText('Connected');
      
      // Verify API endpoints available
      await expect(page.locator('[data-testid="api-status"]')).toBeVisible();
      await expect(page.locator('[data-testid="langgraph-status"]')).toHaveText('Operational');
      
      // Test API connectivity
      await page.click('[data-testid="test-connection"]');
      await expect(page.locator('[data-testid="connection-test"]')).toHaveText('Success');
    });

    test('Initial UI state and component availability', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Verify input components
      await expect(page.locator('[data-testid="message-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="message-input"]')).toBeEnabled();
      await expect(page.locator('[data-testid="send-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="send-button"]')).toBeEnabled();
      
      // Verify message area
      await expect(page.locator('[data-testid="message-area"]')).toBeVisible();
      await expect(page.locator('[data-testid="message-history"]')).toBeVisible();
      
      // Verify sidebar panels
      await expect(page.locator('[data-testid="sidebar-toggle"]')).toBeVisible();
      await expect(page.locator('[data-testid="analysis-panel"]')).toBeVisible();
      await expect(page.locator('[data-testid="context-panel"]')).toBeVisible();
    });
  });

  test.describe('Multi-Agent Workflow Coordination', () => {
    test('Step-by-step message progression using Next message button', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Test message progression through all stages
      for (let stage = 1; stage <= 7; stage++) {
        // Click next message button
        const nextButton = page.locator('[data-testid="next-message"]');
        await expect(nextButton).toBeVisible();
        await expect(nextButton).toBeEnabled();
        
        await nextButton.click();
        
        // Wait for message to load
        await expect(page.locator('[data-testid="message-loading"]')).toBeVisible();
        await expect(page.locator('[data-testid="agent-message"]')).toBeVisible();
        
        // Verify stage progression
        await expect(page.locator('[data-testid="workflow-stage"]')).toHaveText(`Stage ${stage}`);
        await expect(page.locator('[data-testid="stage-progress"]')).toBeVisible();
        
        // Wait for message to complete loading
        await expect(page.locator('[data-testid="message-loading"]')).not.toBeVisible();
      }
    });

    test('Agent message display with proper metadata', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Progress to first agent message
      await page.click('[data-testid="next-message"]');
      await expect(page.locator('[data-testid="agent-message"]')).toBeVisible();
      
      // Verify agent metadata
      await expect(page.locator('[data-testid="agent-name"]')).toBeVisible();
      await expect(page.locator('[data-testid="agent-title"]')).toBeVisible();
      await expect(page.locator('[data-testid="agent-avatar"]')).toBeVisible();
      await expect(page.locator('[data-testid="agent-role"]')).toBeVisible();
      
      // Verify message content
      await expect(page.locator('[data-testid="message-content"]')).toBeVisible();
      await expect(page.locator('[data-testid="message-timestamp"]')).toBeVisible();
      
      // Verify agent information accuracy
      const agentName = await page.locator('[data-testid="agent-name"]').textContent();
      const agentTitle = await page.locator('[data-testid="agent-title"]').textContent();
      
      expect(agentName).toBeTruthy();
      expect(agentTitle).toBeTruthy();
    });

    test('Workflow stage progression through all 7 stages', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      const expectedStages = [
        'Problem Capture',
        'Solution Design',
        'Implementation Planning',
        'Resource Allocation',
        'Risk Assessment',
        'Execution Strategy',
        'Monitoring Setup'
      ];
      
      // Progress through each stage
      for (let i = 0; i < expectedStages.length; i++) {
        // Click next message
        await page.click('[data-testid="next-message"]');
        await expect(page.locator('[data-testid="agent-message"]')).toBeVisible();
        
        // Verify stage name
        await expect(page.locator('[data-testid="stage-name"]')).toContainText(expectedStages[i]);
        
        // Verify stage progress
        await expect(page.locator('[data-testid="stage-progress"]')).toBeVisible();
        const progress = await page.locator('[data-testid="progress-percentage"]').textContent();
        expect(parseInt(progress)).toBeGreaterThanOrEqual((i + 1) * (100 / expectedStages.length));
        
        // Wait for message completion
        await expect(page.locator('[data-testid="message-loading"]')).not.toBeVisible();
      }
      
      // Verify workflow completion
      await expect(page.locator('[data-testid="workflow-complete"]')).toBeVisible();
      await expect(page.locator('[data-testid="completion-message"]')).toBeVisible();
    });

    test('Agent collaboration patterns and message sequencing', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Progress through multiple messages
      for (let i = 0; i < 3; i++) {
        await page.click('[data-testid="next-message"]');
        await expect(page.locator('[data-testid="agent-message"]')).toBeVisible();
        
        // Verify message sequence
        await expect(page.locator('[data-testid="message-sequence"]')).toHaveText(`${i + 1}`);
        
        // Verify agent handoff
        if (i > 0) {
          await expect(page.locator('[data-testid="agent-handoff"]')).toBeVisible();
          await expect(page.locator('[data-testid="handoff-message"]')).toBeVisible();
        }
        
        // Wait for message completion
        await expect(page.locator('[data-testid="message-loading"]')).not.toBeVisible();
      }
      
      // Verify collaboration indicators
      await expect(page.locator('[data-testid="collaboration-status"]')).toBeVisible();
      await expect(page.locator('[data-testid="team-coordination"]')).toBeVisible();
    });
  });

  test.describe('Decision Point Handling', () => {
    test('Decision point detection and UI display', async ({ page }) => {
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
      
      // Verify decision point UI
      expect(decisionPointFound).toBe(true);
      await expect(page.locator('[data-testid="decision-point"]')).toBeVisible();
      await expect(page.locator('[data-testid="decision-title"]')).toBeVisible();
      await expect(page.locator('[data-testid="decision-description"]')).toBeVisible();
    });

    test('Decision buttons and user interaction', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Progress to decision point
      await progressToDecisionPoint(page);
      
      // Verify decision buttons
      await expect(page.locator('[data-testid="decision-buttons"]')).toBeVisible();
      await expect(page.locator('[data-testid="approve-decision"]')).toBeVisible();
      await expect(page.locator('[data-testid="refine-decision"]')).toBeVisible();
      await expect(page.locator('[data-testid="reject-decision"]')).toBeVisible();
      await expect(page.locator('[data-testid="pause-decision"]')).toBeVisible();
      
      // Test button states
      await expect(page.locator('[data-testid="approve-decision"]')).toBeEnabled();
      await expect(page.locator('[data-testid="refine-decision"]')).toBeEnabled();
      await expect(page.locator('[data-testid="reject-decision"]')).toBeEnabled();
      await expect(page.locator('[data-testid="pause-decision"]')).toBeEnabled();
    });

    test('Decision submission and workflow progression', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Progress to decision point
      await progressToDecisionPoint(page);
      
      // Submit approve decision
      await page.click('[data-testid="approve-decision"]');
      
      // Verify decision submitted
      await expect(page.locator('[data-testid="decision-submitted"]')).toBeVisible();
      await expect(page.locator('[data-testid="submission-status"]')).toHaveText('Approved');
      
      // Verify workflow progression
      await expect(page.locator('[data-testid="workflow-progressing"]')).toBeVisible();
      await expect(page.locator('[data-testid="stage-advancing"]')).toBeVisible();
      
      // Wait for next message
      await expect(page.locator('[data-testid="next-message"]')).toBeEnabled();
    });

    test('Decision feedback and stage transition messages', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Progress to decision point
      await progressToDecisionPoint(page);
      
      // Submit decision
      await page.click('[data-testid="approve-decision"]');
      
      // Verify feedback message
      await expect(page.locator('[data-testid="decision-feedback"]')).toBeVisible();
      await expect(page.locator('[data-testid="feedback-content"]')).toBeVisible();
      
      // Verify stage transition
      await expect(page.locator('[data-testid="stage-transition"]')).toBeVisible();
      await expect(page.locator('[data-testid="transition-message"]')).toBeVisible();
      
      // Verify progress update
      await expect(page.locator('[data-testid="progress-update"]')).toBeVisible();
      await expect(page.locator('[data-testid="updated-progress"]')).toBeVisible();
    });
  });

  test.describe('Real-time Features and Progress Tracking', () => {
    test('Progress polling and real-time status updates', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Enable real-time updates
      await page.click('[data-testid="enable-realtime"]');
      await expect(page.locator('[data-testid="realtime-active"]')).toBeVisible();
      
      // Verify progress polling
      await expect(page.locator('[data-testid="progress-polling"]')).toBeVisible();
      await expect(page.locator('[data-testid="polling-status"]')).toHaveText('Active');
      
      // Wait for real-time updates
      await page.waitForTimeout(2000);
      
      // Verify updates received
      await expect(page.locator('[data-testid="realtime-update"]')).toBeVisible();
      await expect(page.locator('[data-testid="update-timestamp"]')).toBeVisible();
    });

    test('Workflow progress indicators and stage completion tracking', async ({ page }) => {
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

    test('Agent status updates and activity indicators', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Verify agent status panel
      await expect(page.locator('[data-testid="agent-status-panel"]')).toBeVisible();
      await expect(page.locator('[data-testid="agent-list"]')).toBeVisible();
      
      // Progress to agent message
      await page.click('[data-testid="next-message"]');
      await expect(page.locator('[data-testid="agent-message"]')).toBeVisible();
      
      // Verify agent activity
      await expect(page.locator('[data-testid="agent-active"]')).toBeVisible();
      await expect(page.locator('[data-testid="activity-indicator"]')).toBeVisible();
      
      // Verify status updates
      await expect(page.locator('[data-testid="status-update"]')).toBeVisible();
      await expect(page.locator('[data-testid="update-time"]')).toBeVisible();
    });

    test('Session state synchronization and consistency', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Get initial session state
      const initialSessionId = await page.locator('[data-testid="session-id"]').textContent();
      const initialStage = await page.locator('[data-testid="workflow-stage"]').textContent();
      
      // Progress through workflow
      await page.click('[data-testid="next-message"]');
      await expect(page.locator('[data-testid="agent-message"]')).toBeVisible();
      
      // Verify session consistency
      const currentSessionId = await page.locator('[data-testid="session-id"]').textContent();
      const currentStage = await page.locator('[data-testid="workflow-stage"]').textContent();
      
      expect(currentSessionId).toBe(initialSessionId);
      expect(currentStage).not.toBe(initialStage);
      
      // Verify state synchronization
      await expect(page.locator('[data-testid="state-sync"]')).toBeVisible();
      await expect(page.locator('[data-testid="sync-status"]')).toHaveText('Synchronized');
    });
  });

  test.describe('User Interaction and Input Handling', () => {
    test('User message input and submission functionality', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Test message input
      const messageInput = page.locator('[data-testid="message-input"]');
      await expect(messageInput).toBeVisible();
      await expect(messageInput).toBeEnabled();
      
      // Type message
      const testMessage = 'This is a test user message';
      await messageInput.fill(testMessage);
      await expect(messageInput).toHaveValue(testMessage);
      
      // Submit message
      const sendButton = page.locator('[data-testid="send-button"]');
      await expect(sendButton).toBeEnabled();
      await sendButton.click();
      
      // Verify message sent
      await expect(page.locator('[data-testid="user-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-message"]')).toContainText(testMessage);
      
      // Verify input cleared
      await expect(messageInput).toHaveValue('');
    });

    test('Keyboard shortcuts and input handling', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      const messageInput = page.locator('[data-testid="message-input"]');
      
      // Test Enter key submission
      await messageInput.fill('Test message with Enter key');
      await messageInput.press('Enter');
      
      await expect(page.locator('[data-testid="user-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-message"]')).toContainText('Test message with Enter key');
      
      // Test Ctrl+Space for release next
      await messageInput.fill('Test message with Ctrl+Space');
      await messageInput.press('Control+Space');
      
      await expect(page.locator('[data-testid="next-message"]')).toBeFocused();
    });

    test('Message queuing and release mechanisms', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Queue multiple messages
      const messages = ['First message', 'Second message', 'Third message'];
      
      for (const message of messages) {
        await page.locator('[data-testid="message-input"]').fill(message);
        await page.locator('[data-testid="send-button"]').click();
        await expect(page.locator('[data-testid="user-message"]')).toContainText(message);
      }
      
      // Verify message queue
      await expect(page.locator('[data-testid="message-queue"]')).toBeVisible();
      await expect(page.locator('[data-testid="queue-count"]')).toHaveText('3');
      
      // Release next message
      await page.click('[data-testid="release-next"]');
      await expect(page.locator('[data-testid="queue-count"]')).toHaveText('2');
    });

    test('Input validation and error handling', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      const messageInput = page.locator('[data-testid="message-input"]');
      const sendButton = page.locator('[data-testid="send-button"]');
      
      // Test empty message validation
      await sendButton.click();
      await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Message cannot be empty');
      
      // Test message length validation
      const longMessage = 'A'.repeat(1001);
      await messageInput.fill(longMessage);
      await sendButton.click();
      
      await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Message too long');
      
      // Test valid message
      await messageInput.fill('Valid message');
      await sendButton.click();
      
      await expect(page.locator('[data-testid="validation-error"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="user-message"]')).toBeVisible();
    });
  });

  test.describe('Session Management and Persistence', () => {
    test('Session creation and ID generation', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Verify session created
      await expect(page.locator('[data-testid="workflow-session"]')).toBeVisible();
      await expect(page.locator('[data-testid="session-id"]')).toBeVisible();
      
      // Verify session ID format
      const sessionId = await page.locator('[data-testid="session-id"]').textContent();
      expect(sessionId).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/);
      
      // Verify session metadata
      await expect(page.locator('[data-testid="session-created"]')).toBeVisible();
      await expect(page.locator('[data-testid="session-status"]')).toHaveText('Ready');
    });

    test('Session persistence across page reloads', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Get session information
      const sessionId = await page.locator('[data-testid="session-id"]').textContent();
      const sessionStatus = await page.locator('[data-testid="session-status"]').textContent();
      
      // Reload page
      await page.reload();
      
      // Wait for ChatInterface to reload
      await waitForChatInterfaceLoad(page);
      
      // Verify session persisted
      const recoveredSessionId = await page.locator('[data-testid="session-id"]').textContent();
      const recoveredSessionStatus = await page.locator('[data-testid="session-status"]').textContent();
      
      expect(recoveredSessionId).toBe(sessionId);
      expect(recoveredSessionStatus).toBe(sessionStatus);
    });

    test('Session recovery and state restoration', async ({ page }) => {
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

    test('Session cleanup and memory management', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Get initial memory usage
      const initialMemory = await page.evaluate(() => performance.memory?.usedJSHeapSize || 0);
      
      // Progress through workflow
      for (let i = 0; i < 5; i++) {
        await page.click('[data-testid="next-message"]');
        await expect(page.locator('[data-testid="agent-message"]')).toBeVisible();
        await expect(page.locator('[data-testid="message-loading"]')).not.toBeVisible();
      }
      
      // Verify memory management
      const currentMemory = await page.evaluate(() => performance.memory?.usedJSHeapSize || 0);
      const memoryIncrease = currentMemory - initialMemory;
      
      // Memory should be reasonable (less than 100MB increase)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
      
      // Verify cleanup indicators
      await expect(page.locator('[data-testid="memory-cleanup"]')).toBeVisible();
      await expect(page.locator('[data-testid="cleanup-status"]')).toHaveText('Active');
    });
  });

  test.describe('Error Handling and Recovery', () => {
    test('Network failure handling and retry mechanisms', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Simulate network failure
      await simulateNetworkInterruption(page, 5000);
      
      // Attempt to progress workflow
      await page.click('[data-testid="next-message"]');
      
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
      await expect(page.locator('[data-testid="connection-restored"]')).toBeVisible();
      await expect(page.locator('[data-testid="retry-success"]')).toBeVisible();
    });

    test('Timeout scenarios and graceful degradation', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Simulate timeout
      await page.route('**/api/workflow/next', route => 
        route.fulfill({ status: 408, body: 'Request Timeout' })
      );
      
      // Attempt to progress workflow
      await page.click('[data-testid="next-message"]');
      
      // Verify timeout handling
      await expect(page.locator('[data-testid="timeout-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="timeout-message"]')).toContainText('Request timed out');
      
      // Verify graceful degradation
      await expect(page.locator('[data-testid="degraded-mode"]')).toBeVisible();
      await expect(page.locator('[data-testid="offline-actions"]')).toBeVisible();
      
      // Restore route
      await page.unroute('**/api/workflow/next');
    });

    test('API error responses and user feedback', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Simulate API error
      await simulateChatError(page, 'api-failure');
      
      // Attempt to progress workflow
      await page.click('[data-testid="next-message"]');
      
      // Verify error display
      await expect(page.locator('[data-testid="api-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-details"]')).toBeVisible();
      
      // Verify user feedback
      await expect(page.locator('[data-testid="error-help"]')).toBeVisible();
      await expect(page.locator('[data-testid="support-link"]')).toBeVisible();
      
      // Verify recovery options
      await expect(page.locator('[data-testid="recovery-options"]')).toBeVisible();
      await expect(page.locator('[data-testid="restart-workflow"]')).toBeVisible();
    });

    test('Error recovery and workflow continuation', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Simulate error
      await simulateChatError(page, 'recoverable-error');
      
      // Attempt to progress workflow
      await page.click('[data-testid="next-message"]');
      
      // Verify error state
      await expect(page.locator('[data-testid="recoverable-error"]')).toBeVisible();
      
      // Attempt recovery
      await page.click('[data-testid="attempt-recovery"]');
      await expect(page.locator('[data-testid="recovery-loading"]')).toBeVisible();
      
      // Wait for recovery
      await expect(page.locator('[data-testid="recovery-success"]')).toBeVisible();
      await expect(page.locator('[data-testid="workflow-continuing"]')).toBeVisible();
      
      // Verify workflow can continue
      await expect(page.locator('[data-testid="next-message"]')).toBeEnabled();
    });
  });

  test.describe('UI State Management', () => {
    test('Loading states during API calls and message processing', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Test message loading state
      await page.click('[data-testid="next-message"]');
      await expect(page.locator('[data-testid="message-loading"]')).toBeVisible();
      await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
      
      // Wait for completion
      await expect(page.locator('[data-testid="agent-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="message-loading"]')).not.toBeVisible();
      
      // Test multiple loading states
      await page.click('[data-testid="refresh-status"]');
      await expect(page.locator('[data-testid="status-loading"]')).toBeVisible();
      
      // Verify loading coordination
      await expect(page.locator('[data-testid="loading-coordinator"]')).toBeVisible();
      await expect(page.locator('[data-testid="coordinator-status"]')).toHaveText('Managing');
    });

    test('Sidebar panel toggles and state management', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Test analysis panel toggle
      const analysisToggle = page.locator('[data-testid="analysis-panel-toggle"]');
      await expect(analysisToggle).toBeVisible();
      
      await analysisToggle.click();
      await expect(page.locator('[data-testid="analysis-panel"]')).toBeVisible();
      await expect(page.locator('[data-testid="analysis-content"]')).toBeVisible();
      
      // Test context panel toggle
      const contextToggle = page.locator('[data-testid="context-panel-toggle"]');
      await expect(contextToggle).toBeVisible();
      
      await contextToggle.click();
      await expect(page.locator('[data-testid="context-panel"]')).toBeVisible();
      await expect(page.locator('[data-testid="context-content"]')).toBeVisible();
      
      // Test panel state persistence
      await page.reload();
      await waitForChatInterfaceLoad(page);
      
      await expect(page.locator('[data-testid="analysis-panel"]')).toBeVisible();
      await expect(page.locator('[data-testid="context-panel"]')).toBeVisible();
    });

    test('Responsive design and mobile compatibility', async ({ page }) => {
      // Test mobile layout
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Verify mobile-specific elements
      await expect(page.locator('[data-testid="mobile-layout"]')).toBeVisible();
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
      
      // Test mobile navigation
      await page.click('[data-testid="mobile-menu-toggle"]');
      await expect(page.locator('[data-testid="mobile-menu-open"]')).toBeVisible();
      
      // Test mobile input
      const messageInput = page.locator('[data-testid="message-input"]');
      await expect(messageInput).toBeVisible();
      await expect(messageInput).toBeEnabled();
      
      // Test mobile buttons
      await expect(page.locator('[data-testid="send-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="next-message"]')).toBeVisible();
    });

    test('Theme integration and visual consistency', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Test light theme
      await expect(page.locator('[data-testid="light-theme"]')).toBeVisible();
      await expect(page.locator('[data-testid="theme-consistent"]')).toBeVisible();
      
      // Switch to dark theme
      await page.click('[data-testid="theme-toggle"]');
      await page.waitForTimeout(100);
      
      // Verify dark theme applied
      await expect(page.locator('[data-testid="dark-theme"]')).toBeVisible();
      await expect(page.locator('[data-testid="theme-consistent"]')).toBeVisible();
      
      // Verify theme consistency across components
      await expect(page.locator('[data-testid="consistent-colors"]')).toBeVisible();
      await expect(page.locator('[data-testid="consistent-typography"]')).toBeVisible();
    });
  });

  test.describe('Performance and Scalability', () => {
    test('Performance with large message histories', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Generate large message history
      for (let i = 0; i < 50; i++) {
        await page.click('[data-testid="next-message"]');
        await expect(page.locator('[data-testid="agent-message"]')).toBeVisible();
        await expect(page.locator('[data-testid="message-loading"]')).not.toBeVisible();
      }
      
      // Verify performance maintained
      await expect(page.locator('[data-testid="performance-indicator"]')).toBeVisible();
      await expect(page.locator('[data-testid="render-time"]')).toContainText('ms');
      
      // Verify scroll performance
      await page.locator('[data-testid="message-area"]').scrollTo({ top: 0 });
      await page.locator('[data-testid="message-area"]').scrollTo({ top: 10000 });
      
      await expect(page.locator('[data-testid="scroll-performance"]')).toBeVisible();
      await expect(page.locator('[data-testid="scroll-smooth"]')).toBeVisible();
    });

    test('Memory usage during extended chat sessions', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Get initial memory
      const initialMemory = await page.evaluate(() => performance.memory?.usedJSHeapSize || 0);
      
      // Extended session
      for (let i = 0; i < 20; i++) {
        await page.click('[data-testid="next-message"]');
        await expect(page.locator('[data-testid="agent-message"]')).toBeVisible();
        await expect(page.locator('[data-testid="message-loading"]')).not.toBeVisible();
        
        // Add user message
        await page.locator('[data-testid="message-input"]').fill(`User message ${i}`);
        await page.locator('[data-testid="send-button"]').click();
        await expect(page.locator('[data-testid="user-message"]')).toBeVisible();
      }
      
      // Check memory usage
      const finalMemory = await page.evaluate(() => performance.memory?.usedJSHeapSize || 0);
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory should be reasonable
      expect(memoryIncrease).toBeLessThan(200 * 1024 * 1024); // 200MB max
      
      // Verify memory management
      await expect(page.locator('[data-testid="memory-management"]')).toBeVisible();
      await expect(page.locator('[data-testid="garbage-collection"]')).toBeVisible();
    });

    test('Concurrent user interactions and state management', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Simulate concurrent interactions
      const interactions = [
        () => page.click('[data-testid="next-message"]'),
        () => page.click('[data-testid="refresh-status"]'),
        () => page.locator('[data-testid="message-input"]').fill('Concurrent message'),
        () => page.click('[data-testid="analysis-panel-toggle"]')
      ];
      
      // Execute concurrently
      await Promise.all(interactions.map(interaction => interaction()));
      
      // Verify state consistency
      await expect(page.locator('[data-testid="state-consistent"]')).toBeVisible();
      await expect(page.locator('[data-testid="concurrent-handling"]')).toBeVisible();
      
      // Verify no race conditions
      await expect(page.locator('[data-testid="race-condition-free"]')).toBeVisible();
      await expect(page.locator('[data-testid="state-integrity"]')).toBeVisible();
    });

    test('Efficient rendering and scroll performance', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Generate content for scrolling
      for (let i = 0; i < 30; i++) {
        await page.click('[data-testid="next-message"]');
        await expect(page.locator('[data-testid="agent-message"]')).toBeVisible();
        await expect(page.locator('[data-testid="message-loading"]')).not.toBeVisible();
      }
      
      // Test scroll performance
      const scrollStart = Date.now();
      await page.locator('[data-testid="message-area"]').scrollTo({ top: 10000 });
      const scrollTime = Date.now() - scrollStart;
      
      // Verify scroll performance
      expect(scrollTime).toBeLessThan(100); // 100ms max
      
      // Verify efficient rendering
      await expect(page.locator('[data-testid="render-performance"]')).toBeVisible();
      await expect(page.locator('[data-testid="virtual-scroll"]')).toBeVisible();
    });
  });
});

// Helper function to progress to decision point
async function progressToDecisionPoint(page: any) {
  let decisionPointFound = false;
  let attempts = 0;
  const maxAttempts = 15;
  
  while (!decisionPointFound && attempts < maxAttempts) {
    await page.click('[data-testid="next-message"]');
    await expect(page.locator('[data-testid="agent-message"]')).toBeVisible();
    
    // Check for decision point
    if (await page.locator('[data-testid="decision-point"]').isVisible()) {
      decisionPointFound = true;
      break;
    }
    
    await expect(page.locator('[data-testid="message-loading"]')).not.toBeVisible();
    attempts++;
  }
  
  if (!decisionPointFound) {
    throw new Error('Decision point not found after maximum attempts');
  }
}
