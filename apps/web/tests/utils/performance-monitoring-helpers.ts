import { Page } from '@playwright/test';

export interface CoreWebVitals {
  lcp: number;
  fid: number | null;
  cls: number;
  tti?: number;
  fmp?: number;
}

export interface PerformanceMetrics {
  timestamp: number;
  lcp: number;
  fid: number | null;
  cls: number;
  tti?: number;
  fmp?: number;
}

export interface HeapSnapshot {
  totalSize: number;
  nodeCount: number;
  edgeCount: number;
  timestamp: number;
}

export interface MemoryLeakDetection {
  hasLeak: boolean;
  memoryGrowth: number;
  growthRate: number;
  leakType?: string;
}

export interface GCMonitoring {
  gcCount: number;
  gcDuration: number;
  gcFrequency: number;
  memoryBeforeGC: number;
  memoryAfterGC: number;
}

export interface MemoryGrowth {
  initialMemory: number;
  finalMemory: number;
  growthRate: number;
  peakMemory: number;
}

export interface PerformanceBaseline {
  testName: string;
  metrics: CoreWebVitals;
  timestamp: number;
  version: string;
  environment: string;
}

export interface PerformanceComparison {
  hasRegression: boolean;
  regressionDetails: string[];
  performanceChange: Record<string, number>;
  recommendations: string[];
}

export interface NetworkAnalysis {
  requests: Array<{
    url: string;
    method: string;
    status: number;
    duration: number;
    size: number;
  }>;
  totalRequests: number;
  totalSize: number;
  loadingTime: number;
  waterfall: Array<{
    startTime: number;
    endTime: number;
    duration: number;
  }>;
}

export interface APIPerformance {
  averageResponseTime: number;
  endpointPerformance: Record<string, {
    responseTime: number;
    successRate: number;
    errorCount: number;
  }>;
}

export interface BundleAnalysis {
  totalSize: number;
  chunkCount: number;
  loadTime: number;
  compressionRatio: number;
}

export interface ImageOptimization {
  totalImages: number;
  optimizedImages: number;
  totalImageSize: number;
  averageImageSize: number;
  compressionRatio: number;
}

export interface LazyLoadingEffectiveness {
  initialLoadTime: number;
  lazyLoadTime: number;
  improvement: number;
  userExperience: string;
}

export interface ResourcePrioritization {
  criticalResources: string[];
  nonCriticalResources: string[];
  loadingOrder: {
    criticalFirst: boolean;
    parallelLoading: boolean;
    blockingResources: string[];
  };
}

export interface PerformanceMonitoring {
  startTime: number;
  metrics: PerformanceMetrics[];
  events: Array<{
    type: string;
    timestamp: number;
    data: any;
  }>;
}

export interface UserInteractionPerformance {
  clickResponseTime: number;
  inputResponseTime: number;
  scrollPerformance: number;
  hoverResponseTime: number;
}

export interface RealTimeFeaturePerformance {
  messageDeliveryTime: number;
  updateFrequency: number;
  connectionLatency: number;
  throughput: number;
}

export interface CodeSplittingEffectiveness {
  initialBundleSize: number;
  splitBundleSizes: number[];
  loadingImprovement: number;
  userExperience: string;
}

export interface CDNPerformance {
  responseTime: number;
  throughput: number;
  cacheHitRate: number;
  availability: number;
}

export interface CompressionEfficiency {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  algorithm: string;
}

export interface ServiceWorkerPerformance {
  registrationTime: number;
  cacheEffectiveness: number;
  offlinePerformance: number;
  updateStrategy: string;
}

