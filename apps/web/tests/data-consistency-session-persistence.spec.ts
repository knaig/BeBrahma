import { test, expect } from '@playwright/test';
import { validateDataConsistency, testMessageIntegrity, validateWorkflowState, testAgentMetadataConsistency } from './utils/end-to-end-test-helpers';

test.describe('Data Consistency and Session Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-chat');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Cross-Service Data Consistency', () => {
    test('should maintain data integrity from ChatInterface through LangGraph to CrewAI services', async ({ page }) => {
      // Test data integrity across services
      await page.click('[data-testid="test-data-integrity"]');
      
      // Verify integrity across all layers
      await expect(page.locator('[data-testid="frontend-data"]')).toBeVisible();
      await expect(page.locator('[data-testid="langgraph-data"]')).toBeVisible();
      await expect(page.locator('[data-testid="crewai-data"]')).toBeVisible();
      await expect(page.locator('[data-testid="integrity-status"]')).toBeVisible();
      
      // Verify data consistency
      const integrityStatus = await page.locator('[data-testid="integrity-status"]').textContent();
      expect(integrityStatus).toContain('Consistent');
    });

    test('should maintain message format consistency across service boundaries', async ({ page }) => {
      // Test message format consistency
      await page.click('[data-testid="test-message-formats"]');
      
      // Verify format consistency
      await expect(page.locator('[data-testid="format-validation"]')).toBeVisible();
      await expect(page.locator('[data-testid="format-errors"]')).toBeVisible();
      
      // Verify no format errors
      const formatErrors = await page.locator('[data-testid="format-error"]').count();
      expect(formatErrors).toBe(0);
    });

    test('should synchronize workflow state between services', async ({ page }) => {
      // Test state synchronization
      await page.click('[data-testid="test-state-sync"]');
      
      // Verify synchronization status
      await expect(page.locator('[data-testid="sync-status"]')).toBeVisible();
      await expect(page.locator('[data-testid="state-consistency"]')).toBeVisible();
      
      // Verify all services have consistent state
      const syncStatus = await page.locator('[data-testid="sync-status"]').textContent();
      expect(syncStatus).toContain('Synchronized');
    });

    test('should preserve agent metadata consistency throughout architecture', async ({ page }) => {
      // Test agent metadata consistency
      await page.click('[data-testid="test-agent-metadata"]');
      
      // Verify metadata consistency
      await expect(page.locator('[data-testid="metadata-consistency"]')).toBeVisible();
      await expect(page.locator('[data-testid="metadata-validation"]')).toBeVisible();
      
      // Verify consistency status
      const consistencyStatus = await page.locator('[data-testid="metadata-consistency"]').textContent();
      expect(consistencyStatus).toContain('Consistent');
    });

    test('should maintain decision data consistency across service calls', async ({ page }) => {
      // Test decision data consistency
      await page.click('[data-testid="test-decision-consistency"]');
      
      // Verify decision consistency
      await expect(page.locator('[data-testid="decision-consistency"]')).toBeVisible();
      await expect(page.locator('[data-testid="decision-validation"]')).toBeVisible();
      
      // Verify consistency status
      const decisionStatus = await page.locator('[data-testid="decision-consistency"]').textContent();
      expect(decisionStatus).toContain('Consistent');
    });
  });

  test.describe('Session Persistence Validation', () => {
    test('should create and generate session IDs across services', async ({ page }) => {
      // Create new session
      await page.click('[data-testid="new-session-btn"]');
      
      // Verify session creation
      await expect(page.locator('[data-testid="session-creation"]')).toBeVisible();
      await expect(page.locator('[data-testid="session-id"]')).toBeVisible();
      
      // Verify session ID format
      const sessionId = await page.locator('[data-testid="session-id"]').textContent();
      expect(sessionId).toMatch(/^[a-f0-9-]+$/);
      
      // Verify session ID consistency across services
      await expect(page.locator('[data-testid="session-id-frontend"]')).toHaveText(sessionId);
      await expect(page.locator('[data-testid="session-id-langgraph"]')).toHaveText(sessionId);
      await expect(page.locator('[data-testid="session-id-crewai"]')).toHaveText(sessionId);
    });

    test('should persist session state in LangGraph workflow service', async ({ page }) => {
      // Create session
      await page.click('[data-testid="new-session-btn"]');
      const sessionId = await page.locator('[data-testid="session-id"]').textContent();
      
      // Verify persistence in LangGraph service
      await page.click('[data-testid="verify-langgraph-persistence"]');
      
      // Verify persistence status
      await expect(page.locator('[data-testid="langgraph-persistence"]')).toBeVisible();
      await expect(page.locator('[data-testid="persistence-status"]')).toBeVisible();
      
      // Verify session exists in LangGraph
      const persistenceStatus = await page.locator('[data-testid="persistence-status"]').textContent();
      expect(persistenceStatus).toContain('Persisted');
    });

    test('should recover sessions after service restarts', async ({ page }) => {
      // Create session
      await page.click('[data-testid="new-session-btn"]');
      const sessionId = await page.locator('[data-testid="session-id"]').textContent();
      
      // Simulate service restart
      await page.click('[data-testid="simulate-service-restart"]');
      
      // Verify session recovery
      await expect(page.locator('[data-testid="session-recovery"]')).toBeVisible();
      await expect(page.locator('[data-testid="recovery-status"]')).toBeVisible();
      
      // Verify same session ID after restart
      const recoveredSessionId = await page.locator('[data-testid="session-id"]').textContent();
      expect(recoveredSessionId).toBe(sessionId);
    });

    test('should reconstruct session data from backend state', async ({ page }) => {
      // Create session with some data
      await page.click('[data-testid="new-session-btn"]');
      await page.click('[data-testid="add-test-data"]');
      
      // Simulate reconstruction
      await page.click('[data-testid="simulate-reconstruction"]');
      
      // Verify reconstruction
      await expect(page.locator('[data-testid="reconstruction-status"]')).toBeVisible();
      await expect(page.locator('[data-testid="reconstructed-data"]')).toBeVisible();
      
      // Verify reconstruction success
      const reconstructionStatus = await page.locator('[data-testid="reconstruction-status"]').textContent();
      expect(reconstructionStatus).toContain('Successful');
    });

    test('should manage session cleanup and garbage collection', async ({ page }) => {
      // Create multiple sessions
      for (let i = 0; i < 3; i++) {
        await page.click('[data-testid="new-session-btn"]');
        await page.waitForTimeout(500);
      }
      
      // Test cleanup
      await page.click('[data-testid="test-cleanup"]');
      
      // Verify cleanup
      await expect(page.locator('[data-testid="cleanup-status"]')).toBeVisible();
      await expect(page.locator('[data-testid="garbage-collection"]')).toBeVisible();
      
      // Verify cleanup success
      const cleanupStatus = await page.locator('[data-testid="cleanup-status"]').textContent();
      expect(cleanupStatus).toContain('Completed');
    });
  });

  test.describe('Workflow State Management', () => {
    test('should maintain workflow stage progression state consistency', async ({ page }) => {
      // Test stage progression consistency
      await page.click('[data-testid="test-stage-consistency"]');
      
      // Verify consistency
      await expect(page.locator('[data-testid="stage-consistency"]')).toBeVisible();
      await expect(page.locator('[data-testid="progression-status"]')).toBeVisible();
      
      // Verify consistency status
      const consistencyStatus = await page.locator('[data-testid="stage-consistency"]').textContent();
      expect(consistencyStatus).toContain('Consistent');
    });

    test('should track progress consistently across service boundaries', async ({ page }) => {
      // Test progress tracking
      await page.click('[data-testid="test-progress-tracking"]');
      
      // Verify progress tracking
      await expect(page.locator('[data-testid="progress-tracking"]')).toBeVisible();
      await expect(page.locator('[data-testid="progress-consistency"]')).toBeVisible();
      
      // Verify tracking consistency
      const trackingStatus = await page.locator('[data-testid="progress-consistency"]').textContent();
      expect(trackingStatus).toContain('Consistent');
    });

    test('should manage decision point state consistently', async ({ page }) => {
      // Test decision point state management
      await page.click('[data-testid="test-decision-state"]');
      
      // Verify decision state management
      await expect(page.locator('[data-testid="decision-state"]')).toBeVisible();
      await expect(page.locator('[data-testid="state-management"]')).toBeVisible();
      
      // Verify state consistency
      const stateStatus = await page.locator('[data-testid="state-management"]').textContent();
      expect(stateStatus).toContain('Consistent');
    });

    test('should track agent participation consistently', async ({ page }) => {
      // Test agent participation tracking
      await page.click('[data-testid="test-agent-participation"]');
      
      // Verify participation tracking
      await expect(page.locator('[data-testid="participation-tracking"]')).toBeVisible();
      await expect(page.locator('[data-testid="participation-consistency"]')).toBeVisible();
      
      // Verify tracking consistency
      const participationStatus = await page.locator('[data-testid="participation-consistency"]').textContent();
      expect(participationStatus).toContain('Consistent');
    });

    test('should synchronize completion status across services', async ({ page }) => {
      // Test completion status synchronization
      await page.click('[data-testid="test-completion-sync"]');
      
      // Verify completion synchronization
      await expect(page.locator('[data-testid="completion-sync"]')).toBeVisible();
      await expect(page.locator('[data-testid="completion-status"]')).toBeVisible();
      
      // Verify synchronization status
      const syncStatus = await page.locator('[data-testid="completion-sync"]').textContent();
      expect(syncStatus).toContain('Synchronized');
    });
  });

  test.describe('Message History Consistency', () => {
    test('should maintain message ordering and chronological consistency', async ({ page }) => {
      // Test message ordering
      await page.click('[data-testid="test-message-ordering"]');
      
      // Verify message ordering
      await expect(page.locator('[data-testid="message-ordering"]')).toBeVisible();
      await expect(page.locator('[data-testid="chronological-consistency"]')).toBeVisible();
      
      // Verify ordering consistency
      const orderingStatus = await page.locator('[data-testid="message-ordering"]').textContent();
      expect(orderingStatus).toContain('Consistent');
    });

    test('should deduplicate messages across services', async ({ page }) => {
      // Test message deduplication
      await page.click('[data-testid="test-message-deduplication"]');
      
      // Verify deduplication
      await expect(page.locator('[data-testid="message-deduplication"]')).toBeVisible();
      await expect(page.locator('[data-testid="duplicate-count"]')).toBeVisible();
      
      // Verify no duplicates
      const duplicateCount = await page.locator('[data-testid="duplicate-count"]').textContent();
      expect(duplicateCount).toBe('0');
    });

    test('should preserve message metadata consistently', async ({ page }) => {
      // Test message metadata preservation
      await page.click('[data-testid="test-metadata-preservation"]');
      
      // Verify metadata preservation
      await expect(page.locator('[data-testid="metadata-preservation"]')).toBeVisible();
      await expect(page.locator('[data-testid="metadata-consistency"]')).toBeVisible();
      
      // Verify preservation status
      const preservationStatus = await page.locator('[data-testid="metadata-preservation"]').textContent();
      expect(preservationStatus).toContain('Preserved');
    });

    test('should maintain agent attribution consistency', async ({ page }) => {
      // Test agent attribution consistency
      await page.click('[data-testid="test-agent-attribution"]');
      
      // Verify attribution consistency
      await expect(page.locator('[data-testid="agent-attribution"]')).toBeVisible();
      await expect(page.locator('[data-testid="attribution-consistency"]')).toBeVisible();
      
      // Verify attribution status
      const attributionStatus = await page.locator('[data-testid="agent-attribution"]').textContent();
      expect(attributionStatus).toContain('Consistent');
    });

    test('should reconstruct message history accurately', async ({ page }) => {
      // Test message history reconstruction
      await page.click('[data-testid="test-history-reconstruction"]');
      
      // Verify reconstruction
      await expect(page.locator('[data-testid="history-reconstruction"]')).toBeVisible();
      await expect(page.locator('[data-testid="reconstruction-accuracy"]')).toBeVisible();
      
      // Verify reconstruction accuracy
      const accuracyStatus = await page.locator('[data-testid="reconstruction-accuracy"]').textContent();
      expect(accuracyStatus).toContain('Accurate');
    });
  });

  test.describe('Error State Consistency', () => {
    test('should propagate error states consistently across services', async ({ page }) => {
      // Test error state propagation
      await page.click('[data-testid="test-error-propagation"]');
      
      // Verify error propagation
      await expect(page.locator('[data-testid="error-propagation"]')).toBeVisible();
      await expect(page.locator('[data-testid="propagation-consistency"]')).toBeVisible();
      
      // Verify propagation consistency
      const propagationStatus = await page.locator('[data-testid="error-propagation"]').textContent();
      expect(propagationStatus).toContain('Consistent');
    });

    test('should recover and restore state consistently after errors', async ({ page }) => {
      // Test error recovery
      await page.click('[data-testid="test-error-recovery"]');
      
      // Verify error recovery
      await expect(page.locator('[data-testid="error-recovery"]')).toBeVisible();
      await expect(page.locator('[data-testid="state-restoration"]')).toBeVisible();
      
      // Verify recovery success
      const recoveryStatus = await page.locator('[data-testid="error-recovery"]').textContent();
      expect(recoveryStatus).toContain('Successful');
    });

    test('should handle partial failures while maintaining data integrity', async ({ page }) => {
      // Test partial failure handling
      await page.click('[data-testid="test-partial-failure"]');
      
      // Verify partial failure handling
      await expect(page.locator('[data-testid="partial-failure"]')).toBeVisible();
      await expect(page.locator('[data-testid="data-integrity"]')).toBeVisible();
      
      // Verify data integrity maintained
      const integrityStatus = await page.locator('[data-testid="data-integrity"]').textContent();
      expect(integrityStatus).toContain('Maintained');
    });

    test('should implement rollback mechanisms for failed operations', async ({ page }) => {
      // Test rollback mechanisms
      await page.click('[data-testid="test-rollback-mechanisms"]');
      
      // Verify rollback mechanisms
      await expect(page.locator('[data-testid="rollback-mechanisms"]')).toBeVisible();
      await expect(page.locator('[data-testid="rollback-success"]')).toBeVisible();
      
      // Verify rollback success
      const rollbackStatus = await page.locator('[data-testid="rollback-mechanisms"]').textContent();
      expect(rollbackStatus).toContain('Successful');
    });

    test('should isolate error boundaries and maintain system stability', async ({ page }) => {
      // Test error boundary isolation
      await page.click('[data-testid="test-error-boundaries"]');
      
      // Verify error boundary isolation
      await expect(page.locator('[data-testid="error-boundaries"]')).toBeVisible();
      await expect(page.locator('[data-testid="system-stability"]')).toBeVisible();
      
      // Verify system stability
      const stabilityStatus = await page.locator('[data-testid="system-stability"]').textContent();
      expect(stabilityStatus).toContain('Stable');
    });
  });

  test.describe('Concurrent Session Management', () => {
    test('should handle multiple concurrent workflow sessions', async ({ page }) => {
      // Test concurrent sessions
      await page.click('[data-testid="test-concurrent-sessions"]');
      
      // Verify concurrent session handling
      await expect(page.locator('[data-testid="concurrent-sessions"]')).toBeVisible();
      await expect(page.locator('[data-testid="session-count"]')).toBeVisible();
      
      // Verify multiple sessions
      const sessionCount = await page.locator('[data-testid="session-count"]').textContent();
      expect(parseInt(sessionCount)).toBeGreaterThan(1);
    });

    test('should maintain session isolation and data separation', async ({ page }) => {
      // Test session isolation
      await page.click('[data-testid="test-session-isolation"]');
      
      // Verify session isolation
      await expect(page.locator('[data-testid="session-isolation"]')).toBeVisible();
      await expect(page.locator('[data-testid="data-separation"]')).toBeVisible();
      
      // Verify isolation status
      const isolationStatus = await page.locator('[data-testid="session-isolation"]').textContent();
      expect(isolationStatus).toContain('Isolated');
    });

    test('should handle concurrent updates and resolve conflicts', async ({ page }) => {
      // Test concurrent updates
      await page.click('[data-testid="test-concurrent-updates"]');
      
      // Verify concurrent update handling
      await expect(page.locator('[data-testid="concurrent-updates"]')).toBeVisible();
      await expect(page.locator('[data-testid="conflict-resolution"]')).toBeVisible();
      
      // Verify conflict resolution
      const resolutionStatus = await page.locator('[data-testid="conflict-resolution"]').textContent();
      expect(resolutionStatus).toContain('Resolved');
    });

    test('should maintain session performance under concurrent load', async ({ page }) => {
      // Test performance under load
      await page.click('[data-testid="test-performance-load"]');
      
      // Verify performance monitoring
      await expect(page.locator('[data-testid="performance-load"]')).toBeVisible();
      await expect(page.locator('[data-testid="performance-metrics"]')).toBeVisible();
      
      // Verify performance thresholds
      const performanceStatus = await page.locator('[data-testid="performance-load"]').textContent();
      expect(performanceStatus).toContain('Acceptable');
    });

    test('should manage session resources and cleanup efficiently', async ({ page }) => {
      // Test resource management
      await page.click('[data-testid="test-resource-management"]');
      
      // Verify resource management
      await expect(page.locator('[data-testid="resource-management"]')).toBeVisible();
      await expect(page.locator('[data-testid="cleanup-efficiency"]')).toBeVisible();
      
      // Verify resource efficiency
      const efficiencyStatus = await page.locator('[data-testid="cleanup-efficiency"]').textContent();
      expect(efficiencyStatus).toContain('Efficient');
    });
  });

  test.describe('Data Validation and Integrity', () => {
    test('should validate input data across service boundaries', async ({ page }) => {
      // Test input validation
      await page.click('[data-testid="test-input-validation"]');
      
      // Verify input validation
      await expect(page.locator('[data-testid="input-validation"]')).toBeVisible();
      await expect(page.locator('[data-testid="validation-results"]')).toBeVisible();
      
      // Verify validation success
      const validationStatus = await page.locator('[data-testid="input-validation"]').textContent();
      expect(validationStatus).toContain('Valid');
    });

    test('should sanitize and secure data throughout the architecture', async ({ page }) => {
      // Test data sanitization
      await page.click('[data-testid="test-data-sanitization"]');
      
      // Verify data sanitization
      await expect(page.locator('[data-testid="data-sanitization"]')).toBeVisible();
      await expect(page.locator('[data-testid="security-status"]')).toBeVisible();
      
      // Verify security status
      const securityStatus = await page.locator('[data-testid="security-status"]').textContent();
      expect(securityStatus).toContain('Secure');
    });

    test('should validate schema and maintain type safety', async ({ page }) => {
      // Test schema validation
      await page.click('[data-testid="test-schema-validation"]');
      
      // Verify schema validation
      await expect(page.locator('[data-testid="schema-validation"]')).toBeVisible();
      await expect(page.locator('[data-testid="type-safety"]')).toBeVisible();
      
      // Verify schema validity
      const schemaStatus = await page.locator('[data-testid="schema-validation"]').textContent();
      expect(schemaStatus).toContain('Valid');
    });

    test('should maintain data transformation accuracy', async ({ page }) => {
      // Test data transformation accuracy
      await page.click('[data-testid="test-transformation-accuracy"]');
      
      // Verify transformation accuracy
      await expect(page.locator('[data-testid="transformation-accuracy"]')).toBeVisible();
      await expect(page.locator('[data-testid="accuracy-metrics"]')).toBeVisible();
      
      // Verify accuracy thresholds
      const accuracyStatus = await page.locator('[data-testid="transformation-accuracy"]').textContent();
      expect(accuracyStatus).toContain('Accurate');
    });

    test('should detect and recover from data corruption', async ({ page }) => {
      // Test data corruption detection
      await page.click('[data-testid="test-corruption-detection"]');
      
      // Verify corruption detection
      await expect(page.locator('[data-testid="corruption-detection"]')).toBeVisible();
      await expect(page.locator('[data-testid="recovery-mechanisms"]')).toBeVisible();
      
      // Verify detection and recovery
      const detectionStatus = await page.locator('[data-testid="corruption-detection"]').textContent();
      expect(detectionStatus).toContain('Detected');
    });
  });
});
