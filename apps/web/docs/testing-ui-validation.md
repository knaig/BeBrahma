## UI Validation Testing Suite

### Overview
This suite validates component rendering, state management, theming, responsiveness, accessibility, and component integration for the BeBrahma web app.

### Test Categories
- Component rendering and state management
- Theme switching and responsive design
- Accessibility and keyboard navigation
- Component integration and prop handling

### Running Tests
- UI tests: `npm run test:ui` (from apps/web)
- Accessibility: `npm run test:a11y`
- Responsive & Theme: `npm run test:responsive` or `npm run test:theme`
- Integration: `npm run test:integration`

### Utilities
Test helpers in `tests/utils/test-helpers.ts` provide:
- `mockApiRoutes(page, fixtures)`
- `toggleTheme(page, mode)` and `verifyThemeClasses(page)`
- `checkResponsiveBreakpoints(page, selector)`
- `checkAccessibility(page)`
- `waitForComponentMount(page, testId)`
- `simulateKeyboardNavigation(page)`
- `mockStreamingResponse(page, route, messages)`
- `captureComponentState(page, component)`

### Fixtures
API fixtures in `tests/fixtures/api-responses.json` mock ChatInterface and LangGraph workflow endpoints with deterministic data.

### CI Integration
- Configure Playwright to record traces and videos for failures
- Use parallel workers and retries for flaky tests

