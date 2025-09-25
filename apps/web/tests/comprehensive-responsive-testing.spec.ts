import { test, expect } from '@playwright/test';
import { testHelpers } from './utils/test-helpers';
import { responsiveTestingHelpers } from './utils/responsive-testing-helpers';

test.describe('Comprehensive Responsive Design Testing', () => {
  let helpers: typeof testHelpers;
  let responsiveUtils: typeof responsiveTestingHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = testHelpers;
    responsiveUtils = responsiveTestingHelpers;
    await page.goto('/');
  });

  test.describe('Device-Specific Testing', () => {
    test('should test on iPhone 12 device profile', async ({ page }) => {
      const devices = ['iPhone 12'];
      const deviceResults = await responsiveUtils.testOnDeviceProfiles(page, devices);
      
      expect(deviceResults).toBeDefined();
      expect(deviceResults['iPhone 12']).toBeDefined();
      expect(deviceResults['iPhone 12'].viewport).toBeDefined();
      expect(deviceResults['iPhone 12'].touchCapabilities).toBeDefined();
    });

    test('should test on Pixel 5 device profile', async ({ page }) => {
      const devices = ['Pixel 5'];
      const deviceResults = await responsiveUtils.testOnDeviceProfiles(page, devices);
      
      expect(deviceResults).toBeDefined();
      expect(deviceResults['Pixel 5']).toBeDefined();
      expect(deviceResults['Pixel 5'].viewport).toBeDefined();
      expect(deviceResults['Pixel 5'].touchCapabilities).toBeDefined();
    });

    test('should test on iPad Pro device profile', async ({ page }) => {
      const devices = ['iPad Pro'];
      const deviceResults = await responsiveUtils.testOnDeviceProfiles(page, devices);
      
      expect(deviceResults).toBeDefined();
      expect(deviceResults['iPad Pro']).toBeDefined();
      expect(deviceResults['iPad Pro'].viewport).toBeDefined();
      expect(deviceResults['iPad Pro'].touchCapabilities).toBeDefined();
    });

    test('should validate touch target sizes on mobile devices', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 }); // iPhone 12 size
      
      const touchTargets = [
        '[data-testid="send-button"]',
        '[data-testid="theme-toggle"]',
        '[data-testid="menu-button"]',
        'button',
        'a'
      ];
      
      const touchTargetValidation = await responsiveUtils.validateTouchTargetSizes(page, touchTargets);
      
      expect(touchTargetValidation).toBeDefined();
      expect(touchTargetValidation.allTargetsValid).toBe(true);
      expect(touchTargetValidation.invalidTargets).toHaveLength(0);
      
      // Touch targets should be at least 44x44px for accessibility
      touchTargetValidation.targets.forEach(target => {
        expect(target.width).toBeGreaterThanOrEqual(44);
        expect(target.height).toBeGreaterThanOrEqual(44);
      });
    });

    test('should test device orientation changes', async ({ page }) => {
      const orientations = ['portrait', 'landscape'];
      const orientationResults = await responsiveUtils.testOrientationChanges(page, orientations);
      
      expect(orientationResults).toBeDefined();
      expect(orientationResults.portrait).toBeDefined();
      expect(orientationResults.landscape).toBeDefined();
      
      // Layout should remain stable during orientation changes
      expect(orientationResults.portrait.layoutStable).toBe(true);
      expect(orientationResults.landscape.layoutStable).toBe(true);
    });

    test('should validate safe area handling on devices with notches', async ({ page }) => {
      const device = 'iPhone 12';
      const safeAreaValidation = await responsiveUtils.validateSafeAreaHandling(page, device);
      
      expect(safeAreaValidation).toBeDefined();
      expect(safeAreaValidation.safeAreaApplied).toBe(true);
      expect(safeAreaValidation.noContentClipped).toBe(true);
      expect(safeAreaValidation.notchHandling).toBeDefined();
    });
  });

  test.describe('Viewport Transition Testing', () => {
    test('should test smooth transitions between breakpoints', async ({ page }) => {
      const breakpoints = [
        { width: 320, height: 568 },   // Small mobile
        { width: 375, height: 812 },   // iPhone 12
        { width: 768, height: 1024 },  // iPad
        { width: 1024, height: 768 },  // Small desktop
        { width: 1920, height: 1080 }  // Full HD
      ];
      
      const transitionResults = await responsiveUtils.testBreakpointTransitions(page, breakpoints);
      
      expect(transitionResults).toBeDefined();
      expect(transitionResults.transitions).toBeDefined();
      expect(transitionResults.transitions.length).toBe(breakpoints.length - 1);
      
      // All transitions should be smooth
      transitionResults.transitions.forEach(transition => {
        expect(transition.smooth).toBe(true);
        expect(transition.noLayoutShift).toBe(true);
      });
    });

    test('should validate layout stability during viewport changes', async ({ page }) => {
      const transitions = [
        { from: { width: 375, height: 812 }, to: { width: 768, height: 1024 } },
        { from: { width: 768, height: 1024 }, to: { width: 1024, height: 768 } },
        { from: { width: 1024, height: 768 }, to: { width: 1920, height: 1080 } }
      ];
      
      const layoutStability = await responsiveUtils.validateLayoutStability(page, transitions);
      
      expect(layoutStability).toBeDefined();
      expect(layoutStability.allTransitionsStable).toBe(true);
      expect(layoutStability.layoutShiftScore).toBeLessThan(0.1);
    });

    test('should test component reflow during viewport changes', async ({ page }) => {
      const components = [
        '[data-testid="chat-interface"]',
        '[data-testid="dashboard-header"]',
        '[data-testid="sidebar"]',
        '[data-testid="main-content"]'
      ];
      
      const reflowResults = await responsiveUtils.testComponentReflow(page, components);
      
      expect(reflowResults).toBeDefined();
      expect(reflowResults.components).toBeDefined();
      
      // Components should reflow smoothly
      reflowResults.components.forEach(component => {
        expect(component.reflowSmooth).toBe(true);
        expect(component.noContentOverlap).toBe(true);
      });
    });

    test('should measure transition performance', async ({ page }) => {
      const transitions = [
        'mobile-to-tablet',
        'tablet-to-desktop',
        'desktop-to-mobile'
      ];
      
      const transitionPerformance = await responsiveUtils.measureTransitionPerformance(page, transitions);
      
      expect(transitionPerformance).toBeDefined();
      expect(transitionPerformance.transitions).toBeDefined();
      
      // Transitions should be performant
      transitionPerformance.transitions.forEach(transition => {
        expect(transition.duration).toBeLessThan(300); // Less than 300ms
        expect(transition.fps).toBeGreaterThan(30); // At least 30 FPS
      });
    });
  });

  test.describe('Advanced Touch Interaction Testing', () => {
    test('should test multi-touch gestures', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 }); // Mobile viewport
      
      const gestures = ['pinch', 'zoom', 'swipe', 'rotate'];
      const gestureResults = await responsiveUtils.testMultiTouchGestures(page, gestures);
      
      expect(gestureResults).toBeDefined();
      expect(gestureResults.gestures).toBeDefined();
      
      // All gestures should work properly
      gestureResults.gestures.forEach(gesture => {
        expect(gesture.supported).toBe(true);
        expect(gesture.responsive).toBe(true);
      });
    });

    test('should validate touch event handling', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      
      const events = ['touchstart', 'touchmove', 'touchend', 'touchcancel'];
      const eventResults = await responsiveUtils.validateTouchEventHandling(page, events);
      
      expect(eventResults).toBeDefined();
      expect(eventResults.events).toBeDefined();
      
      // Touch events should be handled correctly
      eventResults.events.forEach(event => {
        expect(event.handled).toBe(true);
        expect(event.preventDefault).toBeDefined();
      });
    });

    test('should test touch feedback responses', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      
      const touchElements = [
        '[data-testid="send-button"]',
        '[data-testid="theme-toggle"]',
        '[data-testid="menu-button"]'
      ];
      
      const feedbackResults = await responsiveUtils.testTouchFeedback(page, touchElements);
      
      expect(feedbackResults).toBeDefined();
      expect(feedbackResults.elements).toBeDefined();
      
      // Touch feedback should be immediate
      feedbackResults.elements.forEach(element => {
        expect(element.feedbackImmediate).toBe(true);
        expect(element.visualFeedback).toBe(true);
      });
    });

    test('should test touch accessibility', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      
      const touchElements = [
        '[data-testid="chat-input"]',
        '[data-testid="send-button"]',
        '[data-testid="theme-toggle"]'
      ];
      
      const accessibilityResults = await responsiveUtils.testTouchAccessibility(page, touchElements);
      
      expect(accessibilityResults).toBeDefined();
      expect(accessibilityResults.allElementsAccessible).toBe(true);
      expect(accessibilityResults.touchTargetsValid).toBe(true);
    });
  });

  test.describe('Responsive Performance Testing', () => {
    test('should measure layout shift during responsive changes', async ({ page }) => {
      const changes = [
        { from: 375, to: 768 },
        { from: 768, to: 1024 },
        { from: 1024, to: 1920 }
      ];
      
      const layoutShiftResults = await responsiveUtils.measureLayoutShift(page, changes);
      
      expect(layoutShiftResults).toBeDefined();
      expect(layoutShiftResults.changes).toBeDefined();
      
      // Layout shift should be minimal
      layoutShiftResults.changes.forEach(change => {
        expect(change.layoutShiftScore).toBeLessThan(0.1);
        expect(change.noContentJump).toBe(true);
      });
    });

    test('should test rendering performance across screen densities', async ({ page }) => {
      const densities = [1, 2, 3]; // 1x, 2x, 3x pixel ratios
      const densityResults = await responsiveUtils.testRenderingAcrossScreenDensities(page, densities);
      
      expect(densityResults).toBeDefined();
      expect(densityResults.densities).toBeDefined();
      
      // Performance should remain consistent across densities
      densityResults.densities.forEach(density => {
        expect(density.renderingTime).toBeLessThan(100); // Less than 100ms
        expect(density.memoryUsage).toBeDefined();
      });
    });

    test('should validate image responsiveness', async ({ page }) => {
      const images = [
        '[data-testid="hero-image"]',
        '[data-testid="avatar-image"]',
        '[data-testid="icon-image"]'
      ];
      
      const imageResponsiveness = await responsiveUtils.validateImageResponsiveness(page, images);
      
      expect(imageResponsiveness).toBeDefined();
      expect(imageResponsiveness.images).toBeDefined();
      
      // Images should be responsive
      imageResponsiveness.images.forEach(image => {
        expect(image.responsive).toBe(true);
        expect(image.optimized).toBe(true);
        expect(image.loadingTime).toBeLessThan(2000); // Less than 2 seconds
      });
    });

    test('should test font scaling across screen sizes', async ({ page }) => {
      const elements = [
        '[data-testid="page-title"]',
        '[data-testid="body-text"]',
        '[data-testid="button-text"]'
      ];
      
      const fontScaling = await responsiveUtils.testFontScaling(page, elements);
      
      expect(fontScaling).toBeDefined();
      expect(fontScaling.elements).toBeDefined();
      
      // Fonts should scale appropriately
      fontScaling.elements.forEach(element => {
        expect(element.scalesProperly).toBe(true);
        expect(element.readable).toBe(true);
        expect(element.noOverflow).toBe(true);
      });
    });
  });

  test.describe('Cross-Device Consistency Testing', () => {
    test('should compare visual consistency across device types', async ({ page }) => {
      const devices = ['iPhone 12', 'iPad Pro', 'Desktop'];
      const consistencyResults = await responsiveUtils.compareVisualConsistency(page, devices);
      
      expect(consistencyResults).toBeDefined();
      expect(consistencyResults.consistency).toBeDefined();
      expect(consistencyResults.consistency.score).toBeGreaterThan(0.8); // At least 80% consistency
    });

    test('should test interaction consistency across touch and mouse', async ({ page }) => {
      const interactions = ['click', 'hover', 'focus', 'scroll'];
      const interactionResults = await responsiveUtils.testInteractionConsistency(page, interactions);
      
      expect(interactionResults).toBeDefined();
      expect(interactionResults.interactions).toBeDefined();
      
      // Interactions should be consistent
      interactionResults.interactions.forEach(interaction => {
        expect(interaction.consistent).toBe(true);
        expect(interaction.responsive).toBe(true);
      });
    });

    test('should validate accessibility features across devices', async ({ page }) => {
      const devices = ['iPhone 12', 'iPad Pro', 'Desktop'];
      const accessibilityResults = await responsiveUtils.validateAccessibilityAcrossDevices(page, devices);
      
      expect(accessibilityResults).toBeDefined();
      expect(accessibilityResults.devices).toBeDefined();
      
      // Accessibility should work on all devices
      accessibilityResults.devices.forEach(device => {
        expect(device.accessible).toBe(true);
        expect(device.screenReaderCompatible).toBe(true);
      });
    });

    test('should test keyboard navigation on different device types', async ({ page }) => {
      const devices = ['iPhone 12', 'iPad Pro', 'Desktop'];
      const keyboardResults = await responsiveUtils.testKeyboardNavigationOnDevices(page, devices);
      
      expect(keyboardResults).toBeDefined();
      expect(keyboardResults.devices).toBeDefined();
      
      // Keyboard navigation should work on all devices
      keyboardResults.devices.forEach(device => {
        expect(device.keyboardNavigation).toBe(true);
        expect(device.focusManagement).toBe(true);
      });
    });
  });

  test.describe('Progressive Enhancement Testing', () => {
    test('should test functionality without JavaScript', async ({ page }) => {
      // Disable JavaScript
      await page.route('**/*', route => {
        if (route.request().resourceType() === 'script') {
          route.abort();
        } else {
          route.continue();
        }
      });
      
      await page.goto('/');
      
      const noJsResults = await responsiveUtils.testWithoutJavaScript(page);
      
      expect(noJsResults).toBeDefined();
      expect(noJsResults.basicFunctionality).toBe(true);
      expect(noJsResults.contentAccessible).toBe(true);
    });

    test('should test graceful degradation of features', async ({ page }) => {
      const features = ['animations', 'real-time-updates', 'advanced-interactions'];
      const degradationResults = await responsiveUtils.testGracefulDegradation(page, features);
      
      expect(degradationResults).toBeDefined();
      expect(degradationResults.features).toBeDefined();
      
      // Features should degrade gracefully
      degradationResults.features.forEach(feature => {
        expect(feature.degradesGracefully).toBe(true);
        expect(feature.coreFunctionality).toBe(true);
      });
    });

    test('should validate offline functionality', async ({ page }) => {
      // Go offline
      await page.context().setOffline(true);
      
      const offlineResults = await responsiveUtils.validateOfflineFunctionality(page);
      
      expect(offlineResults).toBeDefined();
      expect(offlineResults.offlineMode).toBe(true);
      expect(offlineResults.cachedContent).toBe(true);
      expect(offlineResults.userInformed).toBe(true);
    });

    test('should test progressive web app features', async ({ page }) => {
      const pwaFeatures = ['service-worker', 'manifest', 'offline-support', 'installable'];
      const pwaResults = await responsiveUtils.testPWAFeatures(page, pwaFeatures);
      
      expect(pwaResults).toBeDefined();
      expect(pwaResults.features).toBeDefined();
      
      // PWA features should be available
      pwaResults.features.forEach(feature => {
        expect(feature.available).toBe(true);
        expect(feature.functional).toBe(true);
      });
    });
  });

  test.describe('Responsive Component Validation', () => {
    test('should test ChatInterface responsiveness during workflow progression', async ({ page }) => {
      const components = ['[data-testid="chat-interface"]'];
      const viewports = [
        { width: 375, height: 812 },   // Mobile
        { width: 768, height: 1024 },  // Tablet
        { width: 1920, height: 1080 }  // Desktop
      ];
      
      const componentResponsiveness = await responsiveUtils.testComponentAdaptation(page, components, viewports);
      
      expect(componentResponsiveness).toBeDefined();
      expect(componentResponsiveness.components).toBeDefined();
      
      // Components should adapt to all viewports
      componentResponsiveness.components.forEach(component => {
        expect(component.adaptsToMobile).toBe(true);
        expect(component.adaptsToTablet).toBe(true);
        expect(component.adaptsToDesktop).toBe(true);
      });
    });

    test('should validate modal behavior across devices', async ({ page }) => {
      const modals = [
        '[data-testid="onboarding-modal"]',
        '[data-testid="settings-modal"]',
        '[data-testid="confirmation-modal"]'
      ];
      
      const devices = ['iPhone 12', 'iPad Pro', 'Desktop'];
      const modalBehavior = await responsiveUtils.validateModalBehavior(page, modals, devices);
      
      expect(modalBehavior).toBeDefined();
      expect(modalBehavior.modals).toBeDefined();
      
      // Modals should work properly on all devices
      modalBehavior.modals.forEach(modal => {
        expect(modal.responsive).toBe(true);
        expect(modal.accessible).toBe(true);
        expect(modal.noOverflow).toBe(true);
      });
    });

    test('should test navigation responsiveness', async ({ page }) => {
      const navigation = [
        '[data-testid="main-nav"]',
        '[data-testid="sidebar-nav"]',
        '[data-testid="breadcrumb-nav"]'
      ];
      
      const navigationResponsiveness = await responsiveUtils.testNavigationResponsiveness(page, navigation);
      
      expect(navigationResponsiveness).toBeDefined();
      expect(navigationResponsiveness.navigation).toBeDefined();
      
      // Navigation should be responsive
      navigationResponsiveness.navigation.forEach(nav => {
        expect(nav.responsive).toBe(true);
        expect(nav.accessible).toBe(true);
        expect(nav.noOverlap).toBe(true);
      });
    });

    test('should validate form responsiveness', async ({ page }) => {
      const forms = [
        '[data-testid="onboarding-form"]',
        '[data-testid="login-form"]',
        '[data-testid="contact-form"]'
      ];
      
      const formResponsiveness = await responsiveUtils.validateFormResponsiveness(page, forms);
      
      expect(formResponsiveness).toBeDefined();
      expect(formResponsiveness.forms).toBeDefined();
      
      // Forms should be responsive
      formResponsiveness.forms.forEach(form => {
        expect(form.responsive).toBe(true);
        expect(form.usableOnMobile).toBe(true);
        expect(form.noHorizontalScroll).toBe(true);
      });
    });
  });

  test.describe('Performance Impact Analysis', () => {
    test('should measure responsive performance across viewports', async ({ page }) => {
      const viewports = [
        { width: 375, height: 812 },   // Mobile
        { width: 768, height: 1024 },  // Tablet
        { width: 1920, height: 1080 }  // Desktop
      ];
      
      const responsivePerformance = await responsiveUtils.measureResponsivePerformance(page, viewports);
      
      expect(responsivePerformance).toBeDefined();
      expect(responsivePerformance.viewports).toBeDefined();
      
      // Performance should be consistent across viewports
      responsivePerformance.viewports.forEach(viewport => {
        expect(viewport.loadTime).toBeLessThan(3000); // Less than 3 seconds
        expect(viewport.renderTime).toBeLessThan(500); // Less than 500ms
      });
    });

    test('should test memory usage across different devices', async ({ page }) => {
      const devices = ['iPhone 12', 'iPad Pro', 'Desktop'];
      const memoryUsage = await responsiveUtils.testMemoryUsageAcrossDevices(page, devices);
      
      expect(memoryUsage).toBeDefined();
      expect(memoryUsage.devices).toBeDefined();
      
      // Memory usage should be reasonable on all devices
      memoryUsage.devices.forEach(device => {
        expect(device.memoryUsage).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
        expect(device.memoryGrowth).toBeLessThan(0.2); // Less than 20% growth
      });
    });

    test('should validate rendering performance across devices', async ({ page }) => {
      const devices = ['iPhone 12', 'iPad Pro', 'Desktop'];
      const renderingPerformance = await responsiveUtils.validateRenderingPerformance(page, devices);
      
      expect(renderingPerformance).toBeDefined();
      expect(renderingPerformance.devices).toBeDefined();
      
      // Rendering should be performant on all devices
      renderingPerformance.devices.forEach(device => {
        expect(device.paintTime).toBeLessThan(100); // Less than 100ms
        expect(device.layoutTime).toBeLessThan(50); // Less than 50ms
        expect(device.compositeTime).toBeLessThan(30); // Less than 30ms
      });
    });

    test('should test network impact on different devices', async ({ page }) => {
      const conditions = [
        { name: '3G', download: 750, upload: 250, latency: 100 },
        { name: '4G', download: 4000, upload: 3000, latency: 20 },
        { name: 'WiFi', download: 30000, upload: 15000, latency: 2 }
      ];
      
      const networkImpact = await responsiveUtils.testNetworkImpactOnDevices(page, conditions);
      
      expect(networkImpact).toBeDefined();
      expect(networkImpact.conditions).toBeDefined();
      
      // Performance should degrade gracefully with slower networks
      networkImpact.conditions.forEach(condition => {
        if (condition.name === '3G') {
          expect(condition.loadTime).toBeLessThan(5000); // Should load within 5 seconds even on 3G
        }
      });
    });
  });
});
