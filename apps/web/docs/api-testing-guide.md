# API Testing Guide

## Overview

This comprehensive API testing suite validates all endpoints in the BeBrahma platform's `/api/ai/` and `/api/workflow/` directories. The testing framework uses Jest with MSW (Mock Service Worker) for reliable, fast-running tests that validate complex workflow scenarios without external dependencies.

### Purpose and Scope

- **Request/Response Validation**: Test all HTTP methods, request payloads, and response formats
- **Error State Testing**: Validate 4xx/5xx error handling, timeout scenarios, and network failures  
- **Session Management**: Test workflow state persistence across multiple API calls
- **Real-time Updates**: Validate polling mechanisms and data consistency
- **Integration Testing**: Test complete workflows from start to finish

### Architecture Overview

The BeBrahma API architecture consists of multiple layers:

- **Frontend API Proxies**: 6 Next.js route handlers in `/apps/web/app/api/` that forward requests to backend services
- **Backend Services**: Multiple services including AI analysis, workflow orchestration, and CrewAI multi-agent collaboration
- **Session Management**: Complex workflow state managed across LangGraph and CrewAI services
- **Real-time Features**: Polling mechanisms for progress updates and workflow status

### Integration with Development Workflow

API tests run independently from UI tests and can be executed:
- During development for rapid feedback
- In pre-commit hooks for quality assurance
- In CI/CD pipelines for deployment validation
- On-demand for debugging specific scenarios

## Test Categories

### 1. Individual Endpoint Testing

Tests each API endpoint in isolation with focus on:

**AI Endpoints:**
- `/api/ai/clarify-problem` - Problem statement analysis and clarification
- `/api/ai/sca-analysis` - Sustainable Competitive Advantage analysis
- `/api/ai/mvp-planning` - Minimum Viable Product feature planning

**Workflow Endpoints:**
- `/api/workflow/task/[id]` - Task CRUD operations (GET, PATCH)
- `/api/workflow/task/export-actions` - OpenProject integration and export

**Research Endpoints:**
- `/api/research/run` - Execute research queries
- `/api/research/stream` - Server-sent events for real-time research updates

### 2. Integration Testing

**Workflow Session Persistence:**
- Complete end-to-end workflow execution
- Data flow between AI analysis and task management
- Session state maintenance across service boundaries
- Context preservation and enhancement

**Cross-Service Data Flow:**
- SCA factors feeding into MVP planning
- MVP features converting to actionable tasks
- OpenProject integration with exported actions
- Real-time synchronization across components

### 3. Error Scenario Testing

**Timeout Handling:**
- Request timeout limits (10-second default)
- AbortController usage verification
- Cleanup of hanging requests
- Timeout error message formatting

**Network Failures:**
- Connection failures (DNS, SSL, refused connections)
- HTTP error status codes (4xx, 5xx)
- Intermittent network issues and packet loss
- Service unavailability and graceful degradation
- Rate limiting and throttling responses

### 4. Real-time Feature Testing

**Polling Mechanisms:**
- Repeated GET requests for status updates
- Polling interval validation and frequency limits
- Long-polling scenarios with delayed responses
- Termination conditions and completion detection

**Data Consistency:**
- Immediate reflection of PATCH operations in polling
- Multi-client scenarios and session isolation
- Concurrent access without data corruption
- Progress tracking and stage transitions

### 5. Performance and Load Testing

**Resource Management:**
- Memory usage during extended polling
- Concurrent request handling
- Cleanup of resources and connections
- Cache behavior optimization

## Running Tests

### Local Development

```bash
# Run all API tests
npm run test:api

# Run tests in watch mode for development
npm run test:api:watch

# Run tests with coverage reporting
npm run test:api:coverage

# Run specific test categories
npm run test:integration     # Integration tests only
npm run test:timeout         # Timeout scenario tests
npm run test:network         # Network failure tests
```

### Individual Test Suites

```bash
# AI endpoint tests
npx jest tests/api/ai/

# Workflow endpoint tests  
npx jest tests/api/workflow/

# Research endpoint tests
npx jest tests/api/research/

# Error scenario tests
npx jest tests/api/error-scenarios/

# Integration tests
npx jest tests/api/integration/
```

