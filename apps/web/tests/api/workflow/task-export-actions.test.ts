import { describe, it, expect, beforeEach } from '@jest/globals';
import { server, mockBackendResponse, simulateTimeout, simulateNetworkError } from '../setup';
import { NextRequest } from 'next/server';
import { POST } from '../../../app/api/workflow/task/export-actions/route';

describe('API: /api/workflow/task/export-actions', () => {
  beforeEach(() => {
    server.resetHandlers();
  });

  describe('Request/Response Validation', () => {
    it('should handle valid POST request with OpenProject config and actions', async () => {
      const requestBody = {
        openProjectConfig: {
          baseUrl: 'https://openproject.example.com',
          apiToken: 'test-api-token-123',
          projectId: '5'
        },
        actions: [
          {
            title: 'Implement user authentication',
            description: 'Create secure login and registration system',
            priority: 'high',
            estimate: '5 days'
          },
          {
            title: 'Design database schema',
            description: 'Create normalized database structure for user data',
            priority: 'medium',
            estimate: '2 days'
          }
        ]
      };

      const request = new NextRequest('http://localhost:3000/api/workflow/task/export-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results).toBeDefined();
      expect(Array.isArray(data.results)).toBe(true);
      expect(data.results).toHaveLength(2);
      
      data.results.forEach((result: any, index: number) => {
        expect(result).toHaveProperty('status');
        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('href');
        expect(result.title).toBe(requestBody.actions[index].title);
      });
    });

    it('should validate work package payload format', async () => {
      const mockOpenProjectResponse = [
        {
          id: 123,
          subject: 'Test Work Package',
          _links: {
            self: { href: 'https://openproject.example.com/api/v3/work_packages/123' }
          }
        }
      ];

      server.use(
        mockBackendResponse('*/work_packages', mockOpenProjectResponse, 201)
      );

      const requestBody = {
        openProjectConfig: {
          baseUrl: 'https://openproject.example.com',
          apiToken: 'valid-token',
          projectId: '1'
        },
        actions: [
          {
            title: 'Create API endpoint',
            description: 'Implement REST API for user management',
            priority: 'high',
            estimate: '3 days'
          }
        ]
      };

      const request = new NextRequest('http://localhost:3000/api/workflow/task/export-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results[0].status).toBe('success');
      expect(data.results[0].id).toBeDefined();
      expect(data.results[0].href).toContain('work_packages');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing OpenProject configuration', async () => {
      const requestBody = {
        actions: [
          {
            title: 'Test action',
            description: 'Test description'
          }
        ]
        // Missing openProjectConfig
      };

      const request = new NextRequest('http://localhost:3000/api/workflow/task/export-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toContain('OpenProject configuration');
    });

    it('should handle empty actions array', async () => {
      const requestBody = {
        openProjectConfig: {
          baseUrl: 'https://openproject.example.com',
          apiToken: 'test-token',
          projectId: '1'
        },
        actions: [] // Empty actions array
      };

      const request = new NextRequest('http://localhost:3000/api/workflow/task/export-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toContain('actions');
    });

    it('should handle OpenProject API authentication failures', async () => {
      server.use(
        mockBackendResponse('*/work_packages', { error: 'Unauthorized' }, 401)
      );

      const requestBody = {
        openProjectConfig: {
          baseUrl: 'https://openproject.example.com',
          apiToken: 'invalid-token',
          projectId: '1'
        },
        actions: [
          {
            title: 'Test action',
            description: 'Test description'
          }
        ]
      };

      const request = new NextRequest('http://localhost:3000/api/workflow/task/export-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.results[0].status).toBe('error');
      expect(data.results[0].error).toContain('authentication');
    });

    it('should handle OpenProject server errors', async () => {
      server.use(
        simulateNetworkError('*/work_packages', 'SERVER_ERROR')
      );

      const requestBody = {
        openProjectConfig: {
          baseUrl: 'https://openproject.example.com',
          apiToken: 'valid-token',
          projectId: '1'
        },
        actions: [
          {
            title: 'Test action',
            description: 'Test description'
          }
        ]
      };

      const request = new NextRequest('http://localhost:3000/api/workflow/task/export-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.results[0].status).toBe('error');
      expect(data.results[0].error).toBeDefined();
    });

    it('should handle partial success scenarios', async () => {
      let requestCount = 0;
      server.use(
        mockBackendResponse('*/work_packages', (req) => {
          requestCount++;
          if (requestCount === 1) {
            return { 
              id: 123, 
              _links: { self: { href: '/work_packages/123' } } 
            };
          } else {
            throw new Error('Server error');
          }
        }, 201)
      );

      const requestBody = {
        openProjectConfig: {
          baseUrl: 'https://openproject.example.com',
          apiToken: 'valid-token',
          projectId: '1'
        },
        actions: [
          {
            title: 'Success action',
            description: 'This should succeed'
          },
          {
            title: 'Failure action',
            description: 'This should fail'
          }
        ]
      };

      const request = new NextRequest('http://localhost:3000/api/workflow/task/export-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.results).toHaveLength(2);
      expect(data.results[0].status).toBe('success');
      expect(data.results[1].status).toBe('error');
    });
  });

  describe('Configuration Validation', () => {
    it('should validate and normalize baseUrl format', async () => {
      const testUrls = [
        'https://openproject.example.com',
        'https://openproject.example.com/',
        'http://localhost:8080',
        'http://localhost:8080/'
      ];

      for (const baseUrl of testUrls) {
        const requestBody = {
          openProjectConfig: {
            baseUrl,
            apiToken: 'test-token',
            projectId: '1'
          },
          actions: [
            {
              title: 'URL test action',
              description: 'Testing URL normalization'
            }
          ]
        };

        const request = new NextRequest('http://localhost:3000/api/workflow/task/export-actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        const response = await POST(request);
        expect(response.status).toBe(200);
      }
    });

    it('should validate API token handling and encoding', async () => {
      const requestBody = {
        openProjectConfig: {
          baseUrl: 'https://openproject.example.com',
          apiToken: 'complex-token-with-special-chars!@#$%',
          projectId: '1'
        },
        actions: [
          {
            title: 'Token test action',
            description: 'Testing token encoding'
          }
        ]
      };

      const request = new NextRequest('http://localhost:3000/api/workflow/task/export-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it('should validate projectId usage', async () => {
      const mockResponse = {
        id: 456,
        subject: 'Test Work Package',
        _links: {
          project: { href: '/api/v3/projects/test-project-id' }
        }
      };

      server.use(
        mockBackendResponse('*/work_packages', mockResponse, 201)
      );

      const requestBody = {
        openProjectConfig: {
          baseUrl: 'https://openproject.example.com',
          apiToken: 'valid-token',
          projectId: 'test-project-id'
        },
        actions: [
          {
            title: 'Project validation action',
            description: 'Testing project ID validation'
          }
        ]
      };

      const request = new NextRequest('http://localhost:3000/api/workflow/task/export-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results[0].status).toBe('success');
    });

    it('should handle invalid configuration combinations', async () => {
      const invalidConfigs = [
        {
          // Missing baseUrl
          apiToken: 'token',
          projectId: '1'
        },
        {
          baseUrl: 'invalid-url',
          apiToken: 'token',
          projectId: '1'
        },
        {
          baseUrl: 'https://openproject.example.com',
          // Missing apiToken
          projectId: '1'
        },
        {
          baseUrl: 'https://openproject.example.com',
          apiToken: 'token'
          // Missing projectId
        }
      ];

      for (const config of invalidConfigs) {
        const requestBody = {
          openProjectConfig: config,
          actions: [
            {
              title: 'Test action',
              description: 'Test description'
            }
          ]
        };

        const request = new NextRequest('http://localhost:3000/api/workflow/task/export-actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        const response = await POST(request);
        expect(response.status).toBe(400);
      }
    });
  });

  describe('Batch Processing', () => {
    it('should handle single action export', async () => {
      const requestBody = {
        openProjectConfig: {
          baseUrl: 'https://openproject.example.com',
          apiToken: 'valid-token',
          projectId: '1'
        },
        actions: [
          {
            title: 'Single action',
            description: 'Testing single action export',
            priority: 'high',
            estimate: '1 day'
          }
        ]
      };

      const request = new NextRequest('http://localhost:3000/api/workflow/task/export-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results).toHaveLength(1);
      expect(data.results[0].status).toBe('success');
    });

    it('should handle large batch processing', async () => {
      const actions = Array.from({ length: 20 }, (_, i) => ({
        title: `Batch action ${i + 1}`,
        description: `Description for batch action ${i + 1}`,
        priority: ['low', 'medium', 'high'][i % 3],
        estimate: `${i + 1} days`
      }));

      const requestBody = {
        openProjectConfig: {
          baseUrl: 'https://openproject.example.com',
          apiToken: 'valid-token',
          projectId: '1'
        },
        actions
      };

      const request = new NextRequest('http://localhost:3000/api/workflow/task/export-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results).toHaveLength(20);
      
      // Verify order is maintained
      data.results.forEach((result: any, index: number) => {
        expect(result.title).toBe(`Batch action ${index + 1}`);
      });
    });

    it('should verify results array matches input actions order', async () => {
      const actions = [
        { title: 'First action', description: 'First description' },
        { title: 'Second action', description: 'Second description' },
        { title: 'Third action', description: 'Third description' }
      ];

      const requestBody = {
        openProjectConfig: {
          baseUrl: 'https://openproject.example.com',
          apiToken: 'valid-token',
          projectId: '1'
        },
        actions
      };

      const request = new NextRequest('http://localhost:3000/api/workflow/task/export-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.results).toHaveLength(3);
      expect(data.results[0].title).toBe('First action');
      expect(data.results[1].title).toBe('Second action');
      expect(data.results[2].title).toBe('Third action');
    });
  });

  describe('Security', () => {
    it('should properly encode API token in Basic auth', async () => {
      let capturedAuthHeader: string | null = null;

      server.use(
        mockBackendResponse('*/work_packages', (req) => {
          capturedAuthHeader = req.headers.get('Authorization');
          return { id: 123, _links: { self: { href: '/work_packages/123' } } };
        }, 201)
      );

      const requestBody = {
        openProjectConfig: {
          baseUrl: 'https://openproject.example.com',
          apiToken: 'test-token-123',
          projectId: '1'
        },
        actions: [
          {
            title: 'Security test action',
            description: 'Testing auth header encoding'
          }
        ]
      };

      const request = new NextRequest('http://localhost:3000/api/workflow/task/export-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
      
      // Verify Basic auth format
      expect(capturedAuthHeader).toMatch(/^Basic [A-Za-z0-9+\/]+=*$/);
    });

    it('should validate HTTPS requirement for production URLs', async () => {
      const httpsUrl = 'https://secure-openproject.com';
      const httpUrl = 'http://insecure-openproject.com';

      // HTTPS should work
      const httpsRequestBody = {
        openProjectConfig: {
          baseUrl: httpsUrl,
          apiToken: 'token',
          projectId: '1'
        },
        actions: [{ title: 'HTTPS test', description: 'Testing HTTPS' }]
      };

      const httpsRequest = new NextRequest('http://localhost:3000/api/workflow/task/export-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(httpsRequestBody)
      });

      const httpsResponse = await POST(httpsRequest);
      expect(httpsResponse.status).toBe(200);

      // HTTP should be allowed for localhost/development
      const httpRequestBody = {
        openProjectConfig: {
          baseUrl: 'http://localhost:8080',
          apiToken: 'token',
          projectId: '1'
        },
        actions: [{ title: 'HTTP test', description: 'Testing HTTP localhost' }]
      };

      const httpRequest = new NextRequest('http://localhost:3000/api/workflow/task/export-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(httpRequestBody)
      });

      const httpResponse = await POST(httpRequest);
      expect(httpResponse.status).toBe(200);
    });

    it('should not expose sensitive data in error responses', async () => {
      server.use(
        mockBackendResponse('*/work_packages', { error: 'Server error' }, 500)
      );

      const requestBody = {
        openProjectConfig: {
          baseUrl: 'https://openproject.example.com',
          apiToken: 'sensitive-api-token-that-should-not-be-logged',
          projectId: '1'
        },
        actions: [
          {
            title: 'Security test',
            description: 'Testing error response security'
          }
        ]
      };

      const request = new NextRequest('http://localhost:3000/api/workflow/task/export-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      const responseString = JSON.stringify(data);
      expect(responseString).not.toContain('sensitive-api-token');
      expect(responseString).not.toContain('should-not-be-logged');
    });
  });
});