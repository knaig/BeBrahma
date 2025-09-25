import { test, expect } from '@playwright/test';
import { mockApiRoutes } from './utils/test-helpers';
import {
  waitForOnboardingStepLoad,
  waitForDashboardLoad,
  waitForChatInterfaceLoad,
  setupJourneyMocks,
  generateOnboardingData,
  startProjectFromDashboard,
  checkColorContrastCompliance,
  testKeyboardNavigation,
  testScreenReaderCompatibility,
  testResponsiveLayout,
  testTouchInteractions,
  testFocusManagement,
  testAriaLabels,
  testSemanticHTML,
  testColorBlindnessCompliance,
  testMotionReduction,
  testHighContrastMode,
  testZoomCompatibility,
  testMobileNavigation,
  testTabletLayout
} from './utils/streamlined-journey-helpers';

test.describe('Accessibility and Responsive Design - Streamlined User Journey', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page);
    await setupJourneyMocks(page, 'accessibility-testing');
  });

  test.describe('WCAG 2.1 AA Compliance', () => {
    test('Keyboard navigation throughout onboarding flow', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);

      // Test tab navigation
      await testKeyboardNavigation(page, 'onboarding');

      // Test arrow key navigation
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="company-name"]')).toBeFocused();

      // Test enter key submission
      await page.fill('[data-testid="company-name"]', 'Test Company');
      await page.keyboard.press('Enter');
      await expect(page.locator('[data-testid="step-2"]')).toBeVisible();
    });

    test('Screen reader compatibility across all components', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);

      // Test screen reader compatibility
      await testScreenReaderCompatibility(page, 'onboarding');

      // Navigate to dashboard
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      await testScreenReaderCompatibility(page, 'dashboard');

      // Navigate to chat interface
      await startProjectFromDashboard(page);
      await testScreenReaderCompatibility(page, 'chat-interface');
    });

    test('Color contrast compliance for all text elements', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);

      // Check color contrast on onboarding
      await checkColorContrastCompliance(page, 'onboarding');

      // Check color contrast on dashboard
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      await checkColorContrastCompliance(page, 'dashboard');

      // Check color contrast on chat interface
      await startProjectFromDashboard(page);
      await checkColorContrastCompliance(page, 'chat-interface');
    });

    test('ARIA labels and semantic HTML structure', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);

      // Test ARIA labels
      await testAriaLabels(page, 'onboarding');

      // Test semantic HTML
      await testSemanticHTML(page, 'onboarding');

      // Test on dashboard
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      await testAriaLabels(page, 'dashboard');
      await testSemanticHTML(page, 'dashboard');
    });

    test('Focus management and visible focus indicators', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);

      // Test focus management
      await testFocusManagement(page, 'onboarding');

      // Test on dashboard
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      await testFocusManagement(page, 'dashboard');
    });
  });

  test.describe('Responsive Design Testing', () => {
    test('Mobile layout (320px width)', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 568 });
      
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      await testResponsiveLayout(page, 'mobile', 'onboarding');

      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      await testResponsiveLayout(page, 'mobile', 'dashboard');

      await startProjectFromDashboard(page);
      await testResponsiveLayout(page, 'mobile', 'chat-interface');
    });

    test('Tablet layout (768px width)', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      await testTabletLayout(page, 'onboarding');

      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      await testTabletLayout(page, 'dashboard');

      await startProjectFromDashboard(page);
      await testTabletLayout(page, 'chat-interface');
    });

    test('Desktop layout (1920px width)', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      await testResponsiveLayout(page, 'desktop', 'onboarding');

      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      await testResponsiveLayout(page, 'desktop', 'dashboard');

      await startProjectFromDashboard(page);
      await testResponsiveLayout(page, 'desktop', 'chat-interface');
    });

    test('Touch interactions on mobile devices', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      await testTouchInteractions(page, 'onboarding');

      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      await testTouchInteractions(page, 'dashboard');
    });

    test('Mobile navigation and hamburger menu', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      await testMobileNavigation(page);

      await startProjectFromDashboard(page);
      await testMobileNavigation(page);
    });
  });

  test.describe('Advanced Accessibility Features', () => {
    test('Color blindness compliance (protanopia simulation)', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      await testColorBlindnessCompliance(page, 'protanopia', 'onboarding');

      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      await testColorBlindnessCompliance(page, 'protanopia', 'dashboard');
    });

    test('Motion reduction and reduced motion preferences', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      await testMotionReduction(page, 'onboarding');

      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      await testMotionReduction(page, 'dashboard');
    });

    test('High contrast mode compatibility', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      await testHighContrastMode(page, 'onboarding');

      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      await testHighContrastMode(page, 'dashboard');
    });

    test('Zoom compatibility (200% zoom)', async ({ page }) => {
      await page.setViewportSize({ width: 960, height: 540 }); // Simulate 200% zoom
      
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);
      await testZoomCompatibility(page, 'onboarding');

      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      await testZoomCompatibility(page, 'dashboard');
    });
  });

  test.describe('Cross-Platform Accessibility', () => {
    test('iOS VoiceOver compatibility', async ({ page }) => {
      // Simulate iOS VoiceOver behavior
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);

      // Test VoiceOver-specific navigation
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="company-name"]')).toBeFocused();

      // Test VoiceOver announcements
      const accessibilityLabel = await page.locator('[data-testid="company-name"]').getAttribute('aria-label');
      expect(accessibilityLabel).toBeTruthy();
    });

    test('Android TalkBack compatibility', async ({ page }) => {
      // Simulate Android TalkBack behavior
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);

      // Test TalkBack-specific navigation
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="company-name"]')).toBeFocused();

      // Test TalkBack announcements
      const accessibilityLabel = await page.locator('[data-testid="company-name"]').getAttribute('aria-label');
      expect(accessibilityLabel).toBeTruthy();
    });

    test('Windows Narrator compatibility', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);

      // Test Narrator-specific navigation
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="company-name"]')).toBeFocused();

      // Test Narrator announcements
      const accessibilityLabel = await page.locator('[data-testid="company-name"]').getAttribute('aria-label');
      expect(accessibilityLabel).toBeTruthy();
    });
  });

  test.describe('Performance and Accessibility', () => {
    test('Accessibility performance under load', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);

      // Measure accessibility performance
      const performanceMetrics = await page.evaluate(() => {
        const start = performance.now();
        
        // Simulate accessibility checks
        const elements = document.querySelectorAll('[data-testid]');
        const ariaElements = document.querySelectorAll('[aria-label], [aria-describedby]');
        
        const end = performance.now();
        return {
          duration: end - start,
          elementCount: elements.length,
          ariaElementCount: ariaElements.length
        };
      });

      expect(performanceMetrics.duration).toBeLessThan(100); // Should be fast
      expect(performanceMetrics.ariaElementCount).toBeGreaterThan(0);
    });

    test('Accessibility during network delays', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);

      // Simulate slow network
      await page.route('**/api/onboarding/**', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
      });

      // Fill form and submit
      await page.fill('[data-testid="company-name"]', 'Test Company');
      await page.click('[data-testid="next-step"]');

      // Verify accessibility is maintained during loading
      await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible();
      
      // Check that focus is properly managed during loading
      const focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
      expect(focusedElement).toBe('loading-indicator');
    });
  });
});
