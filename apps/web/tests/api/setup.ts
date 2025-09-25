import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { beforeAll, afterEach, afterAll } from '@jest/globals';

// Mock session storage for workflow state persistence
const sessionStore = new Map<string, any>();

// Request/response logging utility
export const logRequest = (method: string, url: string, body?: any) => {
  if (process.env.NODE_ENV === 'test' && process.env.MSW_DEBUG) {
    console.log(`[MSW] ${method} ${url}`, body ? JSON.stringify(body, null, 2) : '');
  }
};

export const logResponse = (url: string, status: number, body?: any) => {
  if (process.env.NODE_ENV === 'test' && process.env.MSW_DEBUG) {
    console.log(`[MSW] Response ${status} for ${url}`, body ? JSON.stringify(body, null, 2) : '');
  }
};

// Session state management utilities
export const createMockSession = (sessionId: string, initialState: any) => {
  sessionStore.set(sessionId, {
    ...initialState,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  return sessionStore.get(sessionId);
};

export const getMockSession = (sessionId: string) => {
  return sessionStore.get(sessionId);
};

export const updateMockSession = (sessionId: string, updates: any) => {
  const existing = sessionStore.get(sessionId) || {};
  const updated = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString()
  };
  sessionStore.set(sessionId, updated);
  return updated;
};

export const clearMockSession = (sessionId: string) => {
  sessionStore.delete(sessionId);
};

export const clearAllMockSessions = () => {
  sessionStore.clear();
};

// Timeout simulation utilities
export const simulateTimeout = (endpoint: string, delay: number = 11000) => {
  return http.all(endpoint, async () => {
    await new Promise(resolve => setTimeout(resolve, delay));
    return new HttpResponse(null, { status: 408 });
  });
};

// Network error simulation utilities
export const simulateNetworkError = (endpoint: string, errorType: 'CONNECTION_REFUSED' | 'DNS_FAILURE' | 'TIMEOUT' | 'SERVER_ERROR' = 'SERVER_ERROR') => {
  return http.all(endpoint, async () => {
    switch (errorType) {
      case 'CONNECTION_REFUSED':
        return HttpResponse.error();
      case 'DNS_FAILURE':
        return HttpResponse.error();
      case 'TIMEOUT':
        await new Promise(resolve => setTimeout(resolve, 11000));
        return new HttpResponse(null, { status: 408 });
      case 'SERVER_ERROR':
        return new HttpResponse(null, { status: 500 });
      default:
        return new HttpResponse(null, { status: 500 });
    }
  });
};

// Custom response mocking utility
export const mockBackendResponse = (endpoint: string, response: any, statusCode: number = 200) => {
  return http.all(endpoint, async ({ request }) => {
    logRequest(request.method, request.url, await request.clone().json().catch(() => null));
    logResponse(request.url, statusCode, response);
    
    return HttpResponse.json(response, { status: statusCode });
  });
};

// Default mock handlers for backend services
const defaultHandlers = [
  // AI service endpoints
  http.post('*/api/ai/clarify-problem', async ({ request }) => {
    const body = await request.json() as any;
    logRequest('POST', '/api/ai/clarify-problem', body);
    
    const response = {
      success: true,
      clarifiedProblem: `Clarified: ${body.problemStatement}`,
      originalProblem: body.problemStatement,
      projectId: body.projectId,
      projectName: body.projectName,
      context: body.context
    };
    
    logResponse('/api/ai/clarify-problem', 200, response);
    return HttpResponse.json(response);
  }),

  http.post('*/api/ai/sca-analysis', async ({ request }) => {
    const body = await request.json() as any;
    logRequest('POST', '/api/ai/sca-analysis', body);
    
    const response = {
      success: true,
      scaFactors: [
        {
          id: 'sca-1',
          category: 'TECHNICAL',
          factor: 'Technical Expertise',
          description: 'Strong technical foundation',
          strength: 'HIGH',
          sustainability: 'LONG_TERM',
          evidence: ['Proven track record'],
          actionItems: ['Continue development']
        }
      ],
      projectId: body.projectId,
      projectName: body.projectName
    };
    
    logResponse('/api/ai/sca-analysis', 200, response);
    return HttpResponse.json(response);
  }),

  http.post('*/api/ai/mvp-planning', async ({ request }) => {
    const body = await request.json() as any;
    logRequest('POST', '/api/ai/mvp-planning', body);
    
    const response = {
      success: true,
      mvpFeatures: [
        {
          id: 'mvp-1',
          name: 'Core Feature',
          description: 'Essential functionality',
          priority: 'MUST_HAVE',
          effort: 'HIGH',
          impact: 'HIGH',
          userStories: ['As a user, I want...'],
          acceptanceCriteria: ['Given when then...'],
          estimatedHours: 40,
          estimatedCost: 2000
        }
      ],
      projectId: body.projectId,
      projectName: body.projectName
    };
    
    logResponse('/api/ai/mvp-planning', 200, response);
    return HttpResponse.json(response);
  }),

  // Workflow service endpoints
  http.get('*/api/workflow/task/:id', async ({ params, request }) => {
    const { id } = params;
    logRequest('GET', `/api/workflow/task/${id}`, null);
    
    const response = {
      id,
      title: `Task ${id}`,
      description: `Description for task ${id}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    logResponse(`/api/workflow/task/${id}`, 200, response);
    return HttpResponse.json(response);
  }),

  http.patch('*/api/workflow/task/:id', async ({ params, request }) => {
    const { id } = params;
    const body = await request.json() as any;
    logRequest('PATCH', `/api/workflow/task/${id}`, body);
    
    const response = {
      id,
      ...body,
      updatedAt: new Date().toISOString()
    };
    
    logResponse(`/api/workflow/task/${id}`, 200, response);
    return HttpResponse.json(response);
  }),

  http.post('*/api/workflow/task/export-actions', async ({ request }) => {
    const body = await request.json() as any;
    logRequest('POST', '/api/workflow/task/export-actions', body);
    
    const response = {
      results: body.actions.map((action: any, index: number) => ({
        status: 'success',
        id: `wp-${index + 1}`,
        href: `${body.openProjectConfig.baseUrl}/work_packages/${index + 1}`,
        title: action.title
      }))
    };
    
    logResponse('/api/workflow/task/export-actions', 200, response);
    return HttpResponse.json(response);
  }),

  // Research service endpoints
  http.post('*/api/research/run', async ({ request }) => {
    const body = await request.json() as any;
    logRequest('POST', '/api/research/run', body);
    
    const response = {
      findings: [
        {
          title: 'Research Finding',
          summary: `Research results for: ${body.query}`
        }
      ],
      citations: [
        {
          source: 'Example Source',
          url: 'https://example.com',
          snippet: 'Relevant information snippet'
        }
      ],
      gaps: []
    };
    
    logResponse('/api/research/run', 200, response);
    return HttpResponse.json(response);
  }),

  http.get('*/api/research/stream', async ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('query');
    logRequest('GET', '/api/research/stream', { query });
    
    // Return Server-Sent Events format
    const stream = new ReadableStream({
      start(controller) {
        const events = [
          'data: {"type":"progress","phase":"starting"}\n\n',
          'data: {"type":"progress","phase":"searching"}\n\n',
          'data: {"type":"progress","phase":"analyzing"}\n\n',
          'data: {"type":"completion","summary":"Research complete"}\n\n'
        ];
        
        let index = 0;
        const interval = setInterval(() => {
          if (index < events.length) {
            controller.enqueue(new TextEncoder().encode(events[index]));
            index++;
          } else {
            controller.close();
            clearInterval(interval);
          }
        }, 100);
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  })
];

// Create MSW server
export const server = setupServer(...defaultHandlers);

// Setup and teardown for tests
beforeAll(() => {
  // Set environment variables for testing
  process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001';
  process.env.NODE_ENV = 'test';
  
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
  clearAllMockSessions();
});

afterAll(() => {
  server.close();
});

// Export server for use in individual tests
export { server as mswServer };