import { Page } from '@playwright/test';

export interface MockApiRoutesOptions {
  langgraphServiceDown?: boolean;
  partialWorkflowService?: boolean;
  allServicesDown?: boolean;
}

/**
 * Mock API routes for streamlined user journey testing
 */
export async function mockApiRoutes(page: Page, options: MockApiRoutesOptions = {}): Promise<void> {
  // Default mock setup for streamlined journey
  if (!options.langgraphServiceDown && !options.partialWorkflowService && !options.allServicesDown) {
    // Mock onboarding API
    await page.route('**/api/onboarding/**', route => {
      route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
    });

    // Mock dashboard API
    await page.route('**/api/dashboard/**', route => {
      route.fulfill({ status: 200, body: JSON.stringify({ 
        systemStatus: 'healthy',
        services: ['onboarding', 'chat', 'workflow']
      })});
    });

    // Mock workflow API
    await page.route('**/api/workflow/**', route => {
      route.fulfill({ status: 200, body: JSON.stringify({
        success: true,
        message: 'Workflow progressed successfully'
      })});
    });
  }

  // Mock specific error scenarios
  if (options.langgraphServiceDown) {
    await page.route('**/api/workflow/**', route => {
      route.fulfill({ status: 503, body: 'Service Unavailable' });
    });
  }

  if (options.partialWorkflowService) {
    await page.route('**/api/workflow/init', route => {
      route.fulfill({ status: 503, body: 'Service Unavailable' });
    });
    await page.route('**/api/workflow/next', route => {
      route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
    });
  }

  if (options.allServicesDown) {
    await page.route('**/api/**', route => {
      route.fulfill({ status: 503, body: 'Service Unavailable' });
    });
  }
}

/**
 * Mock error responses for streamlined journey testing
 */
export async function mockErrorResponses(page: Page, errorType: string): Promise<void> {
  const errorResponses = {
    'session_not_found': {
      status: 404,
      body: { error: 'Session not found' }
    },
    'invalid_decision': {
      status: 400,
      body: { error: 'Invalid decision' }
    },
    'service_unavailable': {
      status: 503,
      body: { error: 'Service temporarily unavailable' }
    },
    'timeout_error': {
      status: 408,
      body: { error: 'Request timeout' }
    },
    'network_error': {
      status: 500,
      body: { error: 'Network error occurred' }
    }
  };

  const errorResponse = errorResponses[errorType as keyof typeof errorResponses];
  if (errorResponse) {
    await page.route('**/api/**', async (route) => {
      await route.fulfill({
        status: errorResponse.status,
        contentType: 'application/json',
        body: JSON.stringify(errorResponse.body)
      });
    });
  }
}

/**
 * Mock network conditions for testing
 */
export async function mockNetworkConditions(page: Page, condition: 'slow' | 'offline' | 'unstable'): Promise<void> {
  switch (condition) {
    case 'slow':
      await page.route('**/api/**', async (route) => {
        setTimeout(() => route.continue(), 3000);
      });
      break;
    
    case 'offline':
      await page.route('**/api/**', async (route) => {
        await route.abort('Failed');
      });
      break;
    
    case 'unstable':
      let callCount = 0;
      await page.route('**/api/**', async (route) => {
        callCount++;
        if (callCount % 3 === 0) {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Unstable service' })
          });
        } else {
          await route.continue();
        }
      });
      break;
  }
}

/**
 * Measure test execution time
 */
export async function measureExecutionTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
  const startTime = Date.now();
  const result = await fn();
  const endTime = Date.now();
  
  return {
    result,
    duration: endTime - startTime
  };
}

/**
 * Setup test environment with common mocks and configurations
 */
export async function setupTestEnvironment(page: Page): Promise<void> {
  // Clear any existing session data
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // Setup default mock routes
  await mockApiRoutes(page);
}

/**
 * Cleanup test environment
 */
export async function cleanupTestEnvironment(page: Page): Promise<void> {
  // Clear session data
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // Unroute all mocked routes
  await page.unrouteAll();
}
