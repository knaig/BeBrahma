import { test, expect } from '@playwright/test';
import { mockApiRoutes } from './utils/test-helpers';
import {
  setupJourneyMocks,
  waitForDashboardLoad,
  waitForChatInterfaceLoad,
  checkColorContrastCompliance,
  testKeyboardNavigation,
  testScreenReaderCompatibility,
  testResponsiveLayout,
  testTouchInteractions,
  testThemeConsistency
} from './utils/streamlined-journey-helpers';
import axe from '@axe-core/playwright';

async function runAxe(page) {
  await axe.injectAxe(page);
  const results = await axe.runAxe(page);
  // Fail test on any serious violations
  const serious = results.violations.filter(v => ['serious', 'critical'].includes(v.impact || 'minor'));
  expect(serious, JSON.stringify(serious, null, 2)).toHaveLength(0);
}

test.describe('Accessibility - Streamlined User Journey Compliance', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page);
    await setupJourneyMocks(page, 'accessibility-testing');
  });

  test.describe('WCAG 2.1 AA Compliance', () => {
    test('Dashboard meets WCAG 2.1 AA accessibility standards', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      await runAxe(page);
    });

    test('ChatInterface meets WCAG 2.1 AA accessibility standards', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      await runAxe(page);
    });

    test('Onboarding flow meets WCAG 2.1 AA accessibility standards', async ({ page }) => {
      await page.goto('/onboarding');
      await runAxe(page);
    });
  });

  test.describe('Color Contrast and Visual Accessibility', () => {
    test('Dashboard color contrast compliance across all themes', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      await checkColorContrastCompliance(page);
    });

    test('ChatInterface color contrast compliance for all UI elements', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      await checkColorContrastCompliance(page);
    });

    test('Theme consistency and accessibility across component states', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      await testThemeConsistency(page);
    });
  });

  test.describe('Keyboard Navigation and Focus Management', () => {
    test('Dashboard complete keyboard accessibility and focus management', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      await testKeyboardNavigation(page);
    });

    test('ChatInterface keyboard navigation for all interactive elements', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      await testKeyboardNavigation(page);
    });

    test('Onboarding flow keyboard navigation and form accessibility', async ({ page }) => {
      await page.goto('/onboarding');
      
      // Test tab navigation through form fields
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="focused-element"]')).toBeVisible();
      
      // Test arrow key navigation for select options
      await page.keyboard.press('ArrowDown');
      await expect(page.locator('[data-testid="selected-option"]')).toBeVisible();
    });

    test('Focus indicators and logical tab order across all components', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Test focus indicators
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="focus-indicator"]')).toBeVisible();
      
      // Test logical tab order
      await expect(page.locator('[data-testid="tab-order"]')).toBeVisible();
    });
  });

  test.describe('Screen Reader and Assistive Technology Support', () => {
    test('Dashboard screen reader compatibility and ARIA labeling', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      await testScreenReaderCompatibility(page);
    });

    test('ChatInterface screen reader support for workflow progression', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      await testScreenReaderCompatibility(page);
    });

    test('Comprehensive ARIA labels and screen reader announcements', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Test ARIA labels
      await expect(page.locator('[data-testid="aria-label"]')).toHaveAttribute('aria-label');
      
      // Test screen reader announcements
      await expect(page.locator('[data-testid="sr-announcement"]')).toHaveAttribute('aria-live');
      
      // Test role attributes
      await expect(page.locator('[data-testid="role-button"]')).toHaveAttribute('role', 'button');
      await expect(page.locator('[data-testid="role-navigation"]')).toHaveAttribute('role', 'navigation');
    });

    test('Dynamic content updates and screen reader notifications', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Test dynamic updates
      await page.click('[data-testid="next-message"]');
      await expect(page.locator('[data-testid="sr-update"]')).toHaveAttribute('aria-live', 'polite');
      
      // Test status changes
      await expect(page.locator('[data-testid="sr-status"]')).toHaveAttribute('aria-live', 'assertive');
    });
  });

  test.describe('Responsive Design and Mobile Accessibility', () => {
    test('Dashboard responsive accessibility across all viewport sizes', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      await testResponsiveLayout(page);
    });

    test('ChatInterface mobile accessibility and touch interaction support', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      await testTouchInteractions(page);
    });

    test('Mobile-specific accessibility features and touch targets', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Test mobile layout
      await page.setViewportSize({ width: 375, height: 667 });
      await expect(page.locator('[data-testid="mobile-layout"]')).toBeVisible();
      
      // Test touch target sizes
      await expect(page.locator('[data-testid="touch-target"]')).toBeVisible();
      await expect(page.locator('[data-testid="minimum-size"]')).toBeVisible();
    });

    test('Tablet accessibility and intermediate viewport support', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Test tablet layout
      await page.setViewportSize({ width: 768, height: 1024 });
      await expect(page.locator('[data-testid="tablet-layout"]')).toBeVisible();
      
      // Test tablet-specific interactions
      await expect(page.locator('[data-testid="tablet-optimized"]')).toBeVisible();
    });
  });

  test.describe('Form and Input Accessibility', () => {
    test('Onboarding form accessibility and validation feedback', async ({ page }) => {
      await page.goto('/onboarding');
      
      // Test form labels
      await expect(page.locator('[data-testid="form-label"]')).toBeVisible();
      await expect(page.locator('[data-testid="required-indicator"]')).toBeVisible();
      
      // Test validation feedback
      await page.click('[data-testid="next-step"]');
      await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-announcement"]')).toHaveAttribute('aria-live', 'polite');
    });

    test('ChatInterface input accessibility and message composition', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Test input accessibility
      await expect(page.locator('[data-testid="message-input"]')).toHaveAttribute('aria-label');
      await expect(page.locator('[data-testid="input-description"]')).toBeVisible();
      
      // Test message composition
      await page.locator('[data-testid="message-input"]').fill('Test message');
      await expect(page.locator('[data-testid="character-count"]')).toBeVisible();
    });

    test('Error handling accessibility and recovery guidance', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Simulate error
      await page.route('**/api/dashboard/status', route => 
        route.fulfill({ status: 500, body: 'Internal Server Error' })
      );
      
      await page.click('[data-testid="refresh-status"]');
      
      // Test error accessibility
      await expect(page.locator('[data-testid="error-announcement"]')).toHaveAttribute('aria-live', 'assertive');
      await expect(page.locator('[data-testid="error-description"]')).toBeVisible();
      
      // Restore route
      await page.unroute('**/api/dashboard/status');
    });
  });

  test.describe('Navigation and Structure Accessibility', () => {
    test('Breadcrumb navigation and skip link functionality', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Test breadcrumb navigation
      await expect(page.locator('[data-testid="breadcrumb"]')).toBeVisible();
      await expect(page.locator('[data-testid="breadcrumb-item"]')).toBeVisible();
      
      // Test skip links
      await expect(page.locator('[data-testid="skip-link"]')).toBeVisible();
      await page.click('[data-testid="skip-main-content"]');
      await expect(page.locator('[data-testid="main-content"]')).toBeFocused();
    });

    test('Landmark structure and semantic HTML compliance', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Test landmark structure
      await expect(page.locator('main')).toBeVisible();
      await expect(page.locator('nav')).toBeVisible();
      await expect(page.locator('header')).toBeVisible();
      
      // Test semantic HTML
      await expect(page.locator('[data-testid="semantic-structure"]')).toBeVisible();
      await expect(page.locator('[data-testid="heading-hierarchy"]')).toBeVisible();
    });

    test('Navigation menu accessibility and keyboard support', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Test navigation menu
      await expect(page.locator('[data-testid="navigation-menu"]')).toBeVisible();
      await expect(page.locator('[data-testid="menu-item"]')).toBeVisible();
      
      // Test keyboard navigation
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="menu-focused"]')).toBeVisible();
      
      // Test menu expansion
      await page.keyboard.press('Enter');
      await expect(page.locator('[data-testid="menu-expanded"]')).toBeVisible();
    });
  });

  test.describe('Content and Media Accessibility', () => {
    test('Text content accessibility and readability standards', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Test text readability
      await expect(page.locator('[data-testid="readable-text"]')).toBeVisible();
      await expect(page.locator('[data-testid="line-height"]')).toBeVisible();
      
      // Test content structure
      await expect(page.locator('[data-testid="content-structure"]')).toBeVisible();
      await expect(page.locator('[data-testid="logical-order"]')).toBeVisible();
    });

    test('Image and media accessibility with alternative text', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Test image accessibility
      await expect(page.locator('[data-testid="image-alt"]')).toHaveAttribute('alt');
      await expect(page.locator('[data-testid="decorative-image"]')).toHaveAttribute('alt', '');
      
      // Test media accessibility
      await expect(page.locator('[data-testid="media-controls"]')).toBeVisible();
      await expect(page.locator('[data-testid="media-description"]')).toBeVisible();
    });

    test('Dynamic content accessibility and live region management', async ({ page }) => {
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      
      // Test live regions
      await expect(page.locator('[data-testid="live-region"]')).toHaveAttribute('aria-live');
      
      // Test dynamic updates
      await page.click('[data-testid="next-message"]');
      await expect(page.locator('[data-testid="dynamic-update"]')).toBeVisible();
      await expect(page.locator('[data-testid="update-announcement"]')).toHaveAttribute('aria-live');
    });
  });

  test.describe('Integration and Cross-Component Accessibility', () => {
    test('Seamless accessibility across the complete user journey', async ({ page }) => {
      // Test onboarding accessibility
      await page.goto('/onboarding');
      await runAxe(page);
      
      // Test dashboard accessibility
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      await runAxe(page);
      
      // Test chat interface accessibility
      await page.goto('/test-chat');
      await waitForChatInterfaceLoad(page);
      await runAxe(page);
    });

    test('Consistent accessibility patterns across all components', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Test consistent patterns
      await expect(page.locator('[data-testid="consistent-patterns"]')).toBeVisible();
      await expect(page.locator('[data-testid="accessibility-standards"]')).toBeVisible();
    });

    test('Accessibility testing integration with automated tools', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      
      // Test automated accessibility tools integration
      await expect(page.locator('[data-testid="a11y-tools"]')).toBeVisible();
      await expect(page.locator('[data-testid="compliance-checker"]')).toBeVisible();
    });
  });
});
