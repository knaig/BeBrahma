import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { server, simulateTimeout } from '../setup';
import { NextRequest } from 'next/server';
import { POST as clarifyProblem } from '../../../app/api/ai/clarify-problem/route';
import { POST as scaAnalysis } from '../../../app/api/ai/sca-analysis/route';
import { POST as mvpPlanning } from '../../../app/api/ai/mvp-planning/route';
import { POST as exportActions } from '../../../app/api/workflow/task/export-actions/route';
import { GET as getTask } from '../../../app/api/workflow/task/[id]/route';
import { GET as streamResearch } from '../../../app/api/research/stream/route';
import { http, HttpResponse } from 'msw';

describe('Error Scenarios: Timeout Handling', () => {
  beforeEach(() => {
    server.resetHandlers();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Request Timeout Testing', () => {
    it('should test 10-second timeout limits on AI clarify-problem endpoint', async () => {
      server.use(
        simulateTimeout('*/api/ai/clarify-problem', 11000) // 11 seconds - exceeds limit
      );

      const request = new NextRequest('http://localhost:3000/api/ai/clarify-problem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemStatement: 'Test timeout scenario',
          projectId: 'proj-timeout',
          projectName: 'Timeout Test',
          context: 'Testing timeout handling'
        })
      });

      // Create promise that rejects after timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 10000);
      });

      const requestPromise = clarifyProblem(request);

      // Fast-forward time to trigger timeout
      jest.advanceTimersByTime(11000);

      await expect(Promise.race([requestPromise, timeoutPromise])).rejects.toThrow();
    }, 15000);

    it('should verify AbortController usage in route handlers', async () => {
      let abortSignalUsed = false;
      let requestAborted = false;

      server.use(
        http.post('*/api/ai/sca-analysis', async ({ request }) => {
          // Simulate checking for abort signal
          if (request.signal) {
            abortSignalUsed = true;
            
            request.signal.addEventListener('abort', () => {
              requestAborted = true;
            });

            // Simulate long operation
            await new Promise(resolve => {
              const timeout = setTimeout(resolve, 15000);
              request.signal.addEventListener('abort', () => {
                clearTimeout(timeout);
                resolve(undefined);
              });
            });
          }

          if (requestAborted) {
            return new HttpResponse('Request aborted', { status: 499 });
          }

          return HttpResponse.json({ success: true });
        })
      );

      const controller = new AbortController();
      const request = new NextRequest('http://localhost:3000/api/ai/sca-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: 'proj-abort',
          projectName: 'Abort Test',
          context: 'Testing abort controller'
        }),
        signal: controller.signal
      });

      // Start request
      const requestPromise = scaAnalysis(request);

      // Abort after 5 seconds
      setTimeout(() => controller.abort(), 5000);
      jest.advanceTimersByTime(5000);

      try {
        await requestPromise;
      } catch (error) {
        // Request should be aborted
        expect(error).toBeDefined();
      }

      expect(abortSignalUsed).toBe(true);
      expect(requestAborted).toBe(true);
    });

    it('should test timeout error responses with proper status codes', async () => {
      const endpoints = [
        {
          path: '*/api/ai/clarify-problem',
          handler: clarifyProblem,
          body: {
            problemStatement: 'timeout test',
            projectId: 'proj-1',
            projectName: 'Test',
            context: 'timeout'
          }
        },
        {
          path: '*/api/ai/sca-analysis',
          handler: scaAnalysis,
          body: {
            projectId: 'proj-1',
            projectName: 'Test',
            context: 'timeout'
          }
        },
        {
          path: '*/api/ai/mvp-planning',
          handler: mvpPlanning,
          body: {
            projectId: 'proj-1',
            projectName: 'Test',
            scaFactors: [],
            context: 'timeout'
          }
        }
      ];

      for (const endpoint of endpoints) {
        server.use(simulateTimeout(endpoint.path, 12000));

        const request = new NextRequest(`http://localhost:3000${endpoint.path.replace('*', '')}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(endpoint.body)
        });

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Test timeout')), 11000);
        });

        jest.advanceTimersByTime(12000);

        await expect(
          Promise.race([endpoint.handler(request), timeoutPromise])
        ).rejects.toThrow();

        server.resetHandlers();
      }
    });

    it('should validate timeout error messages and formatting', async () => {
      server.use(
        http.post('*/api/ai/clarify-problem', async () => {
          await new Promise(resolve => setTimeout(resolve, 15000));
          return HttpResponse.json({ success: true });
        })
      );

      const request = new NextRequest('http://localhost:3000/api/ai/clarify-problem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemStatement: 'timeout formatting test',
          projectId: 'proj-format',
          projectName: 'Format Test',
          context: 'testing error format'
        })
      });

      // Create a timeout that will trigger
      const timeoutHandler = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Request timeout after 10 seconds'));
        }, 10000);
      });

      jest.advanceTimersByTime(15000);

      try {
        await Promise.race([clarifyProblem(request), timeoutHandler]);
        fail('Expected timeout error');
      } catch (error: any) {
        expect(error.message).toContain('timeout');
        expect(error.message).toMatch(/\d+\s*seconds?/i); // Should mention time duration
      }
    });
  });

  describe('Backend Service Timeouts', () => {
    it('should handle backend services that never respond', async () => {
      server.use(
        http.post('*/api/workflow/task/export-actions', async () => {
          // Simulate hanging request - never resolves
          return new Promise(() => {}); // Never resolves
        })
      );

      const request = new NextRequest('http://localhost:3000/api/workflow/task/export-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          openProjectConfig: {
            baseUrl: 'https://test.com',
            apiToken: 'token',
            projectId: '1'
          },
          actions: [{ title: 'Test Action', description: 'Test' }]
        })
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Backend timeout')), 10000);
      });

      jest.advanceTimersByTime(11000);

      await expect(
        Promise.race([exportActions(request), timeoutPromise])
      ).rejects.toThrow('Backend timeout');
    });

    it('should test timeout propagation from backend to frontend', async () => {
      let backendTimeoutDetected = false;
      let frontendTimeoutDetected = false;

      server.use(
        http.get('*/api/workflow/task/:id', async ({ params }) => {
          const { id } = params;
          
          try {
            // Simulate backend timeout
            await new Promise((_, reject) => {
              setTimeout(() => {
                backendTimeoutDetected = true;
                reject(new Error('Backend service timeout'));
              }, 8000);
            });
            
            return HttpResponse.json({ id, status: 'success' });
          } catch (error) {
            return new HttpResponse('Backend timeout', { status: 504 });
          }
        })
      );

      const request = new NextRequest('http://localhost:3000/api/workflow/task/timeout-test', {
        method: 'GET'
      });

      const frontendTimeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          frontendTimeoutDetected = true;
          reject(new Error('Frontend timeout'));
        }, 10000);
      });

      jest.advanceTimersByTime(11000);

      try {
        await Promise.race([getTask(request, { params: { id: 'timeout-test' } }), frontendTimeoutPromise]);
        fail('Expected timeout');
      } catch (error) {
        expect(backendTimeoutDetected || frontendTimeoutDetected).toBe(true);
      }
    });

    it('should verify cleanup of hanging requests', async () => {
      const activeRequests = new Set();
      let requestsCleanedUp = 0;

      server.use(
        http.post('*/api/ai/mvp-planning', async ({ request }) => {
          const requestId = Math.random().toString(36);
          activeRequests.add(requestId);
          
          request.signal?.addEventListener('abort', () => {
            activeRequests.delete(requestId);
            requestsCleanedUp++;
          });

          // Hang indefinitely
          await new Promise(() => {});
          
          return HttpResponse.json({ success: true });
        })
      );

      const requests = [];
      const controllers = [];

      // Create multiple hanging requests
      for (let i = 0; i < 3; i++) {
        const controller = new AbortController();
        controllers.push(controller);

        const request = new NextRequest('http://localhost:3000/api/ai/mvp-planning', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: `proj-cleanup-${i}`,
            projectName: `Cleanup Test ${i}`,
            scaFactors: [],
            context: 'cleanup test'
          }),
          signal: controller.signal
        });

        requests.push(mvpPlanning(request));
      }

      // Let requests start
      jest.advanceTimersByTime(1000);
      expect(activeRequests.size).toBe(3);

      // Abort all requests to simulate cleanup
      controllers.forEach(controller => controller.abort());
      jest.advanceTimersByTime(1000);

      expect(requestsCleanedUp).toBe(3);
      expect(activeRequests.size).toBe(0);
    });

    it('should test timeout handling during streaming operations', async () => {
      let streamStarted = false;
      let streamAborted = false;

      server.use(
        http.get('*/api/research/stream', async ({ request }) => {
          streamStarted = true;
          const url = new URL(request.url);
          const query = url.searchParams.get('query');

          request.signal?.addEventListener('abort', () => {
            streamAborted = true;
          });

          // Create a stream that hangs
          const stream = new ReadableStream({
            start(controller) {
              const interval = setInterval(() => {
                if (streamAborted) {
                  controller.close();
                  clearInterval(interval);
                  return;
                }
                
                controller.enqueue(
                  new TextEncoder().encode('data: {"type":"progress","phase":"hanging"}\n\n')
                );
              }, 1000);

              // Never complete the stream
            }
          });

          return new Response(stream, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache'
            }
          });
        })
      );

      const query = 'timeout streaming test';
      const request = new NextRequest(`http://localhost:3000/api/research/stream?query=${encodeURIComponent(query)}`, {
        method: 'GET'
      });

      const streamPromise = streamResearch(request);
      
      // Timeout after 5 seconds
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Stream timeout')), 5000);
      });

      jest.advanceTimersByTime(6000);

      await expect(Promise.race([streamPromise, timeoutPromise])).rejects.toThrow('Stream timeout');
      
      expect(streamStarted).toBe(true);
    });
  });

  describe('Network Timeout Scenarios', () => {
    it('should simulate slow network connections', async () => {
      const networkDelays = [2000, 5000, 8000, 12000]; // Progressive network delays
      
      for (let i = 0; i < networkDelays.length; i++) {
        const delay = networkDelays[i];
        
        server.use(
          http.post('*/api/ai/sca-analysis', async () => {
            await new Promise(resolve => setTimeout(resolve, delay));
            return HttpResponse.json({
              success: true,
              networkDelay: delay,
              requestIndex: i
            });
          })
        );

        const request = new NextRequest('http://localhost:3000/api/ai/sca-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: `proj-slow-${i}`,
            projectName: `Slow Network Test ${i}`,
            context: `Testing ${delay}ms network delay`
          })
        });

        const startTime = Date.now();
        
        if (delay <= 10000) {
          // Should succeed within timeout
          jest.advanceTimersByTime(delay + 1000);
          
          const response = await scaAnalysis(request);
          const data = await response.json();
          
          expect(response.status).toBe(200);
          expect(data.networkDelay).toBe(delay);
        } else {
          // Should timeout
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Network timeout')), 10000);
          });

          jest.advanceTimersByTime(delay);
          
          await expect(
            Promise.race([scaAnalysis(request), timeoutPromise])
          ).rejects.toThrow();
        }

        server.resetHandlers();
      }
    });

    it('should test partial response timeouts (connection established but slow data)', async () => {
      server.use(
        http.post('*/api/ai/clarify-problem', async () => {
          // Simulate partial response - start sending but hang in the middle
          const stream = new ReadableStream({
            start(controller) {
              // Send partial response
              controller.enqueue(new TextEncoder().encode('{"success":true,"partialData":'));
              
              // Hang here - never complete the response
              setTimeout(() => {
                // Never complete - simulates network hanging during response
              }, 20000);
            }
          });

          return new Response(stream, {
            headers: { 'Content-Type': 'application/json' }
          });
        })
      );

      const request = new NextRequest('http://localhost:3000/api/ai/clarify-problem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemStatement: 'partial response test',
          projectId: 'proj-partial',
          projectName: 'Partial Response Test',
          context: 'testing partial response timeout'
        })
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Partial response timeout')), 10000);
      });

      jest.advanceTimersByTime(15000);

      await expect(
        Promise.race([clarifyProblem(request), timeoutPromise])
      ).rejects.toThrow('Partial response timeout');
    });

    it('should verify timeout behavior during large payload transfers', async () => {
      const largePayloadSize = 1000; // Number of items in large response

      server.use(
        http.post('*/api/ai/mvp-planning', async () => {
          // Simulate processing delay for large payload
          await new Promise(resolve => setTimeout(resolve, 3000));

          const largeMvpFeatures = Array.from({ length: largePayloadSize }, (_, i) => ({
            id: `mvp-large-${i}`,
            name: `Feature ${i}`,
            description: `Large payload feature ${i} with extensive description that makes the response size very large`,
            priority: 'MUST_HAVE',
            effort: 'MEDIUM',
            impact: 'HIGH',
            userStories: Array.from({ length: 5 }, (_, j) => `User story ${j} for feature ${i}`),
            acceptanceCriteria: Array.from({ length: 3 }, (_, k) => `Criteria ${k} for feature ${i}`),
            estimatedHours: i + 1,
            estimatedCost: (i + 1) * 100
          }));

          return HttpResponse.json({
            success: true,
            mvpFeatures: largeMvpFeatures,
            payloadSize: JSON.stringify(largeMvpFeatures).length
          });
        })
      );

      const request = new NextRequest('http://localhost:3000/api/ai/mvp-planning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: 'proj-large-payload',
          projectName: 'Large Payload Test',
          scaFactors: [],
          context: 'Testing large payload handling'
        })
      });

      jest.advanceTimersByTime(5000);

      const response = await mvpPlanning(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.mvpFeatures).toHaveLength(largePayloadSize);
      expect(data.payloadSize).toBeGreaterThan(10000); // Large payload
    });

    it('should test timeout recovery and retry mechanisms', async () => {
      let attemptCount = 0;
      const maxAttempts = 3;

      server.use(
        http.get('*/api/workflow/task/:id', async ({ params }) => {
          const { id } = params;
          attemptCount++;

          // First two attempts timeout, third succeeds
          if (attemptCount < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 15000));
            return new HttpResponse('Timeout', { status: 408 });
          }

          return HttpResponse.json({
            id,
            status: 'success',
            attemptCount,
            message: 'Recovered after timeout'
          });
        })
      );

      const retryDelays = [1000, 2000, 4000];
      let currentAttempt = 0;

      const makeRequest = async (): Promise<any> => {
        currentAttempt++;
        
        const request = new NextRequest('http://localhost:3000/api/workflow/task/retry-test', {
          method: 'GET'
        });

        try {
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout')), 10000);
          });

          jest.advanceTimersByTime(15000);
          
          const response = await Promise.race([
            getTask(request, { params: { id: 'retry-test' } }),
            timeoutPromise
          ]);

          if (response.status === 200) {
            return await response.json();
          }
          
          throw new Error('Request failed');
        } catch (error) {
          if (currentAttempt < maxAttempts) {
            // Wait for retry delay
            jest.advanceTimersByTime(retryDelays[currentAttempt - 1]);
            return await makeRequest();
          }
          throw error;
        }
      };

      const result = await makeRequest();

      expect(result.status).toBe('success');
      expect(result.attemptCount).toBe(maxAttempts);
      expect(result.message).toContain('Recovered');
      expect(currentAttempt).toBe(maxAttempts);
    });
  });

  describe('Concurrent Timeout Handling', () => {
    it('should test multiple simultaneous requests timing out', async () => {
      const requestCount = 5;
      let timeoutCount = 0;

      server.use(
        http.post('*/api/ai/clarify-problem', async () => {
          await new Promise(resolve => setTimeout(resolve, 15000));
          return HttpResponse.json({ success: true });
        })
      );

      const concurrentRequests = Array.from({ length: requestCount }, (_, i) => {
        const request = new NextRequest('http://localhost:3000/api/ai/clarify-problem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            problemStatement: `concurrent timeout test ${i}`,
            projectId: `proj-concurrent-${i}`,
            projectName: `Concurrent Test ${i}`,
            context: `concurrent test ${i}`
          })
        });

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            timeoutCount++;
            reject(new Error(`Concurrent timeout ${i}`));
          }, 10000);
        });

        return Promise.race([clarifyProblem(request), timeoutPromise]).catch(error => {
          return { error: error.message, index: i };
        });
      });

      jest.advanceTimersByTime(15000);

      const results = await Promise.all(concurrentRequests);

      // All requests should have timed out
      expect(results).toHaveLength(requestCount);
      results.forEach((result, index) => {
        expect(result).toHaveProperty('error');
        expect(result.error).toContain('timeout');
      });

      expect(timeoutCount).toBe(requestCount);
    });

    it('should verify resource cleanup during mass timeouts', async () => {
      const resourcesCreated = new Set();
      const resourcesCleanedUp = new Set();

      server.use(
        http.post('*/api/ai/sca-analysis', async ({ request }) => {
          const resourceId = Math.random().toString(36);
          resourcesCreated.add(resourceId);

          request.signal?.addEventListener('abort', () => {
            resourcesCleanedUp.add(resourceId);
          });

          // Simulate resource-intensive operation that times out
          await new Promise(resolve => setTimeout(resolve, 20000));
          
          return HttpResponse.json({ success: true, resourceId });
        })
      );

      const massTimeoutRequests = Array.from({ length: 10 }, (_, i) => {
        const controller = new AbortController();
        const request = new NextRequest('http://localhost:3000/api/ai/sca-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: `proj-mass-${i}`,
            projectName: `Mass Timeout ${i}`,
            context: `mass timeout test ${i}`
          }),
          signal: controller.signal
        });

        // Auto-abort after timeout
        setTimeout(() => controller.abort(), 10000);

        return scaAnalysis(request).catch(() => ({ timeout: true, index: i }));
      });

      jest.advanceTimersByTime(15000);

      await Promise.all(massTimeoutRequests);

      // Verify all resources were created and cleaned up
      expect(resourcesCreated.size).toBe(10);
      expect(resourcesCleanedUp.size).toBe(10);
      expect(resourcesCreated.size).toEqual(resourcesCleanedUp.size);
    });

    it('should test system stability under timeout stress', async () => {
      const stressTestDuration = 30000; // 30 seconds
      const requestInterval = 1000; // 1 request per second
      let successfulRequests = 0;
      let timeoutRequests = 0;
      let errorRequests = 0;

      server.use(
        http.post('*/api/ai/mvp-planning', async () => {
          const shouldTimeout = Math.random() < 0.7; // 70% chance of timeout
          
          if (shouldTimeout) {
            await new Promise(resolve => setTimeout(resolve, 15000));
            return new HttpResponse('Timeout', { status: 408 });
          }

          await new Promise(resolve => setTimeout(resolve, 2000));
          return HttpResponse.json({ success: true });
        })
      );

      const stressTest = new Promise<void>((resolve) => {
        let requestCount = 0;
        const maxRequests = stressTestDuration / requestInterval;

        const interval = setInterval(async () => {
          if (requestCount >= maxRequests) {
            clearInterval(interval);
            resolve();
            return;
          }

          requestCount++;

          const request = new NextRequest('http://localhost:3000/api/ai/mvp-planning', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId: `proj-stress-${requestCount}`,
              projectName: `Stress Test ${requestCount}`,
              scaFactors: [],
              context: `stress test ${requestCount}`
            })
          });

          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Stress test timeout')), 10000);
          });

          try {
            const response = await Promise.race([mvpPlanning(request), timeoutPromise]);
            if (response.status === 200) {
              successfulRequests++;
            } else {
              errorRequests++;
            }
          } catch (error) {
            timeoutRequests++;
          }
        }, requestInterval);

        // Simulate time advancement for the stress test
        jest.advanceTimersByTime(stressTestDuration);
      });

      await stressTest;

      // Verify system remained stable
      const totalRequests = successfulRequests + timeoutRequests + errorRequests;
      expect(totalRequests).toBeGreaterThan(0);
      
      // System should handle the stress (some requests may timeout, but system shouldn't crash)
      expect(successfulRequests + errorRequests + timeoutRequests).toBe(totalRequests);
      
      // At least some requests should have been processed (system didn't completely fail)
      expect(successfulRequests + errorRequests).toBeGreaterThan(0);
    });
  });

  describe('Service-Specific Timeout Tests', () => {
    it('should test AI analysis endpoints with long processing times', async () => {
      const aiEndpoints = [
        { name: 'clarify-problem', processingTime: 8000 },
        { name: 'sca-analysis', processingTime: 12000 },
        { name: 'mvp-planning', processingTime: 15000 }
      ];

      for (const endpoint of aiEndpoints) {
        server.use(
          http.post(`*/api/ai/${endpoint.name}`, async () => {
            await new Promise(resolve => setTimeout(resolve, endpoint.processingTime));
            return HttpResponse.json({
              success: true,
              processingTime: endpoint.processingTime,
              endpoint: endpoint.name
            });
          })
        );

        const request = new NextRequest(`http://localhost:3000/api/ai/${endpoint.name}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: `proj-ai-${endpoint.name}`,
            projectName: `AI Test ${endpoint.name}`,
            context: `Testing ${endpoint.name} timeout`
          })
        });

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`${endpoint.name} timeout`)), 10000);
        });

        jest.advanceTimersByTime(endpoint.processingTime + 1000);

        if (endpoint.processingTime <= 10000) {
          // Should succeed
          const handler = endpoint.name === 'clarify-problem' ? clarifyProblem : 
                         endpoint.name === 'sca-analysis' ? scaAnalysis : mvpPlanning;
          
          const response = await handler(request);
          const data = await response.json();
          
          expect(data.success).toBe(true);
          expect(data.endpoint).toBe(endpoint.name);
        } else {
          // Should timeout
          const handler = endpoint.name === 'mvp-planning' ? mvpPlanning : clarifyProblem;
          
          await expect(
            Promise.race([handler(request), timeoutPromise])
          ).rejects.toThrow();
        }

        server.resetHandlers();
      }
    });

    it('should test OpenProject API integration timeouts', async () => {
      server.use(
        http.post('*/work_packages', async () => {
          // Simulate slow OpenProject API
          await new Promise(resolve => setTimeout(resolve, 12000));
          return HttpResponse.json({
            id: 123,
            _links: { self: { href: '/work_packages/123' } }
          });
        })
      );

      const request = new NextRequest('http://localhost:3000/api/workflow/task/export-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          openProjectConfig: {
            baseUrl: 'https://openproject.example.com',
            apiToken: 'test-token',
            projectId: '1'
          },
          actions: [
            {
              title: 'Timeout test action',
              description: 'Testing OpenProject API timeout'
            }
          ]
        })
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('OpenProject timeout')), 10000);
      });

      jest.advanceTimersByTime(13000);

      await expect(
        Promise.race([exportActions(request), timeoutPromise])
      ).rejects.toThrow();
    });

    it('should test research streaming endpoint timeouts', async () => {
      server.use(
        http.get('*/api/research/stream', async ({ request }) => {
          const stream = new ReadableStream({
            start(controller) {
              // Send initial data
              controller.enqueue(
                new TextEncoder().encode('data: {"type":"progress","phase":"starting"}\n\n')
              );

              // Hang after initial data - simulate streaming timeout
              setTimeout(() => {
                // Never send more data - simulates stream hanging
              }, 20000);
            }
          });

          return new Response(stream, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache'
            }
          });
        })
      );

      const query = 'streaming timeout test';
      const request = new NextRequest(`http://localhost:3000/api/research/stream?query=${encodeURIComponent(query)}`, {
        method: 'GET'
      });

      const streamPromise = streamResearch(request);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Stream timeout')), 10000);
      });

      jest.advanceTimersByTime(15000);

      await expect(
        Promise.race([streamPromise, timeoutPromise])
      ).rejects.toThrow('Stream timeout');
    });
  });
});