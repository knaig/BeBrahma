import { describe, it, expect, beforeEach } from '@jest/globals';
import { server, mockBackendResponse, simulateTimeout, simulateNetworkError } from '../setup';
import { NextRequest } from 'next/server';
import { POST } from '../../../app/api/ai/sca-analysis/route';

describe('API: /api/ai/sca-analysis', () => {
  beforeEach(() => {
    server.resetHandlers();
  });

  describe('Request/Response Validation', () => {
    it('should handle valid POST request with all required fields', async () => {
      const requestBody = {
        projectId: 'proj-123',
        projectName: 'Task Manager Pro',
        context: 'B2B SaaS application for project management targeting small to medium businesses'
      };

      const request = new NextRequest('http://localhost:3000/api/ai/sca-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.scaFactors).toBeDefined();
      expect(Array.isArray(data.scaFactors)).toBe(true);
      expect(data.projectId).toBe(requestBody.projectId);
      expect(data.projectName).toBe(requestBody.projectName);
    });

    it('should validate SCA factors structure', async () => {
      const mockScaResponse = {
        success: true,
        scaFactors: [
          {
            id: 'sca-1',
            category: 'TECHNICAL',
            factor: 'Development Expertise',
            description: 'Strong technical foundation in web development',
            strength: 'HIGH',
            sustainability: 'LONG_TERM',
            evidence: [
              'Previous successful projects',
              'Technical team expertise',
              'Modern tech stack adoption'
            ],
            actionItems: [
              'Continue investing in skill development',
              'Stay updated with latest technologies',
              'Build technical documentation'
            ]
          }
        ],
        projectId: 'proj-123',
        projectName: 'Test Project'
      };

      server.use(
        mockBackendResponse('*/api/ai/sca-analysis', mockScaResponse, 200)
      );

      const requestBody = {
        projectId: 'proj-123',
        projectName: 'Test Project',
        context: 'Test context for SCA analysis'
      };

      const request = new NextRequest('http://localhost:3000/api/ai/sca-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      const scaFactor = data.scaFactors[0];
      expect(scaFactor).toHaveProperty('id');
      expect(scaFactor).toHaveProperty('category');
      expect(scaFactor).toHaveProperty('factor');
      expect(scaFactor).toHaveProperty('description');
      expect(scaFactor).toHaveProperty('strength');
      expect(scaFactor).toHaveProperty('sustainability');
      expect(scaFactor).toHaveProperty('evidence');
      expect(scaFactor).toHaveProperty('actionItems');

      expect(['TECHNICAL', 'BUSINESS_MODEL', 'NETWORK_EFFECTS', 'BRAND', 'REGULATORY', 'RESOURCE_BASED']).toContain(scaFactor.category);
      expect(['LOW', 'MEDIUM', 'HIGH']).toContain(scaFactor.strength);
      expect(['SHORT_TERM', 'MEDIUM_TERM', 'LONG_TERM']).toContain(scaFactor.sustainability);
      expect(Array.isArray(scaFactor.evidence)).toBe(true);
      expect(Array.isArray(scaFactor.actionItems)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing project information', async () => {
      const requestBody = {
        projectId: 'proj-123'
        // Missing projectName and context
      };

      const request = new NextRequest('http://localhost:3000/api/ai/sca-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should handle backend analysis failures', async () => {
      const errorResponse = {
        error: 'SCA analysis failed',
        code: 'ANALYSIS_ERROR',
        details: 'Insufficient context provided for comprehensive analysis'
      };

      server.use(
        mockBackendResponse('*/api/ai/sca-analysis', errorResponse, 422)
      );

      const requestBody = {
        projectId: 'proj-123',
        projectName: 'Test Project',
        context: 'Minimal context'
      };

      const request = new NextRequest('http://localhost:3000/api/ai/sca-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      expect(response.status).toBe(422);
      
      const data = await response.json();
      expect(data.error).toBe(errorResponse.error);
      expect(data.code).toBe(errorResponse.code);
    });

    it('should handle invalid context data', async () => {
      const requestBody = {
        projectId: 'proj-123',
        projectName: 'Test Project',
        context: null // Invalid context
      };

      const request = new NextRequest('http://localhost:3000/api/ai/sca-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should handle network timeout scenarios', async () => {
      server.use(
        simulateTimeout('*/api/ai/sca-analysis', 11000)
      );

      const requestBody = {
        projectId: 'proj-timeout',
        projectName: 'Timeout Test Project',
        context: 'Testing timeout scenarios for SCA analysis'
      };

      const request = new NextRequest('http://localhost:3000/api/ai/sca-analysis', {
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
    it('should analyze different SCA categories', async () => {
      const comprehensiveScaResponse = {
        success: true,
        scaFactors: [
          {
            id: 'sca-tech-1',
            category: 'TECHNICAL',
            factor: 'Cloud Infrastructure',
            description: 'Scalable cloud-native architecture',
            strength: 'HIGH',
            sustainability: 'LONG_TERM',
            evidence: ['AWS expertise', 'Microservices architecture'],
            actionItems: ['Implement auto-scaling', 'Optimize costs']
          },
          {
            id: 'sca-biz-1',
            category: 'BUSINESS_MODEL',
            factor: 'Subscription Revenue',
            description: 'Recurring revenue model with high retention',
            strength: 'MEDIUM',
            sustainability: 'LONG_TERM',
            evidence: ['Market demand', 'Customer validation'],
            actionItems: ['Optimize pricing tiers', 'Expand target market']
          },
          {
            id: 'sca-net-1',
            category: 'NETWORK_EFFECTS',
            factor: 'Platform Integration',
            description: 'API ecosystem that grows with user adoption',
            strength: 'MEDIUM',
            sustainability: 'MEDIUM_TERM',
            evidence: ['Developer community', 'Integration partnerships'],
            actionItems: ['Expand API capabilities', 'Build developer tools']
          },
          {
            id: 'sca-brand-1',
            category: 'BRAND',
            factor: 'Market Recognition',
            description: 'Strong brand presence in target market',
            strength: 'LOW',
            sustainability: 'SHORT_TERM',
            evidence: ['Initial market traction', 'Positive reviews'],
            actionItems: ['Invest in marketing', 'Build thought leadership']
          }
        ],
        analysisMetrics: {
          totalFactors: 4,
          averageStrength: 'MEDIUM',
          sustainabilityDistribution: {
            'SHORT_TERM': 1,
            'MEDIUM_TERM': 1,
            'LONG_TERM': 2
          }
        }
      };

      server.use(
        mockBackendResponse('*/api/ai/sca-analysis', comprehensiveScaResponse, 200)
      );

      const requestBody = {
        projectId: 'proj-comprehensive',
        projectName: 'Enterprise SaaS Platform',
        context: 'Multi-tenant B2B platform with API ecosystem and subscription model targeting enterprise customers'
      };

      const request = new NextRequest('http://localhost:3000/api/ai/sca-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.scaFactors).toHaveLength(4);
      
      const categories = data.scaFactors.map((f: any) => f.category);
      expect(categories).toContain('TECHNICAL');
      expect(categories).toContain('BUSINESS_MODEL');
      expect(categories).toContain('NETWORK_EFFECTS');
      expect(categories).toContain('BRAND');

      expect(data).toHaveProperty('analysisMetrics');
    });

    it('should handle context data forwarding', async () => {
      const contextSensitiveResponse = {
        success: true,
        scaFactors: [
          {
            id: 'sca-reg-1',
            category: 'REGULATORY',
            factor: 'GDPR Compliance',
            description: 'Strong data privacy and compliance framework',
            strength: 'HIGH',
            sustainability: 'LONG_TERM',
            evidence: ['Legal framework understanding', 'Privacy-by-design'],
            actionItems: ['Regular compliance audits', 'Staff training']
          }
        ]
      };

      server.use(
        mockBackendResponse('*/api/ai/sca-analysis', contextSensitiveResponse, 200)
      );

      const requestBody = {
        projectId: 'proj-eu-market',
        projectName: 'EU Data Platform',
        context: 'European market focus with strict GDPR requirements and privacy-first approach to data handling'
      };

      const request = new NextRequest('http://localhost:3000/api/ai/sca-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.scaFactors[0].category).toBe('REGULATORY');
      expect(data.scaFactors[0].factor).toContain('GDPR');
    });
  });

  describe('Data Structure Validation', () => {
    it('should validate SCA factor categories and strength levels', async () => {
      const validationResponse = {
        success: true,
        scaFactors: [
          { id: '1', category: 'TECHNICAL', strength: 'LOW', sustainability: 'SHORT_TERM' },
          { id: '2', category: 'BUSINESS_MODEL', strength: 'MEDIUM', sustainability: 'MEDIUM_TERM' },
          { id: '3', category: 'NETWORK_EFFECTS', strength: 'HIGH', sustainability: 'LONG_TERM' },
          { id: '4', category: 'BRAND', strength: 'MEDIUM', sustainability: 'MEDIUM_TERM' },
          { id: '5', category: 'REGULATORY', strength: 'HIGH', sustainability: 'LONG_TERM' },
          { id: '6', category: 'RESOURCE_BASED', strength: 'LOW', sustainability: 'SHORT_TERM' }
        ]
      };

      server.use(
        mockBackendResponse('*/api/ai/sca-analysis', validationResponse, 200)
      );

      const requestBody = {
        projectId: 'proj-validation',
        projectName: 'Validation Test',
        context: 'Testing all SCA categories and levels'
      };

      const request = new NextRequest('http://localhost:3000/api/ai/sca-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      const validCategories = ['TECHNICAL', 'BUSINESS_MODEL', 'NETWORK_EFFECTS', 'BRAND', 'REGULATORY', 'RESOURCE_BASED'];
      const validStrengths = ['LOW', 'MEDIUM', 'HIGH'];
      const validSustainability = ['SHORT_TERM', 'MEDIUM_TERM', 'LONG_TERM'];

      data.scaFactors.forEach((factor: any) => {
        expect(validCategories).toContain(factor.category);
        expect(validStrengths).toContain(factor.strength);
        expect(validSustainability).toContain(factor.sustainability);
      });
    });

    it('should validate evidence and actionItems arrays', async () => {
      const mockResponse = {
        success: true,
        scaFactors: [
          {
            id: 'sca-test',
            category: 'TECHNICAL',
            factor: 'Test Factor',
            description: 'Test description',
            strength: 'HIGH',
            sustainability: 'LONG_TERM',
            evidence: [
              'Evidence item 1',
              'Evidence item 2',
              'Evidence item 3'
            ],
            actionItems: [
              'Action item 1 with detailed description',
              'Action item 2 for improvement',
              'Action item 3 for sustainability'
            ]
          }
        ]
      };

      server.use(
        mockBackendResponse('*/api/ai/sca-analysis', mockResponse, 200)
      );

      const requestBody = {
        projectId: 'proj-arrays',
        projectName: 'Array Validation Test',
        context: 'Testing evidence and action items validation'
      };

      const request = new NextRequest('http://localhost:3000/api/ai/sca-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      const factor = data.scaFactors[0];
      expect(Array.isArray(factor.evidence)).toBe(true);
      expect(Array.isArray(factor.actionItems)).toBe(true);
      expect(factor.evidence.length).toBeGreaterThan(0);
      expect(factor.actionItems.length).toBeGreaterThan(0);
      expect(typeof factor.evidence[0]).toBe('string');
      expect(typeof factor.actionItems[0]).toBe('string');
    });
  });

  describe('Analysis Quality', () => {
    it('should handle different project types and contexts', async () => {
      const projectTypes = [
        {
          type: 'E-commerce',
          context: 'Online retail platform with payment processing and inventory management',
          expectedCategories: ['TECHNICAL', 'BUSINESS_MODEL', 'BRAND']
        },
        {
          type: 'FinTech',
          context: 'Financial services platform with regulatory compliance requirements',
          expectedCategories: ['REGULATORY', 'TECHNICAL', 'BUSINESS_MODEL']
        },
        {
          type: 'Social Platform',
          context: 'Social networking platform with viral growth potential',
          expectedCategories: ['NETWORK_EFFECTS', 'TECHNICAL', 'BRAND']
        }
      ];

      for (const project of projectTypes) {
        const mockResponse = {
          success: true,
          scaFactors: project.expectedCategories.map((category, index) => ({
            id: `sca-${category.toLowerCase()}-${index}`,
            category,
            factor: `${category} Factor`,
            description: `${category} competitive advantage`,
            strength: 'MEDIUM',
            sustainability: 'MEDIUM_TERM',
            evidence: [`${category} evidence`],
            actionItems: [`${category} action`]
          }))
        };

        server.use(
          mockBackendResponse('*/api/ai/sca-analysis', mockResponse, 200)
        );

        const requestBody = {
          projectId: `proj-${project.type.toLowerCase()}`,
          projectName: `${project.type} Project`,
          context: project.context
        };

        const request = new NextRequest('http://localhost:3000/api/ai/sca-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        const categories = data.scaFactors.map((f: any) => f.category);
        project.expectedCategories.forEach(expectedCategory => {
          expect(categories).toContain(expectedCategory);
        });
      }
    });

    it('should handle large analysis responses', async () => {
      const largeAnalysisResponse = {
        success: true,
        scaFactors: Array.from({ length: 20 }, (_, i) => ({
          id: `sca-large-${i + 1}`,
          category: ['TECHNICAL', 'BUSINESS_MODEL', 'NETWORK_EFFECTS', 'BRAND', 'REGULATORY', 'RESOURCE_BASED'][i % 6],
          factor: `Competitive Factor ${i + 1}`,
          description: `Detailed description of competitive advantage factor ${i + 1} with comprehensive analysis`,
          strength: ['LOW', 'MEDIUM', 'HIGH'][i % 3],
          sustainability: ['SHORT_TERM', 'MEDIUM_TERM', 'LONG_TERM'][i % 3],
          evidence: [
            `Evidence point 1 for factor ${i + 1}`,
            `Evidence point 2 for factor ${i + 1}`,
            `Evidence point 3 for factor ${i + 1}`
          ],
          actionItems: [
            `Action item 1 for factor ${i + 1}`,
            `Action item 2 for factor ${i + 1}`
          ]
        }))
      };

      server.use(
        mockBackendResponse('*/api/ai/sca-analysis', largeAnalysisResponse, 200)
      );

      const requestBody = {
        projectId: 'proj-large-analysis',
        projectName: 'Comprehensive Analysis Project',
        context: 'Complex multi-faceted project requiring comprehensive SCA analysis across all categories'
      };

      const request = new NextRequest('http://localhost:3000/api/ai/sca-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.scaFactors).toHaveLength(20);
      expect(data.success).toBe(true);
    });
  });
});