### CI/CD Environment

The API tests are designed to run in CI environments with:
- Deterministic mock responses
- No external service dependencies
- Consistent timing and state management
- Comprehensive error reporting

### Debugging Failed Tests

```bash
# Run with verbose output
npm run test:api -- --verbose

# Run specific test file
npx jest tests/api/ai/clarify-problem.test.ts

# Run tests matching pattern
npx jest --testNamePattern="should handle timeout scenarios"

# Enable MSW debug logging
MSW_DEBUG=1 npm run test:api
```

### Test Isolation and Cleanup

Each test automatically:
- Resets MSW handlers before execution
- Clears mock session storage
- Restores original timers and state
- Prevents test interference and flaky results

## Test Utilities and Patterns

### MSW Setup and Configuration

The testing framework uses Mock Service Worker (MSW) for intercepting HTTP requests:

```typescript
// Basic setup in tests/api/setup.ts
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

export const server = setupServer(
  // Default handlers for all backend services
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Mock Data Creation and Management

**Session State Management:**
```typescript
// Create workflow session with initial state
createMockSession('session-id', {
  projectId: 'proj-123',
  stage: 'sca-analysis',
  data: { /* session data */ }
});

// Update session state during workflow progression
updateMockSession('session-id', {
  stage: 'mvp-planning',
  data: { /* updated data */ }
});
```

**Custom Response Mocking:**
```typescript
// Mock specific backend responses
server.use(
  mockBackendResponse('*/api/ai/clarify-problem', {
    success: true,
    clarifiedProblem: 'Enhanced problem statement'
  }, 200)
);
```

**Error Simulation:**
```typescript
// Simulate network timeouts
server.use(simulateTimeout('*/api/ai/sca-analysis', 11000));

// Simulate network failures
server.use(simulateNetworkError('*/api/workflow/task/123', 'CONNECTION_REFUSED'));
```

### Best Practices

**Test Structure:**
- Use descriptive test names that explain the scenario
- Group related tests with `describe` blocks
- Test both success and error cases
- Include edge cases and boundary conditions

**Data Management:**
- Use fixture files for consistent test data
- Create realistic mock responses that match actual API behavior
- Test with various data sizes and complexity levels
- Validate data transformation and persistence

**Async Testing:**
- Use `async/await` for all asynchronous operations
- Set appropriate timeouts for long-running tests
- Test concurrent operations and race conditions
- Verify cleanup of promises and timers

**Error Testing:**
- Test all documented error conditions
- Verify error message formatting and codes
- Test error propagation through the system
- Validate recovery mechanisms and retry logic

## Fixtures and Mock Data

### Structure of Fixture Files

**AI Responses** (`tests/api/fixtures/ai-responses.json`):
- Problem clarification responses (simple and complex)
- SCA analysis results with multiple factors
- MVP planning features with detailed specifications
- LLM completion responses and streaming chunks
- Error responses for various failure scenarios

**Workflow Responses** (`tests/api/fixtures/workflow-responses.json`):
- Task management operations (CRUD)
- OpenProject integration results
- Workflow session state and progression
- Progress tracking and real-time updates
- Error responses for workflow failures

### Creating Realistic Test Data

**Problem Clarification:**
```json
{
  "success": true,
  "clarifiedProblem": "Enhanced problem with market context",
  "targetAudience": "Small businesses (5-50 employees)",
  "painPoints": ["Inefficient processes", "Poor collaboration"],
  "marketOpportunity": "Growing market segment",
  "nextSteps": ["User interviews", "Competitor analysis"]
}
```

**SCA Analysis:**
```json
{
  "success": true,
  "scaFactors": [
    {
      "id": "sca-tech-1",
      "category": "TECHNICAL",
      "factor": "Development Capabilities",
      "strength": "HIGH",
      "sustainability": "LONG_TERM",
      "evidence": ["Technical expertise", "Proven track record"],
      "actionItems": ["Continue skill development", "Build documentation"]
    }
  ]
}
```

**MVP Planning:**
```json
{
  "success": true,
  "mvpFeatures": [
    {
      "id": "mvp-1",
      "name": "User Authentication",
      "priority": "MUST_HAVE",
      "effort": "MEDIUM", 
      "impact": "HIGH",
      "estimatedHours": 40,
      "scaAlignment": ["sca-tech-1"]
    }
  ]
}
```

### Managing Test Data Across Scenarios

**Data Consistency:**
- Use consistent IDs across related test data
- Maintain referential integrity between objects
- Version control fixture files for reproducibility
- Document data relationships and dependencies

**Scenario-Specific Data:**
- Create minimal fixtures for simple tests
- Use comprehensive fixtures for integration tests
- Include edge cases and boundary conditions
- Test with invalid and malformed data

### Updating Fixtures When APIs Evolve

**Version Management:**
- Keep fixtures synchronized with API changes
- Use semantic versioning for major fixture updates
- Maintain backward compatibility when possible
- Document breaking changes and migration paths

**Validation:**
- Run tests against actual API responses periodically
- Compare fixture data with production API schemas
- Validate data types and required fields
- Test with actual backend services in staging

## Troubleshooting

### Common Test Failures and Solutions

**MSW Request Interception Issues:**
```
Error: Request handler not found
```
Solution: Verify handler patterns match request URLs exactly, including wildcards and parameters.

**Timeout and Timing Issues:**
```
Error: Test exceeded timeout
```
Solution: Use `jest.useFakeTimers()` and `jest.advanceTimersByTime()` for predictable timing in tests.

**State Pollution Between Tests:**
```
Error: Unexpected session data found
```
Solution: Ensure `server.resetHandlers()` and `clearAllMockSessions()` run in `beforeEach` or `afterEach`.

**TypeScript Compilation Errors:**
```
Error: Cannot find module or type definitions
```
Solution: Check `moduleNameMapping` in Jest configuration and ensure proper import paths.

### Debugging MSW Request Interception

**Enable Debug Logging:**
```bash
MSW_DEBUG=1 npm run test:api
```

**Inspect Handler Registration:**
```typescript
// Log registered handlers
console.log('MSW Handlers:', server.listHandlers());

