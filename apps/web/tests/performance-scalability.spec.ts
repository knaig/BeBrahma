import { test, expect } from '@playwright/test';
import { mockApiRoutes } from './utils/test-helpers';
import {
  waitForOnboardingStepLoad,
  waitForDashboardLoad,
  waitForChatInterfaceLoad,
  setupJourneyMocks,
  generateOnboardingData,
  startProjectFromDashboard,
  measurePageLoadPerformance,
  measureMemoryUsage,
  measureRenderingPerformance,
  measureNetworkPerformance,
  measureDatabasePerformance,
  measureScalabilityMetrics,
  simulateHighLoad,
  measureResourceUtilization,
  measureCachingEfficiency,
  measureOptimizationMetrics,
  measureProgressiveEnhancement,
  measureErrorBoundaryPerformance,
  measureStateManagementPerformance,
  measureRealTimePerformance,
  measureMobilePerformance,
  measureAccessibilityPerformance
} from './utils/streamlined-journey-helpers';

test.describe('Performance and Scalability - Streamlined User Journey', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page);
    await setupJourneyMocks(page, 'performance-testing');
  });

  test.describe('Page Load Performance', () => {
    test('Onboarding page load time optimization', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      
      const loadTime = Date.now() - startTime;
      
      // Measure detailed performance metrics
      const performanceMetrics = await measurePageLoadPerformance(page, 'onboarding');
      
      expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds
      expect(performanceMetrics.firstContentfulPaint).toBeLessThan(1500);
      expect(performanceMetrics.largestContentfulPaint).toBeLessThan(2500);
      expect(performanceMetrics.cumulativeLayoutShift).toBeLessThan(0.1);
    });

    test('Dashboard page load time optimization', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      const loadTime = Date.now() - startTime;
      
      const performanceMetrics = await measurePageLoadPerformance(page, 'dashboard');
      
      expect(loadTime).toBeLessThan(2000); // Should load within 2 seconds
      expect(performanceMetrics.firstContentfulPaint).toBeLessThan(1000);
      expect(performanceMetrics.largestContentfulPaint).toBeLessThan(2000);
    });

    test('Chat interface load time optimization', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      const startTime = Date.now();
      await startProjectFromDashboard(page);
      await waitForChatInterfaceLoad(page);
      
      const loadTime = Date.now() - startTime;
      
      const performanceMetrics = await measurePageLoadPerformance(page, 'chat-interface');
      
      expect(loadTime).toBeLessThan(2500); // Should load within 2.5 seconds
      expect(performanceMetrics.firstContentfulPaint).toBeLessThan(1200);
      expect(performanceMetrics.largestContentfulPaint).toBeLessThan(2200);
    });
  });

  test.describe('Memory Usage and Management', () => {
    test('Memory usage during onboarding flow', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      
      const initialMemory = await measureMemoryUsage(page);
      
      // Complete onboarding steps
      const userData = generateOnboardingData('startup');
      await page.fill('[data-testid="company-name"]', userData.companyName);
      await page.selectOption('[data-testid="industry-select"]', userData.industry);
      await page.click('[data-testid="next-step"]');
      
      await waitForOnboardingStepLoad(page, 2);
      const step2Memory = await measureMemoryUsage(page);
      
      // Memory should not increase significantly
      const memoryIncrease = step2Memory.usedJSHeapSize - initialMemory.usedJSHeapSize;
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // Less than 10MB increase
    });

    test('Memory usage during dashboard interactions', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      const initialMemory = await measureMemoryUsage(page);
      
      // Perform multiple dashboard interactions
      for (let i = 0; i < 5; i++) {
        await page.click('[data-testid="refresh-status"]');
        await page.waitForTimeout(500);
      }
      
      const finalMemory = await measureMemoryUsage(page);
      
      // Memory should remain stable
      const memoryIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024); // Less than 5MB increase
    });

    test('Memory cleanup after navigation', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      
      const onboardingMemory = await measureMemoryUsage(page);
      
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      const dashboardMemory = await measureMemoryUsage(page);
      
      // Memory should be cleaned up after navigation
      expect(dashboardMemory.usedJSHeapSize).toBeLessThan(onboardingMemory.usedJSHeapSize * 1.2);
    });
  });

  test.describe('Rendering Performance', () => {
    test('Component rendering performance', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      
      const renderingMetrics = await measureRenderingPerformance(page, 'onboarding');
      
      expect(renderingMetrics.renderTime).toBeLessThan(100); // Should render within 100ms
      expect(renderingMetrics.repaintCount).toBeLessThan(5); // Minimal repaints
      expect(renderingMetrics.layoutThrashing).toBeLessThan(3); // Minimal layout thrashing
    });

    test('Dashboard component rendering performance', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      const renderingMetrics = await measureRenderingPerformance(page, 'dashboard');
      
      expect(renderingMetrics.renderTime).toBeLessThan(150); // Should render within 150ms
      expect(renderingMetrics.repaintCount).toBeLessThan(8); // Minimal repaints
    });

    test('Chat interface rendering performance', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      await startProjectFromDashboard(page);
      await waitForChatInterfaceLoad(page);
      
      const renderingMetrics = await measureRenderingPerformance(page, 'chat-interface');
      
      expect(renderingMetrics.renderTime).toBeLessThan(200); // Should render within 200ms
      expect(renderingMetrics.repaintCount).toBeLessThan(10); // Minimal repaints
    });
  });

  test.describe('Network Performance', () => {
    test('API response time optimization', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      
      const networkMetrics = await measureNetworkPerformance(page, 'onboarding');
      
      expect(networkMetrics.averageResponseTime).toBeLessThan(500); // Should respond within 500ms
      expect(networkMetrics.requestCount).toBeLessThan(10); // Minimal API calls
      expect(networkMetrics.totalTransferSize).toBeLessThan(1024 * 1024); // Less than 1MB
    });

    test('Dashboard API performance', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      const networkMetrics = await measureNetworkPerformance(page, 'dashboard');
      
      expect(networkMetrics.averageResponseTime).toBeLessThan(300); // Should respond within 300ms
      expect(networkMetrics.requestCount).toBeLessThan(5); // Minimal API calls
    });

    test('Chat interface API performance', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      await startProjectFromDashboard(page);
      await waitForChatInterfaceLoad(page);
      
      const networkMetrics = await measureNetworkPerformance(page, 'chat-interface');
      
      expect(networkMetrics.averageResponseTime).toBeLessThan(400); // Should respond within 400ms
      expect(networkMetrics.requestCount).toBeLessThan(8); // Minimal API calls
    });
  });

  test.describe('Scalability Testing', () => {
    test('Performance under high user load', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      
      // Simulate high load conditions
      const scalabilityMetrics = await simulateHighLoad(page, 'onboarding');
      
      expect(scalabilityMetrics.responseTimeUnderLoad).toBeLessThan(1000); // Should respond within 1s under load
      expect(scalabilityMetrics.throughput).toBeGreaterThan(100); // Should handle 100+ requests per minute
      expect(scalabilityMetrics.errorRate).toBeLessThan(0.01); // Less than 1% error rate
    });

    test('Database performance under load', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      const databaseMetrics = await measureDatabasePerformance(page, 'dashboard');
      
      expect(databaseMetrics.queryTime).toBeLessThan(200); // Queries should complete within 200ms
      expect(databaseMetrics.connectionPool).toBeGreaterThan(0.8); // Connection pool utilization > 80%
      expect(databaseMetrics.cacheHitRate).toBeGreaterThan(0.7); // Cache hit rate > 70%
    });

    test('Resource utilization optimization', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      
      const resourceMetrics = await measureResourceUtilization(page, 'onboarding');
      
      expect(resourceMetrics.cpuUsage).toBeLessThan(30); // CPU usage < 30%
      expect(resourceMetrics.memoryUsage).toBeLessThan(50); // Memory usage < 50%
      expect(resourceMetrics.networkBandwidth).toBeLessThan(1024 * 1024); // Network < 1MB/s
    });
  });

  test.describe('Caching and Optimization', () => {
    test('Caching efficiency', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      
      const cachingMetrics = await measureCachingEfficiency(page, 'onboarding');
      
      expect(cachingMetrics.cacheHitRate).toBeGreaterThan(0.6); // Cache hit rate > 60%
      expect(cachingMetrics.cacheSize).toBeLessThan(50 * 1024 * 1024); // Cache size < 50MB
      expect(cachingMetrics.cacheEvictionRate).toBeLessThan(0.1); // Low eviction rate
    });

    test('Code splitting and lazy loading', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      
      const optimizationMetrics = await measureOptimizationMetrics(page, 'onboarding');
      
      expect(optimizationMetrics.initialBundleSize).toBeLessThan(500 * 1024); // Initial bundle < 500KB
      expect(optimizationMetrics.lazyLoadedChunks).toBeGreaterThan(0); // Should have lazy-loaded chunks
      expect(optimizationMetrics.treeShakingEfficiency).toBeGreaterThan(0.7); // Tree shaking > 70%
    });

    test('Image and asset optimization', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      
      const assetMetrics = await page.evaluate(() => {
        const images = document.querySelectorAll('img');
        const totalSize = Array.from(images).reduce((size, img) => {
          const src = img.src;
          if (src.includes('webp') || src.includes('svg')) return size;
          return size + 1; // Count non-optimized images
        }, 0);
        
        return {
          totalImages: images.length,
          optimizedImages: images.length - totalSize,
          optimizationRate: (images.length - totalSize) / images.length
        };
      });
      
      expect(assetMetrics.optimizationRate).toBeGreaterThan(0.8); // 80% of images should be optimized
    });
  });

  test.describe('Progressive Enhancement', () => {
    test('Performance with JavaScript disabled', async ({ page }) => {
      // Disable JavaScript
      await page.route('**/*', route => {
        if (route.request().resourceType() === 'script') {
          route.abort();
        } else {
          route.continue();
        }
      });
      
      await page.goto('/onboarding');
      
      const enhancementMetrics = await measureProgressiveEnhancement(page, 'onboarding');
      
      expect(enhancementMetrics.basicFunctionality).toBe(true); // Basic functionality should work
      expect(enhancementMetrics.enhancedFeatures).toBe(false); // Enhanced features should be disabled
      expect(enhancementMetrics.loadTime).toBeLessThan(1000); // Should load quickly without JS
    });

    test('Performance with slow network', async ({ page }) => {
      // Simulate slow 3G network
      await page.route('**/*', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await route.continue();
      });
      
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      
      const loadTime = await page.evaluate(() => performance.timing.loadEventEnd - performance.timing.navigationStart);
      
      expect(loadTime).toBeLessThan(10000); // Should load within 10s even on slow network
    });
  });

  test.describe('Error Boundary Performance', () => {
    test('Error boundary performance impact', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      
      const errorBoundaryMetrics = await measureErrorBoundaryPerformance(page, 'onboarding');
      
      expect(errorBoundaryMetrics.overhead).toBeLessThan(50); // Error boundary overhead < 50ms
      expect(errorBoundaryMetrics.recoveryTime).toBeLessThan(200); // Recovery time < 200ms
    });

    test('State management performance', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      
      const stateMetrics = await measureStateManagementPerformance(page, 'onboarding');
      
      expect(stateMetrics.stateUpdateTime).toBeLessThan(100); // State updates < 100ms
      expect(stateMetrics.reRenderTime).toBeLessThan(150); // Re-renders < 150ms
      expect(stateMetrics.memoryLeaks).toBe(0); // No memory leaks
    });
  });

  test.describe('Real-time Performance', () => {
    test('Real-time updates performance', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      await startProjectFromDashboard(page);
      await waitForChatInterfaceLoad(page);
      
      const realTimeMetrics = await measureRealTimePerformance(page, 'chat-interface');
      
      expect(realTimeMetrics.updateLatency).toBeLessThan(500); // Updates < 500ms
      expect(realTimeMetrics.throughput).toBeGreaterThan(10); // 10+ updates per second
      expect(realTimeMetrics.connectionStability).toBeGreaterThan(0.95); // 95%+ connection stability
    });

    test('WebSocket performance', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      await startProjectFromDashboard(page);
      await waitForChatInterfaceLoad(page);
      
      // Test WebSocket connection performance
      const wsMetrics = await page.evaluate(() => {
        return new Promise((resolve) => {
          const start = performance.now();
          const ws = new WebSocket('ws://localhost:3000/ws');
          
          ws.onopen = () => {
            const openTime = performance.now() - start;
            ws.close();
            resolve({ connectionTime: openTime });
          };
          
          ws.onerror = () => {
            resolve({ connectionTime: Infinity });
          };
          
          setTimeout(() => resolve({ connectionTime: Infinity }), 5000);
        });
      });
      
      expect(wsMetrics.connectionTime).toBeLessThan(1000); // WebSocket should connect within 1s
    });
  });

  test.describe('Mobile Performance', () => {
    test('Mobile device performance optimization', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      
      const mobileMetrics = await measureMobilePerformance(page, 'onboarding');
      
      expect(mobileMetrics.loadTime).toBeLessThan(3000); // Should load within 3s on mobile
      expect(mobileMetrics.batteryUsage).toBeLessThan(0.1); // Battery usage < 10%
      expect(mobileMetrics.networkEfficiency).toBeGreaterThan(0.8); // Network efficiency > 80%
    });

    test('Touch interaction performance', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      
      // Test touch interaction performance
      const touchStart = Date.now();
      await page.touchscreen.tap(200, 300); // Tap on form field
      const touchResponse = Date.now() - touchStart;
      
      expect(touchResponse).toBeLessThan(100); // Touch response < 100ms
    });
  });

  test.describe('Accessibility Performance', () => {
    test('Accessibility features performance impact', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      
      const accessibilityMetrics = await measureAccessibilityPerformance(page, 'onboarding');
      
      expect(accessibilityMetrics.screenReaderPerformance).toBeLessThan(200); // Screen reader < 200ms
      expect(accessibilityMetrics.keyboardNavigation).toBeLessThan(100); // Keyboard nav < 100ms
      expect(accessibilityMetrics.ariaProcessing).toBeLessThan(50); // ARIA processing < 50ms
    });

    test('High contrast mode performance', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      
      // Simulate high contrast mode
      await page.addStyleTag({
        content: `
          * { 
            background: white !important; 
            color: black !important; 
            border: 2px solid black !important; 
          }
        `
      });
      
      const renderTime = await page.evaluate(() => {
        const start = performance.now();
        document.body.offsetHeight; // Force reflow
        return performance.now() - start;
      });
      
      expect(renderTime).toBeLessThan(100); // High contrast rendering < 100ms
    });
  });
});
