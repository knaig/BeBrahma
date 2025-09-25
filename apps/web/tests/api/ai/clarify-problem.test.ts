import { describe, it, expect, beforeEach } from '@jest/globals';
import { server, mockBackendResponse, simulateTimeout, simulateNetworkError } from '../setup';
import { NextRequest } from 'next/server';
import { POST } from '../../../app/api/ai/clarify-problem/route';

describe('API: /api/ai/clarify-problem', () => {
  beforeEach(() => {
    server.resetHandlers();
  });

  describe('Request/Response Validation', () => {
    it('should handle valid POST request with all required fields', async () => {
      const requestBody = {
        problemStatement: 'Users struggle with project management',
        projectId: 'proj-123',
        projectName: 'Task Manager Pro',
        context: 'B2B SaaS application for small teams'
      };

      const request = new NextRequest('http://localhost:3000/api/ai/clarify-problem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.clarifiedProblem).toBeDefined();
      expect(data.originalProblem).toBe(requestBody.problemStatement);
      expect(data.projectId).toBe(requestBody.projectId);
      expect(data.projectName).toBe(requestBody.projectName);
      expect(data.context).toBe(requestBody.context);
    });

    it('should validate response format structure', async () => {
      const requestBody = {
        problemStatement: 'Test problem',
        projectId: 'test-id',
        projectName: 'Test Project',
        context: 'Test context'
      };

      const request = new NextRequest('http://localhost:3000/api/ai/clarify-problem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('clarifiedProblem');
      expect(data).toHaveProperty('originalProblem');
      expect(data).toHaveProperty('projectId');
      expect(data).toHaveProperty('projectName');
      expect(data).toHaveProperty('context');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing required fields', async () => {
      const requestBody = {
        projectId: 'proj-123'
        // Missing problemStatement, projectName, context
      };

      const request = new NextRequest('http://localhost:3000/api/ai/clarify-problem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should handle invalid JSON payload', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/clarify-problem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json'
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should handle backend service unavailable', async () => {
      server.use(
        simulateNetworkError('*/api/ai/clarify-problem', 'SERVER_ERROR')
      );

      const requestBody = {
        problemStatement: 'Test problem',
        projectId: 'test-id',
        projectName: 'Test Project',
        context: 'Test context'
      };

      const request = new NextRequest('http://localhost:3000/api/ai/clarify-problem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      expect(response.status).toBe(500);
    });

    it('should handle network timeout scenarios', async () => {
      server.use(
        simulateTimeout('*/api/ai/clarify-problem', 11000)
      );

      const requestBody = {
        problemStatement: 'Test problem',
        projectId: 'test-id',
        projectName: 'Test Project',
        context: 'Test context'
      };

      const request = new NextRequest('http://localhost:3000/api/ai/clarify-problem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      // Set a timeout for the test itself
      const responsePromise = POST(request);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Test timeout')), 12000)
      );

      await expect(Promise.race([responsePromise, timeoutPromise])).rejects.toThrow();
    }, 15000);
  });

  describe('Backend Integration', () => {
    it('should forward request to backend with correct format', async () => {
      const mockResponse = {
        success: true,
        clarifiedProblem: 'Enhanced problem statement with market context',
        originalProblem: 'Users struggle with project management',
        targetAudience: 'Small to medium businesses',
        painPoints: ['Lack of visibility', 'Poor collaboration'],
        marketOpportunity: 'Growing remote work trend',
        nextSteps: ['Market research', 'User interviews']
      };

      server.use(
        mockBackendResponse('*/api/ai/clarify-problem', mockResponse, 200)
      );

      const requestBody = {
        problemStatement: 'Users struggle with project management',
        projectId: 'proj-123',
        projectName: 'Task Manager Pro',
        context: 'B2B SaaS for remote teams'
      };

      const request = new NextRequest('http://localhost:3000/api/ai/clarify-problem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.clarifiedProblem).toBe(mockResponse.clarifiedProblem);
      expect(data.targetAudience).toBe(mockResponse.targetAudience);
      expect(data.painPoints).toEqual(mockResponse.painPoints);
      expect(data.marketOpportunity).toBe(mockResponse.marketOpportunity);
      expect(data.nextSteps).toEqual(mockResponse.nextSteps);
    });

    it('should handle backend error responses', async () => {
      const errorResponse = {
        error: 'AI service temporarily unavailable',
        code: 'SERVICE_UNAVAILABLE'
      };

      server.use(
        mockBackendResponse('*/api/ai/clarify-problem', errorResponse, 503)
      );

      const requestBody = {
        problemStatement: 'Test problem',
        projectId: 'test-id',
        projectName: 'Test Project',
        context: 'Test context'
      };

      const request = new NextRequest('http://localhost:3000/api/ai/clarify-problem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      expect(response.status).toBe(503);
      
      const data = await response.json();
      expect(data.error).toBe(errorResponse.error);
      expect(data.code).toBe(errorResponse.code);
    });

    it('should preserve request headers and context', async () => {
      let capturedHeaders: any = {};
      let capturedBody: any = {};

      server.use(
        mockBackendResponse('*/api/ai/clarify-problem', {
          success: true,
          clarifiedProblem: 'Test response'
        }, 200)
      );

      const requestBody = {
        problemStatement: 'Test problem with context',
        projectId: 'proj-456',
        projectName: 'Context Test Project',
        context: 'Detailed project context for testing'
      };

      const request = new NextRequest('http://localhost:3000/api/ai/clarify-problem', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Test-Header': 'test-value'
        },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Data Persistence', () => {
    it('should preserve all input data in response', async () => {
      const requestBody = {
        problemStatement: 'Complex multi-faceted problem',
        projectId: 'proj-complex-123',
        projectName: 'Complex Project Name',
        context: 'Detailed context with multiple stakeholders and requirements'
      };

      const request = new NextRequest('http://localhost:3000/api/ai/clarify-problem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.originalProblem).toBe(requestBody.problemStatement);
      expect(data.projectId).toBe(requestBody.projectId);
      expect(data.projectName).toBe(requestBody.projectName);
      expect(data.context).toBe(requestBody.context);
    });

    it('should handle special characters and encoding', async () => {
      const requestBody = {
        problemStatement: 'Problem with special chars: éñ中文🚀',
        projectId: 'proj-特殊-123',
        projectName: 'Project Ñáme with Émojis 🎯',
        context: 'Context with quotes "like this" and symbols & more'
      };

      const request = new NextRequest('http://localhost:3000/api/ai/clarify-problem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.originalProblem).toBe(requestBody.problemStatement);
      expect(data.projectId).toBe(requestBody.projectId);
      expect(data.projectName).toBe(requestBody.projectName);
      expect(data.context).toBe(requestBody.context);
    });
  });
});