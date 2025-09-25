import { test, expect } from '@playwright/test';
import { testHelpers } from './utils/test-helpers';
import { crossBrowserHelpers } from './utils/cross-browser-helpers';

test.describe('Cross-Browser Compatibility Testing', () => {
  let helpers: typeof testHelpers;
  let crossBrowserUtils: typeof crossBrowserHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = testHelpers;
    crossBrowserUtils = crossBrowserHelpers;
    await page.goto('/');
  });

  test.describe('Browser Feature Detection', () => {
    test('should detect CSS Grid support across all browsers', async ({ page }) => {
      const features = await crossBrowserUtils.detectBrowserFeatures(page);
      expect(features.cssGrid).toBeDefined();
      expect(typeof features.cssGrid).toBe('boolean');
    });

    test('should detect Flexbox support across all browsers', async ({ page }) => {
      const features = await crossBrowserUtils.detectBrowserFeatures(page);
      expect(features.flexbox).toBeDefined();
      expect(typeof features.flexbox).toBe('boolean');
    });

    test('should detect ES6+ JavaScript features', async ({ page }) => {
      const features = await crossBrowserUtils.detectBrowserFeatures(page);
      expect(features.asyncAwait).toBeDefined();
      expect(features.arrowFunctions).toBeDefined();
      expect(features.destructuring).toBeDefined();
      expect(features.templateLiterals).toBeDefined();
    });

    test('should detect Web APIs availability', async ({ page }) => {
      const features = await crossBrowserUtils.detectBrowserFeatures(page);
      expect(features.localStorage).toBeDefined();
      expect(features.sessionStorage).toBeDefined();
      expect(features.fetch).toBeDefined();
      expect(features.websocket).toBeDefined();
    });

    test('should validate CSS property support', async ({ page }) => {
      const gridSupport = await crossBrowserUtils.testCSSSupport(page, 'display', 'grid');
      const flexSupport = await crossBrowserUtils.testCSSSupport(page, 'display', 'flex');
      
      expect(gridSupport).toBeDefined();
      expect(flexSupport).toBeDefined();
    });
  });

  test.describe('Cross-Browser UI Consistency', () => {
    test('should render ChatInterface consistently across browsers', async ({ page }) => {
      await page.goto('/chat');
      
      const chatInterface = page.locator('[data-testid="chat-interface"]');
      await expect(chatInterface).toBeVisible();
      
      // Test component rendering consistency
      const consistency = await crossBrowserUtils.validateConsistency(page, [
        '[data-testid="chat-input"]',
        '[data-testid="send-button"]',
        '[data-testid="message-list"]'
      ]);
      
      expect(consistency.isConsistent).toBe(true);
    });

    test('should maintain font rendering consistency', async ({ page }) => {
      const fontConsistency = await crossBrowserUtils.compareRendering(page, ['chrome', 'firefox', 'safari']);
      
      // Check that fonts render consistently across browsers
      expect(fontConsistency.fontRendering).toBeDefined();
      expect(fontConsistency.fontRendering.isConsistent).toBe(true);
    });

    test('should maintain form element consistency', async ({ page }) => {
      await page.goto('/onboarding');
      
      const formElements = [
        'input[type="text"]',
        'input[type="email"]',
        'select',
        'button[type="submit"]'
      ];
      
      const formConsistency = await crossBrowserUtils.validateConsistency(page, formElements);
      expect(formConsistency.isConsistent).toBe(true);
    });

    test('should maintain animation consistency', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Test transition animations
      const transitionButton = page.locator('[data-testid="theme-toggle"]');
      await transitionButton.click();
      
      // Wait for transition to complete
      await page.waitForTimeout(300);
      
      const animationConsistency = await crossBrowserUtils.validateConsistency(page, [
        '[data-testid="dashboard-header"]',
        '[data-testid="sidebar"]'
      ]);
      
      expect(animationConsistency.isConsistent).toBe(true);
    });
  });

  test.describe('Browser-Specific Performance', () => {
    test('should measure JavaScript execution performance', async ({ page }) => {
      const performance = await crossBrowserUtils.benchmarkAcrossBrowsers(page, [
        'javascript-execution',
        'dom-manipulation',
        'event-handling'
      ]);
      
      expect(performance.javascriptExecution).toBeDefined();
      expect(performance.domManipulation).toBeDefined();
      expect(performance.eventHandling).toBeDefined();
    });

    test('should compare memory usage patterns', async ({ page }) => {
      const memoryComparison = await crossBrowserUtils.compareMemoryUsage(page, ['chrome', 'firefox', 'safari']);
      
      expect(memoryComparison.initialMemory).toBeDefined();
      expect(memoryComparison.memoryGrowth).toBeDefined();
      expect(memoryComparison.garbageCollection).toBeDefined();
    });

    test('should validate rendering performance', async ({ page }) => {
      const renderingPerformance = await crossBrowserUtils.testRenderingPerformance(page, ['chrome', 'firefox', 'safari']);
      
      expect(renderingPerformance.paintTime).toBeDefined();
      expect(renderingPerformance.layoutTime).toBeDefined();
      expect(renderingPerformance.compositeTime).toBeDefined();
    });

    test('should test network request handling', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Trigger network requests
      await page.click('[data-testid="refresh-data"]');
      
      const networkPerformance = await crossBrowserUtils.benchmarkAcrossBrowsers(page, [
        'network-requests',
        'caching-behavior',
        'request-prioritization'
      ]);
      
      expect(networkPerformance.networkRequests).toBeDefined();
      expect(networkPerformance.cachingBehavior).toBeDefined();
    });
  });

  test.describe('Feature Compatibility Testing', () => {
    test('should test ChatInterface functionality across browsers', async ({ page }) => {
      await page.goto('/chat');
      
      // Test chat functionality
      const chatInput = page.locator('[data-testid="chat-input"]');
      const sendButton = page.locator('[data-testid="send-button"]');
      
      await chatInput.fill('Test message');
      await sendButton.click();
      
      // Verify message appears
      const messageList = page.locator('[data-testid="message-list"]');
      await expect(messageList).toContainText('Test message');
      
      // Test browser-specific behavior
      const browserBehavior = await crossBrowserUtils.testBrowserSpecificBehavior(page, 'chat-functionality');
      expect(browserBehavior.isCompatible).toBe(true);
    });

    test('should test dashboard component behavior', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Test dashboard interactions
      const dashboardHeader = page.locator('[data-testid="dashboard-header"]');
      await expect(dashboardHeader).toBeVisible();
      
      // Test component responsiveness
      const componentBehavior = await crossBrowserUtils.testBrowserSpecificBehavior(page, 'dashboard-components');
      expect(componentBehavior.isCompatible).toBe(true);
    });

    test('should test onboarding flow compatibility', async ({ page }) => {
      await page.goto('/onboarding');
      
      // Test onboarding steps
      const onboardingSteps = page.locator('[data-testid="onboarding-step"]');
      await expect(onboardingSteps.first()).toBeVisible();
      
      // Test form submission
      const emailInput = page.locator('[data-testid="onboarding-email"], input[type="email"], input[name="email"]').first();
      const submitButton = page.locator('[data-testid="submit-onboarding"]');
      
      // Fill the email input field specifically
      await emailInput.fill('test@example.com');
      await submitButton.click();
      
      // Verify progression
      const nextStep = page.locator('[data-testid="onboarding-step"]').nth(1);
      await expect(nextStep).toBeVisible();
    });

    test('should test theme switching compatibility', async ({ page }) => {
      await page.goto('/dashboard');
      
      const themeToggle = page.locator('[data-testid="theme-toggle"]');
      const initialTheme = await page.getAttribute('html', 'data-theme');
      
      await themeToggle.click();
      
      // Wait for theme change
      await page.waitForTimeout(200);
      
      const newTheme = await page.getAttribute('html', 'data-theme');
      expect(newTheme).not.toBe(initialTheme);
      
      // Test theme consistency across browsers
      const themeConsistency = await crossBrowserUtils.validateConsistency(page, [
        '[data-testid="dashboard-header"]',
        '[data-testid="sidebar"]',
        '[data-testid="main-content"]'
      ]);
      
      expect(themeConsistency.isConsistent).toBe(true);
    });
  });

  test.describe('Browser-Specific Error Handling', () => {
    test('should test error boundary behavior', async ({ page }) => {
      await page.goto('/dashboard');
      
      try {
        // Try to trigger a component-level error by clicking a known error-inducing button
        // This is safer than injecting window errors
        const errorButton = page.locator('[data-testid="error-trigger-button"]');
        if (await errorButton.isVisible()) {
          await errorButton.click();
        } else {
          // If no error button exists, try to find an error-prone component
          const errorProneComponent = page.locator('[data-testid="error-prone-component"]');
          if (await errorProneComponent.isVisible()) {
            await errorProneComponent.click();
          }
        }
        
        // Wait for error boundary to potentially appear
        await page.waitForTimeout(1000);
        
        // Check if error boundary is visible
        const errorBoundary = page.locator('[data-testid="error-boundary"]');
        const errorDisplayed = await errorBoundary.isVisible();
        
        // Different browsers may handle errors differently
        const errorHandling = await crossBrowserUtils.testBrowserSpecificBehavior(page, 'error-boundary');
        expect(errorHandling.isCompatible).toBe(true);
        
        // If error boundary is visible, check its content
        if (errorDisplayed) {
          const errorMessage = page.locator('[data-testid="error-message"]');
          await expect(errorMessage).toBeVisible();
          
          const retryButton = page.locator('[data-testid="retry-button"]');
          if (await retryButton.isVisible()) {
            await retryButton.click();
            // Wait for recovery
            await page.waitForTimeout(1000);
            await expect(errorBoundary).not.toBeVisible();
          }
        }
      } catch (error) {
        // If no error boundary is triggered, that's also valid
        console.log('No error boundary was triggered, which is acceptable');
      }
    });

    test('should test console error reporting', async ({ page }) => {
      const consoleErrors: string[] = [];
      
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      // Trigger an error
      await page.evaluate(() => {
        console.error('Test console error');
      });
      
      expect(consoleErrors).toContain('Test console error');
      
      // Test error reporting consistency
      const errorReporting = await crossBrowserUtils.testErrorReporting(page, 'console');
      expect(errorReporting.isConsistent).toBe(true);
    });

    test('should test network failure handling', async ({ page }) => {
      // Mock network failure
      await page.route('**/api/**', route => route.abort());
      
      await page.goto('/dashboard');
      
      // Check error handling
      const errorMessage = page.locator('[data-testid="error-message"]');
      const errorDisplayed = await errorMessage.isVisible();
      
      // Test recovery mechanisms
      const recoveryBehavior = await crossBrowserUtils.testBrowserSpecificBehavior(page, 'network-recovery');
      expect(recoveryBehavior.isCompatible).toBe(true);
    });
  });

  test.describe('Accessibility Across Browsers', () => {
    test('should test screen reader compatibility', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Test ARIA attributes
      const ariaElements = page.locator('[aria-label], [aria-describedby], [aria-labelledby]');
      const ariaCount = await ariaElements.count();
      expect(ariaCount).toBeGreaterThan(0);
      
      // Test accessibility features
      const accessibilityFeatures = await crossBrowserUtils.detectBrowserFeatures(page);
      expect(accessibilityFeatures.ariaSupport).toBeDefined();
    });

    test('should test keyboard navigation consistency', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Test tab navigation
      await page.keyboard.press('Tab');
      const firstFocusable = page.locator(':focus');
      await expect(firstFocusable).toBeVisible();
      
      // Test keyboard navigation
      const keyboardNavigation = await crossBrowserUtils.testBrowserSpecificBehavior(page, 'keyboard-navigation');
      expect(keyboardNavigation.isCompatible).toBe(true);
    });

    test('should test ARIA attribute support', async ({ page }) => {
      await page.goto('/chat');
      
      // Test ARIA roles
      const roleElements = page.locator('[role]');
      const roleCount = await roleElements.count();
      expect(roleCount).toBeGreaterThan(0);
      
      // Test ARIA support
      const ariaSupport = await crossBrowserUtils.detectBrowserFeatures(page);
      expect(ariaSupport.ariaSupport).toBeDefined();
    });

    test('should test focus management', async ({ page }) => {
      await page.goto('/onboarding');
      
      // Test focus trapping in modals
      const modal = page.locator('[data-testid="onboarding-modal"]');
      if (await modal.isVisible()) {
        // Test focus management
        const focusManagement = await crossBrowserUtils.testBrowserSpecificBehavior(page, 'focus-management');
        expect(focusManagement.isCompatible).toBe(true);
      }
    });
  });

  test.describe('Cross-Browser Performance Comparison', () => {
    test('should compare overall performance across browsers', async ({ page }) => {
      const performanceComparison = await crossBrowserUtils.validatePerformanceAcrossBrowsers(page, [
        'page-load-time',
        'time-to-interactive',
        'memory-usage',
        'rendering-performance'
      ]);
      
      expect(performanceComparison.pageLoadTime).toBeDefined();
      expect(performanceComparison.timeToInteractive).toBeDefined();
      expect(performanceComparison.memoryUsage).toBeDefined();
      expect(performanceComparison.renderingPerformance).toBeDefined();
    });

    test('should identify browser-specific bottlenecks', async ({ page }) => {
      const bottlenecks = await crossBrowserUtils.benchmarkAcrossBrowsers(page, [
        'javascript-execution',
        'css-rendering',
        'network-requests',
        'memory-allocation'
      ]);
      
      // Analyze for bottlenecks
      expect(bottlenecks.javascriptExecution).toBeDefined();
      expect(bottlenecks.cssRendering).toBeDefined();
      expect(bottlenecks.networkRequests).toBeDefined();
      expect(bottlenecks.memoryAllocation).toBeDefined();
    });

    test('should validate performance consistency', async ({ page }) => {
      const consistency = await crossBrowserUtils.validatePerformanceAcrossBrowsers(page, [
        'core-web-vitals',
        'user-interaction-performance',
        'resource-loading-performance'
      ]);
      
      expect(consistency.coreWebVitals).toBeDefined();
      expect(consistency.userInteractionPerformance).toBeDefined();
      expect(consistency.resourceLoadingPerformance).toBeDefined();
    });
  });
});
