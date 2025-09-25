import { describe, it, expect, beforeEach } from '@jest/globals';
import { server, mockBackendResponse, simulateTimeout, simulateNetworkError } from '../setup';
import { NextRequest } from 'next/server';
import { POST } from '../../../app/api/ai/mvp-planning/route';

describe('API: /api/ai/mvp-planning', () => {
  beforeEach(() => {
    server.resetHandlers();
  });

  describe('Request/Response Validation', () => {
    it('should handle valid POST request with all required fields', async () => {
      const requestBody = {
        projectId: 'proj-123',
        projectName: 'Task Manager Pro',
        scaFactors: [
          {
            id: 'sca-1',
            category: 'TECHNICAL',
            factor: 'Development Expertise',
            strength: 'HIGH'
          }
        ],
        context: 'B2B SaaS application for project management'
      };

      const request = new NextRequest('http://localhost:3000/api/ai/mvp-planning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.mvpFeatures).toBeDefined();
      expect(Array.isArray(data.mvpFeatures)).toBe(true);
      expect(data.projectId).toBe(requestBody.projectId);
      expect(data.projectName).toBe(requestBody.projectName);
    });

    it('should validate MVP features structure', async () => {
      const mockMvpResponse = {
        success: true,
        mvpFeatures: [
          {
            id: 'mvp-1',
            name: 'User Authentication',
            description: 'Secure login and registration system',
            priority: 'MUST_HAVE',
            effort: 'MEDIUM',
            impact: 'HIGH',
            userStories: [
              'As a user, I want to create an account',
              'As a user, I want to login securely'
            ],
            acceptanceCriteria: [
              'User can register with email and password',
              'User receives confirmation email'
            ],
            estimatedHours: 24,
            estimatedCost: 1200,
            scaAlignment: ['sca-1']
          }
        ],
        projectId: 'proj-123',
        projectName: 'Test Project'
      };

      server.use(
        mockBackendResponse('*/api/ai/mvp-planning', mockMvpResponse, 200)
      );

      const requestBody = {
        projectId: 'proj-123',
        projectName: 'Test Project',
        scaFactors: [{ id: 'sca-1', category: 'TECHNICAL' }],
        context: 'Test context'
      };

      const request = new NextRequest('http://localhost:3000/api/ai/mvp-planning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.mvpFeatures[0]).toHaveProperty('id');
      expect(data.mvpFeatures[0]).toHaveProperty('name');
      expect(data.mvpFeatures[0]).toHaveProperty('description');
      expect(data.mvpFeatures[0]).toHaveProperty('priority');
      expect(data.mvpFeatures[0]).toHaveProperty('effort');
      expect(data.mvpFeatures[0]).toHaveProperty('impact');
      expect(data.mvpFeatures[0]).toHaveProperty('userStories');
      expect(data.mvpFeatures[0]).toHaveProperty('acceptanceCriteria');
      expect(data.mvpFeatures[0]).toHaveProperty('estimatedHours');
      expect(data.mvpFeatures[0]).toHaveProperty('estimatedCost');
      expect(data.mvpFeatures[0]).toHaveProperty('scaAlignment');

      expect(['MUST_HAVE', 'SHOULD_HAVE', 'COULD_HAVE', 'WONT_HAVE']).toContain(data.mvpFeatures[0].priority);
      expect(['LOW', 'MEDIUM', 'HIGH']).toContain(data.mvpFeatures[0].effort);
      expect(['LOW', 'MEDIUM', 'HIGH']).toContain(data.mvpFeatures[0].impact);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing required fields', async () => {
      const requestBody = {
        projectId: 'proj-123'
        // Missing projectName, scaFactors, context
      };

      const request = new NextRequest('http://localhost:3000/api/ai/mvp-planning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should handle invalid scaFactors format', async () => {
      const requestBody = {
        projectId: 'proj-123',
        projectName: 'Test Project',
        scaFactors: 'invalid-format', // Should be array
        context: 'Test context'
      };

      const request = new NextRequest('http://localhost:3000/api/ai/mvp-planning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should handle backend service failures', async () => {
      server.use(
        simulateNetworkError('*/api/ai/mvp-planning', 'SERVER_ERROR')
      );

      const requestBody = {
        projectId: 'proj-123',
        projectName: 'Test Project',
        scaFactors: [],
        context: 'Test context'
      };

      const request = new NextRequest('http://localhost:3000/api/ai/mvp-planning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      expect(response.status).toBe(500);
    });

    it('should handle timeout scenarios', async () => {
      server.use(
        simulateTimeout('*/api/ai/mvp-planning', 11000)
      );

      const requestBody = {
        projectId: 'proj-123',
        projectName: 'Test Project',
        scaFactors: [],
        context: 'Test context'
      };

      const request = new NextRequest('http://localhost:3000/api/ai/mvp-planning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const responsePromise = POST(request);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Test timeout')), 12000)
      );

      await expect(Promise.race([responsePromise, timeoutPromise])).rejects.toThrow();
    }, 15000);
  });

  describe('Backend Integration', () => {
    it('should forward SCA factors correctly to backend', async () => {
      const scaFactors = [
        {
          id: 'sca-1',
          category: 'TECHNICAL',
          factor: 'API Development Skills',
          description: 'Strong backend development capabilities',
          strength: 'HIGH',
          sustainability: 'LONG_TERM'
        },
        {
          id: 'sca-2',
          category: 'BUSINESS_MODEL',
          factor: 'Market Understanding',
          description: 'Deep understanding of target market',
          strength: 'MEDIUM',
          sustainability: 'MEDIUM_TERM'
        }
      ];

      const mockResponse = {
        success: true,
        mvpFeatures: [
          {
            id: 'mvp-1',
            name: 'Core API',
            description: 'Essential API endpoints',
            priority: 'MUST_HAVE',
            effort: 'HIGH',
            impact: 'HIGH',
            scaAlignment: ['sca-1']
          },
          {
            id: 'mvp-2',
            name: 'Market Validation',
            description: 'Basic analytics and feedback collection',
            priority: 'SHOULD_HAVE',
            effort: 'MEDIUM',
            impact: 'MEDIUM',
            scaAlignment: ['sca-2']
          }
        ]
      };

      server.use(
        mockBackendResponse('*/api/ai/mvp-planning', mockResponse, 200)
      );

      const requestBody = {
        projectId: 'proj-456',
        projectName: 'API Platform',
        scaFactors,
        context: 'Enterprise API platform development'
      };

      const request = new NextRequest('http://localhost:3000/api/ai/mvp-planning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.mvpFeatures).toHaveLength(2);
      expect(data.mvpFeatures[0].scaAlignment).toContain('sca-1');
      expect(data.mvpFeatures[1].scaAlignment).toContain('sca-2');
    });

    it('should handle complex MVP planning scenarios', async () => {
      const complexMvpResponse = {
        success: true,
        mvpFeatures: [
          {
            id: 'mvp-core-1',
            name: 'User Management System',
            description: 'Complete user lifecycle management',
            priority: 'MUST_HAVE',
            effort: 'HIGH',
            impact: 'HIGH',
            userStories: [
              'As an admin, I want to manage user accounts',
              'As a user, I want to update my profile',
              'As a user, I want to reset my password'
            ],
            acceptanceCriteria: [
              'Admin can create, update, deactivate users',
              'Users can update their own profiles',
              'Password reset works via email'
            ],
            estimatedHours: 80,
            estimatedCost: 4000,
            dependencies: [],
            risks: ['Authentication security', 'Data privacy compliance'],
            scaAlignment: ['sca-tech-1', 'sca-sec-1']
          }
        ],
        totalEstimatedHours: 320,
        totalEstimatedCost: 16000,
        recommendedPhases: [
          {
            phase: 1,
            features: ['mvp-core-1'],
            duration: '4 weeks'
          }
        ]
      };

      server.use(
        mockBackendResponse('*/api/ai/mvp-planning', complexMvpResponse, 200)
      );

      const requestBody = {
        projectId: 'proj-complex',
        projectName: 'Enterprise Platform',
        scaFactors: [
          { id: 'sca-tech-1', category: 'TECHNICAL', strength: 'HIGH' },
          { id: 'sca-sec-1', category: 'REGULATORY', strength: 'MEDIUM' }
        ],
        context: 'Enterprise-grade platform with security requirements'
      };

      const request = new NextRequest('http://localhost:3000/api/ai/mvp-planning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.mvpFeatures[0]).toHaveProperty('dependencies');
      expect(data.mvpFeatures[0]).toHaveProperty('risks');
      expect(data).toHaveProperty('totalEstimatedHours');
      expect(data).toHaveProperty('totalEstimatedCost');
      expect(data).toHaveProperty('recommendedPhases');
    });
  });

  describe('Data Validation', () => {
    it('should validate priority levels', async () => {
      const mockResponse = {
        success: true,
        mvpFeatures: [
          { id: '1', priority: 'MUST_HAVE', effort: 'LOW', impact: 'HIGH' },
          { id: '2', priority: 'SHOULD_HAVE', effort: 'MEDIUM', impact: 'MEDIUM' },
          { id: '3', priority: 'COULD_HAVE', effort: 'HIGH', impact: 'LOW' },
          { id: '4', priority: 'WONT_HAVE', effort: 'LOW', impact: 'LOW' }
        ]
      };

      server.use(
        mockBackendResponse('*/api/ai/mvp-planning', mockResponse, 200)
      );

      const requestBody = {
        projectId: 'proj-validation',
        projectName: 'Validation Test',
        scaFactors: [],
        context: 'Test different priority levels'
      };

      const request = new NextRequest('http://localhost:3000/api/ai/mvp-planning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      const validPriorities = ['MUST_HAVE', 'SHOULD_HAVE', 'COULD_HAVE', 'WONT_HAVE'];
      const validEffortLevels = ['LOW', 'MEDIUM', 'HIGH'];
      const validImpactLevels = ['LOW', 'MEDIUM', 'HIGH'];

      data.mvpFeatures.forEach((feature: any) => {
        expect(validPriorities).toContain(feature.priority);
        expect(validEffortLevels).toContain(feature.effort);
        expect(validImpactLevels).toContain(feature.impact);
      });
    });

    it('should handle large response payloads', async () => {
      const largeMvpResponse = {
        success: true,
        mvpFeatures: Array.from({ length: 50 }, (_, i) => ({
          id: `mvp-${i + 1}`,
          name: `Feature ${i + 1}`,
          description: `Description for feature ${i + 1} with detailed explanation of functionality and requirements`,
          priority: ['MUST_HAVE', 'SHOULD_HAVE', 'COULD_HAVE'][i % 3],
          effort: ['LOW', 'MEDIUM', 'HIGH'][i % 3],
          impact: ['LOW', 'MEDIUM', 'HIGH'][(i + 1) % 3],
          userStories: [`As a user, I want feature ${i + 1}`],
          acceptanceCriteria: [`Feature ${i + 1} should work correctly`],
          estimatedHours: (i + 1) * 2,
          estimatedCost: (i + 1) * 100
        }))
      };

      server.use(
        mockBackendResponse('*/api/ai/mvp-planning', largeMvpResponse, 200)
      );

      const requestBody = {
        projectId: 'proj-large',
        projectName: 'Large Scale Project',
        scaFactors: [],
        context: 'Project requiring many features'
      };

      const request = new NextRequest('http://localhost:3000/api/ai/mvp-planning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.mvpFeatures).toHaveLength(50);
      expect(data.success).toBe(true);
    });
  });
});