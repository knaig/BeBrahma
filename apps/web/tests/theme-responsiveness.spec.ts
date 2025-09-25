import { test, expect } from '@playwright/test';
import { mockApiRoutes } from './utils/test-helpers';
import {
  setupJourneyMocks,
  waitForDashboardLoad,
  waitForChatInterfaceLoad,
  testThemeToggle,
  testThemeConsistency,
  testResponsiveLayout,
  testTouchInteractions,
  checkColorContrastCompliance,
  testPerformance,
  testMemoryUsage,
  testRenderingPerformance
} from './utils/streamlined-journey-helpers';

test.describe('Theme & Responsiveness - Streamlined User Journey Integration', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page);
    await setupJourneyMocks(page, 'theme-responsive-testing');
  });

  test.describe('Theme System Integration', () => {
    test('Theme switching works consistently across all components', async ({ page }) => {
      // Test dashboard theme switching
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      await testThemeToggle(page);
      
      // Test chat interface theme switching
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      await testThemeToggle(page);
      
      // Test onboarding theme switching
      await page.goto('/onboarding');
      await testThemeToggle(page);
    });

    test('Theme persistence across page navigation and browser sessions', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Set dark theme
      await page.click('[data-testid="theme-toggle"]');
      await page.waitForTimeout(100);
      await expect(page.locator('[data-testid="dark-theme"]')).toBeVisible();
      
      // Navigate to chat interface
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Verify theme persisted
      await expect(page.locator('[data-testid="dark-theme"]')).toBeVisible();
      
      // Navigate back to dashboard
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Verify theme still persisted
      await expect(page.locator('[data-testid="dark-theme"]')).toBeVisible();
    });

    test('Theme consistency across component states and interactions', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      await testThemeConsistency(page);
    });

    test('Color contrast compliance across all themes and states', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      await checkColorContrastCompliance(page);
      
      // Test dark theme contrast
      await page.click('[data-testid="theme-toggle"]');
      await page.waitForTimeout(100);
      await checkColorContrastCompliance(page);
    });
  });

  test.describe('Responsive Design Implementation', () => {
    test('Dashboard responsive layout adapts to all viewport sizes', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      await testResponsiveLayout(page);
    });

    test('ChatInterface responsive design for mobile and tablet usage', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      await testResponsiveLayout(page);
    });

    test('Onboarding flow responsive design across all devices', async ({ page }) => {
      await page.goto('/onboarding');
      
      // Test mobile layout
      await page.setViewportSize({ width: 375, height: 667 });
      await expect(page.locator('[data-testid="mobile-layout"]')).toBeVisible();
      
      // Test tablet layout
      await page.setViewportSize({ width: 768, height: 1024 });
      await expect(page.locator('[data-testid="tablet-layout"]')).toBeVisible();
      
      // Test desktop layout
      await page.setViewportSize({ width: 1920, height: 1080 });
      await expect(page.locator('[data-testid="desktop-layout"]')).toBeVisible();
    });

    test('Responsive breakpoints and layout transitions', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Test breakpoint transitions
      const breakpoints = [
        { width: 320, height: 568, name: 'mobile-small' },
        { width: 375, height: 667, name: 'mobile' },
        { width: 768, height: 1024, name: 'tablet' },
        { width: 1024, height: 768, name: 'tablet-landscape' },
        { width: 1280, height: 720, name: 'desktop' },
        { width: 1920, height: 1080, name: 'desktop-large' }
      ];
      
      for (const breakpoint of breakpoints) {
        await page.setViewportSize(breakpoint);
        await expect(page.locator(`[data-testid="${breakpoint.name}-layout"]`)).toBeVisible();
      }
    });
  });

  test.describe('Mobile and Touch Interactions', () => {
    test('Touch-friendly interface design and interaction patterns', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      await testTouchInteractions(page);
    });

    test('Mobile-specific UI components and navigation patterns', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Test mobile navigation
      await expect(page.locator('[data-testid="mobile-navigation"]')).toBeVisible();
      await expect(page.locator('[data-testid="hamburger-menu"]')).toBeVisible();
      
      // Test mobile menu
      await page.click('[data-testid="hamburger-menu"]');
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
      await expect(page.locator('[data-testid="menu-items"]')).toBeVisible();
    });

    test('Touch gesture support and mobile optimization', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Test touch gestures
      await page.touchscreen.tap(200, 300);
      await expect(page.locator('[data-testid="touch-responsive"]')).toBeVisible();
      
      // Test swipe gestures
      await page.touchscreen.swipe(100, 300, 300, 300);
      await expect(page.locator('[data-testid="swipe-gesture"]')).toBeVisible();
    });

    test('Mobile performance optimization and resource management', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Test mobile performance
      await testPerformance(page);
      await testMemoryUsage(page);
      await testRenderingPerformance(page);
    });
  });

  test.describe('Cross-Device Consistency', () => {
    test('Consistent user experience across all device types', async ({ page }) => {
      const devices = [
        { width: 375, height: 667, name: 'mobile' },
        { width: 768, height: 1024, name: 'tablet' },
        { width: 1920, height: 1080, name: 'desktop' }
      ];
      
      for (const device of devices) {
        await page.setViewportSize(device);
        
        // Test dashboard consistency
        await page.goto('/dashboard');
        await waitForDashboardLoad(page);
        await expect(page.locator(`[data-testid="${device.name}-consistent"]`)).toBeVisible();
        
        // Test chat interface consistency
        await page.goto('/test-chat');
        await waitForChatInterfaceLoad(page);
        await expect(page.locator(`[data-testid="${device.name}-consistent"]`)).toBeVisible();
      }
    });

    test('Responsive images and media across all viewport sizes', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Test responsive images
      await expect(page.locator('[data-testid="responsive-image"]')).toBeVisible();
      await expect(page.locator('[data-testid="image-srcset"]')).toBeVisible();
      
      // Test responsive media
      await expect(page.locator('[data-testid="responsive-media"]')).toBeVisible();
      await expect(page.locator('[data-testid="media-adaptation"]')).toBeVisible();
    });

    test('Typography scaling and readability across devices', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Test typography scaling
      await expect(page.locator('[data-testid="typography-scaling"]')).toBeVisible();
      await expect(page.locator('[data-testid="readable-text"]')).toBeVisible();
      
      // Test different viewport sizes
      const viewports = [
        { width: 375, height: 667, name: 'mobile' },
        { width: 768, height: 1024, name: 'tablet' },
        { width: 1920, height: 1080, name: 'desktop' }
      ];
      
      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await expect(page.locator(`[data-testid="${viewport.name}-typography"]`)).toBeVisible();
      }
    });
  });

  test.describe('Performance and Optimization', () => {
    test('Responsive design performance across different devices', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      await testPerformance(page);
    });

    test('Memory usage optimization for mobile devices', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await testMemoryUsage(page);
    });

    test('Rendering performance and smooth transitions across viewports', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      await testRenderingPerformance(page);
    });

    test('Resource loading optimization for different screen densities', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Test different pixel ratios
      const pixelRatios = [1, 2, 3];
      
      for (const ratio of pixelRatios) {
        await page.evaluate((ratio) => {
          Object.defineProperty(window, 'devicePixelRatio', {
            value: ratio,
            writable: true
          });
        }, ratio);
        
        await expect(page.locator(`[data-testid="pixel-ratio-${ratio}"]`)).toBeVisible();
      }
    });
  });

  test.describe('Integration with Streamlined Journey', () => {
    test('Theme and responsiveness consistency across complete user journey', async ({ page }) => {
      const devices = [
        { width: 375, height: 667, name: 'mobile' },
        { width: 768, height: 1024, name: 'tablet' },
        { width: 1920, height: 1080, name: 'desktop' }
      ];
      
      for (const device of devices) {
        await page.setViewportSize(device);
        
        // Test complete journey
        await page.goto('/onboarding');
        await expect(page.locator(`[data-testid="${device.name}-onboarding"]`)).toBeVisible();
        
        await page.goto('/dashboard');
        await waitForDashboardLoad(page);
        await expect(page.locator(`[data-testid="${device.name}-dashboard"]`)).toBeVisible();
        
        await page.goto('/test-chat');
        await waitForChatInterfaceLoad(page);
        await expect(page.locator(`[data-testid="${device.name}-chat"]`)).toBeVisible();
      }
    });

    test('Responsive design integration with workflow progression', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Test different viewports during workflow
      const viewports = [
        { width: 375, height: 667, name: 'mobile' },
        { width: 768, height: 1024, name: 'tablet' },
        { width: 1920, height: 1080, name: 'desktop' }
      ];
      
      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        
        // Progress through workflow
        await page.click('[data-testid="next-message"]');
        await expect(page.locator('[data-testid="agent-message"]')).toBeVisible();
        await expect(page.locator(`[data-testid="${viewport.name}-workflow"]`)).toBeVisible();
      }
    });
  });
});