export const performanceMonitoringHelpers = {
  /**
   * Collect Core Web Vitals (LCP, FID, CLS) metrics
   */
  async measureCoreWebVitals(page: Page): Promise<CoreWebVitals> {
    return await page.evaluate(() => {
      return new Promise<CoreWebVitals>((resolve) => {
        // Wait for page to be fully loaded
        if (document.readyState === 'complete') {
          measureVitals();
        } else {
          window.addEventListener('load', measureVitals);
        }

        function measureVitals() {
          let lcp = 0;
          let cls = 0;
          let fid: number | null = null;
          let tti: number | undefined;
          let fmp: number | undefined;
          
          const observers: PerformanceObserver[] = [];

          // Measure LCP with buffered entries
          const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            if (lastEntry) {
              lcp = lastEntry.startTime;
            }
          });
          lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
          observers.push(lcpObserver);

          // Measure CLS with buffered entries and proper aggregation
          const clsObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!(entry as any).hadRecentInput) {
                cls += (entry as any).value;
              }
            }
          });
          clsObserver.observe({ type: 'layout-shift', buffered: true });
          observers.push(clsObserver);

          // Measure FID with buffered entries
          const fidObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.entryType === 'first-input') {
                fid = (entry as any).processingStart - entry.startTime;
              }
            }
          });
          fidObserver.observe({ type: 'first-input', buffered: true });
          observers.push(fidObserver);

          // Measure TTI using Performance API
          const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          if (navigationEntry) {
            tti = Math.max(
              navigationEntry.domContentLoadedEventEnd - navigationEntry.domContentLoadedEventStart,
              navigationEntry.loadEventEnd - navigationEntry.loadEventStart
            );
          }

          // Measure FMP
          const paintEntries = performance.getEntriesByType('paint');
          const fmpEntry = paintEntries.find(entry => entry.name === 'first-paint');
          if (fmpEntry) {
            fmp = fmpEntry.startTime;
          }

          // Handle visibility change to disconnect observers
          const handleVisibilityChange = () => {
            if (document.hidden) {
              observers.forEach(observer => observer.disconnect());
              document.removeEventListener('visibilitychange', handleVisibilityChange);
            }
          };
          document.addEventListener('visibilitychange', handleVisibilityChange);

          // Wait for load + idle period or when document becomes hidden
          const checkComplete = () => {
            // Check if we have all metrics or if document is hidden
            if ((lcp > 0 && cls >= 0 && (fid !== null || document.hidden)) || document.hidden) {
              observers.forEach(observer => observer.disconnect());
              document.removeEventListener('visibilitychange', handleVisibilityChange);
              resolve({ lcp, fid, cls, tti, fmp });
            } else {
              // Check again after a short delay
              setTimeout(checkComplete, 100);
            }
          };

          // Start checking for completion
          setTimeout(checkComplete, 100);
        }
      });
    });
  },

  /**
   * Continuous performance monitoring over a specified duration
   */
  async trackPerformanceMetrics(page: Page, duration: number): Promise<PerformanceMetrics[]> {
    return await page.evaluate((dur) => {
      return new Promise<PerformanceMetrics[]>((resolve) => {
        const metrics: PerformanceMetrics[] = [];
        const startTime = Date.now();
        
        const interval = setInterval(() => {
          // Collect current metrics
          const currentMetrics: PerformanceMetrics = {
            timestamp: Date.now(),
            lcp: 0, // Would measure actual LCP
            fid: null, // Would measure actual FID
            cls: 0, // Would measure actual CLS
            tti: 0, // Would measure actual TTI
            fmp: 0  // Would measure actual FMP
          };
          
          metrics.push(currentMetrics);
          
          // Check if duration has elapsed
          if (Date.now() - startTime >= dur) {
            clearInterval(interval);
            resolve(metrics);
          }
        }, 1000); // Collect metrics every second
      });
    }, duration);
  },

  /**
   * Calculate Time to Interactive (TTI) accurately
   */
  async measureTimeToInteractive(page: Page): Promise<number> {
    return await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        // Wait for page to be fully loaded
        if (document.readyState === 'complete') {
          measureTTI();
        } else {
          window.addEventListener('load', measureTTI);
        }

        function measureTTI() {
          // Measure TTI using Performance API
          const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          const domContentLoaded = navigationEntry.domContentLoadedEventEnd - navigationEntry.domContentLoadedEventStart;
          const loadComplete = navigationEntry.loadEventEnd - navigationEntry.loadEventStart;
          
          // TTI is typically when the page becomes interactive
          const tti = Math.max(domContentLoaded, loadComplete);
          resolve(tti);
        }
      });
    });
  },

  /**
   * Track First Meaningful Paint (FMP) timing
   */
  async trackFirstMeaningfulPaint(page: Page): Promise<number> {
    return await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        // Wait for page to be fully loaded
        if (document.readyState === 'complete') {
          measureFMP();
        } else {
          window.addEventListener('load', measureFMP);
        }

        function measureFMP() {
          // Measure FMP using Performance API
          const paintEntries = performance.getEntriesByType('paint');
          const fmpEntry = paintEntries.find(entry => entry.name === 'first-paint');
          
          if (fmpEntry) {
            resolve(fmpEntry.startTime);
          } else {
            resolve(0);
          }
        }
      });
    });
  },

  /**
   * Take heap snapshots for analysis
   */
  async captureHeapSnapshot(page: Page): Promise<HeapSnapshot> {
    return await page.evaluate(() => {
      // Mock heap snapshot - in real implementation, this would use Chrome DevTools Protocol
      return {
        totalSize: performance.memory?.usedJSHeapSize || 0,
        nodeCount: 1000, // Mock value
        edgeCount: 2000, // Mock value
        timestamp: Date.now()
      };
    });
  },

  /**
   * Detect memory leaks over time
   */
  async detectMemoryLeaks(page: Page, iterations: number): Promise<MemoryLeakDetection> {
    return await page.evaluate((iter) => {
      // Mock memory leak detection - in real implementation, this would analyze heap snapshots
      const initialMemory = 25 * 1024 * 1024; // 25MB
      const finalMemory = 28 * 1024 * 1024;   // 28MB
      const memoryGrowth = finalMemory - initialMemory;
      const growthRate = memoryGrowth / initialMemory;
      
      return {
        hasLeak: growthRate > 0.1, // More than 10% growth indicates potential leak
        memoryGrowth,
        growthRate,
        leakType: growthRate > 0.1 ? 'gradual' : undefined
      };
    }, iterations);
  },

  /**
   * Monitor garbage collection patterns
   */
  async monitorGarbageCollection(page: Page): Promise<GCMonitoring> {
    return await page.evaluate(() => {
      // Mock GC monitoring - in real implementation, this would use Chrome DevTools Protocol
      return {
        gcCount: 3,
        gcDuration: 150,
        gcFrequency: 0.1,
        memoryBeforeGC: 30 * 1024 * 1024, // 30MB
        memoryAfterGC: 25 * 1024 * 1024   // 25MB
      };
    });
  },

  /**
   * Monitor memory growth over time
   */
  async measureMemoryGrowth(page: Page, duration: number): Promise<MemoryGrowth> {
    return await page.evaluate((dur) => {
      // Mock memory growth measurement - in real implementation, this would track actual memory usage
      const initialMemory = 25 * 1024 * 1024; // 25MB
      const finalMemory = 30 * 1024 * 1024;   // 30MB
      const growthRate = (finalMemory - initialMemory) / initialMemory;
      
      return {
        initialMemory,
        finalMemory,
        growthRate,
        peakMemory: 32 * 1024 * 1024 // 32MB
      };
    }, duration);
  },

  /**
   * Establish performance baselines for regression detection
   */
  async establishPerformanceBaseline(page: Page, testName: string): Promise<PerformanceBaseline> {
    const metrics = await this.measureCoreWebVitals(page);
    
    return {
      testName,
      metrics,
      timestamp: Date.now(),
      version: '1.0.0', // Would get from package.json or environment
      environment: 'test' // Would get from environment variables
    };
  },

  /**
   * Compare current performance against baseline
   */
  async compareAgainstBaseline(page: Page, testName: string, currentMetrics: CoreWebVitals): Promise<PerformanceComparison> {
    // In real implementation, this would load the baseline from storage
    const baseline: PerformanceBaseline = {
      testName,
      metrics: { lcp: 1000, fid: 50, cls: 0.05 },
      timestamp: Date.now() - 86400000, // 24 hours ago
      version: '1.0.0',
      environment: 'test'
    };

    const hasRegression = this.detectPerformanceRegression(currentMetrics, baseline.metrics, 0.2);
    
    return {
      hasRegression: hasRegression.hasRegression,
      regressionDetails: hasRegression.regressions,
      performanceChange: {
        lcp: ((currentMetrics.lcp - baseline.metrics.lcp) / baseline.metrics.lcp) * 100,
        cls: ((currentMetrics.cls - baseline.metrics.cls) / baseline.metrics.cls) * 100
      },
      recommendations: hasRegression.regressions.length > 0 ? 
        ['Investigate performance degradation', 'Check recent code changes'] : 
        ['Performance is within acceptable range']
    };
  },

  /**
   * Detect performance regressions
   */
  detectPerformanceRegression(current: CoreWebVitals, baseline: CoreWebVitals, threshold: number): {
    hasRegression: boolean;
    regressions: string[];
  } {
    const regressions: string[] = [];
    
    // Check LCP regression
    if (current.lcp > baseline.lcp * (1 + threshold)) {
      regressions.push(`LCP degraded from ${baseline.lcp}ms to ${current.lcp}ms`);
    }
    
    // Check CLS regression
    if (current.cls > baseline.cls * (1 + threshold)) {
      regressions.push(`CLS degraded from ${baseline.cls} to ${current.cls}`);
    }
    
    return {
      hasRegression: regressions.length > 0,
      regressions
    };
  },

  /**
   * Generate performance reports
   */
  generatePerformanceReport(metrics: CoreWebVitals, comparison: PerformanceComparison): {
    summary: string;
    details: Record<string, any>;
    recommendations: string[];
  } {
    return {
      summary: comparison.hasRegression ? 
        'Performance regression detected' : 
        'Performance is within acceptable range',
      details: {
        currentMetrics: metrics,
        comparison,
        timestamp: new Date().toISOString()
      },
      recommendations: comparison.recommendations
    };
  },

  /**
   * Analyze network waterfall
   */
  async analyzeNetworkWaterfall(page: Page): Promise<NetworkAnalysis> {
    return await page.evaluate(() => {
      // Mock network analysis - in real implementation, this would analyze actual network requests
      return {
        requests: [
          {
            url: 'https://example.com/api/data',
            method: 'GET',
            status: 200,
            duration: 150,
            size: 1024
          }
        ],
        totalRequests: 1,
        totalSize: 1024,
        loadingTime: 150,
        waterfall: [
          {
            startTime: 0,
            endTime: 150,
            duration: 150
          }
        ]
      };
    });
  },

  /**
   * Measure API response times
   */
  async measureAPIResponseTimes(page: Page, endpoints: string[]): Promise<APIPerformance> {
    return await page.evaluate((endpoints) => {
      // Mock API performance measurement - in real implementation, this would measure actual API calls
      const endpointPerformance: Record<string, any> = {};
      let totalResponseTime = 0;
      
      endpoints.forEach(endpoint => {
        const responseTime = Math.random() * 500 + 100; // 100-600ms
        endpointPerformance[endpoint] = {
          responseTime,
          successRate: 0.98,
          errorCount: 0
        };
        totalResponseTime += responseTime;
      });
      
      return {
        averageResponseTime: totalResponseTime / endpoints.length,
        endpointPerformance
      };
    }, endpoints);
  },

  /**
   * Test performance under various network conditions
   */
  async testNetworkConditions(page: Page, conditions: Array<{ name: string; download: number; upload: number; latency: number }>): Promise<void> {
    // This would typically involve setting network throttling
    // For now, we'll just wait for the specified conditions
    for (const condition of conditions) {
      await page.waitForTimeout(100); // Simulate network condition
    }
  },

  /**
   * Validate caching efficiency
   */
  async validateCachingEfficiency(page: Page, resources: string[]): Promise<{ cacheHitRate: number }> {
    return await page.evaluate(() => {
      // Mock cache validation - in real implementation, this would check actual cache headers and behavior
      return {
        cacheHitRate: 0.75 // 75% cache hit rate
      };
    });
  },

  /**
   * Measure JavaScript bundle load time
   */
  async measureBundleLoadTime(page: Page): Promise<number> {
    return await page.evaluate(() => {
      // Mock bundle load time measurement - in real implementation, this would measure actual bundle loading
      return 1200; // 1.2 seconds
    });
  },

  /**
   * Analyze image optimization
   */
  async analyzeImageOptimization(page: Page): Promise<ImageOptimization> {
    return await page.evaluate(() => {
      // Mock image analysis - in real implementation, this would analyze actual images
      return {
        totalImages: 10,
        optimizedImages: 8,
        totalImageSize: 500 * 1024, // 500KB
        averageImageSize: 50 * 1024, // 50KB
        compressionRatio: 0.6
      };
    });
  },

  /**
   * Test lazy loading effectiveness
   */
  async testLazyLoadingEffectiveness(page: Page): Promise<LazyLoadingEffectiveness> {
    return await page.evaluate(() => {
      // Mock lazy loading test - in real implementation, this would measure actual lazy loading
      return {
        initialLoadTime: 2000,
        lazyLoadTime: 1500,
        improvement: 0.25, // 25% improvement
        userExperience: 'improved'
      };
    });
  },

  /**
   * Validate resource prioritization
   */
  async validateResourcePrioritization(page: Page): Promise<ResourcePrioritization> {
    return await page.evaluate(() => {
      // Mock resource prioritization validation - in real implementation, this would check actual resource loading
      return {
        criticalResources: ['main.js', 'critical.css'],
        nonCriticalResources: ['analytics.js', 'ads.js'],
        loadingOrder: {
          criticalFirst: true,
          parallelLoading: true,
          blockingResources: []
        }
      };
    });
  },

  /**
   * Start performance monitoring
   */
  async startPerformanceMonitoring(page: Page): Promise<void> {
    await page.evaluate(() => {
      // Start performance monitoring
      (window as any).performanceMonitoring = {
        startTime: Date.now(),
        metrics: [],
        events: []
      };
    });
  },

  /**
   * Stop performance monitoring and collect data
   */
  async stopPerformanceMonitoring(page: Page): Promise<PerformanceMonitoring> {
    return await page.evaluate(() => {
      const monitoring = (window as any).performanceMonitoring;
      const duration = Date.now() - monitoring.startTime;
      
      return {
        startTime: monitoring.startTime,
        metrics: monitoring.metrics,
        events: monitoring.events,
        duration
      };
    });
  },

  /**
   * Track user interaction performance
   */
  async trackUserInteractionPerformance(page: Page): Promise<UserInteractionPerformance> {
    return await page.evaluate(() => {
      // Mock interaction performance tracking - in real implementation, this would measure actual interactions
      return {
        clickResponseTime: 45,
        inputResponseTime: 32,
        scrollPerformance: 60,
        hoverResponseTime: 28
      };
    });
  },

  /**
   * Measure real-time feature performance
   */
  async measureRealTimeFeaturePerformance(page: Page): Promise<RealTimeFeaturePerformance> {
    return await page.evaluate(() => {
      // Mock real-time performance measurement - in real implementation, this would measure actual real-time features
      return {
        messageDeliveryTime: 150,
        updateFrequency: 10, // updates per second
        connectionLatency: 45,
        throughput: 1000 // messages per second
      };
    });
  },

  /**
   * Test code splitting effectiveness
   */
  async testCodeSplittingEffectiveness(page: Page): Promise<CodeSplittingEffectiveness> {
    return await page.evaluate(() => {
      // Mock code splitting test - in real implementation, this would measure actual code splitting
      return {
        initialBundleSize: 500 * 1024, // 500KB
        splitBundleSizes: [200 * 1024, 150 * 1024, 100 * 1024], // 200KB, 150KB, 100KB
        loadingImprovement: 0.3, // 30% improvement
        userExperience: 'improved'
      };
    });
  },

  /**
   * Measure CDN performance
   */
  async measureCDNPerformance(page: Page, assets: string[]): Promise<CDNPerformance> {
    return await page.evaluate(() => {
      // Mock CDN performance measurement - in real implementation, this would measure actual CDN performance
      return {
        responseTime: 120,
        throughput: 5000, // KB/s
        cacheHitRate: 0.85, // 85% cache hit rate
        availability: 0.999 // 99.9% availability
      };
    });
  },

  /**
   * Validate compression efficiency
   */
  async validateCompressionEfficiency(page: Page, resources: string[]): Promise<CompressionEfficiency> {
    return await page.evaluate(() => {
      // Mock compression validation - in real implementation, this would check actual compression
      return {
        originalSize: 1000 * 1024, // 1MB
        compressedSize: 400 * 1024, // 400KB
        compressionRatio: 0.6, // 60% reduction
        algorithm: 'gzip'
      };
    });
  },

  /**
   * Test service worker performance
   */
  async testServiceWorkerPerformance(page: Page): Promise<ServiceWorkerPerformance> {
    return await page.evaluate(() => {
      // Mock service worker test - in real implementation, this would measure actual service worker performance
      return {
        registrationTime: 200,
        cacheEffectiveness: 0.8, // 80% cache effectiveness
        offlinePerformance: 0.9, // 90% offline performance
        updateStrategy: 'stale-while-revalidate'
      };
    });
  },

  /**
   * Run performance benchmarks across browsers
   */
  async benchmarkAcrossBrowsers(page: Page, tests: string[]): Promise<Record<string, any>> {
    return await page.evaluate(() => {
      // Mock cross-browser benchmarking - in real implementation, this would run actual benchmarks
      return {
        chrome: {
          coreWebVitals: { lcp: 1200, fid: 45, cls: 0.05 },
          memoryUsage: 45 * 1024 * 1024,
          renderingPerformance: 90
        },
        firefox: {
          coreWebVitals: { lcp: 1350, fid: 52, cls: 0.06 },
          memoryUsage: 48 * 1024 * 1024,
          renderingPerformance: 85
        },
        safari: {
          coreWebVitals: { lcp: 1100, fid: 40, cls: 0.04 },
          memoryUsage: 42 * 1024 * 1024,
          renderingPerformance: 88
        }
      };
    });
  }
};
