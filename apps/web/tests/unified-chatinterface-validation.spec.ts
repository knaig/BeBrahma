import { test, expect } from '@playwright/test';
import { testWorkflowOrchestration, validateAgentCoordination, testDecisionPointOrchestration, validateStageTransitions } from './utils/end-to-end-test-helpers';

test.describe('Unified ChatInterface Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-chat');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Unified Interface Functionality', () => {
    test('should serve as sole interface for all multi-agent workflows', async ({ page }) => {
      // Verify unified interface
      await expect(page.locator('[data-testid="unified-chat-interface"]')).toBeVisible();
      await expect(page.locator('[data-testid="workflow-management"]')).toBeVisible();
      await expect(page.locator('[data-testid="agent-coordination"]')).toBeVisible();
      
      // Verify no separate CrewAI components
      await expect(page.locator('[data-testid="crewai-frontend"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="separate-agent-ui"]')).not.toBeVisible();
    });

    test('should remove separate CrewAI frontend components', async ({ page }) => {
      // Verify removal of deprecated components
      await expect(page.locator('[data-testid="crewai-dashboard"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="agent-panel"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="crewai-workflow-ui"]')).not.toBeVisible();
      
      // Verify unified interface provides all functionality
      await expect(page.locator('[data-testid="workflow-controls"]')).toBeVisible();
      await expect(page.locator('[data-testid="agent-messages"]')).toBeVisible();
      await expect(page.locator('[data-testid="decision-controls"]')).toBeVisible();
    });

    test('should manage complete workflows through single interface', async ({ page }) => {
      // Test workflow management
      await page.click('[data-testid="new-workflow-btn"]');
      
      // Verify workflow creation
      await expect(page.locator('[data-testid="workflow-form"]')).toBeVisible();
      await expect(page.locator('[data-testid="workflow-type-selector"]')).toBeVisible();
      await expect(page.locator('[data-testid="workflow-parameters"]')).toBeVisible();
      
      // Create workflow
      await page.fill('[data-testid="workflow-name"]', 'Healthcare System Analysis');
      await page.selectOption('[data-testid="workflow-type"]', 'healthcare-modernization');
      await page.click('[data-testid="create-workflow-btn"]');
      
      // Verify workflow initialization
      await expect(page.locator('[data-testid="workflow-session"]')).toBeVisible();
    });

    test('should handle all agent interactions through unified chat experience', async ({ page }) => {
      // Start workflow
      await page.click('[data-testid="start-workflow-btn"]');
      
      // Verify agent interaction interface
      await expect(page.locator('[data-testid="agent-chat-area"]')).toBeVisible();
      await expect(page.locator('[data-testid="message-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="send-message-btn"]')).toBeVisible();
      
      // Test agent interaction
      await page.fill('[data-testid="message-input"]', 'What are the key requirements?');
      await page.click('[data-testid="send-message-btn"]');
      
      // Verify agent response
      await expect(page.locator('[data-testid="agent-response"]')).toBeVisible();
    });

    test('should handle decision points without separate CrewAI UI', async ({ page }) => {
      // Progress to decision point
      await page.click('[data-testid="start-workflow-btn"]');
      
      // Wait for decision point
      await expect(page.locator('[data-testid="decision-point"]')).toBeVisible();
      
      // Verify decision interface in unified UI
      await expect(page.locator('[data-testid="decision-options"]')).toBeVisible();
      await expect(page.locator('[data-testid="decision-context"]')).toBeVisible();
      await expect(page.locator('[data-testid="decision-history"]')).toBeVisible();
    });
  });

  test.describe('LangGraph Backend Integration', () => {
    test('should integrate with LangGraph client for workflow management', async ({ page }) => {
      // Test LangGraph client integration
      await page.click('[data-testid="test-langgraph-integration"]');
      
      // Verify integration status
      await expect(page.locator('[data-testid="langgraph-status"]')).toBeVisible();
      await expect(page.locator('[data-testid="client-connection"]')).toBeVisible();
      await expect(page.locator('[data-testid="api-endpoints"]')).toBeVisible();
    });

    test('should manage workflow sessions through backend orchestration', async ({ page }) => {
      // Test session management
      await page.click('[data-testid="manage-sessions-btn"]');
      
      // Verify session management interface
      await expect(page.locator('[data-testid="session-list"]')).toBeVisible();
      await expect(page.locator('[data-testid="session-details"]')).toBeVisible();
      await expect(page.locator('[data-testid="session-controls"]')).toBeVisible();
      
      // Create new session
      await page.click('[data-testid="new-session-btn"]');
      await expect(page.locator('[data-testid="session-creation"]')).toBeVisible();
    });

    test('should progress step-by-step via LangGraph service', async ({ page }) => {
      // Start workflow
      await page.click('[data-testid="start-workflow-btn"]');
      
      // Progress through steps
      for (let i = 0; i < 3; i++) {
        await page.click('[data-testid="next-step-btn"]');
        
        // Wait for step progression instead of arbitrary timeout
        await expect(page.locator('[data-testid="current-step"]')).toHaveText((i + 2).toString());
      }
    });

    test('should coordinate agents through backend APIs', async ({ page }) => {
      // Test agent coordination
      await page.click('[data-testid="test-agent-coordination"]');
      
      // Verify coordination interface
      await expect(page.locator('[data-testid="agent-status"]')).toBeVisible();
      await expect(page.locator('[data-testid="coordination-log"]')).toBeVisible();
      await expect(page.locator('[data-testid="agent-queue"]')).toBeVisible();
    });

    test('should provide real-time updates and progress tracking', async ({ page }) => {
      // Test real-time updates
      await page.click('[data-testid="start-workflow-btn"]');
      
      // Verify real-time features
      await expect(page.locator('[data-testid="progress-indicator"]')).toBeVisible();
      await expect(page.locator('[data-testid="live-updates"]')).toBeVisible();
      await expect(page.locator('[data-testid="status-polling"]')).toBeVisible();
      
      // Monitor updates - wait for progress to be visible and contain percentage
      await expect(page.locator('[data-testid="progress-percentage"]')).toBeVisible();
      await expect(page.locator('[data-testid="progress-percentage"]')).toContainText('%');
    });
  });

  test.describe('Multi-Agent Workflow Coordination', () => {
    test('should progress through 7-stage workflow', async ({ page }) => {
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
      
      // Verify all stages
      for (const stage of stages) {
        await expect(page.locator(`[data-testid="stage-${stage.toLowerCase().replace(/\s+/g, '-')}"]`)).toBeVisible();
      }
    });

    test('should sequence agent participation and messages', async ({ page }) => {
      // Start workflow
      await page.click('[data-testid="start-workflow-btn"]');
      
      // Progress through agent interactions
      for (let i = 0; i < 5; i++) {
        await page.click('[data-testid="next-message-btn"]');
        
        // Wait for agent participation to be visible
        await expect(page.locator('[data-testid="current-agent"]')).toBeVisible();
        
        // Verify message sequencing - wait for expected count
        await expect(page.locator('[data-testid="agent-message"]')).toHaveCount(i + 2); // +2 for initial message
      }
    });

    test('should display agent metadata correctly', async ({ page }) => {
      // Start workflow
      await page.click('[data-testid="start-workflow-btn"]');
      
      // Verify agent metadata display
      await expect(page.locator('[data-testid="agent-name"]')).toBeVisible();
      await expect(page.locator('[data-testid="agent-title"]')).toBeVisible();
      await expect(page.locator('[data-testid="agent-department"]')).toBeVisible();
      await expect(page.locator('[data-testid="agent-avatar"]')).toBeVisible();
      
      // Verify metadata content
      const agentName = await page.locator('[data-testid="agent-name"]').textContent();
      const agentTitle = await page.locator('[data-testid="agent-title"]').textContent();
      const agentDept = await page.locator('[data-testid="agent-department"]').textContent();
      
      expect(agentName).toBeTruthy();
      expect(agentTitle).toBeTruthy();
      expect(agentDept).toBeTruthy();
    });

    test('should demonstrate agent collaboration patterns', async ({ page }) => {
      // Test agent collaboration
      await page.click('[data-testid="test-collaboration-patterns"]');
      
      // Verify collaboration interface
      await expect(page.locator('[data-testid="collaboration-view"]')).toBeVisible();
      await expect(page.locator('[data-testid="agent-interactions"]')).toBeVisible();
      await expect(page.locator('[data-testid="collaboration-log"]')).toBeVisible();
      
      // Verify collaboration patterns
      const interactions = await page.locator('[data-testid="agent-interaction"]').count();
      expect(interactions).toBeGreaterThan(0);
    });

    test('should handle stage transitions and completion criteria', async ({ page }) => {
      // Test stage transitions
      await page.click('[data-testid="test-stage-transitions"]');
      
      // Verify transition interface
      await expect(page.locator('[data-testid="stage-transition"]')).toBeVisible();
      await expect(page.locator('[data-testid="completion-criteria"]')).toBeVisible();
      await expect(page.locator('[data-testid="transition-log"]')).toBeVisible();
    });
  });

  test.describe('Decision Point Management', () => {
    test('should detect decision points and display UI', async ({ page }) => {
      // Progress to decision point
      await page.click('[data-testid="start-workflow-btn"]');
      
      // Wait for decision point
      await expect(page.locator('[data-testid="decision-point"]')).toBeVisible();
      
      // Verify decision UI
      await expect(page.locator('[data-testid="decision-context"]')).toBeVisible();
      await expect(page.locator('[data-testid="decision-options"]')).toBeVisible();
      await expect(page.locator('[data-testid="decision-timer"]')).toBeVisible();
    });

    test('should provide decision options (Approve, Refine, Reject, Pause)', async ({ page }) => {
      // Wait for decision point
      await expect(page.locator('[data-testid="decision-point"]')).toBeVisible();
      
      // Verify all decision options
      await expect(page.locator('[data-testid="decision-approve"]')).toBeVisible();
      await expect(page.locator('[data-testid="decision-refine"]')).toBeVisible();
      await expect(page.locator('[data-testid="decision-reject"]')).toBeVisible();
      await expect(page.locator('[data-testid="decision-pause"]')).toBeVisible();
      
      // Verify option labels
      const approveText = await page.locator('[data-testid="decision-approve"]').textContent();
      const refineText = await page.locator('[data-testid="decision-refine"]').textContent();
      const rejectText = await page.locator('[data-testid="decision-reject"]').textContent();
      const pauseText = await page.locator('[data-testid="decision-pause"]').textContent();
      
      expect(approveText).toContain('Approve');
      expect(refineText).toContain('Refine');
      expect(rejectText).toContain('Reject');
      expect(pauseText).toContain('Pause');
    });

    test('should process decisions and advance workflow', async ({ page }) => {
      // Wait for decision point
      await expect(page.locator('[data-testid="decision-point"]')).toBeVisible();
      
      // Submit decision
      await page.click('[data-testid="decision-approve"]');
      
      // Verify decision processing
      await expect(page.locator('[data-testid="decision-feedback"]')).toBeVisible();
      await expect(page.locator('[data-testid="workflow-progression"]')).toBeVisible();
      
      // Verify stage advancement
      const newStage = await page.locator('[data-testid="current-stage"]').textContent();
      expect(newStage).not.toBe('Problem Capture');
    });

    test('should provide decision feedback and stage transitions', async ({ page }) => {
      // Submit decision
      await page.click('[data-testid="decision-approve"]');
      
      // Verify feedback
      await expect(page.locator('[data-testid="decision-feedback"]')).toBeVisible();
      await expect(page.locator('[data-testid="transition-message"]')).toBeVisible();
      
      // Verify transition
      await expect(page.locator('[data-testid="stage-progress"]')).toBeVisible();
    });

    test('should maintain decision history and audit trail', async ({ page }) => {
      // Submit decision
      await page.click('[data-testid="decision-approve"]');
      
      // Verify decision history
      await expect(page.locator('[data-testid="decision-history"]')).toBeVisible();
      await expect(page.locator('[data-testid="audit-trail"]')).toBeVisible();
      
      // Verify history content
      const decisionEntry = await page.locator('[data-testid="decision-entry"]').first();
      expect(decisionEntry).toBeVisible();
      
      const decisionType = await page.locator('[data-testid="decision-type"]').first().textContent();
      expect(decisionType).toContain('Approve');
    });
  });

  test.describe('Session and State Management', () => {
    test('should create and persist workflow sessions', async ({ page }) => {
      // Create session
      await page.click('[data-testid="new-session-btn"]');
      
      // Verify session creation
      await expect(page.locator('[data-testid="session-creation"]')).toBeVisible();
      await expect(page.locator('[data-testid="session-id"]')).toBeVisible();
      
      // Verify persistence
      const sessionId = await page.locator('[data-testid="session-id"]').textContent();
      expect(sessionId).toBeTruthy();
      
      // Verify session state
      await expect(page.locator('[data-testid="session-state"]')).toBeVisible();
    });

    test('should recover sessions after page reload', async ({ page }) => {
      // Create session
      await page.click('[data-testid="new-session-btn"]');
      await page.waitForTimeout(1000);
      
      // Get session ID
      const sessionId = await page.locator('[data-testid="session-id"]').textContent();
      
      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Verify session recovery
      await expect(page.locator('[data-testid="session-recovery"]')).toBeVisible();
      await expect(page.locator('[data-testid="restored-session"]')).toBeVisible();
      
      // Verify same session ID
      const recoveredSessionId = await page.locator('[data-testid="session-id"]').textContent();
      expect(recoveredSessionId).toBe(sessionId);
    });

    test('should synchronize sessions across tabs', async ({ page, context }) => {
      // Create session in first tab
      await page.click('[data-testid="new-session-btn"]');
      const sessionId = await page.locator('[data-testid="session-id"]').textContent();
      
      // Open second tab
      const secondPage = await context.newPage();
      await secondPage.goto('/test-chat');
      await secondPage.waitForLoadState('networkidle');
      
      // Verify session synchronization
      await expect(secondPage.locator('[data-testid="session-sync"]')).toBeVisible();
      await expect(secondPage.locator('[data-testid="shared-session"]')).toBeVisible();
      
      // Verify same session ID
      const syncedSessionId = await secondPage.locator('[data-testid="session-id"]').textContent();
      expect(syncedSessionId).toBe(sessionId);
    });

    test('should manage session cleanup and memory', async ({ page }) => {
      // Create multiple sessions
      for (let i = 0; i < 3; i++) {
        await page.click('[data-testid="new-session-btn"]');
        await page.waitForTimeout(500);
      }
      
      // Verify session management
      await expect(page.locator('[data-testid="session-list"]')).toBeVisible();
      await expect(page.locator('[data-testid="memory-usage"]')).toBeVisible();
      
      // Clean up sessions
      await page.click('[data-testid="cleanup-sessions-btn"]');
      await expect(page.locator('[data-testid="cleanup-status"]')).toBeVisible();
    });

    test('should handle concurrent sessions', async ({ page }) => {
      // Test concurrent session handling
      await page.click('[data-testid="test-concurrent-sessions"]');
      
      // Verify concurrent handling
      await expect(page.locator('[data-testid="concurrent-sessions"]')).toBeVisible();
      await expect(page.locator('[data-testid="session-isolation"]')).toBeVisible();
      await expect(page.locator('[data-testid="resource-management"]')).toBeVisible();
    });
  });

  test.describe('User Experience Validation', () => {
    test('should handle message input and submission', async ({ page }) => {
      // Test message input
      await page.fill('[data-testid="message-input"]', 'Test message input');
      
      // Verify input handling
      const inputValue = await page.locator('[data-testid="message-input"]').inputValue();
      expect(inputValue).toBe('Test message input');
      
      // Submit message
      await page.click('[data-testid="send-message-btn"]');
      
      // Verify submission
      await expect(page.locator('[data-testid="message-sent"]')).toBeVisible();
    });

    test('should support keyboard shortcuts and accessibility', async ({ page }) => {
      // Test keyboard shortcuts
      await page.click('[data-testid="message-input"]');
      await page.keyboard.press('Enter');
      
      // Verify shortcut handling
      await expect(page.locator('[data-testid="shortcut-handled"]')).toBeVisible();
      
      // Test accessibility
      await expect(page.locator('[data-testid="accessibility-features"]')).toBeVisible();
      await expect(page.locator('[data-testid="screen-reader-support"]')).toBeVisible();
    });

    test('should display loading states and progress indicators', async ({ page }) => {
      // Start workflow
      await page.click('[data-testid="start-workflow-btn"]');
      
      // Verify loading states
      await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible();
      await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible();
      await expect(page.locator('[data-testid="status-message"]')).toBeVisible();
      
      // Wait for completion
      await expect(page.locator('[data-testid="workflow-complete"]')).toBeVisible();
    });

    test('should handle errors and provide user feedback', async ({ page }) => {
      // Test error handling
      await page.click('[data-testid="test-error-scenario"]');
      
      // Verify error display
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-details"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-recovery"]')).toBeVisible();
      
      // Verify user guidance
      await expect(page.locator('[data-testid="user-guidance"]')).toBeVisible();
      await expect(page.locator('[data-testid="retry-options"]')).toBeVisible();
    });

    test('should provide responsive design and mobile compatibility', async ({ page }) => {
      // Test responsive design
      await page.setViewportSize({ width: 375, height: 667 }); // Mobile viewport
      
      // Verify mobile compatibility
      await expect(page.locator('[data-testid="mobile-interface"]')).toBeVisible();
      await expect(page.locator('[data-testid="touch-friendly"]')).toBeVisible();
      await expect(page.locator('[data-testid="responsive-layout"]')).toBeVisible();
      
      // Test tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      await expect(page.locator('[data-testid="tablet-interface"]')).toBeVisible();
      
      // Test desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 });
      await expect(page.locator('[data-testid="desktop-interface"]')).toBeVisible();
    });
  });
});
