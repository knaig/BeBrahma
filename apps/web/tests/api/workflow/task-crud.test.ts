import { describe, it, expect, beforeEach } from '@jest/globals';
import { server, mockBackendResponse, simulateTimeout, simulateNetworkError, createMockSession, updateMockSession, getMockSession } from '../setup';
import { NextRequest } from 'next/server';
import { GET, PATCH } from '../../../app/api/workflow/task/[id]/route';

describe('API: /api/workflow/task/[id]', () => {
  beforeEach(() => {
    server.resetHandlers();
  });

  describe('GET Method Tests', () => {
    it('should handle valid GET request with task ID', async () => {
      const taskId = 'task-123';
      const mockTask = {
        id: taskId,
        title: 'Implement authentication',
        description: 'Create secure login system',
        status: 'pending',
        priority: 'high',
        assignee: 'john.doe@example.com',
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
        metadata: {
          estimatedHours: 8,
          tags: ['backend', 'security']
        }
      };

      server.use(
        mockBackendResponse(`*/api/workflow/task/${taskId}`, mockTask, 200)
      );

      const request = new NextRequest(`http://localhost:3000/api/workflow/task/${taskId}`, {
        method: 'GET'
      });

      const response = await GET(request, { params: { id: taskId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe(taskId);
      expect(data.title).toBe(mockTask.title);
      expect(data.description).toBe(mockTask.description);
      expect(data.status).toBe(mockTask.status);
      expect(data.metadata).toEqual(mockTask.metadata);
    });

    it('should handle invalid task ID', async () => {
      const invalidIds = ['', 'undefined', 'null', null, undefined];

      for (const invalidId of invalidIds) {
        const request = new NextRequest(`http://localhost:3000/api/workflow/task/${invalidId}`, {
          method: 'GET'
        });

        const response = await GET(request, { params: { id: invalidId as string } });
        expect(response.status).toBe(400);
      }
    });

    it('should handle non-existent task', async () => {
      const taskId = 'non-existent-task';

      server.use(
        mockBackendResponse(`*/api/workflow/task/${taskId}`, { error: 'Task not found' }, 404)
      );

      const request = new NextRequest(`http://localhost:3000/api/workflow/task/${taskId}`, {
        method: 'GET'
      });

      const response = await GET(request, { params: { id: taskId } });
      expect(response.status).toBe(404);
    });

    it('should handle backend service unavailable', async () => {
      const taskId = 'task-unavailable';

      server.use(
        simulateNetworkError(`*/api/workflow/task/${taskId}`, 'SERVER_ERROR')
      );

      const request = new NextRequest(`http://localhost:3000/api/workflow/task/${taskId}`, {
        method: 'GET'
      });

      const response = await GET(request, { params: { id: taskId } });
      expect(response.status).toBe(500);
    });
  });

  describe('PATCH Method Tests', () => {
    it('should handle valid PATCH request with task updates', async () => {
      const taskId = 'task-patch-123';
      const updateData = {
        status: 'in-progress',
        description: 'Updated description with more details',
        priority: 'medium',
        assignee: 'jane.doe@example.com',
        metadata: {
          estimatedHours: 10,
          tags: ['backend', 'security', 'testing'],
          notes: 'Added testing requirements'
        }
      };

      const updatedTask = {
        id: taskId,
        title: 'Original title',
        ...updateData,
        updatedAt: new Date().toISOString()
      };

      server.use(
        mockBackendResponse(`*/api/workflow/task/${taskId}`, updatedTask, 200)
      );

      const request = new NextRequest(`http://localhost:3000/api/workflow/task/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      const response = await PATCH(request, { params: { id: taskId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe(taskId);
      expect(data.status).toBe(updateData.status);
      expect(data.description).toBe(updateData.description);
      expect(data.priority).toBe(updateData.priority);
      expect(data.assignee).toBe(updateData.assignee);
      expect(data.metadata).toEqual(updateData.metadata);
      expect(data.updatedAt).toBeDefined();
    });

    it('should handle partial updates', async () => {
      const taskId = 'task-partial-123';
      const partialUpdate = {
        status: 'completed'
      };

      const existingTask = {
        id: taskId,
        title: 'Existing task',
        description: 'Existing description',
        status: 'pending',
        priority: 'high',
        createdAt: '2024-01-15T10:00:00Z'
      };

      const updatedTask = {
        ...existingTask,
        ...partialUpdate,
        updatedAt: new Date().toISOString()
      };

      server.use(
        mockBackendResponse(`*/api/workflow/task/${taskId}`, updatedTask, 200)
      );

      const request = new NextRequest(`http://localhost:3000/api/workflow/task/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partialUpdate)
      });

      const response = await PATCH(request, { params: { id: taskId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('completed');
      expect(data.title).toBe(existingTask.title); // Should remain unchanged
      expect(data.description).toBe(existingTask.description); // Should remain unchanged
    });

    it('should handle invalid update payloads', async () => {
      const taskId = 'task-invalid-payload';

      const invalidPayloads = [
        'invalid-json',
        null,
        { invalidField: 'value' }, // Assuming certain fields are not allowed
      ];

      for (const payload of invalidPayloads) {
        const request = new NextRequest(`http://localhost:3000/api/workflow/task/${taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: typeof payload === 'string' ? payload : JSON.stringify(payload)
        });

        const response = await PATCH(request, { params: { id: taskId } });
        expect([400, 422]).toContain(response.status);
      }
    });

    it('should handle backend update failures', async () => {
      const taskId = 'task-update-fail';
      const updateData = {
        status: 'completed'
      };

      server.use(
        mockBackendResponse(`*/api/workflow/task/${taskId}`, { error: 'Update failed' }, 500)
      );

      const request = new NextRequest(`http://localhost:3000/api/workflow/task/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      const response = await PATCH(request, { params: { id: taskId } });
      expect(response.status).toBe(500);
    });
  });

  describe('Data Persistence Testing', () => {
    it('should maintain data consistency across GET and PATCH operations', async () => {
      const taskId = 'task-consistency-123';
      const sessionId = 'session-consistency-test';

      // Create initial task in session
      const initialTask = {
        id: taskId,
        title: 'Initial task',
        description: 'Initial description',
        status: 'pending',
        priority: 'medium',
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z'
      };

      createMockSession(sessionId, { tasks: { [taskId]: initialTask } });

      // Mock backend to use session data
      let currentTask = initialTask;
      server.use(
        mockBackendResponse(`*/api/workflow/task/${taskId}`, () => currentTask, 200)
      );

      // Initial GET request
      const getRequest1 = new NextRequest(`http://localhost:3000/api/workflow/task/${taskId}`, {
        method: 'GET'
      });

      const getResponse1 = await GET(getRequest1, { params: { id: taskId } });
      const initialData = await getResponse1.json();

      expect(initialData.status).toBe('pending');
      expect(initialData.priority).toBe('medium');

      // Update task via PATCH
      const updateData = {
        status: 'in-progress',
        priority: 'high',
        description: 'Updated description'
      };

      // Update mock data
      currentTask = { ...currentTask, ...updateData, updatedAt: new Date().toISOString() };

      const patchRequest = new NextRequest(`http://localhost:3000/api/workflow/task/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      const patchResponse = await PATCH(patchRequest, { params: { id: taskId } });
      const patchData = await patchResponse.json();

      expect(patchResponse.status).toBe(200);
      expect(patchData.status).toBe('in-progress');
      expect(patchData.priority).toBe('high');

      // Verify changes with another GET request
      const getRequest2 = new NextRequest(`http://localhost:3000/api/workflow/task/${taskId}`, {
        method: 'GET'
      });

      const getResponse2 = await GET(getRequest2, { params: { id: taskId } });
      const updatedData = await getResponse2.json();

      expect(updatedData.status).toBe('in-progress');
      expect(updatedData.priority).toBe('high');
      expect(updatedData.description).toBe('Updated description');
      expect(updatedData.title).toBe(initialTask.title); // Should remain unchanged
    });

    it('should handle multiple sequential updates', async () => {
      const taskId = 'task-sequential-123';
      let taskData = {
        id: taskId,
        title: 'Sequential test task',
        status: 'pending',
        priority: 'low',
        updatedAt: '2024-01-15T10:00:00Z'
      };

      // Mock backend to track sequential updates
      server.use(
        mockBackendResponse(`*/api/workflow/task/${taskId}`, (req) => {
          if (req.method === 'PATCH') {
            const updates = req.body ? JSON.parse(req.body) : {};
            taskData = { ...taskData, ...updates, updatedAt: new Date().toISOString() };
          }
          return taskData;
        }, 200)
      );

      const updates = [
        { status: 'in-progress' },
        { priority: 'medium' },
        { status: 'review' },
        { priority: 'high' },
        { status: 'completed' }
      ];

      for (const update of updates) {
        const patchRequest = new NextRequest(`http://localhost:3000/api/workflow/task/${taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(update)
        });

        const patchResponse = await PATCH(patchRequest, { params: { id: taskId } });
        const patchData = await patchResponse.json();

        expect(patchResponse.status).toBe(200);
        Object.keys(update).forEach(key => {
          expect(patchData[key]).toBe(update[key as keyof typeof update]);
        });
      }

      // Final verification
      const finalGetRequest = new NextRequest(`http://localhost:3000/api/workflow/task/${taskId}`, {
        method: 'GET'
      });

      const finalGetResponse = await GET(finalGetRequest, { params: { id: taskId } });
      const finalData = await finalGetResponse.json();

      expect(finalData.status).toBe('completed');
      expect(finalData.priority).toBe('high');
    });
  });

  describe('Backend Integration', () => {
    it('should forward requests with proper headers and format', async () => {
      const taskId = 'task-integration-123';
      let capturedHeaders: any = {};
      let capturedMethod: string = '';
      let capturedBody: any = null;

      server.use(
        mockBackendResponse(`*/api/workflow/task/${taskId}`, (req) => {
          capturedMethod = req.method;
          capturedHeaders = Object.fromEntries(req.headers.entries());
          capturedBody = req.body ? JSON.parse(req.body) : null;
          
          return {
            id: taskId,
            method: capturedMethod,
            receivedHeaders: capturedHeaders,
            receivedBody: capturedBody
          };
        }, 200)
      );

      // Test GET request
      const getRequest = new NextRequest(`http://localhost:3000/api/workflow/task/${taskId}`, {
        method: 'GET',
        headers: { 'X-Custom-Header': 'test-value' }
      });

      await GET(getRequest, { params: { id: taskId } });
      expect(capturedMethod).toBe('GET');

      // Test PATCH request
      const updateData = { status: 'updated' };
      const patchRequest = new NextRequest(`http://localhost:3000/api/workflow/task/${taskId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'X-Custom-Header': 'test-value'
        },
        body: JSON.stringify(updateData)
      });

      await PATCH(patchRequest, { params: { id: taskId } });
      expect(capturedMethod).toBe('PATCH');
      expect(capturedBody).toEqual(updateData);
    });

    it('should handle different task states and transitions', async () => {
      const taskId = 'task-states-123';
      const stateTransitions = [
        { from: 'pending', to: 'in-progress', valid: true },
        { from: 'in-progress', to: 'review', valid: true },
        { from: 'review', to: 'completed', valid: true },
        { from: 'completed', to: 'pending', valid: false }, // Invalid transition
        { from: 'review', to: 'in-progress', valid: true }, // Valid rollback
      ];

      for (const transition of stateTransitions) {
        let taskData = {
          id: taskId,
          status: transition.from,
          title: 'State transition test'
        };

        server.use(
          mockBackendResponse(`*/api/workflow/task/${taskId}`, (req) => {
            if (req.method === 'PATCH') {
              const updates = JSON.parse(req.body);
              if (transition.valid) {
                taskData = { ...taskData, ...updates };
                return taskData;
              } else {
                return { error: 'Invalid state transition' };
              }
            }
            return taskData;
          }, transition.valid ? 200 : 422)
        );

        const updateData = { status: transition.to };
        const patchRequest = new NextRequest(`http://localhost:3000/api/workflow/task/${taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
        });

        const response = await PATCH(patchRequest, { params: { id: taskId } });
        
        if (transition.valid) {
          expect(response.status).toBe(200);
          const data = await response.json();
          expect(data.status).toBe(transition.to);
        } else {
          expect(response.status).toBe(422);
        }
      }
    });
  });

  describe('Error Scenarios', () => {
    it('should handle concurrent update scenarios', async () => {
      const taskId = 'task-concurrent-123';
      let updateCount = 0;

      server.use(
        mockBackendResponse(`*/api/workflow/task/${taskId}`, (req) => {
          if (req.method === 'PATCH') {
            updateCount++;
            if (updateCount > 1) {
              return { error: 'Concurrent modification detected' };
            }
            const updates = JSON.parse(req.body);
            return { id: taskId, ...updates, version: updateCount };
          }
          return { id: taskId, status: 'pending', version: 0 };
        }, (req) => req.method === 'PATCH' && updateCount > 1 ? 409 : 200)
      );

      // Simulate concurrent PATCH requests
      const update1 = { status: 'in-progress' };
      const update2 = { priority: 'high' };

      const request1 = new NextRequest(`http://localhost:3000/api/workflow/task/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update1)
      });

      const request2 = new NextRequest(`http://localhost:3000/api/workflow/task/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update2)
      });

      const [response1, response2] = await Promise.all([
        PATCH(request1, { params: { id: taskId } }),
        PATCH(request2, { params: { id: taskId } })
      ]);

      // One should succeed, one should fail with conflict
      const statuses = [response1.status, response2.status];
      expect(statuses).toContain(200);
      expect(statuses).toContain(409);
    });

    it('should handle network timeouts', async () => {
      const taskId = 'task-timeout-123';

      server.use(
        simulateTimeout(`*/api/workflow/task/${taskId}`, 11000)
      );

      const request = new NextRequest(`http://localhost:3000/api/workflow/task/${taskId}`, {
        method: 'GET'
      });

      const responsePromise = GET(request, { params: { id: taskId } });
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Test timeout')), 12000)
      );

      await expect(Promise.race([responsePromise, timeoutPromise])).rejects.toThrow();
    }, 15000);
  });

  describe('Session Management', () => {
    it('should handle task operations within workflow sessions', async () => {
      const sessionId = 'workflow-session-123';
      const taskId = 'session-task-123';

      // Create workflow session with initial task
      const sessionData = {
        id: sessionId,
        status: 'active',
        tasks: {
          [taskId]: {
            id: taskId,
            title: 'Session task',
            status: 'pending',
            sessionId
          }
        }
      };

      createMockSession(sessionId, sessionData);

      // Mock backend to simulate session-aware operations
      server.use(
        mockBackendResponse(`*/api/workflow/task/${taskId}`, (req) => {
          const session = getMockSession(sessionId);
          if (!session || !session.tasks[taskId]) {
            return { error: 'Task not found in session' };
          }

          if (req.method === 'PATCH') {
            const updates = JSON.parse(req.body);
            const updatedTask = { ...session.tasks[taskId], ...updates };
            updateMockSession(sessionId, {
              tasks: { ...session.tasks, [taskId]: updatedTask }
            });
            return updatedTask;
          }

          return session.tasks[taskId];
        }, 200)
      );

      // Test GET within session
      const getRequest = new NextRequest(`http://localhost:3000/api/workflow/task/${taskId}`, {
        method: 'GET',
        headers: { 'X-Session-ID': sessionId }
      });

      const getResponse = await GET(getRequest, { params: { id: taskId } });
      const getData = await getResponse.json();

      expect(getData.id).toBe(taskId);
      expect(getData.sessionId).toBe(sessionId);

      // Test PATCH within session
      const updateData = { status: 'completed' };
      const patchRequest = new NextRequest(`http://localhost:3000/api/workflow/task/${taskId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId
        },
        body: JSON.stringify(updateData)
      });

      const patchResponse = await PATCH(patchRequest, { params: { id: taskId } });
      const patchData = await patchResponse.json();

      expect(patchData.status).toBe('completed');

      // Verify session was updated
      const updatedSession = getMockSession(sessionId);
      expect(updatedSession?.tasks[taskId].status).toBe('completed');
    });

    it('should handle task lifecycle within sessions', async () => {
      const sessionId = 'lifecycle-session-123';
      const taskId = 'lifecycle-task-123';

      // Simulate task lifecycle: created -> assigned -> in-progress -> completed
      const lifecycle = [
        { status: 'created', assignee: null },
        { status: 'assigned', assignee: 'user@example.com' },
        { status: 'in-progress', startedAt: new Date().toISOString() },
        { status: 'completed', completedAt: new Date().toISOString() }
      ];

      let currentState = { id: taskId, status: 'pending' };

      server.use(
        mockBackendResponse(`*/api/workflow/task/${taskId}`, (req) => {
          if (req.method === 'PATCH') {
            const updates = JSON.parse(req.body);
            currentState = { ...currentState, ...updates };
          }
          return currentState;
        }, 200)
      );

      for (const stateUpdate of lifecycle) {
        const patchRequest = new NextRequest(`http://localhost:3000/api/workflow/task/${taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(stateUpdate)
        });

        const response = await PATCH(patchRequest, { params: { id: taskId } });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.status).toBe(stateUpdate.status);
      }

      // Final state verification
      const finalGetRequest = new NextRequest(`http://localhost:3000/api/workflow/task/${taskId}`, {
        method: 'GET'
      });

      const finalResponse = await GET(finalGetRequest, { params: { id: taskId } });
      const finalData = await finalResponse.json();

      expect(finalData.status).toBe('completed');
      expect(finalData.assignee).toBe('user@example.com');
      expect(finalData.completedAt).toBeDefined();
    });
  });
});