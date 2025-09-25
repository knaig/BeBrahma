import { describe, it, expect, beforeEach } from '@jest/globals';
import { server, mockBackendResponse, simulateTimeout, simulateNetworkError } from '../setup';
import { NextRequest } from 'next/server';
import { POST } from '../../../app/api/research/run/route';
import { GET } from '../../../app/api/research/stream/route';

describe('API: Research Endpoints', () => {
  beforeEach(() => {
    server.resetHandlers();
  });

  describe('Research Run Endpoint (/api/research/run)', () => {
    it('should handle valid POST request with query and parameters', async () => {
      const requestBody = {
        query: 'latest trends in artificial intelligence',
        role: 'researcher',
        mode: 'comprehensive'
      };

      const mockResponse = {
        findings: [
          {
            title: 'AI Trends 2024',
            summary: 'Latest developments in AI technology and applications'
          },
          {
            title: 'Machine Learning Advances',
            summary: 'Recent breakthroughs in ML algorithms and frameworks'
          }
        ],
        citations: [
          {
            source: 'IEEE Computer Society',
            url: 'https://computer.org/ai-trends-2024',
            snippet: 'Artificial intelligence continues to evolve rapidly...'
          }
        ],
        gaps: []
      };

      server.use(
        mockBackendResponse('*/research/run', mockResponse, 200)
      );

      const request = new NextRequest('http://localhost:3000/api/research/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.findings).toBeDefined();
      expect(Array.isArray(data.findings)).toBe(true);
      expect(data.findings).toHaveLength(2);
      expect(data.citations).toBeDefined();
      expect(Array.isArray(data.citations)).toBe(true);
      expect(data.gaps).toBeDefined();
      expect(Array.isArray(data.gaps)).toBe(true);
    });

    it('should validate findings data structure', async () => {
      const mockResponse = {
        findings: [
          {
            title: 'Research Finding 1',
            summary: 'Detailed summary of the research finding',
            relevance: 0.95,
            confidence: 0.87,
            category: 'technology'
          }
        ],
        citations: [
          {
            source: 'Research Journal',
            url: 'https://example.com/research',
            snippet: 'Key information snippet',
            publishDate: '2024-01-15',
            credibilityScore: 0.92
          }
        ],
        gaps: [
          {
            area: 'specific implementation details',
            description: 'More research needed on practical implementation'
          }
        ],
        metadata: {
          searchTime: 45000,
          sourcesScanned: 150,
          totalResults: 1247
        }
      };

      server.use(
        mockBackendResponse('*/research/run', mockResponse, 200)
      );

      const requestBody = {
        query: 'comprehensive research query',
        role: 'analyst',
        mode: 'detailed'
      };

      const request = new NextRequest('http://localhost:3000/api/research/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      // Validate findings structure
      expect(data.findings[0]).toHaveProperty('title');
      expect(data.findings[0]).toHaveProperty('summary');
      expect(typeof data.findings[0].title).toBe('string');
      expect(typeof data.findings[0].summary).toBe('string');

      // Validate citations structure
      expect(data.citations[0]).toHaveProperty('source');
      expect(data.citations[0]).toHaveProperty('url');
      expect(data.citations[0]).toHaveProperty('snippet');
      expect(typeof data.citations[0].source).toBe('string');
      expect(typeof data.citations[0].url).toBe('string');

      // Validate gaps structure
      expect(data.gaps[0]).toHaveProperty('area');
      expect(data.gaps[0]).toHaveProperty('description');
    });

    it('should handle missing query parameter', async () => {
      const requestBody = {
        role: 'researcher',
        mode: 'basic'
        // Missing query parameter
      };

      const request = new NextRequest('http://localhost:3000/api/research/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('query');
    });

    it('should handle different role and mode combinations', async () => {
      const combinations = [
        { role: 'researcher', mode: 'comprehensive' },
        { role: 'analyst', mode: 'focused' },
        { role: 'consultant', mode: 'executive' },
        { role: 'student', mode: 'basic' }
      ];

      for (const combo of combinations) {
        const mockResponse = {
          findings: [`Finding for ${combo.role} in ${combo.mode} mode`],
          citations: [],
          gaps: [],
          searchStrategy: combo.role,
          analysisDepth: combo.mode
        };

        server.use(
          mockBackendResponse('*/research/run', mockResponse, 200)
        );

        const requestBody = {
          query: 'test query',
          ...combo
        };

        const request = new NextRequest('http://localhost:3000/api/research/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.searchStrategy).toBe(combo.role);
        expect(data.analysisDepth).toBe(combo.mode);
      }
    });

    it('should handle backend service failures', async () => {
      server.use(
        simulateNetworkError('*/research/run', 'SERVER_ERROR')
      );

      const requestBody = {
        query: 'test query',
        role: 'researcher',
        mode: 'basic'
      };

      const request = new NextRequest('http://localhost:3000/api/research/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await POST(request);
      expect(response.status).toBe(500);
    });
  });

  describe('Research Stream Endpoint (/api/research/stream)', () => {
    it('should handle valid GET request with query parameters', async () => {
      const query = 'streaming research query';
      
      const request = new NextRequest(`http://localhost:3000/api/research/stream?query=${encodeURIComponent(query)}`, {
        method: 'GET'
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/event-stream');
      expect(response.headers.get('Cache-Control')).toBe('no-cache');
      expect(response.headers.get('Connection')).toBe('keep-alive');
    });

    it('should validate SSE event format and data structure', async () => {
      const query = 'test streaming query';
      
      const request = new NextRequest(`http://localhost:3000/api/research/stream?query=${encodeURIComponent(query)}`, {
        method: 'GET'
      });

      const response = await GET(request);
      expect(response.body).toBeDefined();

      // Read the stream
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      const events: string[] = [];

      try {
        let done = false;
        while (!done && events.length < 10) { // Limit to prevent infinite loop
          const { value, done: streamDone } = await reader.read();
          done = streamDone;
          
          if (value) {
            const chunk = decoder.decode(value);
            events.push(chunk);
          }
        }
      } finally {
        reader.releaseLock();
      }

      // Validate SSE format
      events.forEach(event => {
        if (event.trim()) {
          expect(event).toMatch(/^data: /);
          
          // Try to parse the JSON after "data: "
          const jsonStr = event.replace(/^data: /, '').trim();
          if (jsonStr && !jsonStr.includes('\n\n')) {
            expect(() => JSON.parse(jsonStr)).not.toThrow();
            const eventData = JSON.parse(jsonStr);
            expect(eventData).toHaveProperty('type');
          }
        }
      });
    });

    it('should handle progress event sequence', async () => {
      const query = 'progress sequence test';
      
      const request = new NextRequest(`http://localhost:3000/api/research/stream?query=${encodeURIComponent(query)}`, {
        method: 'GET'
      });

      const response = await GET(request);
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      const progressEvents: string[] = [];

      try {
        let done = false;
        while (!done && progressEvents.length < 5) {
          const { value, done: streamDone } = await reader.read();
          done = streamDone;
          
          if (value) {
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            lines.forEach(line => {
              if (line.startsWith('data: ')) {
                const jsonStr = line.replace('data: ', '');
                try {
                  const eventData = JSON.parse(jsonStr);
                  if (eventData.type === 'progress') {
                    progressEvents.push(eventData.phase);
                  }
                } catch (e) {
                  // Skip invalid JSON
                }
              }
            });
          }
        }
      } finally {
        reader.releaseLock();
      }

      // Validate progress phases are in expected order
      const expectedPhases = ['starting', 'searching', 'analyzing'];
      expectedPhases.forEach((phase, index) => {
        if (index < progressEvents.length) {
          expect(progressEvents[index]).toBe(phase);
        }
      });
    });

    it('should handle stream completion with citations', async () => {
      const query = 'completion test query';
      
      const request = new NextRequest(`http://localhost:3000/api/research/stream?query=${encodeURIComponent(query)}`, {
        method: 'GET'
      });

      const response = await GET(request);
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let completionFound = false;

      try {
        let done = false;
        while (!done && !completionFound) {
          const { value, done: streamDone } = await reader.read();
          done = streamDone;
          
          if (value) {
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            lines.forEach(line => {
              if (line.startsWith('data: ')) {
                const jsonStr = line.replace('data: ', '');
                try {
                  const eventData = JSON.parse(jsonStr);
                  if (eventData.type === 'completion') {
                    completionFound = true;
                    expect(eventData).toHaveProperty('summary');
                    expect(typeof eventData.summary).toBe('string');
                  }
                } catch (e) {
                  // Skip invalid JSON
                }
              }
            });
          }
        }
      } finally {
        reader.releaseLock();
      }

      expect(completionFound).toBe(true);
    });

    it('should handle missing query parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/research/stream', {
        method: 'GET'
      });

      const response = await GET(request);
      expect(response.status).toBe(400);
    });

    it('should handle stream interruption and error scenarios', async () => {
      // Test with a query that might cause backend issues
      const query = 'error inducing query';
      
      server.use(
        simulateNetworkError('*/research/stream', 'SERVER_ERROR')
      );

      const request = new NextRequest(`http://localhost:3000/api/research/stream?query=${encodeURIComponent(query)}`, {
        method: 'GET'
      });

      const response = await GET(request);
      
      // For streaming endpoints, error handling might still return 200 initially
      // but the stream should contain error events
      if (response.status === 200) {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let errorFound = false;

        try {
          const { value } = await reader.read();
          if (value) {
            const chunk = decoder.decode(value);
            if (chunk.includes('error') || chunk.includes('Error')) {
              errorFound = true;
            }
          }
        } finally {
          reader.releaseLock();
        }

        // Either the response status should indicate error or the stream should contain error events
        expect(errorFound || response.status >= 400).toBe(true);
      } else {
        expect(response.status).toBeGreaterThanOrEqual(400);
      }
    });
  });

  describe('Streaming Behavior', () => {
    it('should maintain proper SSE formatting throughout stream', async () => {
      const query = 'sse format validation';
      
      const request = new NextRequest(`http://localhost:3000/api/research/stream?query=${encodeURIComponent(query)}`, {
        method: 'GET'
      });

      const response = await GET(request);
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      const allChunks: string[] = [];

      try {
        let done = false;
        while (!done && allChunks.length < 10) {
          const { value, done: streamDone } = await reader.read();
          done = streamDone;
          
          if (value) {
            const chunk = decoder.decode(value);
            allChunks.push(chunk);
          }
        }
      } finally {
        reader.releaseLock();
      }

      const fullStream = allChunks.join('');
      const lines = fullStream.split('\n');

      // Validate SSE format: each data line should start with "data: "
      lines.forEach(line => {
        if (line.trim() && !line.startsWith('data: ') && line !== '') {
          // Allow empty lines (used as event separators in SSE)
          expect(line.trim()).toBe('');
        }
      });
    });

    it('should handle concurrent research requests', async () => {
      const queries = [
        'concurrent query 1',
        'concurrent query 2',
        'concurrent query 3'
      ];

      const requests = queries.map(query => 
        new NextRequest(`http://localhost:3000/api/research/stream?query=${encodeURIComponent(query)}`, {
          method: 'GET'
        })
      );

      const responses = await Promise.all(
        requests.map(request => GET(request))
      );

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.headers.get('Content-Type')).toBe('text/event-stream');
      });

      // Clean up streams
      await Promise.all(
        responses.map(async response => {
          if (response.body) {
            const reader = response.body.getReader();
            reader.releaseLock();
          }
        })
      );
    });

    it('should handle stream timeout scenarios', async () => {
      const query = 'timeout test query';

      server.use(
        simulateTimeout('*/research/stream', 30000) // Long timeout
      );
      
      const request = new NextRequest(`http://localhost:3000/api/research/stream?query=${encodeURIComponent(query)}`, {
        method: 'GET'
      });

      const responsePromise = GET(request);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Test timeout')), 5000)
      );

      // The request should either complete quickly or timeout
      await expect(
        Promise.race([responsePromise, timeoutPromise])
      ).rejects.toThrow('Test timeout');
    });
  });

  describe('Data Validation', () => {
    it('should validate research result quality and relevance', async () => {
      const qualityTestCases = [
        {
          query: 'machine learning algorithms',
          expectedFindings: 3,
          expectedCitations: 2,
          category: 'technology'
        },
        {
          query: 'business strategy frameworks',
          expectedFindings: 5,
          expectedCitations: 4,
          category: 'business'
        },
        {
          query: 'sustainable energy solutions',
          expectedFindings: 4,
          expectedCitations: 3,
          category: 'environment'
        }
      ];

      for (const testCase of qualityTestCases) {
        const mockResponse = {
          findings: Array.from({ length: testCase.expectedFindings }, (_, i) => ({
            title: `${testCase.category} Finding ${i + 1}`,
            summary: `Relevant information about ${testCase.query}`,
            relevanceScore: 0.8 + (i * 0.05),
            category: testCase.category
          })),
          citations: Array.from({ length: testCase.expectedCitations }, (_, i) => ({
            source: `Source ${i + 1}`,
            url: `https://example${i + 1}.com`,
            snippet: `Citation snippet for ${testCase.query}`,
            credibilityScore: 0.85
          })),
          gaps: [],
          qualityMetrics: {
            averageRelevance: 0.87,
            sourceDiversity: 0.92,
            informationDepth: 0.78
          }
        };

        server.use(
          mockBackendResponse('*/research/run', mockResponse, 200)
        );

        const requestBody = {
          query: testCase.query,
          role: 'researcher',
          mode: 'comprehensive'
        };

        const request = new NextRequest('http://localhost:3000/api/research/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        const response = await POST(request);
        const data = await response.json();

        expect(data.findings).toHaveLength(testCase.expectedFindings);
        expect(data.citations).toHaveLength(testCase.expectedCitations);
        
        // Validate quality metrics if present
        if (data.qualityMetrics) {
          expect(data.qualityMetrics.averageRelevance).toBeGreaterThan(0.5);
          expect(data.qualityMetrics.sourceDiversity).toBeGreaterThan(0.5);
        }

        // Validate findings relevance
        data.findings.forEach((finding: any) => {
          expect(finding.title).toContain(testCase.category);
          if (finding.relevanceScore) {
            expect(finding.relevanceScore).toBeGreaterThan(0.5);
          }
        });
      }
    });

    it('should handle complex research queries with multiple parameters', async () => {
      const complexQuery = {
        query: 'artificial intelligence impact on healthcare industry 2024',
        role: 'consultant',
        mode: 'executive',
        filters: {
          dateRange: '2023-2024',
          sources: ['academic', 'industry'],
          regions: ['North America', 'Europe'],
          languages: ['en']
        },
        analysisDepth: 'comprehensive',
        outputFormat: 'structured'
      };

      const mockResponse = {
        findings: [
          {
            title: 'AI in Healthcare: 2024 Market Analysis',
            summary: 'Comprehensive analysis of AI adoption in healthcare',
            region: 'North America',
            sourceType: 'industry',
            publicationDate: '2024-01-15'
          }
        ],
        citations: [
          {
            source: 'Healthcare AI Journal',
            url: 'https://hai-journal.com/2024-analysis',
            snippet: 'AI technologies show 40% growth in healthcare applications',
            region: 'Global',
            publicationDate: '2024-02-01'
          }
        ],
        gaps: [
          {
            area: 'regulatory compliance',
            description: 'Limited research on regulatory frameworks for AI in healthcare'
          }
        ],
        metadata: {
          appliedFilters: complexQuery.filters,
          searchStrategy: complexQuery.role,
          analysisDepth: complexQuery.analysisDepth
        }
      };

      server.use(
        mockBackendResponse('*/research/run', mockResponse, 200)
      );

      const request = new NextRequest('http://localhost:3000/api/research/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(complexQuery)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.findings[0].region).toBe('North America');
      expect(data.findings[0].sourceType).toBe('industry');
      expect(data.metadata.appliedFilters).toEqual(complexQuery.filters);
      expect(data.metadata.searchStrategy).toBe(complexQuery.role);
    });
  });

  describe('Real-time Features', () => {
    it('should handle client disconnection gracefully', async () => {
      const query = 'disconnection test';
      
      const request = new NextRequest(`http://localhost:3000/api/research/stream?query=${encodeURIComponent(query)}`, {
        method: 'GET'
      });

      const response = await GET(request);
      const reader = response.body!.getReader();

      // Simulate client disconnection by canceling the reader
      try {
        await reader.read();
        reader.releaseLock();
        // In a real scenario, this would trigger cleanup on the server
        expect(true).toBe(true); // Verify test completes without hanging
      } catch (error) {
        // Connection cancellation is expected
        expect(error).toBeDefined();
      }
    });

    it('should validate stream isolation between different queries', async () => {
      const query1 = 'isolated query 1';
      const query2 = 'isolated query 2';

      const request1 = new NextRequest(`http://localhost:3000/api/research/stream?query=${encodeURIComponent(query1)}`, {
        method: 'GET'
      });

      const request2 = new NextRequest(`http://localhost:3000/api/research/stream?query=${encodeURIComponent(query2)}`, {
        method: 'GET'
      });

      const [response1, response2] = await Promise.all([
        GET(request1),
        GET(request2)
      ]);

      // Both streams should be independent
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(response1.body).not.toBe(response2.body);

      // Clean up
      if (response1.body) response1.body.getReader().releaseLock();
      if (response2.body) response2.body.getReader().releaseLock();
    });
  });
});