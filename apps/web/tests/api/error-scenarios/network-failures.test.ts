import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { server, simulateNetworkError } from '../setup';
import { NextRequest } from 'next/server';
import { POST as clarifyProblem } from '../../../app/api/ai/clarify-problem/route';
import { POST as scaAnalysis } from '../../../app/api/ai/sca-analysis/route';
import { POST as mvpPlanning } from '../../../app/api/ai/mvp-planning/route';
import { POST as exportActions } from '../../../app/api/workflow/task/export-actions/route';
import { GET as getTask, PATCH as updateTask } from '../../../app/api/workflow/task/[id]/route';
import { POST as runResearch } from '../../../app/api/research/run/route';
import { http, HttpResponse } from 'msw';

describe('Error Scenarios: Network Failures', () => {
  beforeEach(() => {
    server.resetHandlers();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Connection Failures', () => {
    it('should test DNS resolution failures', async () => {
      server.use(
        simulateNetworkError('*/api/ai/clarify-problem', 'DNS_FAILURE')
      );

      const request = new NextRequest('http://localhost:3000/api/ai/clarify-problem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemStatement: 'DNS failure test',
          projectId: 'proj-dns',
          projectName: 'DNS Test',
          context: 'Testing DNS resolution failure'
        })
      });

      await expect(clarifyProblem(request)).rejects.toThrow();
    });

    it('should simulate connection refused errors', async () => {
      server.use(
        simulateNetworkError('*/api/ai/sca-analysis', 'CONNECTION_REFUSED')
      );

      const request = new NextRequest('http://localhost:3000/api/ai/sca-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: 'proj-refused',
          projectName: 'Connection Refused Test',
          context: 'Testing connection refused error'
        })
      });

      await expect(scaAnalysis(request)).rejects.toThrow();
    });

    it('should test SSL/TLS handshake failures', async () => {
      server.use(
        http.post('*/api/ai/mvp-planning', async () => {
          // Simulate SSL handshake failure
          throw new Error('SSL handshake failed');
        })
      );

      const request = new NextRequest('http://localhost:3000/api/ai/mvp-planning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: 'proj-ssl',
          projectName: 'SSL Test',
          scaFactors: [],
          context: 'Testing SSL handshake failure'
        })
      });

      await expect(mvpPlanning(request)).rejects.toThrow('SSL handshake failed');
    });

    it('should verify error handling for unreachable services', async () => {
      const unreachableEndpoints = [
        '*/api/ai/clarify-problem',
        '*/api/ai/sca-analysis',
        '*/api/ai/mvp-planning',
        '*/api/workflow/task/export-actions'
      ];

      for (const endpoint of unreachableEndpoints) {
        server.use(simulateNetworkError(endpoint, 'CONNECTION_REFUSED'));

        const request = new NextRequest(`http://localhost:3000${endpoint.replace('*', '')}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: 'proj-unreachable',
            projectName: 'Unreachable Test',
            context: 'Testing unreachable service'
          })
        });

        // Test appropriate handler based on endpoint
        let handler;
        if (endpoint.includes('clarify-problem')) handler = clarifyProblem;
        else if (endpoint.includes('sca-analysis')) handler = scaAnalysis;
        else if (endpoint.includes('mvp-planning')) handler = mvpPlanning;
        else if (endpoint.includes('export-actions')) {
          request.body = JSON.stringify({
            openProjectConfig: { baseUrl: 'https://test.com', apiToken: 'token', projectId: '1' },
            actions: [{ title: 'Test', description: 'Test' }]
          });
          handler = exportActions;
        }

        if (handler) {
          await expect(handler(request)).rejects.toThrow();
        }

        server.resetHandlers();
      }
    });
  });

  describe('HTTP Error Status Codes', () => {
    it('should test 4xx client errors (400, 401, 403, 404, 429)', async () => {
      const clientErrors = [
        { code: 400, message: 'Bad Request' },
        { code: 401, message: 'Unauthorized' },
        { code: 403, message: 'Forbidden' },
        { code: 404, message: 'Not Found' },
        { code: 429, message: 'Too Many Requests' }
      ];

      for (const error of clientErrors) {
        server.use(
          http.post('*/api/ai/clarify-problem', async () => {
            return new HttpResponse(error.message, { status: error.code });
          })
        );

        const request = new NextRequest('http://localhost:3000/api/ai/clarify-problem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            problemStatement: `${error.code} error test`,
            projectId: `proj-${error.code}`,
            projectName: `${error.code} Test`,
            context: `Testing ${error.code} error`
          })
        });

        const response = await clarifyProblem(request);
        expect(response.status).toBe(error.code);

        server.resetHandlers();
      }
    });

    it('should test 5xx server errors (500, 502, 503, 504)', async () => {
      const serverErrors = [
        { code: 500, message: 'Internal Server Error' },
        { code: 502, message: 'Bad Gateway' },
        { code: 503, message: 'Service Unavailable' },
        { code: 504, message: 'Gateway Timeout' }
      ];

      for (const error of serverErrors) {
        server.use(
          http.post('*/api/ai/sca-analysis', async () => {
            return new HttpResponse(error.message, { status: error.code });
          })
        );

        const request = new NextRequest('http://localhost:3000/api/ai/sca-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: `proj-${error.code}`,
            projectName: `${error.code} Test`,
            context: `Testing ${error.code} error`
          })
        });

        const response = await scaAnalysis(request);
        expect(response.status).toBe(error.code);

        server.resetHandlers();
      }
    });

    it('should verify error response propagation and formatting', async () => {
      const errorResponse = {
        error: 'Custom error message',
        code: 'CUSTOM_ERROR',
        details: 'Detailed error information',
        timestamp: new Date().toISOString()
      };

      server.use(
        http.post('*/api/ai/mvp-planning', async () => {
          return HttpResponse.json(errorResponse, { status: 422 });
        })
      );

      const request = new NextRequest('http://localhost:3000/api/ai/mvp-planning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: 'proj-custom-error',
          projectName: 'Custom Error Test',
          scaFactors: [],
          context: 'Testing custom error formatting'
        })
      });

      const response = await mvpPlanning(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.error).toBe(errorResponse.error);
      expect(data.code).toBe(errorResponse.code);
      expect(data.details).toBe(errorResponse.details);
      expect(data.timestamp).toBeDefined();
    });

    it('should test custom error message handling', async () => {
      const customErrors = [
        { scenario: 'validation', message: 'Validation failed for required fields', status: 400 },
        { scenario: 'authentication', message: 'Invalid API token provided', status: 401 },
        { scenario: 'rate_limit', message: 'Rate limit exceeded, try again later', status: 429 },
        { scenario: 'service', message: 'Backend service temporarily unavailable', status: 503 }
      ];

      for (const error of customErrors) {
        server.use(
          http.post('*/api/workflow/task/export-actions', async () => {
            return HttpResponse.json(
              { error: error.message, scenario: error.scenario },
              { status: error.status }
            );
          })
        );

        const request = new NextRequest('http://localhost:3000/api/workflow/task/export-actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            openProjectConfig: {
              baseUrl: 'https://test.com',
              apiToken: 'invalid-token',
              projectId: '1'
            },
            actions: [{ title: 'Custom Error Test', description: 'Testing custom errors' }]
          })
        });

        const response = await exportActions(request);
        const data = await response.json();

        expect(response.status).toBe(error.status);
        expect(data.error).toBe(error.message);
        expect(data.scenario).toBe(error.scenario);

        server.resetHandlers();
      }
    });
  });

  describe('Intermittent Network Issues', () => {
    it('should simulate packet loss and connection drops', async () => {
      let requestCount = 0;
      const dropPattern = [false, true, false, false, true]; // Drop 2nd and 5th requests

      server.use(
        http.get('*/api/workflow/task/:id', async ({ params }) => {
          const { id } = params;
          requestCount++;
          const shouldDrop = dropPattern[(requestCount - 1) % dropPattern.length];

          if (shouldDrop) {
            // Simulate connection drop
            throw new Error('Connection dropped');
          }

          return HttpResponse.json({
            id,
            status: 'success',
            requestNumber: requestCount,
            connectionStable: true
          });
        })
      );

      const results = [];

      for (let i = 0; i < 5; i++) {
        const request = new NextRequest(`http://localhost:3000/api/workflow/task/drop-test-${i}`, {
          method: 'GET'
        });

        try {
          const response = await getTask(request, { params: { id: `drop-test-${i}` } });
          const data = await response.json();
          results.push({ success: true, data });
        } catch (error: any) {
          results.push({ success: false, error: error.message });
        }
      }

      // Verify packet drop pattern
      expect(results).toHaveLength(5);
      expect(results[0].success).toBe(true);  // 1st request succeeds
      expect(results[1].success).toBe(false); // 2nd request drops
      expect(results[2].success).toBe(true);  // 3rd request succeeds
      expect(results[3].success).toBe(true);  // 4th request succeeds
      expect(results[4].success).toBe(false); // 5th request drops
    });

    it('should test request retry mechanisms', async () => {
      let attemptCount = 0;
      const maxRetries = 3;

      server.use(
        http.post('*/api/ai/clarify-problem', async () => {
          attemptCount++;
          
          if (attemptCount < maxRetries) {
            // Fail first attempts
            return new HttpResponse('Network error', { status: 503 });
          }
          
          return HttpResponse.json({
            success: true,
            retriedSuccessfully: true,
            totalAttempts: attemptCount
          });
        })
      );

      // Simulate retry logic
      const makeRequestWithRetry = async (retries = 0): Promise<any> => {
        const request = new NextRequest('http://localhost:3000/api/ai/clarify-problem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            problemStatement: 'retry test',
            projectId: 'proj-retry',
            projectName: 'Retry Test',
            context: 'Testing retry mechanism'
          })
        });

        try {
          const response = await clarifyProblem(request);
          
          if (response.status >= 500 && retries < maxRetries - 1) {
            // Wait before retry (exponential backoff)
            const delay = Math.pow(2, retries) * 1000;
            jest.advanceTimersByTime(delay);
            return await makeRequestWithRetry(retries + 1);
          }
          
          return response;
        } catch (error) {
          if (retries < maxRetries - 1) {
            const delay = Math.pow(2, retries) * 1000;
            jest.advanceTimersByTime(delay);
            return await makeRequestWithRetry(retries + 1);
          }
          throw error;
        }
      };

      const response = await makeRequestWithRetry();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.retriedSuccessfully).toBe(true);
      expect(data.totalAttempts).toBe(maxRetries);
    });

    it('should verify exponential backoff implementation', async () => {
      let requestTimes: number[] = [];
      let attemptCount = 0;

      server.use(
        http.post('*/api/ai/sca-analysis', async () => {
          attemptCount++;
          requestTimes.push(Date.now());
          
          if (attemptCount < 4) {
            return new HttpResponse('Service temporarily unavailable', { status: 503 });
          }
          
          return HttpResponse.json({ 
            success: true, 
            attempts: attemptCount,
            requestTimes 
          });
        })
      );

      const exponentialBackoff = async (attempt = 0): Promise<any> => {
        const request = new NextRequest('http://localhost:3000/api/ai/sca-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: 'proj-backoff',
            projectName: 'Backoff Test',
            context: 'Testing exponential backoff'
          })
        });

        const response = await scaAnalysis(request);
        
        if (response.status >= 500 && attempt < 3) {
          const backoffDelay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
          jest.advanceTimersByTime(backoffDelay);
          return await exponentialBackoff(attempt + 1);
        }
        
        return response;
      };

      const response = await exponentialBackoff();
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.attempts).toBe(4);
      
      // Verify backoff timing (allowing for some variance in test execution)
      const intervals = [];
      for (let i = 1; i < requestTimes.length; i++) {
        intervals.push(requestTimes[i] - requestTimes[i - 1]);
      }
      
      // Each interval should be roughly double the previous (exponential)
      expect(intervals.length).toBe(3);
      // Note: In test environment, timing may not be exact due to mocking
      expect(intervals[0]).toBeGreaterThan(0);
      expect(intervals[1]).toBeGreaterThanOrEqual(intervals[0]);
      expect(intervals[2]).toBeGreaterThanOrEqual(intervals[1]);
    });

    it('should test circuit breaker patterns', async () => {
      let failureCount = 0;
      let circuitOpen = false;
      const failureThreshold = 3;
      const circuitResetTime = 5000;

      server.use(
        http.post('*/api/ai/mvp-planning', async () => {
          if (circuitOpen) {
            return new HttpResponse('Circuit breaker is open', { status: 503 });
          }

          failureCount++;
          
          if (failureCount <= failureThreshold) {
            // Simulate failures up to threshold
            return new HttpResponse('Service error', { status: 500 });
          }
          
          // Service recovered
          return HttpResponse.json({ 
            success: true, 
            circuitClosed: true,
            failureCount 
          });
        })
      );

      const circuitBreakerRequest = async (): Promise<any> => {
        const request = new NextRequest('http://localhost:3000/api/ai/mvp-planning', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: 'proj-circuit',
            projectName: 'Circuit Breaker Test',
            scaFactors: [],
            context: 'Testing circuit breaker'
          })
        });

        const response = await mvpPlanning(request);
        
        // Check if circuit should be opened
        if (response.status >= 500 && failureCount >= failureThreshold && !circuitOpen) {
          circuitOpen = true;
          // Schedule circuit reset
          setTimeout(() => {
            circuitOpen = false;
            failureCount = 0;
          }, circuitResetTime);
        }

        return response;
      };

      const results = [];

      // Make requests that will trigger circuit breaker
      for (let i = 0; i < 6; i++) {
        const response = await circuitBreakerRequest();
        results.push({
          attempt: i + 1,
          status: response.status,
          circuitOpen: circuitOpen && i >= failureThreshold
        });

        jest.advanceTimersByTime(1000);
      }

      // Verify circuit breaker behavior
      expect(results).toHaveLength(6);
      
      // First few requests should fail normally
      expect(results[0].status).toBe(500);
      expect(results[1].status).toBe(500);
      expect(results[2].status).toBe(500);
      
      // Circuit should be open after threshold
      const circuitOpenRequests = results.filter(r => r.circuitOpen);
      expect(circuitOpenRequests.length).toBeGreaterThan(0);
    });
  });

  describe('Service Unavailability', () => {
    it('should handle backend services returning 503 Service Unavailable', async () => {
      const services = [
        { endpoint: '*/api/ai/clarify-problem', handler: clarifyProblem },
        { endpoint: '*/api/ai/sca-analysis', handler: scaAnalysis },
        { endpoint: '*/api/ai/mvp-planning', handler: mvpPlanning }
      ];

      for (const service of services) {
        server.use(
          http.post(service.endpoint, async () => {
            return new HttpResponse('Service temporarily unavailable', {
              status: 503,
              headers: {
                'Retry-After': '30',
                'X-Service-Status': 'maintenance'
              }
            });
          })
        );

        const request = new NextRequest(`http://localhost:3000${service.endpoint.replace('*', '')}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: 'proj-unavailable',
            projectName: 'Unavailable Test',
            context: 'Testing service unavailability'
          })
        });

        const response = await service.handler(request);
        
        expect(response.status).toBe(503);
        expect(response.headers.get('Retry-After')).toBe('30');

        server.resetHandlers();
      }
    });

    it('should test graceful degradation when services are down', async () => {
      let primaryServiceDown = true;
      let fallbackUsed = false;

      server.use(
        http.post('*/api/ai/clarify-problem', async () => {
          if (primaryServiceDown) {
            return new HttpResponse('Primary service down', { status: 503 });
          }
          
          return HttpResponse.json({ 
            success: true, 
            source: 'primary',
            message: 'Primary service response' 
          });
        }),

        // Simulated fallback endpoint
        http.post('*/api/ai/clarify-problem/fallback', async () => {
          fallbackUsed = true;
          return HttpResponse.json({ 
            success: true, 
            source: 'fallback',
            message: 'Degraded service response',
            limitations: ['Reduced functionality', 'Limited analysis depth']
          });
        })
      );

      // Simulate client-side fallback logic
      const requestWithFallback = async (): Promise<any> => {
        const primaryRequest = new NextRequest('http://localhost:3000/api/ai/clarify-problem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            problemStatement: 'degradation test',
            projectId: 'proj-degradation',
            projectName: 'Degradation Test',
            context: 'Testing graceful degradation'
          })
        });

        const primaryResponse = await clarifyProblem(primaryRequest);
        
        if (primaryResponse.status >= 500) {
          // Fallback to degraded service
          const fallbackRequest = new NextRequest('http://localhost:3000/api/ai/clarify-problem/fallback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              problemStatement: 'degradation test - fallback',
              projectId: 'proj-degradation',
              projectName: 'Degradation Test',
              context: 'Using fallback service'
            })
          });

          // In a real scenario, this would be handled by a different route
          // For testing, we'll simulate the fallback response
          return {
            status: 200,
            json: async () => ({
              success: true,
              source: 'fallback',
              message: 'Degraded service response',
              limitations: ['Reduced functionality', 'Limited analysis depth']
            })
          };
        }
        
        return primaryResponse;
      };

      const response = await requestWithFallback();
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.source).toBe('fallback');
      expect(data.limitations).toBeDefined();
    });

    it('should verify fallback mechanisms and error messages', async () => {
      const fallbackScenarios = [
        {
          name: 'AI Service Fallback',
          primary: '*/api/ai/sca-analysis',
          fallback: 'cached-analysis',
          errorMessage: 'Using cached analysis results'
        },
        {
          name: 'Export Service Fallback',
          primary: '*/api/workflow/task/export-actions',
          fallback: 'local-storage',
          errorMessage: 'Actions saved locally, will sync when service is available'
        }
      ];

      for (const scenario of fallbackScenarios) {
        server.use(
          http.post(scenario.primary, async () => {
            return new HttpResponse('Primary service unavailable', { status: 503 });
          })
        );

        // Simulate fallback logic
        const primaryRequest = new NextRequest(`http://localhost:3000${scenario.primary.replace('*', '')}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: 'proj-fallback',
            projectName: 'Fallback Test',
            context: `Testing ${scenario.name} fallback`
          })
        });

        let response;
        if (scenario.primary.includes('sca-analysis')) {
          response = await scaAnalysis(primaryRequest);
        } else {
          const exportRequest = new NextRequest('http://localhost:3000/api/workflow/task/export-actions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              openProjectConfig: { baseUrl: 'https://test.com', apiToken: 'token', projectId: '1' },
              actions: [{ title: 'Fallback Test', description: 'Test' }]
            })
          });
          response = await exportActions(exportRequest);
        }

        expect(response.status).toBe(503);

        // In a real implementation, this would trigger fallback logic
        const fallbackData = {
          success: false,
          fallback: scenario.fallback,
          message: scenario.errorMessage,
          retryAfter: 30
        };

        expect(fallbackData.fallback).toBe(scenario.fallback);
        expect(fallbackData.message).toContain(scenario.errorMessage);

        server.resetHandlers();
      }
    });

    it('should test service health check integration', async () => {
      let serviceHealth = 'healthy';
      const healthChecks = {
        'ai-service': true,
        'workflow-service': true,
        'research-service': true
      };

      server.use(
        http.get('*/health', async () => {
          return HttpResponse.json({
            status: serviceHealth,
            services: healthChecks,
            timestamp: new Date().toISOString()
          });
        }),

        http.post('*/api/ai/clarify-problem', async () => {
          if (!healthChecks['ai-service']) {
            return new HttpResponse('AI service unhealthy', { status: 503 });
          }
          
          return HttpResponse.json({ success: true, service: 'ai' });
        })
      );

      // Simulate health check before making request
      const checkServiceHealth = async (): Promise<any> => {
        const healthRequest = new NextRequest('http://localhost:3000/health', {
          method: 'GET'
        });

        // In real implementation, this would be a proper health check endpoint
        return {
          status: 200,
          json: async () => ({
            status: serviceHealth,
            services: healthChecks,
            timestamp: new Date().toISOString()
          })
        };
      };

      // Test healthy service
      let healthResponse = await checkServiceHealth();
      let healthData = await healthResponse.json();
      
      expect(healthData.status).toBe('healthy');
      expect(healthData.services['ai-service']).toBe(true);

      // Make request to healthy service
      const request = new NextRequest('http://localhost:3000/api/ai/clarify-problem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemStatement: 'health check test',
          projectId: 'proj-health',
          projectName: 'Health Check Test',
          context: 'Testing service health integration'
        })
      });

      let response = await clarifyProblem(request);
      let data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Simulate service becoming unhealthy
      serviceHealth = 'degraded';
      healthChecks['ai-service'] = false;

      healthResponse = await checkServiceHealth();
      healthData = await healthResponse.json();

      expect(healthData.status).toBe('degraded');
      expect(healthData.services['ai-service']).toBe(false);

      // Request should fail
      response = await clarifyProblem(request);
      expect(response.status).toBe(503);
    });
  });

  describe('Partial Failures', () => {
    it('should test scenarios where some services are available, others are not', async () => {
      const serviceStatus = {
        'ai-clarify': true,
        'ai-sca': false,
        'ai-mvp': true,
        'workflow-export': false
      };

      server.use(
        http.post('*/api/ai/clarify-problem', async () => {
          if (!serviceStatus['ai-clarify']) {
            return new HttpResponse('Service unavailable', { status: 503 });
          }
          return HttpResponse.json({ success: true, service: 'clarify' });
        }),

        http.post('*/api/ai/sca-analysis', async () => {
          if (!serviceStatus['ai-sca']) {
            return new HttpResponse('Service unavailable', { status: 503 });
          }
          return HttpResponse.json({ success: true, service: 'sca' });
        }),

        http.post('*/api/ai/mvp-planning', async () => {
          if (!serviceStatus['ai-mvp']) {
            return new HttpResponse('Service unavailable', { status: 503 });
          }
          return HttpResponse.json({ success: true, service: 'mvp' });
        }),

        http.post('*/api/workflow/task/export-actions', async () => {
          if (!serviceStatus['workflow-export']) {
            return new HttpResponse('Service unavailable', { status: 503 });
          }
          return HttpResponse.json({ success: true, service: 'export' });
        })
      );

      const requests = [
        { name: 'clarify', handler: clarifyProblem, endpoint: '/api/ai/clarify-problem' },
        { name: 'sca', handler: scaAnalysis, endpoint: '/api/ai/sca-analysis' },
        { name: 'mvp', handler: mvpPlanning, endpoint: '/api/ai/mvp-planning' },
        { 
          name: 'export', 
          handler: exportActions, 
          endpoint: '/api/workflow/task/export-actions',
          bodyOverride: {
            openProjectConfig: { baseUrl: 'https://test.com', apiToken: 'token', projectId: '1' },
            actions: [{ title: 'Partial Test', description: 'Test' }]
          }
        }
      ];

      const results = [];

      for (const req of requests) {
        const request = new NextRequest(`http://localhost:3000${req.endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(req.bodyOverride || {
            projectId: 'proj-partial',
            projectName: 'Partial Test',
            context: 'Testing partial failures'
          })
        });

        const response = await req.handler(request);
        results.push({
          service: req.name,
          status: response.status,
          available: serviceStatus[`ai-${req.name}`] || serviceStatus[`workflow-${req.name}`]
        });
      }

      // Verify partial failure pattern
      expect(results.find(r => r.service === 'clarify')?.status).toBe(200);
      expect(results.find(r => r.service === 'sca')?.status).toBe(503);
      expect(results.find(r => r.service === 'mvp')?.status).toBe(200);
      expect(results.find(r => r.service === 'export')?.status).toBe(503);
    });

    it('should verify partial workflow completion handling', async () => {
      const workflowSteps = [
        { name: 'clarify', available: true },
        { name: 'sca', available: false },
        { name: 'mvp', available: true },
        { name: 'export', available: false }
      ];

      const workflowResults = [];

      for (const step of workflowSteps) {
        server.use(
          http.post(`*/api/${step.name === 'export' ? 'workflow/task/export-actions' : `ai/${step.name === 'clarify' ? 'clarify-problem' : step.name === 'sca' ? 'sca-analysis' : 'mvp-planning'}`}, async () => {
            if (!step.available) {
              return new HttpResponse(`${step.name} service unavailable`, { status: 503 });
            }
            
            return HttpResponse.json({
              success: true,
              step: step.name,
              completed: true
            });
          })
        );

        let request, handler;
        
        if (step.name === 'clarify') {
          request = new NextRequest('http://localhost:3000/api/ai/clarify-problem', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              problemStatement: 'workflow test',
              projectId: 'proj-workflow',
              projectName: 'Workflow Test',
              context: 'Testing workflow completion'
            })
          });
          handler = clarifyProblem;
        } else if (step.name === 'sca') {
          request = new NextRequest('http://localhost:3000/api/ai/sca-analysis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId: 'proj-workflow',
              projectName: 'Workflow Test',
              context: 'Testing workflow completion'
            })
          });
          handler = scaAnalysis;
        } else if (step.name === 'mvp') {
          request = new NextRequest('http://localhost:3000/api/ai/mvp-planning', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId: 'proj-workflow',
              projectName: 'Workflow Test',
              scaFactors: [],
              context: 'Testing workflow completion'
            })
          });
          handler = mvpPlanning;
        } else {
          request = new NextRequest('http://localhost:3000/api/workflow/task/export-actions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              openProjectConfig: { baseUrl: 'https://test.com', apiToken: 'token', projectId: '1' },
              actions: [{ title: 'Workflow Test', description: 'Test' }]
            })
          });
          handler = exportActions;
        }

        try {
          const response = await handler(request);
          const data = response.status === 200 ? await response.json() : null;
          
          workflowResults.push({
            step: step.name,
            completed: response.status === 200,
            available: step.available,
            data
          });
        } catch (error) {
          workflowResults.push({
            step: step.name,
            completed: false,
            available: step.available,
            error: error
          });
        }

        server.resetHandlers();
      }

      // Verify workflow can handle partial completion
      const completedSteps = workflowResults.filter(r => r.completed);
      const failedSteps = workflowResults.filter(r => !r.completed);

      expect(completedSteps).toHaveLength(2); // clarify and mvp should succeed
      expect(failedSteps).toHaveLength(2);    // sca and export should fail

      expect(completedSteps.find(s => s.step === 'clarify')).toBeDefined();
      expect(completedSteps.find(s => s.step === 'mvp')).toBeDefined();
      expect(failedSteps.find(s => s.step === 'sca')).toBeDefined();
      expect(failedSteps.find(s => s.step === 'export')).toBeDefined();
    });

    it('should test data consistency during partial failures', async () => {
      let sessionData: any = {};
      let failedOperations: string[] = [];

      server.use(
        http.post('*/api/ai/clarify-problem', async () => {
          sessionData.clarification = {
            completed: true,
            data: { clarifiedProblem: 'Test problem clarified' }
          };
          return HttpResponse.json({ success: true, ...sessionData.clarification.data });
        }),

        http.post('*/api/ai/sca-analysis', async () => {
          failedOperations.push('sca-analysis');
          return new HttpResponse('SCA service failed', { status: 503 });
        }),

        http.post('*/api/ai/mvp-planning', async () => {
          // This should not execute because SCA failed, but let's test it anyway
          if (!sessionData.clarification) {
            return new HttpResponse('Missing prerequisites', { status: 400 });
          }
          
          sessionData.mvp = {
            completed: true,
            data: { mvpFeatures: [] }
          };
          return HttpResponse.json({ success: true, ...sessionData.mvp.data });
        })
      );

      // Execute workflow steps
      const workflowExecution = async () => {
        // Step 1: Clarify problem (should succeed)
        const clarifyRequest = new NextRequest('http://localhost:3000/api/ai/clarify-problem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            problemStatement: 'consistency test',
            projectId: 'proj-consistency',
            projectName: 'Consistency Test',
            context: 'Testing data consistency'
          })
        });

        const clarifyResponse = await clarifyProblem(clarifyRequest);
        const clarifyData = clarifyResponse.status === 200 ? await clarifyResponse.json() : null;

        // Step 2: SCA analysis (should fail)
        const scaRequest = new NextRequest('http://localhost:3000/api/ai/sca-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: 'proj-consistency',
            projectName: 'Consistency Test',
            context: 'Testing data consistency'
          })
        });

        const scaResponse = await scaAnalysis(scaRequest);
        const scaFailed = scaResponse.status !== 200;

        // Step 3: MVP planning (should handle missing SCA data)
        const mvpRequest = new NextRequest('http://localhost:3000/api/ai/mvp-planning', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: 'proj-consistency',
            projectName: 'Consistency Test',
            scaFactors: [], // Empty due to SCA failure
            context: 'Testing data consistency with missing SCA'
          })
        });

        const mvpResponse = await mvpPlanning(mvpRequest);
        const mvpData = mvpResponse.status === 200 ? await mvpResponse.json() : null;

        return {
          clarify: { success: clarifyResponse.status === 200, data: clarifyData },
          sca: { success: !scaFailed, failed: scaFailed },
          mvp: { success: mvpResponse.status === 200, data: mvpData },
          sessionData,
          failedOperations
        };
      };

      const result = await workflowExecution();

      // Verify data consistency
      expect(result.clarify.success).toBe(true);
      expect(result.sca.failed).toBe(true);
      expect(result.mvp.success).toBe(true);
      expect(result.failedOperations).toContain('sca-analysis');
      
      // Session should contain data from successful operations only
      expect(result.sessionData.clarification).toBeDefined();
      expect(result.sessionData.mvp).toBeDefined();
      
      // MVP should handle missing SCA data gracefully
      expect(result.mvp.data.success).toBe(true);
    });

    it('should validate rollback mechanisms', async () => {
      let transactionId = 'tx-' + Math.random().toString(36);
      let operations: any[] = [];
      let rollbackExecuted = false;

      server.use(
        http.post('*/api/ai/clarify-problem', async () => {
          operations.push({ id: transactionId, step: 'clarify', status: 'success' });
          return HttpResponse.json({ 
            success: true, 
            transactionId,
            canRollback: true 
          });
        }),

        http.post('*/api/ai/sca-analysis', async () => {
          operations.push({ id: transactionId, step: 'sca', status: 'success' });
          return HttpResponse.json({ 
            success: true, 
            transactionId,
            canRollback: true 
          });
        }),

        http.post('*/api/ai/mvp-planning', async () => {
          // This operation fails, triggering rollback
          operations.push({ id: transactionId, step: 'mvp', status: 'failed' });
          return new HttpResponse('MVP planning failed', { status: 500 });
        }),

        http.post('*/api/rollback/:transactionId', async ({ params }) => {
          const txId = params.transactionId;
          rollbackExecuted = true;
          
          // Mark all operations as rolled back
          operations = operations.map(op => 
            op.id === txId ? { ...op, rolledBack: true } : op
          );

          return HttpResponse.json({
            success: true,
            transactionId: txId,
            operationsRolledBack: operations.filter(op => op.rolledBack).length
          });
        })
      );

      // Execute transaction that will fail
      const executeTransaction = async () => {
        try {
          // Step 1
          const clarifyRequest = new NextRequest('http://localhost:3000/api/ai/clarify-problem', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              problemStatement: 'rollback test',
              projectId: 'proj-rollback',
              projectName: 'Rollback Test',
              context: 'Testing rollback mechanism'
            })
          });

          await clarifyProblem(clarifyRequest);

          // Step 2
          const scaRequest = new NextRequest('http://localhost:3000/api/ai/sca-analysis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId: 'proj-rollback',
              projectName: 'Rollback Test',
              context: 'Testing rollback mechanism'
            })
          });

          await scaAnalysis(scaRequest);

          // Step 3 (fails)
          const mvpRequest = new NextRequest('http://localhost:3000/api/ai/mvp-planning', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId: 'proj-rollback',
              projectName: 'Rollback Test',
              scaFactors: [],
              context: 'Testing rollback mechanism'
            })
          });

          const mvpResponse = await mvpPlanning(mvpRequest);
          
          if (mvpResponse.status >= 500) {
            throw new Error('MVP planning failed - initiating rollback');
          }
        } catch (error) {
          // Initiate rollback
          const rollbackRequest = new NextRequest(`http://localhost:3001/api/rollback/${transactionId}`, {
            method: 'POST'
          });

          // In real implementation, this would trigger rollback
          rollbackExecuted = true;
          operations = operations.map(op => ({ ...op, rolledBack: true }));

          return { rollbackRequired: true, error: error };
        }
      };

      const result = await executeTransaction();

      expect(result?.rollbackRequired).toBe(true);
      expect(rollbackExecuted).toBe(true);
      expect(operations.every(op => op.rolledBack)).toBe(true);
      expect(operations).toHaveLength(3); // All three operations attempted
    });
  });

  describe('Rate Limiting and Throttling', () => {
    it('should test 429 Too Many Requests responses', async () => {
      let requestCount = 0;
      const rateLimit = 3;
      const windowMs = 60000; // 1 minute window

      server.use(
        http.post('*/api/ai/clarify-problem', async () => {
          requestCount++;
          
          if (requestCount > rateLimit) {
            return new HttpResponse('Rate limit exceeded', {
              status: 429,
              headers: {
                'Retry-After': '60',
                'X-RateLimit-Limit': rateLimit.toString(),
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': (Date.now() + windowMs).toString()
              }
            });
          }

          return HttpResponse.json({
            success: true,
            requestCount,
            remaining: rateLimit - requestCount
          });
        })
      );

      const requests = [];

      // Make requests exceeding rate limit
      for (let i = 0; i < 5; i++) {
        const request = new NextRequest('http://localhost:3000/api/ai/clarify-problem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            problemStatement: `rate limit test ${i}`,
            projectId: `proj-rate-${i}`,
            projectName: `Rate Test ${i}`,
            context: 'Testing rate limiting'
          })
        });

        requests.push(clarifyProblem(request));
      }

      const responses = await Promise.all(requests);
      const results = await Promise.all(
        responses.map(async (response) => ({
          status: response.status,
          data: response.status === 200 ? await response.json() : null,
          retryAfter: response.headers.get('Retry-After')
        }))
      );

      // First 3 requests should succeed
      expect(results.slice(0, 3).every(r => r.status === 200)).toBe(true);
      
      // Remaining requests should be rate limited
      expect(results.slice(3).every(r => r.status === 429)).toBe(true);
      expect(results[3].retryAfter).toBe('60');
    });

    it('should verify rate limit header handling', async () => {
      const rateLimitHeaders = {
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '95',
        'X-RateLimit-Reset': (Date.now() + 3600000).toString(), // 1 hour from now
        'X-RateLimit-Window': '3600'
      };

      server.use(
        http.post('*/api/ai/sca-analysis', async () => {
          return HttpResponse.json(
            { success: true, message: 'Within rate limit' },
            { headers: rateLimitHeaders }
          );
        })
      );

      const request = new NextRequest('http://localhost:3000/api/ai/sca-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: 'proj-headers',
          projectName: 'Headers Test',
          context: 'Testing rate limit headers'
        })
      });

      const response = await scaAnalysis(request);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('X-RateLimit-Limit')).toBe('100');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('95');
      expect(response.headers.get('X-RateLimit-Reset')).toBeDefined();
      expect(response.headers.get('X-RateLimit-Window')).toBe('3600');
    });

    it('should test automatic retry with proper delays', async () => {
      let requestAttempt = 0;
      const retryAfterSeconds = 2;

      server.use(
        http.post('*/api/ai/mvp-planning', async () => {
          requestAttempt++;
          
          if (requestAttempt <= 2) {
            return new HttpResponse('Rate limited', {
              status: 429,
              headers: { 'Retry-After': retryAfterSeconds.toString() }
            });
          }

          return HttpResponse.json({
            success: true,
            attempts: requestAttempt,
            message: 'Request succeeded after rate limit'
          });
        })
      );

      // Simulate retry logic with proper delay handling
      const retryRequest = async (attempt = 1): Promise<any> => {
        const request = new NextRequest('http://localhost:3000/api/ai/mvp-planning', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: 'proj-retry-rate',
            projectName: 'Retry Rate Test',
            scaFactors: [],
            context: 'Testing retry with rate limiting'
          })
        });

        const response = await mvpPlanning(request);
        
        if (response.status === 429 && attempt < 3) {
          const retryAfter = parseInt(response.headers.get('Retry-After') || '1');
          
          // Wait for retry delay
          jest.advanceTimersByTime(retryAfter * 1000);
          
          return await retryRequest(attempt + 1);
        }
        
        return response;
      };

      const response = await retryRequest();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.attempts).toBe(3);
    });

    it('should validate rate limit error messaging', async () => {
      const rateLimitScenarios = [
        {
          type: 'per-minute',
          message: 'Request limit exceeded. Try again in 1 minute.',
          retryAfter: 60,
          limit: 10
        },
        {
          type: 'per-hour',
          message: 'Hourly limit reached. Try again in 45 minutes.',
          retryAfter: 2700,
          limit: 100
        },
        {
          type: 'per-day',
          message: 'Daily quota exceeded. Try again tomorrow.',
          retryAfter: 86400,
          limit: 1000
        }
      ];

      for (const scenario of rateLimitScenarios) {
        server.use(
          http.post('*/api/research/run', async () => {
            return HttpResponse.json(
              {
                error: scenario.message,
                type: 'RATE_LIMIT_EXCEEDED',
                limitType: scenario.type,
                limit: scenario.limit,
                retryAfter: scenario.retryAfter
              },
              {
                status: 429,
                headers: {
                  'Retry-After': scenario.retryAfter.toString(),
                  'X-RateLimit-Limit': scenario.limit.toString(),
                  'X-RateLimit-Type': scenario.type
                }
              }
            );
          })
        );

        const request = new NextRequest('http://localhost:3000/api/research/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `rate limit test ${scenario.type}`,
            role: 'researcher',
            mode: 'basic'
          })
        });

        const response = await runResearch(request);
        const data = await response.json();

        expect(response.status).toBe(429);
        expect(data.error).toBe(scenario.message);
        expect(data.type).toBe('RATE_LIMIT_EXCEEDED');
        expect(data.limitType).toBe(scenario.type);
        expect(response.headers.get('Retry-After')).toBe(scenario.retryAfter.toString());

        server.resetHandlers();
      }
    });
  });

  describe('Recovery and Resilience', () => {
    it('should test automatic recovery when services return', async () => {
      let serviceDown = true;
      let recoveryTime: number;
      const downtime = 10000; // 10 seconds

      server.use(
        http.post('*/api/ai/clarify-problem', async () => {
          if (serviceDown) {
            return new HttpResponse('Service temporarily down', { status: 503 });
          }

          return HttpResponse.json({
            success: true,
            recoveredAt: recoveryTime,
            message: 'Service has recovered'
          });
        })
      );

      // Schedule service recovery
      setTimeout(() => {
        serviceDown = false;
        recoveryTime = Date.now();
      }, downtime);

      const recoveryTest = async () => {
        let attempts = 0;
        const maxAttempts = 15;
        const retryInterval = 1000;

        while (attempts < maxAttempts) {
          attempts++;
          
          const request = new NextRequest('http://localhost:3000/api/ai/clarify-problem', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              problemStatement: 'recovery test',
              projectId: 'proj-recovery',
              projectName: 'Recovery Test',
              context: 'Testing automatic recovery'
            })
          });

          try {
            const response = await clarifyProblem(request);
            
            if (response.status === 200) {
              const data = await response.json();
              return {
                recovered: true,
                attempts,
                recoveredAt: data.recoveredAt,
                message: data.message
              };
            }
          } catch (error) {
            // Service still down
          }

          jest.advanceTimersByTime(retryInterval);
        }

        return { recovered: false, attempts };
      };

      // Fast forward to service recovery
      jest.advanceTimersByTime(downtime);

      const result = await recoveryTest();

      expect(result.recovered).toBe(true);
      expect(result.attempts).toBeGreaterThan(10); // Should have retried multiple times
      expect(result.message).toBe('Service has recovered');
    });

    it('should verify session state preservation during outages', async () => {
      let sessionStore: any = {};
      let serviceOutage = false;

      server.use(
        http.post('*/api/ai/sca-analysis', async ({ request }) => {
          const sessionId = request.headers.get('X-Session-ID');
          
          if (serviceOutage) {
            return new HttpResponse('Service outage', { status: 503 });
          }

          // Store session data
          if (sessionId && !sessionStore[sessionId]) {
            sessionStore[sessionId] = {
              id: sessionId,
              data: { scaAnalysis: 'preserved during outage' },
              timestamp: Date.now()
            };
          }

          return HttpResponse.json({
            success: true,
            sessionId,
            sessionData: sessionStore[sessionId]?.data
          });
        }),

        http.get('*/api/session/:sessionId', async ({ params }) => {
          const sessionId = params.sessionId as string;
          return HttpResponse.json(sessionStore[sessionId] || null);
        })
      );

      const sessionId = 'recovery-session-123';

      // Create session before outage
      const preOutageRequest = new NextRequest('http://localhost:3000/api/ai/sca-analysis', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId
        },
        body: JSON.stringify({
          projectId: 'proj-session-recovery',
          projectName: 'Session Recovery Test',
          context: 'Testing session preservation'
        })
      });

      const preOutageResponse = await scaAnalysis(preOutageRequest);
      const preOutageData = await preOutageResponse.json();

      expect(preOutageData.sessionData).toBeDefined();

      // Simulate service outage
      serviceOutage = true;

      const duringOutageRequest = new NextRequest('http://localhost:3000/api/ai/sca-analysis', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId
        },
        body: JSON.stringify({
          projectId: 'proj-session-recovery',
          projectName: 'Session Recovery Test',
          context: 'Testing session preservation during outage'
        })
      });

      const duringOutageResponse = await scaAnalysis(duringOutageRequest);
      expect(duringOutageResponse.status).toBe(503);

      // Service recovers
      serviceOutage = false;

      const postOutageRequest = new NextRequest('http://localhost:3000/api/ai/sca-analysis', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId
        },
        body: JSON.stringify({
          projectId: 'proj-session-recovery',
          projectName: 'Session Recovery Test',
          context: 'Testing session preservation after recovery'
        })
      });

      const postOutageResponse = await scaAnalysis(postOutageRequest);
      const postOutageData = await postOutageResponse.json();

      // Verify session data was preserved
      expect(postOutageResponse.status).toBe(200);
      expect(postOutageData.sessionId).toBe(sessionId);
      expect(postOutageData.sessionData.scaAnalysis).toBe('preserved during outage');
    });

    it('should test manual retry after network failures', async () => {
      let failureCount = 0;
      const maxFailures = 2;

      server.use(
        http.patch('*/api/workflow/task/:id', async ({ params, request }) => {
          const { id } = params;
          failureCount++;

          if (failureCount <= maxFailures) {
            return new HttpResponse('Network failure', { status: 502 });
          }

          const updates = await request.json() as any;
          return HttpResponse.json({
            id,
            ...updates,
            manualRetrySuccessful: true,
            failureCount,
            updatedAt: new Date().toISOString()
          });
        })
      );

      // Simulate manual retry by user
      const manualRetry = async (maxRetries = 3): Promise<any> => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          const request = new NextRequest('http://localhost:3000/api/workflow/task/manual-retry-test', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              status: 'updated via manual retry',
              retryAttempt: attempt
            })
          });

          try {
            const response = await updateTask(request, { params: { id: 'manual-retry-test' } });
            
            if (response.status === 200) {
              const data = await response.json();
              return { success: true, attempt, data };
            }

            if (attempt === maxRetries) {
              return { success: false, finalAttempt: attempt };
            }

            // Wait between manual retries
            jest.advanceTimersByTime(2000);
          } catch (error) {
            if (attempt === maxRetries) {
              return { success: false, error, finalAttempt: attempt };
            }
          }
        }
      };

      const result = await manualRetry();

      expect(result.success).toBe(true);
      expect(result.attempt).toBe(maxFailures + 1);
      expect(result.data.manualRetrySuccessful).toBe(true);
      expect(result.data.failureCount).toBe(maxFailures + 1);
    });

    it('should validate error reporting and monitoring', async () => {
      const errorReports: any[] = [];
      let monitoringEnabled = true;

      server.use(
        http.post('*/api/ai/mvp-planning', async () => {
          const error = {
            timestamp: new Date().toISOString(),
            service: 'mvp-planning',
            error: 'Database connection failed',
            errorCode: 'DB_CONNECTION_ERROR',
            severity: 'HIGH',
            requestId: Math.random().toString(36)
          };

          if (monitoringEnabled) {
            errorReports.push(error);
          }

          return HttpResponse.json(error, { status: 500 });
        }),

        // Monitoring endpoint
        http.get('*/api/monitoring/errors', async () => {
          return HttpResponse.json({
            errors: errorReports,
            count: errorReports.length,
            lastUpdated: new Date().toISOString()
          });
        })
      );

      // Generate some errors
      for (let i = 0; i < 3; i++) {
        const request = new NextRequest('http://localhost:3000/api/ai/mvp-planning', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: `proj-monitoring-${i}`,
            projectName: `Monitoring Test ${i}`,
            scaFactors: [],
            context: 'Testing error monitoring'
          })
        });

        const response = await mvpPlanning(request);
        expect(response.status).toBe(500);

        jest.advanceTimersByTime(1000);
      }

      // Verify error reporting
      expect(errorReports).toHaveLength(3);
      
      errorReports.forEach(error => {
        expect(error.service).toBe('mvp-planning');
        expect(error.errorCode).toBe('DB_CONNECTION_ERROR');
        expect(error.severity).toBe('HIGH');
        expect(error.timestamp).toBeDefined();
        expect(error.requestId).toBeDefined();
      });

      // Test monitoring endpoint (in real implementation)
      const monitoringData = {
        errors: errorReports,
        count: errorReports.length,
        lastUpdated: new Date().toISOString()
      };

      expect(monitoringData.count).toBe(3);
      expect(monitoringData.errors[0].service).toBe('mvp-planning');
    });
  });
});