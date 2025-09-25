import { test, expect } from '@playwright/test';
import { testCompleteArchitectureFlow, validateServiceCommunication, testRequestResponseFlow, validateDataTransformation } from './utils/end-to-end-test-helpers';

test.describe('End-to-End Architecture Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-chat');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Complete Architecture Flow Testing', () => {
    test('should initialize workflow through complete architecture stack', async ({ page }) => {
      const workflowData = {
        name: 'Healthcare System Analysis',
        description: 'Comprehensive analysis of healthcare system modernization',
        stages: ['Problem Capture', 'Requirements Analysis', 'Solution Design', 'Implementation Planning', 'Quality Assurance', 'Deployment Strategy', 'Monitoring Setup']
      };

      await testCompleteArchitectureFlow(page, workflowData);
      
      // Verify complete initialization
      await expect(page.locator('[data-testid="workflow-session"]')).toBeVisible();
      await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="stage-progress"]')).toBeVisible();
    });

    test('should handle request/response flow through all service layers', async ({ page }) => {
      const testPayload = {
        message: 'Start healthcare system analysis',
        workflowType: 'healthcare-modernization'
      };

      await testRequestResponseFlow(page, '/api/chat/crew/start', testPayload);
      
      // Verify response propagation
      await expect(page.locator('[data-testid="api-response"]')).toBeVisible();
      await expect(page.locator('[data-testid="workflow-state"]')).toBeVisible();
    });

    test('should orchestrate CrewAI multi-agent collaboration through LangGraph', async ({ page }) => {
      // Test agent coordination through backend orchestration
      await page.click('[data-testid="next-message-btn"]');
      
      // Verify agent message generation
      await expect(page.locator('[data-testid="agent-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="agent-metadata"]')).toBeVisible();
      
      // Verify workflow state update
      await expect(page.locator('[data-testid="workflow-progress"]')).toBeVisible();
    });

    test('should create and manage sessions across entire stack', async ({ page }) => {
      // Create new session
      await page.click('[data-testid="new-session-btn"]');
      
      // Verify session creation across services
      await expect(page.locator('[data-testid="session-id"]')).toBeVisible();
      await expect(page.locator('[data-testid="session-state"]')).toBeVisible();
      
      // Verify session persistence
      const sessionId = await page.locator('[data-testid="session-id"]').textContent();
      expect(sessionId).toBeTruthy();
    });
  });

  test.describe('Multi-Agent Coordination Integration', () => {
    test('should generate agent messages through CrewAI service integration', async ({ page }) => {
      await page.click('[data-testid="start-workflow-btn"]');
      
      // Wait for first agent message
      await expect(page.locator('[data-testid="agent-message"]')).toBeVisible();
      
      // Verify agent metadata
      const agentName = await page.locator('[data-testid="agent-name"]').textContent();
      const agentTitle = await page.locator('[data-testid="agent-title"]').textContent();
      const agentRole = await page.locator('[data-testid="agent-role"]').textContent();
      
      expect(agentName).toBeTruthy();
      expect(agentTitle).toBeTruthy();
      expect(agentRole).toBeTruthy();
    });

    test('should propagate agent metadata through all layers', async ({ page }) => {
      await page.click('[data-testid="next-message-btn"]');
      
      // Verify metadata display
      await expect(page.locator('[data-testid="agent-avatar"]')).toBeVisible();
      await expect(page.locator('[data-testid="agent-department"]')).toBeVisible();
      await expect(page.locator('[data-testid="agent-expertise"]')).toBeVisible();
    });

    test('should handle workflow stage progression with agent participation', async ({ page }) => {
      // Start workflow
      await page.click('[data-testid="start-workflow-btn"]');
      
      // Progress through stages
      for (let i = 0; i < 3; i++) {
        await page.click('[data-testid="next-message-btn"]');
        await page.waitForTimeout(1000); // Wait for agent processing
      }
      
      // Verify stage progression
      const currentStage = await page.locator('[data-testid="current-stage"]').textContent();
      expect(currentStage).toContain('Requirements Analysis');
    });

    test('should process decision points across complete architecture', async ({ page }) => {
      // Progress to decision point
      await page.click('[data-testid="start-workflow-btn"]');
      
      // Wait for decision point
      await expect(page.locator('[data-testid="decision-point"]')).toBeVisible();
      
      // Verify decision options
      await expect(page.locator('[data-testid="decision-approve"]')).toBeVisible();
      await expect(page.locator('[data-testid="decision-refine"]')).toBeVisible();
      await expect(page.locator('[data-testid="decision-reject"]')).toBeVisible();
      await expect(page.locator('[data-testid="decision-pause"]')).toBeVisible();
      
      // Submit decision
      await page.click('[data-testid="decision-approve"]');
      
      // Verify decision processing
      await expect(page.locator('[data-testid="decision-feedback"]')).toBeVisible();
    });

    test('should demonstrate agent collaboration patterns through backend', async ({ page }) => {
      // Start workflow and observe agent collaboration
      await page.click('[data-testid="start-workflow-btn"]');
      
      // Progress through multiple agent interactions
      for (let i = 0; i < 5; i++) {
        await page.click('[data-testid="next-message-btn"]');
        await page.waitForTimeout(1000);
      }
      
      // Verify collaboration patterns
      const agentMessages = await page.locator('[data-testid="agent-message"]').count();
      expect(agentMessages).toBeGreaterThan(3);
      
      // Verify different agent types participated
      const agentTypes = await page.locator('[data-testid="agent-role"]').allTextContents();
      const uniqueAgents = new Set(agentTypes);
      expect(uniqueAgents.size).toBeGreaterThan(2);
    });
  });

  test.describe('Service Communication Validation', () => {
    test('should forward API requests to LangGraph workflow service', async ({ page }) => {
      const services = ['api-proxy', 'langgraph-service', 'crewai-service'];
      
      await validateServiceCommunication(page, services);
      
      // Verify service communication
      await expect(page.locator('[data-testid="service-status"]')).toBeVisible();
      await expect(page.locator('[data-testid="service-health"]')).toBeVisible();
    });

    test('should communicate between LangGraph and CrewAI services', async ({ page }) => {
      // Test inter-service communication
      await page.click('[data-testid="test-service-communication"]');
      
      // Verify communication status
      await expect(page.locator('[data-testid="langgraph-crewai-status"]')).toBeVisible();
      await expect(page.locator('[data-testid="communication-latency"]')).toBeVisible();
    });

    test('should handle errors and propagate across service boundaries', async ({ page }) => {
      // Simulate service error
      await page.click('[data-testid="simulate-error"]');
      
      // Verify error propagation
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-source"]')).toBeVisible();
      
      // Verify error handling
      await expect(page.locator('[data-testid="error-recovery"]')).toBeVisible();
    });

    test('should handle timeouts and retry mechanisms throughout stack', async ({ page }) => {
      // Test timeout handling
      await page.click('[data-testid="test-timeout"]');
      
      // Verify timeout behavior
      await expect(page.locator('[data-testid="timeout-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="retry-attempt"]')).toBeVisible();
      
      // Verify retry success
      await expect(page.locator('[data-testid="retry-success"]')).toBeVisible();
    });

    test('should monitor service health and availability', async ({ page }) => {
      // Check service health
      await page.click('[data-testid="check-service-health"]');
      
      // Verify health status
      await expect(page.locator('[data-testid="health-status"]')).toBeVisible();
      await expect(page.locator('[data-testid="service-uptime"]')).toBeVisible();
      await expect(page.locator('[data-testid="response-time"]')).toBeVisible();
    });
  });

  test.describe('Data Transformation and Consistency', () => {
    test('should transform request/response formats across service layers', async ({ page }) => {
      const inputData = {
        message: 'Analyze healthcare system requirements',
        context: 'Modern hospital infrastructure'
      };
      
      const expectedOutput = {
        workflowType: 'healthcare-analysis',
        stage: 'requirements-analysis',
        agents: ['Business Analyst', 'Solution Architect']
      };
      
      await validateDataTransformation(page, inputData, expectedOutput);
      
      // Verify transformation
      await expect(page.locator('[data-testid="transformed-data"]')).toBeVisible();
      await expect(page.locator('[data-testid="data-consistency"]')).toBeVisible();
    });

    test('should maintain data consistency from ChatInterface to CrewAI output', async ({ page }) => {
      // Test data consistency
      await page.click('[data-testid="test-data-consistency"]');
      
      // Verify consistency across layers
      await expect(page.locator('[data-testid="frontend-data"]')).toBeVisible();
      await expect(page.locator('[data-testid="backend-data"]')).toBeVisible();
      await expect(page.locator('[data-testid="consistency-status"]')).toBeVisible();
    });

    test('should standardize message formats across architecture', async ({ page }) => {
      // Test message format standardization
      await page.click('[data-testid="test-message-formats"]');
      
      // Verify format consistency
      await expect(page.locator('[data-testid="format-validation"]')).toBeVisible();
      await expect(page.locator('[data-testid="format-errors"]')).toBeVisible();
    });

    test('should synchronize workflow state across services', async ({ page }) => {
      // Test state synchronization
      await page.click('[data-testid="test-state-sync"]');
      
      // Verify state consistency
      await expect(page.locator('[data-testid="state-consistency"]')).toBeVisible();
      await expect(page.locator('[data-testid="sync-status"]')).toBeVisible();
    });

    test('should preserve metadata through complete flow', async ({ page }) => {
      // Test metadata preservation
      await page.click('[data-testid="test-metadata-preservation"]');
      
      // Verify metadata integrity
      await expect(page.locator('[data-testid="metadata-status"]')).toBeVisible();
      await expect(page.locator('[data-testid="preserved-fields"]')).toBeVisible();
    });
  });

  test.describe('Authentication and Security', () => {
    test('should authenticate API requests across service boundaries', async ({ page }) => {
      // Test authentication
      await page.click('[data-testid="test-authentication"]');
      
      // Verify authentication status
      await expect(page.locator('[data-testid="auth-status"]')).toBeVisible();
      await expect(page.locator('[data-testid="auth-token"]')).toBeVisible();
    });

    test('should secure communication between services', async ({ page }) => {
      // Test secure communication
      await page.click('[data-testid="test-secure-communication"]');
      
      // Verify security measures
      await expect(page.locator('[data-testid="encryption-status"]')).toBeVisible();
      await expect(page.locator('[data-testid="security-headers"]')).toBeVisible();
    });

    test('should isolate sessions and maintain security', async ({ page }) => {
      // Test session isolation
      await page.click('[data-testid="test-session-isolation"]');
      
      // Verify isolation
      await expect(page.locator('[data-testid="isolation-status"]')).toBeVisible();
      await expect(page.locator('[data-testid="session-boundaries"]')).toBeVisible();
    });

    test('should sanitize error messages for security', async ({ page }) => {
      // Test error message sanitization
      await page.click('[data-testid="test-error-sanitization"]');
      
      // Verify sanitization
      await expect(page.locator('[data-testid="sanitization-status"]')).toBeVisible();
      await expect(page.locator('[data-testid="sanitized-content"]')).toBeVisible();
    });
  });
});
