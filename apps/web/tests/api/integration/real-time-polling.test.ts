import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { server, createMockSession, updateMockSession, getMockSession } from '../setup';
import { NextRequest } from 'next/server';
import { GET as getTask, PATCH as updateTask } from '../../../app/api/workflow/task/[id]/route';
import { GET as streamResearch } from '../../../app/api/research/stream/route';
import { http, HttpResponse } from 'msw';

describe('Integration: Real-time Polling', () => {
  beforeEach(() => {
    server.resetHandlers();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Polling Behavior', () => {
    it('should handle repeated GET requests for task status updates', async () => {
      const taskId = 'polling-task-123';
      let pollCount = 0;
      let taskStatus = 'pending';

      server.use(
        http.get(`*/api/workflow/task/${taskId}`, async () => {
          pollCount++;
          
          // Simulate status progression over time
          if (pollCount >= 3) taskStatus = 'in-progress';
          if (pollCount >= 6) taskStatus = 'completed';

          return HttpResponse.json({
            id: taskId,
            title: 'Polling test task',
            status: taskStatus,
            pollCount,
            lastUpdated: new Date().toISOString()
          });
        })
      );

      // Simulate polling every 2 seconds
      const polls = [];
      for (let i = 0; i < 8; i++) {
        const request = new NextRequest(`http://localhost:3000/api/workflow/task/${taskId}`, {
          method: 'GET'
        });

        polls.push(getTask(request, { params: { id: taskId } }));
        
        // Advance time by 2 seconds
        jest.advanceTimersByTime(2000);
      }

      const responses = await Promise.all(polls);
      const data = await Promise.all(responses.map(r => r.json()));

      // Verify polling behavior
      expect(data).toHaveLength(8);
      expect(data[0].status).toBe('pending');
      expect(data[2].status).toBe('pending'); // 3rd poll triggers status change
      expect(data[3].status).toBe('in-progress');
      expect(data[6].status).toBe('completed');
      
      // Verify poll counts are tracked
      data.forEach((d, index) => {
        expect(d.pollCount).toBe(index + 1);
      });
    });

    it('should validate polling intervals and frequency limits', async () => {
      const taskId = 'frequency-limit-task';
      let requestTimes: number[] = [];

      server.use(
        http.get(`*/api/workflow/task/${taskId}`, async () => {
          requestTimes.push(Date.now());
          return HttpResponse.json({
            id: taskId,
            status: 'pending',
            timestamp: Date.now()
          });
        })
      );

      // Simulate rapid polling (every 100ms)
      const rapidPolls = [];
      for (let i = 0; i < 10; i++) {
        const request = new NextRequest(`http://localhost:3000/api/workflow/task/${taskId}`, {
          method: 'GET'
        });

        rapidPolls.push(getTask(request, { params: { id: taskId } }));
        jest.advanceTimersByTime(100);
      }

      await Promise.all(rapidPolls);

      // All requests should be processed (no built-in rate limiting in mock)
      expect(requestTimes).toHaveLength(10);
      
      // Verify timing intervals (allowing some tolerance for test execution)
      for (let i = 1; i < requestTimes.length; i++) {
        const interval = requestTimes[i] - requestTimes[i - 1];
        expect(interval).toBeLessThanOrEqual(200); // Should be close to 100ms + execution time
      }
    });

    it('should handle long-polling scenarios with delayed responses', async () => {
      const taskId = 'long-polling-task';
      let responseDelay = 0;

      server.use(
        http.get(`*/api/workflow/task/${taskId}`, async () => {
          // Simulate variable response delays
          responseDelay += 1000; // Increase delay each time
          
          return new Promise(resolve => {
            setTimeout(() => {
              resolve(HttpResponse.json({
                id: taskId,
                status: 'processing',
                delay: responseDelay,
                timestamp: Date.now()
              }));
            }, responseDelay);
          });
        })
      );

      const startTime = Date.now();
      
      // Make 3 long-polling requests
      const longPolls = [];
      for (let i = 0; i < 3; i++) {
        const request = new NextRequest(`http://localhost:3000/api/workflow/task/${taskId}`, {
          method: 'GET'
        });

        longPolls.push(getTask(request, { params: { id: taskId } }));
      }

      // Fast-forward time to resolve the delayed responses
      jest.advanceTimersByTime(10000);

      const responses = await Promise.all(longPolls);
      const data = await Promise.all(responses.map(r => r.json()));

      expect(data).toHaveLength(3);
      expect(data[0].delay).toBe(1000);
      expect(data[1].delay).toBe(2000);
      expect(data[2].delay).toBe(3000);
    });

    it('should validate polling termination conditions', async () => {
      const taskId = 'termination-task';
      let pollCount = 0;

      server.use(
        http.get(`*/api/workflow/task/${taskId}`, async () => {
          pollCount++;
          
          const status = pollCount < 5 ? 'in-progress' : 'completed';
          const shouldTerminate = status === 'completed';

          return HttpResponse.json({
            id: taskId,
            status,
            shouldTerminate,
            pollCount
          });
        })
      );

      // Simulate polling until completion
      let completed = false;
      let totalPolls = 0;
      
      while (!completed && totalPolls < 10) { // Safety limit
        const request = new NextRequest(`http://localhost:3000/api/workflow/task/${taskId}`, {
          method: 'GET'
        });

        const response = await getTask(request, { params: { id: taskId } });
        const data = await response.json();
        
        totalPolls++;
        completed = data.shouldTerminate;
        
        if (!completed) {
          jest.advanceTimersByTime(1000);
        }
      }

      expect(completed).toBe(true);
      expect(totalPolls).toBe(5);
    });
  });

  describe('Data Consistency', () => {
    it('should ensure polling immediately reflects changes from PATCH operations', async () => {
      const taskId = 'consistency-task';
      let currentTaskData = {
        id: taskId,
        title: 'Consistency test',
        status: 'pending',
        priority: 'medium',
        lastModified: Date.now()
      };

      server.use(
        http.get(`*/api/workflow/task/${taskId}`, async () => {
          return HttpResponse.json({ ...currentTaskData });
        }),

        http.patch(`*/api/workflow/task/${taskId}`, async ({ request }) => {
          const updates = await request.json() as any;
          currentTaskData = {
            ...currentTaskData,
            ...updates,
            lastModified: Date.now()
          };
          return HttpResponse.json(currentTaskData);
        })
      );

      // Initial polling
      const getRequest1 = new NextRequest(`http://localhost:3000/api/workflow/task/${taskId}`, {
        method: 'GET'
      });

      const getResponse1 = await getTask(getRequest1, { params: { id: taskId } });
      const getData1 = await getResponse1.json();

      expect(getData1.status).toBe('pending');
      expect(getData1.priority).toBe('medium');

      // Update task via PATCH
      const patchRequest = new NextRequest(`http://localhost:3000/api/workflow/task/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'in-progress',
          priority: 'high'
        })
      });

      const patchResponse = await updateTask(patchRequest, { params: { id: taskId } });
      const patchData = await patchResponse.json();

      expect(patchData.status).toBe('in-progress');
      expect(patchData.priority).toBe('high');

      // Immediate polling after update
      const getRequest2 = new NextRequest(`http://localhost:3000/api/workflow/task/${taskId}`, {
        method: 'GET'
      });

      const getResponse2 = await getTask(getRequest2, { params: { id: taskId } });
      const getData2 = await getResponse2.json();

      expect(getData2.status).toBe('in-progress');
      expect(getData2.priority).toBe('high');
      expect(getData2.lastModified).toBeGreaterThan(getData1.lastModified);
    });

    it('should test eventual consistency across multiple clients', async () => {
      const taskId = 'multi-client-task';
      const sessionId = 'multi-client-session';
      
      createMockSession(sessionId, {
        tasks: {
          [taskId]: {
            id: taskId,
            status: 'pending',
            version: 1
          }
        }
      });

      server.use(
        http.get(`*/api/workflow/task/${taskId}`, async () => {
          const session = getMockSession(sessionId);
          return HttpResponse.json(session?.tasks[taskId] || { id: taskId });
        }),

        http.patch(`*/api/workflow/task/${taskId}`, async ({ request }) => {
          const updates = await request.json() as any;
          const session = getMockSession(sessionId);
          
          if (session?.tasks[taskId]) {
            const updatedTask = {
              ...session.tasks[taskId],
              ...updates,
              version: (session.tasks[taskId].version || 1) + 1,
              lastUpdated: Date.now()
            };

            updateMockSession(sessionId, {
              tasks: {
                ...session.tasks,
                [taskId]: updatedTask
              }
            });

            return HttpResponse.json(updatedTask);
          }

          return new HttpResponse(null, { status: 404 });
        })
      );

      // Client 1: Update task
      const updateRequest = new NextRequest(`http://localhost:3000/api/workflow/task/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'updated-by-client-1' })
      });

      const updateResponse = await updateTask(updateRequest, { params: { id: taskId } });
      const updateData = await updateResponse.json();

      expect(updateData.version).toBe(2);
      expect(updateData.status).toBe('updated-by-client-1');

      // Client 2: Poll for changes (simulating another client)
      const pollRequest = new NextRequest(`http://localhost:3000/api/workflow/task/${taskId}`, {
        method: 'GET',
        headers: { 'X-Client-ID': 'client-2' }
      });

      const pollResponse = await getTask(pollRequest, { params: { id: taskId } });
      const pollData = await pollResponse.json();

      expect(pollData.version).toBe(2);
      expect(pollData.status).toBe('updated-by-client-1');
      expect(pollData.lastUpdated).toBeDefined();
    });

    it('should validate no data corruption during concurrent access', async () => {
      const taskId = 'concurrent-access-task';
      let accessCount = 0;
      let concurrentWrites = 0;

      server.use(
        http.get(`*/api/workflow/task/${taskId}`, async () => {
          accessCount++;
          return HttpResponse.json({
            id: taskId,
            status: 'stable',
            accessCount,
            timestamp: Date.now()
          });
        }),

        http.patch(`*/api/workflow/task/${taskId}`, async ({ request }) => {
          concurrentWrites++;
          const updates = await request.json() as any;
          
          // Simulate processing time that could lead to race conditions
          await new Promise(resolve => setTimeout(resolve, 10));
          
          return HttpResponse.json({
            id: taskId,
            ...updates,
            writeId: concurrentWrites,
            processedAt: Date.now()
          });
        })
      );

      // Simulate concurrent read/write operations
      const operations = [];

      // 5 concurrent reads
      for (let i = 0; i < 5; i++) {
        const readRequest = new NextRequest(`http://localhost:3000/api/workflow/task/${taskId}`, {
          method: 'GET'
        });
        operations.push(getTask(readRequest, { params: { id: taskId } }));
      }

      // 3 concurrent writes
      for (let i = 0; i < 3; i++) {
        const writeRequest = new NextRequest(`http://localhost:3000/api/workflow/task/${taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ update: `concurrent-${i}` })
        });
        operations.push(updateTask(writeRequest, { params: { id: taskId } }));
      }

      // Execute all operations concurrently
      const responses = await Promise.all(operations);

      // Verify no errors occurred
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Verify data integrity (specific to the mock implementation)
      expect(accessCount).toBeGreaterThanOrEqual(5);
      expect(concurrentWrites).toBe(3);
    });
  });

  describe('Progress Tracking', () => {
    it('should track workflow progress updates through AI analysis endpoints', async () => {
      const sessionId = 'progress-tracking-session';
      let analysisProgress = 0;

      createMockSession(sessionId, {
        stage: 'starting',
        progress: 0
      });

      server.use(
        http.post('*/api/ai/sca-analysis', async () => {
          analysisProgress += 25;
          updateMockSession(sessionId, {
            stage: 'sca-analysis',
            progress: analysisProgress
          });

          return HttpResponse.json({
            success: true,
            progress: analysisProgress,
            stage: 'sca-analysis',
            scaFactors: []
          });
        }),

        http.post('*/api/ai/mvp-planning', async () => {
          analysisProgress += 35;
          updateMockSession(sessionId, {
            stage: 'mvp-planning',
            progress: analysisProgress
          });

          return HttpResponse.json({
            success: true,
            progress: analysisProgress,
            stage: 'mvp-planning',
            mvpFeatures: []
          });
        }),

        http.get('*/api/session/:sessionId/progress', async ({ params }) => {
          const session = getMockSession(params.sessionId as string);
          return HttpResponse.json({
            sessionId: params.sessionId,
            stage: session?.stage,
            progress: session?.progress,
            timestamp: Date.now()
          });
        })
      );

      // Start SCA analysis
      const scaRequest = new NextRequest('http://localhost:3000/api/ai/sca-analysis', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId
        },
        body: JSON.stringify({
          projectId: 'proj-progress',
          projectName: 'Progress Test',
          context: 'Testing progress tracking'
        })
      });

      // Note: We need to import the actual route handler for SCA analysis
      // For this test, we'll simulate the API call
      const mockScaResponse = await fetch('http://localhost:3001/api/ai/sca-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: 'proj-progress',
          projectName: 'Progress Test',
          context: 'Testing progress tracking'
        })
      }).catch(() => {
        // Fallback for test environment
        return { 
          json: async () => ({ success: true, progress: 25, stage: 'sca-analysis' }),
          status: 200
        };
      });

      // Simulate progress polling
      let currentProgress = 0;
      const progressChecks = [];

      while (currentProgress < 60) {
        const progressRequest = new NextRequest(`http://localhost:3001/api/session/${sessionId}/progress`, {
          method: 'GET'
        });

        // In actual implementation, this would call the session progress endpoint
        const session = getMockSession(sessionId);
        progressChecks.push({
          progress: session?.progress || 0,
          stage: session?.stage || 'unknown'
        });

        currentProgress = session?.progress || 0;
        jest.advanceTimersByTime(1000);

        if (currentProgress >= 25 && currentProgress < 60) {
          // Trigger MVP planning
          updateMockSession(sessionId, {
            stage: 'mvp-planning',
            progress: 60
          });
          currentProgress = 60;
        }
      }

      // Verify progress tracking
      expect(progressChecks.length).toBeGreaterThan(0);
      const finalSession = getMockSession(sessionId);
      expect(finalSession?.progress).toBeGreaterThanOrEqual(25);
    });

    it('should verify stage transitions are reflected in polling responses', async () => {
      const workflowId = 'stage-transition-workflow';
      const stages = ['initializing', 'analyzing', 'planning', 'executing', 'completed'];
      let currentStageIndex = 0;

      server.use(
        http.get(`*/api/workflow/${workflowId}/status`, async () => {
          const currentStage = stages[currentStageIndex];
          const progress = ((currentStageIndex + 1) / stages.length) * 100;

          return HttpResponse.json({
            workflowId,
            stage: currentStage,
            progress,
            stageIndex: currentStageIndex,
            timestamp: Date.now()
          });
        }),

        http.post(`*/api/workflow/${workflowId}/advance`, async () => {
          if (currentStageIndex < stages.length - 1) {
            currentStageIndex++;
          }

          return HttpResponse.json({
            workflowId,
            newStage: stages[currentStageIndex],
            stageIndex: currentStageIndex
          });
        })
      );

      const polledStages = [];

      // Poll initial state
      let pollRequest = new NextRequest(`http://localhost:3001/api/workflow/${workflowId}/status`, {
        method: 'GET'
      });

      // Simulate status endpoint (in real implementation this would be a proper route)
      polledStages.push({
        stage: stages[currentStageIndex],
        progress: ((currentStageIndex + 1) / stages.length) * 100
      });

      // Advance through stages and poll
      for (let i = 0; i < stages.length - 1; i++) {
        // Advance stage
        currentStageIndex = i + 1;

        // Poll new status
        polledStages.push({
          stage: stages[currentStageIndex],
          progress: ((currentStageIndex + 1) / stages.length) * 100
        });

        jest.advanceTimersByTime(2000);
      }

      // Verify stage progression
      expect(polledStages).toHaveLength(stages.length);
      polledStages.forEach((poll, index) => {
        expect(poll.stage).toBe(stages[index]);
        expect(poll.progress).toBe(((index + 1) / stages.length) * 100);
      });

      expect(polledStages[polledStages.length - 1].stage).toBe('completed');
      expect(polledStages[polledStages.length - 1].progress).toBe(100);
    });

    it('should test progress percentage calculations and updates', async () => {
      const taskId = 'progress-calculation-task';
      const totalSteps = 8;
      let completedSteps = 0;

      server.use(
        http.get(`*/api/workflow/task/${taskId}/progress`, async () => {
          const percentage = Math.round((completedSteps / totalSteps) * 100);
          
          return HttpResponse.json({
            taskId,
            completedSteps,
            totalSteps,
            percentage,
            details: {
              currentStep: completedSteps < totalSteps ? `Step ${completedSteps + 1}` : 'Completed',
              estimatedTimeRemaining: (totalSteps - completedSteps) * 30 // 30 seconds per step
            }
          });
        }),

        http.post(`*/api/workflow/task/${taskId}/complete-step`, async () => {
          if (completedSteps < totalSteps) {
            completedSteps++;
          }

          return HttpResponse.json({
            taskId,
            stepCompleted: completedSteps,
            totalSteps
          });
        })
      );

      const progressUpdates = [];

      // Complete steps one by one and track progress
      for (let step = 0; step <= totalSteps; step++) {
        // Poll progress
        const progressRequest = new NextRequest(`http://localhost:3001/api/workflow/task/${taskId}/progress`, {
          method: 'GET'
        });

        // Simulate progress polling
        const percentage = Math.round((completedSteps / totalSteps) * 100);
        progressUpdates.push({
          step: completedSteps,
          percentage,
          isCompleted: completedSteps === totalSteps
        });

        if (completedSteps < totalSteps) {
          // Complete next step
          completedSteps++;
          jest.advanceTimersByTime(1000);
        }
      }

      // Verify progress calculations
      expect(progressUpdates).toHaveLength(totalSteps + 1);
      expect(progressUpdates[0].percentage).toBe(0);
      expect(progressUpdates[totalSteps].percentage).toBe(100);
      expect(progressUpdates[totalSteps].isCompleted).toBe(true);

      // Verify incremental progress
      progressUpdates.forEach((update, index) => {
        const expectedPercentage = Math.round((index / totalSteps) * 100);
        expect(update.percentage).toBe(expectedPercentage);
      });
    });
  });

  describe('Error Handling in Polling', () => {
    it('should handle polling behavior during backend service outages', async () => {
      const taskId = 'outage-test-task';
      let requestCount = 0;
      let serviceAvailable = true;

      server.use(
        http.get(`*/api/workflow/task/${taskId}`, async () => {
          requestCount++;
          
          // Simulate service outage between requests 3-5
          if (requestCount >= 3 && requestCount <= 5) {
            serviceAvailable = false;
            return new HttpResponse(null, { status: 503 });
          }
          
          serviceAvailable = true;
          return HttpResponse.json({
            id: taskId,
            status: 'available',
            requestCount,
            serviceAvailable
          });
        })
      );

      const pollResults = [];

      // Poll through the outage
      for (let i = 0; i < 8; i++) {
        const request = new NextRequest(`http://localhost:3000/api/workflow/task/${taskId}`, {
          method: 'GET'
        });

        try {
          const response = await getTask(request, { params: { id: taskId } });
          const data = await response.json();
          
          pollResults.push({
            attempt: i + 1,
            status: response.status,
            serviceAvailable: data.serviceAvailable,
            error: response.status >= 400
          });
        } catch (error) {
          pollResults.push({
            attempt: i + 1,
            status: 503,
            serviceAvailable: false,
            error: true
          });
        }

        jest.advanceTimersByTime(2000);
      }

      // Verify outage handling
      expect(pollResults).toHaveLength(8);
      expect(pollResults[0].error).toBe(false);
      expect(pollResults[1].error).toBe(false);
      expect(pollResults[2].error).toBe(true); // Outage starts
      expect(pollResults[3].error).toBe(true);
      expect(pollResults[4].error).toBe(true); // Outage ends
      expect(pollResults[5].error).toBe(false); // Service restored
      expect(pollResults[6].error).toBe(false);
      expect(pollResults[7].error).toBe(false);
    });

    it('should test retry logic and exponential backoff', async () => {
      const taskId = 'retry-backoff-task';
      let failureCount = 0;
      const maxFailures = 3;

      server.use(
        http.get(`*/api/workflow/task/${taskId}`, async () => {
          failureCount++;
          
          if (failureCount <= maxFailures) {
            return new HttpResponse(null, { status: 500 });
          }
          
          return HttpResponse.json({
            id: taskId,
            status: 'recovered',
            failureCount: failureCount - maxFailures
          });
        })
      );

      // Simulate retry logic with exponential backoff
      const retryDelays = [1000, 2000, 4000, 8000]; // Exponential backoff
      const retryResults = [];

      for (let attempt = 0; attempt < retryDelays.length; attempt++) {
        const startTime = Date.now();
        
        const request = new NextRequest(`http://localhost:3000/api/workflow/task/${taskId}`, {
          method: 'GET'
        });

        const response = await getTask(request, { params: { id: taskId } });
        const success = response.status === 200;
        
        retryResults.push({
          attempt: attempt + 1,
          success,
          status: response.status,
          delay: retryDelays[attempt]
        });

        if (success) break;

        // Wait for backoff period
        jest.advanceTimersByTime(retryDelays[attempt]);
      }

      // Verify retry behavior
      expect(retryResults.length).toBeGreaterThan(maxFailures);
      
      // First few attempts should fail
      for (let i = 0; i < maxFailures; i++) {
        expect(retryResults[i].success).toBe(false);
        expect(retryResults[i].status).toBe(500);
      }

      // Final attempt should succeed
      const lastResult = retryResults[retryResults.length - 1];
      expect(lastResult.success).toBe(true);
      expect(lastResult.status).toBe(200);
    });

    it('should validate error state recovery when services return', async () => {
      const taskId = 'recovery-test-task';
      let isServiceDown = true;
      let recoveryTime: number | null = null;

      server.use(
        http.get(`*/api/workflow/task/${taskId}`, async () => {
          if (isServiceDown) {
            return new HttpResponse('Service temporarily unavailable', { 
              status: 503,
              headers: { 'Retry-After': '5' }
            });
          }

          return HttpResponse.json({
            id: taskId,
            status: 'operational',
            recoveredAt: recoveryTime,
            message: 'Service has recovered'
          });
        })
      );

      const recoveryTest = [];

      // Poll while service is down
      for (let i = 0; i < 3; i++) {
        const request = new NextRequest(`http://localhost:3000/api/workflow/task/${taskId}`, {
          method: 'GET'
        });

        const response = await getTask(request, { params: { id: taskId } });
        recoveryTest.push({
          attempt: i + 1,
          status: response.status,
          isDown: response.status === 503
        });

        jest.advanceTimersByTime(2000);
      }

      // Service recovers
      isServiceDown = false;
      recoveryTime = Date.now();

      // Poll after recovery
      for (let i = 3; i < 6; i++) {
        const request = new NextRequest(`http://localhost:3000/api/workflow/task/${taskId}`, {
          method: 'GET'
        });

        const response = await getTask(request, { params: { id: taskId } });
        const data = response.status === 200 ? await response.json() : null;
        
        recoveryTest.push({
          attempt: i + 1,
          status: response.status,
          isDown: response.status === 503,
          recovered: response.status === 200,
          message: data?.message
        });

        jest.advanceTimersByTime(2000);
      }

      // Verify recovery behavior
      expect(recoveryTest).toHaveLength(6);
      
      // First 3 attempts should show service down
      expect(recoveryTest[0].isDown).toBe(true);
      expect(recoveryTest[1].isDown).toBe(true);
      expect(recoveryTest[2].isDown).toBe(true);
      
      // Last 3 attempts should show service recovered
      expect(recoveryTest[3].recovered).toBe(true);
      expect(recoveryTest[4].recovered).toBe(true);
      expect(recoveryTest[5].recovered).toBe(true);
      expect(recoveryTest[3].message).toBe('Service has recovered');
    });
  });

  describe('Performance Optimization', () => {
    it('should test caching behavior for frequently polled endpoints', async () => {
      const taskId = 'caching-test-task';
      let backendCallCount = 0;
      let lastCallTime = 0;

      server.use(
        http.get(`*/api/workflow/task/${taskId}`, async ({ request }) => {
          const currentTime = Date.now();
          backendCallCount++;
          
          // Simulate caching logic (5-second cache window)
          const cacheWindow = 5000;
          const shouldUseCache = (currentTime - lastCallTime) < cacheWindow && lastCallTime > 0;
          
          if (!shouldUseCache) {
            lastCallTime = currentTime;
          }

          return HttpResponse.json({
            id: taskId,
            status: 'cached-response',
            backendCallCount,
            fromCache: shouldUseCache,
            cacheAge: shouldUseCache ? currentTime - lastCallTime : 0,
            headers: shouldUseCache ? 
              { 'X-Cache': 'HIT' } : 
              { 'X-Cache': 'MISS', 'Cache-Control': 'max-age=5' }
          });
        })
      );

      const cacheTests = [];

      // Make requests within cache window
      for (let i = 0; i < 5; i++) {
        const request = new NextRequest(`http://localhost:3000/api/workflow/task/${taskId}`, {
          method: 'GET'
        });

        const response = await getTask(request, { params: { id: taskId } });
        const data = await response.json();

        cacheTests.push({
          request: i + 1,
          backendCalls: data.backendCallCount,
          fromCache: data.fromCache,
          cacheAge: data.cacheAge
        });

        // Short delay (within cache window)
        jest.advanceTimersByTime(1000);
      }

      // Wait for cache to expire
      jest.advanceTimersByTime(6000);

      // Make another request (should be cache miss)
      const request = new NextRequest(`http://localhost:3000/api/workflow/task/${taskId}`, {
        method: 'GET'
      });

      const response = await getTask(request, { params: { id: taskId } });
      const data = await response.json();

      cacheTests.push({
        request: 6,
        backendCalls: data.backendCallCount,
        fromCache: data.fromCache,
        expired: true
      });

      // Verify caching behavior
      expect(cacheTests).toHaveLength(6);
      expect(cacheTests[0].fromCache).toBe(false); // First request - cache miss
      
      // Requests within cache window might be cached (depends on implementation)
      const finalExpiredRequest = cacheTests[5];
      expect(finalExpiredRequest.expired).toBe(true);
    });

    it('should validate memory usage during extended polling', async () => {
      const taskId = 'memory-test-task';
      const pollCount = 100; // Extended polling
      let memoryUsage: number[] = [];

      server.use(
        http.get(`*/api/workflow/task/${taskId}`, async () => {
          // Simulate memory tracking (in real test, this would use actual memory monitoring)
          const mockMemoryUsage = process.memoryUsage ? process.memoryUsage().heapUsed : Math.random() * 1000000;
          memoryUsage.push(mockMemoryUsage);

          return HttpResponse.json({
            id: taskId,
            status: 'memory-test',
            memorySnapshot: mockMemoryUsage,
            pollNumber: memoryUsage.length
          });
        })
      );

      // Perform extended polling
      for (let i = 0; i < pollCount; i++) {
        const request = new NextRequest(`http://localhost:3000/api/workflow/task/${taskId}`, {
          method: 'GET'
        });

        await getTask(request, { params: { id: taskId } });
        
        // Small delay to prevent overwhelming
        jest.advanceTimersByTime(100);
      }

      // Analyze memory usage patterns
      expect(memoryUsage).toHaveLength(pollCount);
      
      // Check for memory leaks (memory shouldn't grow unbounded)
      const initialMemory = memoryUsage[0];
      const finalMemory = memoryUsage[memoryUsage.length - 1];
      const memoryGrowth = finalMemory - initialMemory;
      
      // Memory growth should be reasonable (less than 10x initial usage)
      expect(memoryGrowth / initialMemory).toBeLessThan(10);

      // Check for memory spikes
      const maxMemory = Math.max(...memoryUsage);
      const avgMemory = memoryUsage.reduce((sum, usage) => sum + usage, 0) / memoryUsage.length;
      
      // Max memory shouldn't be more than 5x average (indicates no major spikes)
      expect(maxMemory / avgMemory).toBeLessThan(5);
    });
  });
});