// Verify handler matching
server.use(
  http.post('*/api/ai/clarify-problem', ({ request }) => {
    console.log('Handler matched:', request.method, request.url);
    return HttpResponse.json({ success: true });
  })
);
```

**Request Verification:**
```typescript
// Capture and inspect requests
let capturedRequests = [];
server.use(
  http.all('*', ({ request }) => {
    capturedRequests.push({
      method: request.method,
      url: request.url,
      headers: Object.fromEntries(request.headers)
    });
    return req.passthrough(); // Continue to actual handler
  })
);
```

### Handling Timing Issues in Async Tests

**Fake Timers:**
```typescript
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

// Advance time in tests
jest.advanceTimersByTime(5000); // Advance by 5 seconds
```

**Async/Await Patterns:**
```typescript
// Wait for async operations
await new Promise(resolve => setTimeout(resolve, 100));

// Use proper async assertions
await expect(asyncOperation()).resolves.toBe(expectedValue);
await expect(asyncOperation()).rejects.toThrow('Expected error');
```

### Memory and Performance Issues

**Memory Leaks:**
- Clear all timers and intervals in test cleanup
- Reset MSW server state between tests
- Avoid creating large objects in test loops
- Monitor memory usage in long-running test suites

**Performance Optimization:**
```typescript
// Use sparse mock data for performance tests
const largeMockArray = new Array(1000).fill(null).map((_, i) => ({
  id: `item-${i}`,
  name: `Item ${i}`
}));

// Limit concurrent requests in tests
const concurrentLimit = 5;
const requests = Array.from({ length: 100 }, (_, i) => 
  i < concurrentLimit ? makeRequest(i) : Promise.resolve()
);
```

## CI/CD Integration

### How API Tests Run in Continuous Integration

**GitHub Actions Integration:**
```yaml
- name: Run API Tests
  run: npm run test:api:coverage
  env:
    NODE_ENV: test
    MSW_DEBUG: false

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    directory: ./coverage/api
```

**Test Isolation:**
- Tests run in isolated Node.js processes
- No shared state between test files
- Deterministic mock responses ensure consistency
- No external service dependencies required

### Test Result Reporting and Failure Notifications

**JUnit XML Reports:**
```xml
<!-- Generated automatically for CI integration -->
<testsuites>
  <testsuite name="API Tests" tests="45" failures="0" time="12.34">
    <testcase classname="AI Endpoints" name="should handle problem clarification" time="0.123"/>
  </testsuite>
