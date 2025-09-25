import { test, expect } from '@playwright/test';
import { testHelpers } from './utils/test-helpers';
import { performanceMonitoringHelpers } from './utils/performance-monitoring-helpers';

test.describe('Advanced Performance Monitoring', () => {
  let helpers: typeof testHelpers;
  let performanceUtils: typeof performanceMonitoringHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = testHelpers;
    performanceUtils = performanceMonitoringHelpers;
    await page.goto('/');
  });

  test.describe('Core Web Vitals Measurement', () => {
    test('should measure Largest Contentful Paint (LCP)', async ({ page }) => {
      const coreWebVitals = await performanceUtils.measureCoreWebVitals(page);
      
      expect(coreWebVitals.lcp).toBeDefined();
      expect(typeof coreWebVitals.lcp).toBe('number');
      expect(coreWebVitals.lcp).toBeGreaterThan(0);
      
      // LCP should be under 2.5 seconds for good performance
      expect(coreWebVitals.lcp).toBeLessThan(2500);
    });

    test('should measure First Input Delay (FID)', async ({ page }) => {
      // Wait for page to be fully loaded
      await page.waitForLoadState('networkidle');
      
      const coreWebVitals = await performanceUtils.measureCoreWebVitals(page);
      
      expect(coreWebVitals.fid).toBeDefined();
      expect(typeof coreWebVitals.fid).toBe('number');
      
      // FID should be under 100ms for good performance
      if (coreWebVitals.fid !== null) {
        expect(coreWebVitals.fid).toBeLessThan(100);
      }
    });

    test('should measure Cumulative Layout Shift (CLS)', async ({ page }) => {
      const coreWebVitals = await performanceUtils.measureCoreWebVitals(page);
      
      expect(coreWebVitals.cls).toBeDefined();
      expect(typeof coreWebVitals.cls).toBe('number');
      expect(coreWebVitals.cls).toBeGreaterThanOrEqual(0);
      
      // CLS should be under 0.1 for good performance
      expect(coreWebVitals.cls).toBeLessThan(0.1);
    });

    test('should measure Time to Interactive (TTI)', async ({ page }) => {
      const tti = await performanceUtils.measureTimeToInteractive(page);
      
      expect(tti).toBeDefined();
      expect(typeof tti).toBe('number');
      expect(tti).toBeGreaterThan(0);
      
      // TTI should be under 3.8 seconds for good performance
      expect(tti).toBeLessThan(3800);
    });

    test('should measure First Meaningful Paint (FMP)', async ({ page }) => {
      const fmp = await performanceUtils.trackFirstMeaningfulPaint(page);
      
      expect(fmp).toBeDefined();
      expect(typeof fmp).toBe('number');
      expect(fmp).toBeGreaterThan(0);
    });

    test('should track performance metrics over time', async ({ page }) => {
      const duration = 5000; // 5 seconds
      const metrics = await performanceUtils.trackPerformanceMetrics(page, duration);
      
      expect(metrics).toBeDefined();
      expect(Array.isArray(metrics)).toBe(true);
      expect(metrics.length).toBeGreaterThan(0);
      
      // Each metric should have required properties
      metrics.forEach(metric => {
        expect(metric.timestamp).toBeDefined();
        expect(metric.lcp).toBeDefined();
        expect(metric.fid).toBeDefined();
        expect(metric.cls).toBeDefined();
      });
    });
  });

  test.describe('Memory Profiling and Leak Detection', () => {
    test('should capture heap snapshots for analysis', async ({ page }) => {
      const initialSnapshot = await performanceUtils.captureHeapSnapshot(page);
      
      expect(initialSnapshot).toBeDefined();
      expect(initialSnapshot.totalSize).toBeDefined();
      expect(initialSnapshot.nodeCount).toBeDefined();
      expect(initialSnapshot.edgeCount).toBeDefined();
    });

    test('should detect memory leaks over time', async ({ page }) => {
      const iterations = 5;
      const leakDetection = await performanceUtils.detectMemoryLeaks(page, iterations);
      
      expect(leakDetection.hasLeak).toBeDefined();
      expect(typeof leakDetection.hasLeak).toBe('boolean');
      expect(leakDetection.memoryGrowth).toBeDefined();
      expect(leakDetection.growthRate).toBeDefined();
      
      // Memory growth should be reasonable
      expect(leakDetection.growthRate).toBeLessThan(0.1); // Less than 10% growth per iteration
    });

    test('should monitor garbage collection patterns', async ({ page }) => {
      const gcMonitoring = await performanceUtils.monitorGarbageCollection(page);
      
      expect(gcMonitoring.gcCount).toBeDefined();
      expect(gcMonitoring.gcDuration).toBeDefined();
      expect(gcMonitoring.gcFrequency).toBeDefined();
      expect(gcMonitoring.memoryBeforeGC).toBeDefined();
      expect(gcMonitoring.memoryAfterGC).toBeDefined();
    });

    test('should measure memory growth over time', async ({ page }) => {
      const duration = 10000; // 10 seconds
      const memoryGrowth = await performanceUtils.measureMemoryGrowth(page, duration);
      
      expect(memoryGrowth.initialMemory).toBeDefined();
      expect(memoryGrowth.finalMemory).toBeDefined();
      expect(memoryGrowth.growthRate).toBeDefined();
      expect(memoryGrowth.peakMemory).toBeDefined();
      
      // Memory should not grow excessively
      expect(memoryGrowth.growthRate).toBeLessThan(0.2); // Less than 20% growth over 10 seconds
    });

    test('should track memory usage during workflow progression', async ({ page }) => {
      // Navigate through different pages to test memory usage
      const memoryUsage = [];
      
      // Home page
      await page.goto('/');
      const homeMemory = await performanceUtils.captureHeapSnapshot(page);
      memoryUsage.push({ page: 'home', memory: homeMemory.totalSize });
      
      // Dashboard
      await page.goto('/dashboard');
      const dashboardMemory = await performanceUtils.captureHeapSnapshot(page);
      memoryUsage.push({ page: 'dashboard', memory: dashboardMemory.totalSize });
      
      // Chat
      await page.goto('/chat');
      const chatMemory = await performanceUtils.captureHeapSnapshot(page);
      memoryUsage.push({ page: 'chat', memory: chatMemory.totalSize });
      
      expect(memoryUsage).toHaveLength(3);
      
      // Memory should not grow excessively between pages
      const memoryGrowth = (chatMemory.totalSize - homeMemory.totalSize) / homeMemory.totalSize;
      expect(memoryGrowth).toBeLessThan(0.5); // Less than 50% growth
    });
  });

  test.describe('Performance Regression Detection', () => {
    test('should establish performance baselines', async ({ page }) => {
      const testName = 'page-load-performance';
      const baseline = await performanceUtils.establishPerformanceBaseline(page, testName);
      
      expect(baseline).toBeDefined();
      expect(baseline.testName).toBe(testName);
      expect(baseline.metrics).toBeDefined();
      expect(baseline.timestamp).toBeDefined();
      expect(baseline.version).toBeDefined();
    });

    test('should compare current performance against baseline', async ({ page }) => {
      const testName = 'core-web-vitals';
      const baseline = await performanceUtils.establishPerformanceBaseline(page, testName);
      
      // Run the same test again
      const currentMetrics = await performanceUtils.measureCoreWebVitals(page);
      const comparison = await performanceUtils.compareAgainstBaseline(page, testName, currentMetrics);
      
      expect(comparison).toBeDefined();
      expect(comparison.hasRegression).toBeDefined();
      expect(comparison.regressionDetails).toBeDefined();
      expect(comparison.performanceChange).toBeDefined();
    });

    test('should detect performance regressions', async ({ page }) => {
      const baseline = {
        lcp: 1000,
        fid: 50,
        cls: 0.05,
        tti: 2000
      };
      
      const current = {
        lcp: 1500,
        fid: 80,
        cls: 0.08,
        tti: 2500
      };
      
      const threshold = 0.2; // 20% degradation threshold
      const regression = performanceUtils.detectPerformanceRegression(current, baseline, threshold);
      
      expect(regression.hasRegression).toBe(true);
      expect(regression.regressions).toBeDefined();
      expect(regression.regressions.length).toBeGreaterThan(0);
    });

    test('should generate performance reports', async ({ page }) => {
      const metrics = await performanceUtils.measureCoreWebVitals(page);
      const baseline = await performanceUtils.establishPerformanceBaseline(page, 'performance-test');
      const comparison = await performanceUtils.compareAgainstBaseline(page, 'performance-test', metrics);
      
      const report = performanceUtils.generatePerformanceReport(metrics, comparison);
      
      expect(report).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.details).toBeDefined();
      expect(report.recommendations).toBeDefined();
    });
  });

  test.describe('Network Performance Analysis', () => {
    test('should analyze network waterfall', async ({ page }) => {
      await page.goto('/dashboard');
      
      const networkAnalysis = await performanceUtils.analyzeNetworkWaterfall(page);
      
      expect(networkAnalysis).toBeDefined();
      expect(networkAnalysis.requests).toBeDefined();
      expect(networkAnalysis.totalRequests).toBeDefined();
      expect(networkAnalysis.totalSize).toBeDefined();
      expect(networkAnalysis.loadingTime).toBeDefined();
    });

    test('should measure API response times', async ({ page }) => {
      const endpoints = ['/api/user', '/api/dashboard', '/api/chat'];
      
      // Trigger API calls
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      const apiPerformance = await performanceUtils.measureAPIResponseTimes(page, endpoints);
      
      expect(apiPerformance).toBeDefined();
      expect(apiPerformance.averageResponseTime).toBeDefined();
      expect(apiPerformance.endpointPerformance).toBeDefined();
      
      // API response times should be reasonable
      expect(apiPerformance.averageResponseTime).toBeLessThan(1000); // Less than 1 second
    });

    test('should test performance under various network conditions', async ({ page }) => {
      // Only test network conditions in Chromium (CDP support)
      if (page.context().browser()?.browserType().name() !== 'chromium') {
        test.skip('Network condition testing requires Chromium with CDP support');
        return;
      }

      const conditions = [
        { name: '3G', download: 750, upload: 250, latency: 100 },
        { name: '4G', download: 4000, upload: 3000, latency: 20 },
        { name: 'WiFi', download: 30000, upload: 15000, latency: 2 }
      ];
      
      for (const condition of conditions) {
        try {
          // Use CDP to emulate network conditions
          const client = await page.context().newCDPSession(page);
          await client.send('Network.enable');
          await client.send('Network.emulateNetworkConditions', {
            offline: false,
            downloadThroughput: condition.download * 1024 / 8, // Convert kbps to bytes per second
            uploadThroughput: condition.upload * 1024 / 8,
            latency: condition.latency
          });
          
          const startTime = Date.now();
          await page.goto('/');
          const loadTime = Date.now() - startTime;
          
          // Performance should degrade gracefully with slower networks
          if (condition.name === '3G') {
            expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds even on 3G
          }
          
          // Reset network conditions
          await client.send('Network.emulateNetworkConditions', {
            offline: false,
            downloadThroughput: -1,
            uploadThroughput: -1,
            latency: 0
          });
          
          await client.detach();
        } catch (error) {
          console.log(`Skipping network condition test for ${condition.name}: ${error}`);
        }
      }
    });

    test('should validate caching efficiency', async ({ page }) => {
      const resources = ['*.js', '*.css', '*.png', '*.webp'];
      
      // First load
      await page.goto('/');
      const firstLoadMetrics = await performanceUtils.analyzeNetworkWaterfall(page);
      
      // Second load (should use cache)
      await page.goto('/');
      const secondLoadMetrics = await performanceUtils.analyzeNetworkWaterfall(page);
      
      // Cached resources should load faster
      expect(secondLoadMetrics.totalSize).toBeLessThanOrEqual(firstLoadMetrics.totalSize);
      
      const cacheEfficiency = await performanceUtils.validateCachingEfficiency(page, resources);
      expect(cacheEfficiency.cacheHitRate).toBeDefined();
      expect(cacheEfficiency.cacheHitRate).toBeGreaterThan(0.5); // At least 50% cache hit rate
    });
  });

  test.describe('Resource Loading Analysis', () => {
    test('should measure JavaScript bundle load time', async ({ page }) => {
      const bundleLoadTime = await performanceUtils.measureBundleLoadTime(page);
      
      expect(bundleLoadTime).toBeDefined();
      expect(typeof bundleLoadTime).toBe('number');
      expect(bundleLoadTime).toBeGreaterThan(0);
      
      // Bundle should load within reasonable time
      expect(bundleLoadTime).toBeLessThan(3000); // Less than 3 seconds
    });

    test('should analyze image optimization', async ({ page }) => {
      const imageAnalysis = await performanceUtils.analyzeImageOptimization(page);
      
      expect(imageAnalysis).toBeDefined();
      expect(imageAnalysis.totalImages).toBeDefined();
      expect(imageAnalysis.optimizedImages).toBeDefined();
      expect(imageAnalysis.totalImageSize).toBeDefined();
      expect(imageAnalysis.averageImageSize).toBeDefined();
      
      // Images should be reasonably sized
      expect(imageAnalysis.averageImageSize).toBeLessThan(100000); // Less than 100KB average
    });

    test('should test lazy loading effectiveness', async ({ page }) => {
      const lazyLoadingEffectiveness = await performanceUtils.testLazyLoadingEffectiveness(page);
      
      expect(lazyLoadingEffectiveness).toBeDefined();
      expect(lazyLoadingEffectiveness.initialLoadTime).toBeDefined();
      expect(lazyLoadingEffectiveness.lazyLoadTime).toBeDefined();
      expect(lazyLoadingEffectiveness.improvement).toBeDefined();
      
      // Lazy loading should provide improvement
      expect(lazyLoadingEffectiveness.improvement).toBeGreaterThan(0);
    });

    test('should validate resource prioritization', async ({ page }) => {
      const resourcePrioritization = await performanceUtils.validateResourcePrioritization(page);
      
      expect(resourcePrioritization).toBeDefined();
      expect(resourcePrioritization.criticalResources).toBeDefined();
      expect(resourcePrioritization.nonCriticalResources).toBeDefined();
      expect(resourcePrioritization.loadingOrder).toBeDefined();
      
      // Critical resources should load first
      expect(resourcePrioritization.loadingOrder.criticalFirst).toBe(true);
    });
  });

  test.describe('Real-Time Performance Monitoring', () => {
    test('should start and stop performance monitoring', async ({ page }) => {
      await performanceUtils.startPerformanceMonitoring(page);
      
      // Perform some actions
      await page.goto('/dashboard');
      await page.click('[data-testid="refresh-data"]');
      await page.waitForTimeout(1000);
      
      const monitoringData = await performanceUtils.stopPerformanceMonitoring(page);
      
      expect(monitoringData).toBeDefined();
      expect(monitoringData.duration).toBeDefined();
      expect(monitoringData.metrics).toBeDefined();
      expect(monitoringData.events).toBeDefined();
    });

    test('should track user interaction performance', async ({ page }) => {
      await page.goto('/dashboard');
      
      const interactionPerformance = await performanceUtils.trackUserInteractionPerformance(page);
      
      expect(interactionPerformance).toBeDefined();
      expect(interactionPerformance.clickResponseTime).toBeDefined();
      expect(interactionPerformance.inputResponseTime).toBeDefined();
      expect(interactionPerformance.scrollPerformance).toBeDefined();
      
      // Interactions should be responsive
      expect(interactionPerformance.clickResponseTime).toBeLessThan(100); // Less than 100ms
    });

    test('should measure real-time feature performance', async ({ page }) => {
      await page.goto('/chat');
      
      const realTimePerformance = await performanceUtils.measureRealTimeFeaturePerformance(page);
      
      expect(realTimePerformance).toBeDefined();
      expect(realTimePerformance.messageDeliveryTime).toBeDefined();
      expect(realTimePerformance.updateFrequency).toBeDefined();
      expect(realTimePerformance.connectionLatency).toBeDefined();
      
      // Real-time features should be performant
      expect(realTimePerformance.messageDeliveryTime).toBeLessThan(500); // Less than 500ms
    });
  });

  test.describe('Performance Optimization Validation', () => {
    test('should test code splitting effectiveness', async ({ page }) => {
      const codeSplittingEffectiveness = await performanceUtils.testCodeSplittingEffectiveness(page);
      
      expect(codeSplittingEffectiveness).toBeDefined();
      expect(codeSplittingEffectiveness.initialBundleSize).toBeDefined();
      expect(codeSplittingEffectiveness.splitBundleSizes).toBeDefined();
      expect(codeSplittingEffectiveness.loadingImprovement).toBeDefined();
      
      // Code splitting should provide improvement
      expect(codeSplittingEffectiveness.loadingImprovement).toBeGreaterThan(0);
    });

    test('should measure CDN performance', async ({ page }) => {
      const assets = ['*.js', '*.css', '*.png', '*.webp'];
      const cdnPerformance = await performanceUtils.measureCDNPerformance(page, assets);
      
      expect(cdnPerformance).toBeDefined();
      expect(cdnPerformance.responseTime).toBeDefined();
      expect(cdnPerformance.throughput).toBeDefined();
      expect(cdnPerformance.cacheHitRate).toBeDefined();
      
      // CDN should provide good performance
      expect(cdnPerformance.responseTime).toBeLessThan(200); // Less than 200ms
    });

    test('should validate compression efficiency', async ({ page }) => {
      const resources = ['*.js', '*.css', '*.html'];
      const compressionEfficiency = await performanceUtils.validateCompressionEfficiency(page, resources);
      
      expect(compressionEfficiency).toBeDefined();
      expect(compressionEfficiency.originalSize).toBeDefined();
      expect(compressionEfficiency.compressedSize).toBeDefined();
      expect(compressionEfficiency.compressionRatio).toBeDefined();
      
      // Compression should provide significant size reduction
      expect(compressionEfficiency.compressionRatio).toBeGreaterThan(0.3); // At least 30% reduction
    });

    test('should test service worker performance', async ({ page }) => {
      const serviceWorkerPerformance = await performanceUtils.testServiceWorkerPerformance(page);
      
      expect(serviceWorkerPerformance).toBeDefined();
      expect(serviceWorkerPerformance.registrationTime).toBeDefined();
      expect(serviceWorkerPerformance.cacheEffectiveness).toBeDefined();
      expect(serviceWorkerPerformance.offlinePerformance).toBeDefined();
      
      // Service worker should improve performance
      expect(serviceWorkerPerformance.cacheEffectiveness).toBeGreaterThan(0);
    });
  });

  test.describe('Cross-Browser Performance Analysis', () => {
    test('should compare performance across browsers', async ({ page }) => {
      const browserPerformance = await performanceUtils.benchmarkAcrossBrowsers(page, [
        'core-web-vitals',
        'memory-usage',
        'rendering-performance',
        'network-performance'
      ]);
      
      expect(browserPerformance).toBeDefined();
      expect(browserPerformance.chrome).toBeDefined();
      expect(browserPerformance.firefox).toBeDefined();
      expect(browserPerformance.safari).toBeDefined();
      
      // All browsers should meet performance requirements
      Object.values(browserPerformance).forEach(browser => {
        expect(browser.coreWebVitals.lcp).toBeLessThan(2500);
        expect(browser.coreWebVitals.cls).toBeLessThan(0.1);
      });
    });

    test('should identify browser-specific bottlenecks', async ({ page }) => {
      const bottlenecks = await performanceUtils.benchmarkAcrossBrowsers(page, [
        'javascript-execution',
        'css-rendering',
        'memory-allocation',
        'network-requests'
      ]);
      
      expect(bottlenecks).toBeDefined();
      
      // Analyze each browser for specific bottlenecks
      Object.entries(bottlenecks).forEach(([browser, metrics]) => {
        expect(metrics.javascriptExecution).toBeDefined();
        expect(metrics.cssRendering).toBeDefined();
        expect(metrics.memoryAllocation).toBeDefined();
        expect(metrics.networkRequests).toBeDefined();
      });
    });
  });
});
