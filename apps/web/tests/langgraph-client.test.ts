import { describe, it, expect, beforeEach, vi, afterEach, beforeAll, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { LangGraphClient } from '../lib/langgraphClient';

describe('LangGraphClient', () => {
  let client: LangGraphClient;
  let server: any;

  const mockWorkflowResponses = {
    start: {
      session_id: 'test_session_123',
      current_stage: 'PROBLEM_CAPTURE',
      stage_status: 'IN_PROGRESS',
      messages: [
        {
          id: 'welcome_msg',
          content: 'Welcome to the workflow!',
          agent_id: 'system',
          agent_name: 'System',
          agent_title: 'System',
          timestamp: new Date().toISOString(),
          stage: 'PROBLEM_CAPTURE'
        }
      ],
      stage_progress: {
        PROBLEM_CAPTURE: {
          status: 'IN_PROGRESS',
          message_count: 1,
          completed: false
        }
      },
      pending_decision: false,
      decision_options: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    next: {
      session_id: 'test_session_123',
      current_stage: 'PROBLEM_CAPTURE',
      stage_status: 'IN_PROGRESS',
      messages: [
        {
          id: 'welcome_msg',
          content: 'Welcome to the workflow!',
          agent_id: 'system',
          agent_name: 'System',
          agent_title: 'System',
          timestamp: new Date().toISOString(),
          stage: 'PROBLEM_CAPTURE'
        },
        {
          id: 'agent_msg',
          content: 'Business Analyst: Here is my analysis...',
          agent_id: 'business_analyst',
          agent_name: 'Business Analyst',
          agent_title: 'Business Analyst',
          timestamp: new Date().toISOString(),
          stage: 'PROBLEM_CAPTURE'
        }
      ],
      stage_progress: {
        PROBLEM_CAPTURE: {
          status: 'IN_PROGRESS',
          message_count: 2,
          completed: false
        }
      },
      pending_decision: false,
      decision_options: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    decision: {
      session_id: 'test_session_123',
      current_stage: 'PROBLEM_CLARIFICATION',
      stage_status: 'IN_PROGRESS',
      messages: [
        {
          id: 'welcome_msg',
          content: 'Welcome to the workflow!',
          agent_id: 'system',
          agent_name: 'System',
          agent_title: 'System',
          timestamp: new Date().toISOString(),
          stage: 'PROBLEM_CAPTURE'
        },
        {
          id: 'decision_msg',
          content: 'Decision: APPROVE - Approved for next stage',
          agent_id: 'system',
          agent_name: 'System',
          agent_title: 'System',
          timestamp: new Date().toISOString(),
          stage: 'PROBLEM_CAPTURE'
        }
      ],
      stage_progress: {
        PROBLEM_CAPTURE: {
          status: 'COMPLETED',
          message_count: 2,
          completed: true
        },
        PROBLEM_CLARIFICATION: {
          status: 'IN_PROGRESS',
          message_count: 0,
          completed: false
        }
      },
      pending_decision: false,
      decision_options: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    status: {
      session_id: 'test_session_123',
      current_stage: 'PROBLEM_CAPTURE',
      stage_status: 'IN_PROGRESS',
      messages: [
        {
          id: 'welcome_msg',
          content: 'Welcome to the workflow!',
          agent_id: 'system',
          agent_name: 'System',
          agent_title: 'System',
          timestamp: new Date().toISOString(),
          stage: 'PROBLEM_CAPTURE'
        }
      ],
      stage_progress: {
        PROBLEM_CAPTURE: {
          status: 'IN_PROGRESS',
          message_count: 1,
          completed: false
        }
      },
      pending_decision: false,
      decision_options: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  };

  beforeAll(() => {
    // Setup MSW server
    server = setupServer(
      rest.post('*/api/workflow/start', (req, res, ctx) => {
        return res(ctx.json(mockWorkflowResponses.start));
      }),
      rest.post('*/api/workflow/next', (req, res, ctx) => {
        return res(ctx.json(mockWorkflowResponses.next));
      }),
      rest.post('*/api/workflow/decision', (req, res, ctx) => {
        return res(ctx.json(mockWorkflowResponses.decision));
      }),
      rest.get('*/api/workflow/status/:sessionId', (req, res, ctx) => {
        return res(ctx.json(mockWorkflowResponses.status));
      }),
      rest.post('*/api/workflow/continue', (req, res, ctx) => {
        return res(ctx.json(mockWorkflowResponses.start));
      })
    );

    server.listen({ onUnhandledRequest: 'error' });
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(() => {
    // Reset MSW handlers
    server.resetHandlers();
    
    // Create new client instance
    client = new LangGraphClient('http://localhost:8000');
    
    // Reset fetch mock
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Client Initialization', () => {
    it('should initialize with base URL and default configuration', () => {
      // Assert
      expect(client.baseUrl).toBe('http://localhost:8000');
      expect(client.timeout).toBe(10000); // Default 10 second timeout
    });

    it('should use custom timeout when provided', () => {
      // Arrange
      const customClient = new LangGraphClient('http://localhost:8000', 5000);

      // Assert
      expect(customClient.timeout).toBe(5000);
    });

    it('should create singleton instance when getInstance is called', () => {
      // Act
      const instance1 = LangGraphClient.getInstance();
      const instance2 = LangGraphClient.getInstance();

      // Assert
      expect(instance1).toBe(instance2);
    });
  });

  describe('API Method Testing', () => {
    it('should call startWorkflowSession with correct parameters', async () => {
      // Arrange
      const sessionId = 'test_session_123';
      const workflowName = 'Test Workflow';
      const initialContext = { domain: 'healthcare', complexity: 'high' };

      // Act
      const result = await client.startWorkflowSession(sessionId, workflowName, initialContext);

      // Assert
      expect(result).toEqual(mockWorkflowResponses.start);
      expect(result.session_id).toBe(sessionId);
      expect(result.current_stage).toBe('PROBLEM_CAPTURE');
    });

    it('should call getNextMessage for step progression', async () => {
      // Arrange
      const sessionId = 'test_session_123';

      // Act
      const result = await client.getNextMessage(sessionId);

      // Assert
      expect(result).toEqual(mockWorkflowResponses.next);
      expect(result.messages).toHaveLength(2);
      expect(result.messages[1].agent_id).toBe('business_analyst');
    });

    it('should call sendDecision with different decision types', async () => {
      // Arrange
      const sessionId = 'test_session_123';
      const decision = 'APPROVE';
      const feedback = 'Approved for next stage';

      // Act
      const result = await client.sendDecision(sessionId, decision, feedback);

      // Assert
      expect(result).toEqual(mockWorkflowResponses.decision);
      expect(result.current_stage).toBe('PROBLEM_CLARIFICATION');
      expect(result.stage_progress.PROBLEM_CAPTURE.status).toBe('COMPLETED');
    });

    it('should call getWorkflowStatus for status retrieval', async () => {
      // Arrange
      const sessionId = 'test_session_123';

      // Act
      const result = await client.getWorkflowStatus(sessionId);

      // Assert
      expect(result).toEqual(mockWorkflowResponses.status);
      expect(result.session_id).toBe(sessionId);
      expect(result.current_stage).toBe('PROBLEM_CAPTURE');
    });

    it('should call continueSession for session continuation', async () => {
      // Arrange
      const sessionId = 'test_session_123';

      // Act
      const result = await client.continueSession(sessionId);

      // Assert
      expect(result).toEqual(mockWorkflowResponses.start);
      expect(result.session_id).toBe(sessionId);
    });
  });

  describe('Request/Response Handling', () => {
    it('should format request payloads correctly', async () => {
      // Arrange
      const sessionId = 'test_session_123';
      const workflowName = 'Test Workflow';
      const initialContext = { domain: 'healthcare' };

      // Mock fetch to capture request
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockWorkflowResponses.start)
      });
      vi.stubGlobal('fetch', mockFetch);

      // Act
      await client.startWorkflowSession(sessionId, workflowName, initialContext);

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/workflow/start',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            session_id: sessionId,
            workflow_name: workflowName,
            initial_context: initialContext
          })
        })
      );
    });

    it('should parse response data correctly', async () => {
      // Arrange
      const sessionId = 'test_session_123';

      // Act
      const result = await client.getWorkflowStatus(sessionId);

      // Assert
      expect(result).toHaveProperty('session_id');
      expect(result).toHaveProperty('current_stage');
      expect(result).toHaveProperty('stage_status');
      expect(result).toHaveProperty('messages');
      expect(result).toHaveProperty('stage_progress');
      expect(result).toHaveProperty('pending_decision');
      expect(result).toHaveProperty('decision_options');
    });

    it('should handle error responses and propagate errors', async () => {
      // Arrange - Mock error response
      server.use(
        rest.get('*/api/workflow/status/:sessionId', (req, res, ctx) => {
          return res(
            ctx.status(404),
            ctx.json({ detail: 'Session not found' })
          );
        })
      );

      const sessionId = 'non_existent_session';

      // Act & Assert
      await expect(client.getWorkflowStatus(sessionId)).rejects.toThrow('Session not found');
    });

    it('should handle malformed responses gracefully', async () => {
      // Arrange - Mock malformed response
      server.use(
        rest.get('*/api/workflow/status/:sessionId', (req, res, ctx) => {
          return res(
            ctx.status(200),
            ctx.body('Invalid JSON response')
          );
        })
      );

      const sessionId = 'test_session_123';

      // Act & Assert
      await expect(client.getWorkflowStatus(sessionId)).rejects.toThrow();
    });
  });

  describe('Retry Logic', () => {
    it('should implement exponential backoff retry mechanism', async () => {
      // Arrange - Mock intermittent failures
      let callCount = 0;
      server.use(
        rest.post('*/api/workflow/start', (req, res, ctx) => {
          callCount++;
          if (callCount < 3) {
            return res(ctx.status(500));
          }
          return res(ctx.json(mockWorkflowResponses.start));
        })
      );

      const sessionId = 'test_session_123';
      const workflowName = 'Test Workflow';
      const initialContext = {};

      // Act
      const result = await client.startWorkflowSession(sessionId, workflowName, initialContext);

      // Assert
      expect(result).toEqual(mockWorkflowResponses.start);
      expect(callCount).toBe(3);
    });

    it('should respect maximum retry limits', async () => {
      // Arrange - Mock persistent failures
      server.use(
        rest.post('*/api/workflow/start', (req, res, ctx) => {
          return res(ctx.status(500));
        })
      );

      const sessionId = 'test_session_123';
      const workflowName = 'Test Workflow';
      const initialContext = {};

      // Act & Assert
      await expect(client.startWorkflowSession(sessionId, workflowName, initialContext))
        .rejects.toThrow();
    });

    it('should skip retries for 4xx client errors', async () => {
      // Arrange - Mock client error
      server.use(
        rest.post('*/api/workflow/start', (req, res, ctx) => {
          return res(
            ctx.status(400),
            ctx.json({ detail: 'Bad request' })
          );
        })
      );

      const sessionId = '';
      const workflowName = 'Test Workflow';
      const initialContext = {};

      // Act & Assert
      await expect(client.startWorkflowSession(sessionId, workflowName, initialContext))
        .rejects.toThrow('Bad request');
    });

    it('should handle timeout scenarios with retry logic', async () => {
      // Arrange - Mock timeout
      server.use(
        rest.post('*/api/workflow/start', (req, res, ctx) => {
          return res(ctx.delay(15000)); // 15 second delay
        })
      );

      const sessionId = 'test_session_123';
      const workflowName = 'Test Workflow';
      const initialContext = {};

      // Act & Assert
      await expect(client.startWorkflowSession(sessionId, workflowName, initialContext))
        .rejects.toThrow();
    });
  });

  describe('Error Scenarios', () => {
    it('should handle network failures and connection errors', async () => {
      // Arrange - Mock network failure
      server.use(
        rest.post('*/api/workflow/start', (req, res, ctx) => {
          return res(ctx.error('Network error'));
        })
      );

      const sessionId = 'test_session_123';
      const workflowName = 'Test Workflow';
      const initialContext = {};

      // Act & Assert
      await expect(client.startWorkflowSession(sessionId, workflowName, initialContext))
        .rejects.toThrow();
    });

    it('should handle HTTP error status codes', async () => {
      // Arrange - Mock different HTTP errors
      const errorScenarios = [
        { status: 400, detail: 'Bad request' },
        { status: 401, detail: 'Unauthorized' },
        { status: 403, detail: 'Forbidden' },
        { status: 404, detail: 'Not found' },
        { status: 500, detail: 'Internal server error' },
        { status: 503, detail: 'Service unavailable' }
      ];

      for (const scenario of errorScenarios) {
        server.use(
          rest.post('*/api/workflow/start', (req, res, ctx) => {
            return res(
              ctx.status(scenario.status),
              ctx.json({ detail: scenario.detail })
            );
          })
        );

        const sessionId = 'test_session_123';
        const workflowName = 'Test Workflow';
        const initialContext = {};

        // Act & Assert
        await expect(client.startWorkflowSession(sessionId, workflowName, initialContext))
          .rejects.toThrow(scenario.detail);
      }
    });

    it('should handle timeout scenarios', async () => {
      // Arrange - Mock timeout
      server.use(
        rest.post('*/api/workflow/start', (req, res, ctx) => {
          return res(ctx.delay(15000)); // 15 second delay
        })
      );

      const sessionId = 'test_session_123';
      const workflowName = 'Test Workflow';
      const initialContext = {};

      // Act & Assert
      await expect(client.startWorkflowSession(sessionId, workflowName, initialContext))
        .rejects.toThrow();
    });

    it('should handle malformed response handling', async () => {
      // Arrange - Mock malformed response
      server.use(
        rest.post('*/api/workflow/start', (req, res, ctx) => {
          return res(
            ctx.status(200),
            ctx.body('Invalid JSON response')
          );
        })
      );

      const sessionId = 'test_session_123';
      const workflowName = 'Test Workflow';
      const initialContext = {};

      // Act & Assert
      await expect(client.startWorkflowSession(sessionId, workflowName, initialContext))
        .rejects.toThrow();
    });
  });

  describe('Session Management', () => {
    it('should generate and validate session IDs', async () => {
      // Arrange
      const sessionId = 'test_session_123';

      // Act
      const result = await client.getWorkflowStatus(sessionId);

      // Assert
      expect(result.session_id).toBe(sessionId);
    });

    it('should maintain session state across multiple calls', async () => {
      // Arrange
      const sessionId = 'test_session_123';

      // Act - Make multiple calls to same session
      const status1 = await client.getWorkflowStatus(sessionId);
      const nextMessage = await client.getNextMessage(sessionId);
      const status2 = await client.getWorkflowStatus(sessionId);

      // Assert
      expect(status1.session_id).toBe(sessionId);
      expect(nextMessage.session_id).toBe(sessionId);
      expect(status2.session_id).toBe(sessionId);
      expect(nextMessage.messages.length).toBeGreaterThan(status1.messages.length);
    });

    it('should handle session isolation between different sessions', async () => {
      // Arrange
      const session1Id = 'session_1';
      const session2Id = 'session_2';

      // Act - Start both sessions
      const session1 = await client.startWorkflowSession(session1Id, 'Workflow 1', {});
      const session2 = await client.startWorkflowSession(session2Id, 'Workflow 2', {});

      // Assert - Sessions should be independent
      expect(session1.session_id).toBe(session1Id);
      expect(session2.session_id).toBe(session2Id);
      expect(session1).not.toEqual(session2);
    });

    it('should handle session cleanup and error scenarios', async () => {
      // Arrange - Mock session not found
      server.use(
        rest.get('*/api/workflow/status/:sessionId', (req, res, ctx) => {
          return res(
            ctx.status(404),
            ctx.json({ detail: 'Session not found' })
          );
        })
      );

      const sessionId = 'expired_session';

      // Act & Assert
      await expect(client.getWorkflowStatus(sessionId)).rejects.toThrow('Session not found');
    });
  });

  describe('Type Safety', () => {
    it('should validate TypeScript interfaces and types', async () => {
      // Arrange
      const sessionId = 'test_session_123';

      // Act
      const result = await client.getWorkflowStatus(sessionId);

      // Assert - Type checking should pass
      expect(typeof result.session_id).toBe('string');
      expect(typeof result.current_stage).toBe('string');
      expect(typeof result.stage_status).toBe('string');
      expect(Array.isArray(result.messages)).toBe(true);
      expect(typeof result.stage_progress).toBe('object');
      expect(typeof result.pending_decision).toBe('boolean');
      expect(Array.isArray(result.decision_options)).toBe(true);
    });

    it('should handle optional parameters correctly', async () => {
      // Arrange
      const sessionId = 'test_session_123';
      const workflowName = 'Test Workflow';

      // Act - Call without optional initialContext
      const result = await client.startWorkflowSession(sessionId, workflowName);

      // Assert
      expect(result.session_id).toBe(sessionId);
      expect(result.workflow_name).toBe(workflowName);
    });

    it('should validate request/response type compatibility', async () => {
      // Arrange
      const sessionId = 'test_session_123';
      const decision = 'APPROVE';
      const feedback = 'Test feedback';

      // Act
      const result = await client.sendDecision(sessionId, decision, feedback);

      // Assert - Response should match expected structure
      expect(result).toHaveProperty('session_id');
      expect(result).toHaveProperty('current_stage');
      expect(result).toHaveProperty('stage_status');
      expect(result).toHaveProperty('messages');
      expect(result).toHaveProperty('stage_progress');
      expect(result).toHaveProperty('pending_decision');
      expect(result).toHaveProperty('decision_options');
    });

    it('should handle enum values for decision types', async () => {
      // Arrange
      const sessionId = 'test_session_123';
      const validDecisions = ['APPROVE', 'REFINE', 'REJECT', 'PAUSE'];

      // Act & Assert - Test all valid decision types
      for (const decision of validDecisions) {
        const result = await client.sendDecision(sessionId, decision, 'Test feedback');
        expect(result).toBeDefined();
        expect(result.session_id).toBe(sessionId);
      }
    });
  });

  describe('Abort Controller Integration', () => {
    it('should use abort controller for request cancellation', async () => {
      // Arrange
      const sessionId = 'test_session_123';
      const abortController = new AbortController();

      // Act
      const promise = client.getWorkflowStatus(sessionId, abortController.signal);
      
      // Cancel request
      abortController.abort();

      // Assert
      await expect(promise).rejects.toThrow();
    });

    it('should handle timeout with abort controller', async () => {
      // Arrange
      const sessionId = 'test_session_123';
      const abortController = new AbortController();

      // Mock timeout
      server.use(
        rest.get('*/api/workflow/status/:sessionId', (req, res, ctx) => {
          return res(ctx.delay(15000)); // 15 second delay
        })
      );

      // Act
      const promise = client.getWorkflowStatus(sessionId, abortController.signal);
      
      // Cancel after 1 second
      setTimeout(() => abortController.abort(), 1000);

      // Assert
      await expect(promise).rejects.toThrow();
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle concurrent requests efficiently', async () => {
      // Arrange
      const sessionId = 'test_session_123';
      const requestCount = 5;

      // Act - Make concurrent requests
      const startTime = Date.now();
      const promises = Array(requestCount).fill(0).map(() => 
        client.getWorkflowStatus(sessionId)
      );
      
      const results = await Promise.all(promises);
      const endTime = Date.now();

      // Assert
      expect(results).toHaveLength(requestCount);
      results.forEach(result => {
        expect(result.session_id).toBe(sessionId);
      });
      
      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(10000); // 10 seconds
    });

    it('should maintain consistent response times', async () => {
      // Arrange
      const sessionId = 'test_session_123';
      const responseTimes: number[] = [];

      // Act - Measure response times
      for (let i = 0; i < 3; i++) {
        const startTime = Date.now();
        await client.getWorkflowStatus(sessionId);
        const endTime = Date.now();
        responseTimes.push(endTime - startTime);
      }

      // Assert - Response times should be consistent
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      const minResponseTime = Math.min(...responseTimes);
      
      // Variance should be reasonable
      expect(maxResponseTime / minResponseTime).toBeLessThan(3);
      expect(avgResponseTime).toBeLessThan(5000); // Average under 5 seconds
    });
  });
});