</testsuites>
```

**Coverage Reports:**
- HTML reports for detailed coverage analysis
- LCOV format for integration with coverage tools
- JSON format for programmatic analysis
- Text format for console output

### Performance Benchmarking and Regression Detection

**Performance Metrics:**
```typescript
// Track response times in tests
const startTime = performance.now();
const response = await apiCall();
const duration = performance.now() - startTime;

expect(duration).toBeLessThan(1000); // Max 1 second response
```

**Regression Detection:**
- Compare test execution times across builds
- Monitor memory usage patterns
- Track request/response payload sizes
- Alert on performance degradation

### Integration with Deployment Pipelines

**Pre-deployment Validation:**
```bash
# Run API tests before deployment
npm run test:api || exit 1

# Run integration tests with staging environment
npm run test:integration:staging

# Validate API compatibility
npm run test:api:compatibility
```

**Post-deployment Verification:**
- Run smoke tests against deployed APIs
- Validate critical workflow paths
- Monitor error rates and response times
- Rollback triggers on test failures

## Maintenance

### Updating Tests When APIs Change

**API Evolution Process:**
1. Update API endpoint implementation
2. Modify corresponding test fixtures
3. Update test assertions and expectations
4. Run full test suite to validate changes
5. Update documentation and examples

**Breaking Changes:**
- Create migration tests for version compatibility
- Maintain backward compatibility tests
- Update error message validations
- Modify response schema validations

### Adding Tests for New Endpoints

**New Endpoint Checklist:**
- [ ] Create test file following naming convention
- [ ] Add request/response validation tests
- [ ] Include error scenario testing
- [ ] Test integration with existing workflows
- [ ] Add fixture data for various scenarios
- [ ] Update documentation and examples

**Test Template:**
```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';
import { server, mockBackendResponse } from '../setup';
import { NextRequest } from 'next/server';
import { POST } from '../../../app/api/new-endpoint/route';

describe('API: /api/new-endpoint', () => {
  beforeEach(() => {
    server.resetHandlers();
  });

  describe('Request/Response Validation', () => {
    it('should handle valid POST request', async () => {
      // Test implementation
    });
  });

  describe('Error Handling', () => {
    it('should handle missing required fields', async () => {
      // Error test implementation
    });
  });
});
```

### Refactoring Test Utilities

**Utility Organization:**
- Keep common utilities in `tests/api/setup.ts`
- Create specialized utilities for complex scenarios
- Extract reusable assertion helpers
- Maintain backward compatibility in utility functions

**Code Reuse:**
```typescript
// Reusable test helpers
export const createValidRequest = (endpoint: string, body: any) => {
  return new NextRequest(`http://localhost:3000${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
};

export const expectValidResponse = (response: Response, expectedData: any) => {
  expect(response.status).toBe(200);
  expect(response.headers.get('Content-Type')).toContain('application/json');
  return response.json().then(data => {
    expect(data).toMatchObject(expectedData);
    return data;
  });
};
```

### Managing Test Data and Fixtures

**Data Versioning:**
- Use semantic versioning for fixture files
- Maintain compatibility matrices for API versions
- Archive old fixture versions for regression testing
- Document data schema changes and migrations

**Fixture Maintenance:**
```bash
# Validate fixture data against schemas
npm run fixtures:validate

# Update fixture data from API responses
npm run fixtures:update

# Clean up unused or outdated fixtures
npm run fixtures:cleanup
```

**Data Quality:**
- Regular review of fixture data accuracy
- Validation against production API schemas
- Testing with edge cases and boundary conditions
- Performance testing with large datasets

This comprehensive API testing guide provides developers with the knowledge and tools needed to maintain, extend, and debug the BeBrahma platform's API testing suite. The testing framework ensures reliable API functionality, comprehensive error handling, and smooth integration across all platform services.