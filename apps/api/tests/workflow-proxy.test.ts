import request from 'supertest';
import { Express } from 'express';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { createServer } from '../src/server';

describe('Workflow Proxy API Tests', () => {
  let app: Express;
  let server: any;

  // Mock workflow service responses
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

  beforeAll(async () => {
    // Setup MSW server
    server = setupServer(
      // Mock workflow start endpoint
      rest.post('*/api/workflow/start', (req, res, ctx) => {
        return res(ctx.json(mockWorkflowResponses.start));
      }),
      
      // Mock workflow next endpoint
      rest.post('*/api/workflow/next', (req, res, ctx) => {
        return res(ctx.json(mockWorkflowResponses.next));
      }),
      
      // Mock workflow decision endpoint
      rest.post('*/api/workflow/decision', (req, res, ctx) => {
        return res(ctx.json(mockWorkflowResponses.decision));
      }),
      
      // Mock workflow status endpoint
      rest.get('*/api/workflow/status/:sessionId', (req, res, ctx) => {
        return res(ctx.json(mockWorkflowResponses.status));
      }),
      
      // Mock workflow continue endpoint
      rest.post('*/api/workflow/continue', (req, res, ctx) => {
        return res(ctx.json(mockWorkflowResponses.start));
      })
    );

    server.listen({ onUnhandledRequest: 'error' });

    // Create Express app
    app = await createServer();
  });

  afterAll(async () => {
    server.close();
  });

  beforeEach(() => {
    // Reset MSW handlers before each test
    server.resetHandlers();
  });

  describe('Proxy Forwarding', () => {
    it('should forward POST /chat/crew/start to workflow service correctly', async () => {
      // Arrange
      const payload = {
        session_id: 'test_session_123',
        workflow_name: 'test_workflow',
        initial_context: { domain: 'test', complexity: 'medium' }
      };

      // Act
      const response = await request(app)
        .post('/chat/crew/start')
        .send(payload)
        .expect(200);

      // Assert
      expect(response.body).toMatchObject({
        session_id: 'test_session_123',
        current_stage: 'PROBLEM_CAPTURE',
        stage_status: 'IN_PROGRESS'
      });
      expect(response.body.messages).toHaveLength(1);
      expect(response.body.messages[0].content).toContain('Welcome to the workflow');
    });

    it('should forward POST /chat/crew/next request/response correctly', async () => {
      // Arrange
      const payload = { session_id: 'test_session_123' };

      // Act
      const response = await request(app)
        .post('/chat/crew/next')
        .send(payload)
        .expect(200);

      // Assert
      expect(response.body).toMatchObject({
        session_id: 'test_session_123',
        current_stage: 'PROBLEM_CAPTURE'
      });
      expect(response.body.messages).toHaveLength(2);
      expect(response.body.messages[1].agent_id).toBe('business_analyst');
    });

    it('should forward POST /chat/crew/decision for decision processing', async () => {
      // Arrange
      const payload = {
        session_id: 'test_session_123',
        decision: 'APPROVE',
        feedback: 'Approved for next stage'
      };

      // Act
      const response = await request(app)
        .post('/chat/crew/decision')
        .send(payload)
        .expect(200);

      // Assert
      expect(response.body).toMatchObject({
        session_id: 'test_session_123',
        current_stage: 'PROBLEM_CLARIFICATION'
      });
      expect(response.body.stage_progress.PROBLEM_CAPTURE.status).toBe('COMPLETED');
    });

    it('should forward GET /chat/crew/status/:sessionId for status retrieval', async () => {
      // Arrange
      const sessionId = 'test_session_123';

      // Act
      const response = await request(app)
        .get(`/chat/crew/status/${sessionId}`)
        .expect(200);

      // Assert
      expect(response.body).toMatchObject({
        session_id: 'test_session_123',
        current_stage: 'PROBLEM_CAPTURE',
        stage_status: 'IN_PROGRESS'
      });
    });

    it('should forward POST /chat/crew/continue for session continuation', async () => {
      // Arrange
      const payload = { session_id: 'test_session_123' };

      // Act
      const response = await request(app)
        .post('/chat/crew/continue')
        .send(payload)
        .expect(200);

      // Assert
      expect(response.body).toMatchObject({
        session_id: 'test_session_123',
        current_stage: 'PROBLEM_CAPTURE'
      });
    });
  });

  describe('Request/Response Transformation', () => {
    it('should preserve all request body fields when forwarding', async () => {
      // Arrange
      const complexPayload = {
        session_id: 'test_session_123',
        workflow_name: 'complex_workflow',
        initial_context: {
          domain: 'healthcare',
          complexity: 'high',
          stakeholders: ['doctors', 'nurses', 'patients'],
          constraints: {
            budget: 1000000,
            timeline: '6 months',
            compliance: ['HIPAA', 'FDA']
          }
        }
      };

      // Act
      const response = await request(app)
        .post('/chat/crew/start')
        .send(complexPayload)
        .expect(200);

      // Assert
      expect(response.body).toMatchObject({
        session_id: 'test_session_123',
        current_stage: 'PROBLEM_CAPTURE'
      });
    });

    it('should transform response format from workflow service to frontend', async () => {
      // Arrange
      const payload = { session_id: 'test_session_123' };

      // Act
      const response = await request(app)
        .post('/chat/crew/next')
        .send(payload)
        .expect(200);

      // Assert
      const data = response.body;
      
      // Verify response structure matches expected format
      expect(data).toHaveProperty('session_id');
      expect(data).toHaveProperty('current_stage');
      expect(data).toHaveProperty('stage_status');
      expect(data).toHaveProperty('messages');
      expect(data).toHaveProperty('stage_progress');
      expect(data).toHaveProperty('pending_decision');
      expect(data).toHaveProperty('decision_options');
      expect(data).toHaveProperty('created_at');
      expect(data).toHaveProperty('updated_at');
    });

    it('should handle header forwarding and content-type correctly', async () => {
      // Arrange
      const payload = { session_id: 'test_session_123' };

      // Act
      const response = await request(app)
        .post('/chat/crew/next')
        .set('Content-Type', 'application/json')
        .set('Authorization', 'Bearer test-token')
        .send(payload)
        .expect(200);

      // Assert
      expect(response.headers['content-type']).toContain('application/json');
    });

    it('should format error responses and status code mapping correctly', async () => {
      // Arrange - Mock error response
      server.use(
        rest.post('*/api/workflow/next', (req, res, ctx) => {
          return res(
            ctx.status(404),
            ctx.json({ detail: 'Session not found' })
          );
        })
      );

      const payload = { session_id: 'non_existent_session' };

      // Act
      const response = await request(app)
        .post('/chat/crew/next')
        .send(payload)
        .expect(404);

      // Assert
      expect(response.body).toHaveProperty('detail');
      expect(response.body.detail).toBe('Session not found');
    });
  });

  describe('Error Handling', () => {
    it('should handle workflow service unavailable (500 responses)', async () => {
      // Arrange - Mock service unavailable
      server.use(
        rest.post('*/api/workflow/start', (req, res, ctx) => {
          return res(
            ctx.status(500),
            ctx.json({ detail: 'Internal server error' })
          );
        })
      );

      const payload = {
        session_id: 'test_session_123',
        workflow_name: 'test_workflow',
        initial_context: {}
      };

      // Act
      const response = await request(app)
        .post('/chat/crew/start')
        .send(payload)
        .expect(500);

      // Assert
      expect(response.body).toHaveProperty('detail');
      expect(response.body.detail).toBe('Internal server error');
    });

    it('should handle invalid request payloads (400 responses)', async () => {
      // Arrange - Mock bad request
      server.use(
        rest.post('*/api/workflow/start', (req, res, ctx) => {
          return res(
            ctx.status(400),
            ctx.json({ detail: 'Bad request' })
          );
        })
      );

      const payload = { invalid_field: 'invalid_value' };

      // Act
      const response = await request(app)
        .post('/chat/crew/start')
        .send(payload)
        .expect(400);

      // Assert
      expect(response.body).toHaveProperty('detail');
      expect(response.body.detail).toBe('Bad request');
    });

    it('should handle session not found scenarios (404 responses)', async () => {
      // Arrange - Mock session not found
      server.use(
        rest.get('*/api/workflow/status/:sessionId', (req, res, ctx) => {
          return res(
            ctx.status(404),
            ctx.json({ detail: 'Session not found' })
          );
        })
      );

      // Act
      const response = await request(app)
        .get('/chat/crew/status/non_existent_session')
        .expect(404);

      // Assert
      expect(response.body).toHaveProperty('detail');
      expect(response.body.detail).toBe('Session not found');
    });

    it('should handle network timeouts and connection failures', async () => {
      // Arrange - Mock timeout
      server.use(
        rest.post('*/api/workflow/start', (req, res, ctx) => {
          return res(ctx.delay(5000)); // 5 second delay
        })
      );

      const payload = {
        session_id: 'test_session_123',
        workflow_name: 'test_workflow',
        initial_context: {}
      };

      // Act & Assert - Should timeout
      await request(app)
        .post('/chat/crew/start')
        .send(payload)
        .timeout(1000) // 1 second timeout
        .expect(500); // Should fail due to timeout
    });

    it('should handle malformed responses from workflow service', async () => {
      // Arrange - Mock malformed response
      server.use(
        rest.post('*/api/workflow/start', (req, res, ctx) => {
          return res(
            ctx.status(200),
            ctx.body('Invalid JSON response')
          );
        })
      );

      const payload = {
        session_id: 'test_session_123',
        workflow_name: 'test_workflow',
        initial_context: {}
      };

      // Act & Assert
      await request(app)
        .post('/chat/crew/start')
        .send(payload)
        .expect(500); // Should fail due to malformed response
    });
  });

  describe('Environment Configuration', () => {
    it('should use WORKFLOW_SERVICE_URL environment variable', async () => {
      // Arrange
      const originalUrl = process.env.WORKFLOW_SERVICE_URL;
      process.env.WORKFLOW_SERVICE_URL = 'http://custom-workflow-service:8000';

      // Mock custom service URL
      server.use(
        rest.post('http://custom-workflow-service:8000/api/workflow/start', (req, res, ctx) => {
          return res(ctx.json(mockWorkflowResponses.start));
        })
      );

      const payload = {
        session_id: 'test_session_123',
        workflow_name: 'test_workflow',
        initial_context: {}
      };

      // Act
      const response = await request(app)
        .post('/chat/crew/start')
        .send(payload)
        .expect(200);

      // Assert
      expect(response.body.session_id).toBe('test_session_123');

      // Cleanup
      if (originalUrl) {
        process.env.WORKFLOW_SERVICE_URL = originalUrl;
      } else {
        delete process.env.WORKFLOW_SERVICE_URL;
      }
    });

    it('should handle fallback behavior when service URL is not configured', async () => {
      // Arrange
      const originalUrl = process.env.WORKFLOW_SERVICE_URL;
      delete process.env.WORKFLOW_SERVICE_URL;

      // Mock fallback URL (usually localhost:8000 or similar)
      server.use(
        rest.post('http://localhost:8000/api/workflow/start', (req, res, ctx) => {
          return res(ctx.json(mockWorkflowResponses.start));
        })
      );

      const payload = {
        session_id: 'test_session_123',
        workflow_name: 'test_workflow',
        initial_context: {}
      };

      // Act & Assert - Should use fallback URL
      const response = await request(app)
        .post('/chat/crew/start')
        .send(payload)
        .expect(200);

      expect(response.body).toHaveProperty('session_id');
      expect(response.body.session_id).toBe('test_session_123');

      // Cleanup
      if (originalUrl) {
        process.env.WORKFLOW_SERVICE_URL = originalUrl;
      }
    });

    it('should construct proper URLs for different endpoints', async () => {
      // Arrange
      const originalUrl = process.env.WORKFLOW_SERVICE_URL;
      process.env.WORKFLOW_SERVICE_URL = 'http://workflow-service:8000';

      // Mock all endpoints
      server.use(
        rest.post('http://workflow-service:8000/api/workflow/start', (req, res, ctx) => {
          return res(ctx.json(mockWorkflowResponses.start));
        }),
        rest.post('http://workflow-service:8000/api/workflow/next', (req, res, ctx) => {
          return res(ctx.json(mockWorkflowResponses.next));
        }),
        rest.post('http://workflow-service:8000/api/workflow/decision', (req, res, ctx) => {
          return res(ctx.json(mockWorkflowResponses.decision));
        }),
        rest.get('http://workflow-service:8000/api/workflow/status/:sessionId', (req, res, ctx) => {
          return res(ctx.json(mockWorkflowResponses.status));
        })
      );

      // Act & Assert - Test all endpoints
      const endpoints = [
        { method: 'POST', path: '/chat/crew/start', payload: { session_id: 'test_123', workflow_name: 'test', initial_context: {} } },
        { method: 'POST', path: '/chat/crew/next', payload: { session_id: 'test_123' } },
        { method: 'POST', path: '/chat/crew/decision', payload: { session_id: 'test_123', decision: 'APPROVE', feedback: 'test' } },
        { method: 'GET', path: '/chat/crew/status/test_123' }
      ];

      for (const endpoint of endpoints) {
        let response;
        if (endpoint.method === 'POST') {
          response = await request(app)
            .post(endpoint.path)
            .send(endpoint.payload)
            .expect(200);
        } else {
          response = await request(app)
            .get(endpoint.path)
            .expect(200);
        }
        
        expect(response.body).toHaveProperty('session_id');
      }

      // Cleanup
      if (originalUrl) {
        process.env.WORKFLOW_SERVICE_URL = originalUrl;
      } else {
        delete process.env.WORKFLOW_SERVICE_URL;
      }
    });
  });

  describe('Legacy Compatibility', () => {
    it('should maintain legacy /api/crew/* endpoints', async () => {
      // Arrange
      const payload = {
        session_id: 'test_session_123',
        workflow_name: 'test_workflow',
        initial_context: {}
      };

      // Act - Test legacy endpoint
      const response = await request(app)
        .post('/api/crew/start')
        .send(payload)
        .expect(200);

      // Assert
      expect(response.body).toMatchObject({
        session_id: 'test_session_123',
        current_stage: 'PROBLEM_CAPTURE'
      });
    });

    it('should verify response format compatibility with existing frontend code', async () => {
      // Arrange
      const payload = { session_id: 'test_session_123' };

      // Act
      const response = await request(app)
        .post('/api/crew/next')
        .send(payload)
        .expect(200);

      // Assert - Verify response structure matches expected format
      const data = response.body;
      
      // Required fields for frontend compatibility
      expect(data).toHaveProperty('session_id');
      expect(data).toHaveProperty('current_stage');
      expect(data).toHaveProperty('stage_status');
      expect(data).toHaveProperty('messages');
      expect(data).toHaveProperty('stage_progress');
      expect(data).toHaveProperty('pending_decision');
      expect(data).toHaveProperty('decision_options');
      
      // Verify message structure
      if (data.messages && data.messages.length > 0) {
        const message = data.messages[0];
        expect(message).toHaveProperty('id');
        expect(message).toHaveProperty('content');
        expect(message).toHaveProperty('agent_id');
        expect(message).toHaveProperty('agent_name');
        expect(message).toHaveProperty('agent_title');
        expect(message).toHaveProperty('timestamp');
        expect(message).toHaveProperty('stage');
      }
    });

    it('should test migration path from old to new endpoints', async () => {
      // Arrange
      const payload = {
        session_id: 'test_session_123',
        workflow_name: 'test_workflow',
        initial_context: {}
      };

      // Act - Test both old and new endpoints
      const legacyResponse = await request(app)
        .post('/api/crew/start')
        .send(payload)
        .expect(200);

      const newResponse = await request(app)
        .post('/chat/crew/start')
        .send(payload)
        .expect(200);

      // Assert - Both should return identical responses
      expect(legacyResponse.body).toEqual(newResponse.body);
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle multiple concurrent requests to the same session', async () => {
      // Arrange
      const sessionId = 'concurrent_session_123';
      const payload = { session_id: sessionId };

      // Act - Make concurrent requests
      const promises = [
        request(app).post('/chat/crew/next').send(payload),
        request(app).post('/chat/crew/next').send(payload),
        request(app).post('/chat/crew/next').send(payload),
        request(app).get(`/chat/crew/status/${sessionId}`),
        request(app).get(`/chat/crew/status/${sessionId}`)
      ];

      const responses = await Promise.all(promises);

      // Assert - All requests should succeed
      for (const response of responses) {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('session_id');
      }
    });

    it('should maintain session isolation between different sessions', async () => {
      // Arrange
      const session1Payload = { session_id: 'session_1' };
      const session2Payload = { session_id: 'session_2' };

      // Act - Make requests to different sessions
      const [response1, response2] = await Promise.all([
        request(app).post('/chat/crew/next').send(session1Payload),
        request(app).post('/chat/crew/next').send(session2Payload)
      ]);

      // Assert - Both should succeed independently
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(response1.body.session_id).toBe('session_1');
      expect(response2.body.session_id).toBe('session_2');
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle large payloads efficiently', async () => {
      // Arrange
      const largePayload = {
        session_id: 'large_session_123',
        workflow_name: 'large_workflow',
        initial_context: {
          large_data: 'x'.repeat(10000), // 10KB of data
          nested_object: {
            level1: { level2: { level3: { data: 'x'.repeat(5000) } } }
          }
        }
      };

      // Act
      const startTime = Date.now();
      const response = await request(app)
        .post('/chat/crew/start')
        .send(largePayload)
        .expect(200);
      const endTime = Date.now();

      // Assert
      expect(response.body.session_id).toBe('large_session_123');
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should maintain consistent response times under load', async () => {
      // Arrange
      const payload = { session_id: 'load_test_session' };
      const requestCount = 10;
      const responseTimes: number[] = [];

      // Act - Make multiple requests and measure response times
      for (let i = 0; i < requestCount; i++) {
        const startTime = Date.now();
        await request(app)
          .post('/chat/crew/next')
          .send(payload)
          .expect(200);
        const endTime = Date.now();
        responseTimes.push(endTime - startTime);
      }

      // Assert - Response times should be consistent
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      const minResponseTime = Math.min(...responseTimes);
      
      // Variance should be reasonable (max should not be more than 3x min)
      expect(maxResponseTime / minResponseTime).toBeLessThan(3);
      expect(avgResponseTime).toBeLessThan(2000); // Average should be under 2 seconds
    });
  });
});
