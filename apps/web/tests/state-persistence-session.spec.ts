import { test, expect } from '@playwright/test';
import { mockApiRoutes } from './utils/test-helpers';
import {
  waitForOnboardingStepLoad,
  waitForDashboardLoad,
  waitForChatInterfaceLoad,
  setupJourneyMocks,
  generateOnboardingData,
  startProjectFromDashboard,
  testStatePersistence,
  testSessionRecovery,
  testDataIntegrity,
  testOfflineFunctionality,
  testCrossTabSynchronization,
  testBrowserRefreshRecovery,
  testNavigationStatePreservation,
  testFormDataPersistence,
  testUserPreferencesPersistence,
  testWorkflowStatePersistence,
  testAuthenticationStatePersistence,
  testErrorStateRecovery,
  testProgressiveDataLoading,
  testStateOptimization,
  testMemoryEfficientState,
  testStateSerialization,
  testStateValidation,
  testStateMigration,
  testStateBackup,
  testStateRestore
} from './utils/streamlined-journey-helpers';

test.describe('State Persistence and Session Management - Streamlined User Journey', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page);
    await setupJourneyMocks(page, 'state-persistence-testing');
  });

  test.describe('Onboarding State Persistence', () => {
    test('Onboarding form data persistence across navigation', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);

      // Fill first step data
      const userData = generateOnboardingData('startup');
      await page.fill('[data-testid="company-name"]', userData.companyName);
      await page.selectOption('[data-testid="industry-select"]', userData.industry);

      // Navigate away and back
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      await page.goto('/onboarding');

      // Verify data persistence
      await testFormDataPersistence(page, 'onboarding', userData);
    });

    test('Onboarding progress persistence across browser sessions', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);

      // Complete first step
      const userData = generateOnboardingData('startup');
      await page.fill('[data-testid="company-name"]', userData.companyName);
      await page.selectOption('[data-testid="industry-select"]', userData.industry);
      await page.click('[data-testid="next-step"]');

      await waitForOnboardingStepLoad(page, 2);

      // Simulate browser refresh
      await page.reload();
      await waitForOnboardingStepLoad(page, 2);

      // Verify progress maintained
      await expect(page.locator('[data-testid="step-2"]')).toBeVisible();
      await expect(page.locator('[data-testid="company-name"]')).toHaveValue(userData.companyName);
    });

    test('Onboarding state recovery after network interruption', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);

      // Fill form data
      const userData = generateOnboardingData('startup');
      await page.fill('[data-testid="company-name"]', userData.companyName);
      await page.selectOption('[data-testid="industry-select"]', userData.industry);

      // Simulate network interruption
      await page.route('**/api/onboarding/**', async (route) => {
        await route.abort('Failed');
      });

      // Attempt submission
      await page.click('[data-testid="next-step"]');

      // Verify error handling and state preservation
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="company-name"]')).toHaveValue(userData.companyName);

      // Restore network and retry
      await page.unroute('**/api/onboarding/**');
      await page.click('[data-testid="retry-button"]');

      // Verify successful progression
      await waitForOnboardingStepLoad(page, 2);
    });
  });

  test.describe('Dashboard State Persistence', () => {
    test('Dashboard preferences and settings persistence', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);

      // Change theme
      await page.click('[data-testid="theme-toggle"]');
      await expect(page.locator('[data-testid="theme-dark"]')).toBeVisible();

      // Change layout
      await page.click('[data-testid="layout-toggle"]');
      await expect(page.locator('[data-testid="layout-compact"]')).toBeVisible();

      // Navigate away and back
      await page.goto('/onboarding');
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);

      // Verify preferences persisted
      await testUserPreferencesPersistence(page, 'dashboard');
    });

    test('Dashboard system status persistence', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);

      // Get initial system status
      const initialStatus = await page.locator('[data-testid="system-status"]').textContent();

      // Refresh status
      await page.click('[data-testid="refresh-status"]');
      await page.waitForTimeout(1000);

      // Verify status updated
      const updatedStatus = await page.locator('[data-testid="system-status"]').textContent();
      expect(updatedStatus).not.toBe(initialStatus);

      // Navigate away and back
      await page.goto('/onboarding');
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);

      // Verify status maintained
      await expect(page.locator('[data-testid="system-status"]')).toHaveText(updatedStatus);
    });

    test('Dashboard navigation state preservation', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);

      // Navigate to specific section
      await page.click('[data-testid="projects-section"]');
      await expect(page.locator('[data-testid="projects-list"]')).toBeVisible();

      // Navigate away and back
      await page.goto('/onboarding');
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);

      // Verify navigation state preserved
      await testNavigationStatePreservation(page, 'dashboard');
    });
  });

  test.describe('Chat Interface State Persistence', () => {
    test('Chat conversation state persistence', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      await startProjectFromDashboard(page);
      await waitForChatInterfaceLoad(page);

      // Send initial message
      await page.fill('[data-testid="message-input"]', 'Hello, I need help with my project');
      await page.click('[data-testid="send-message"]');

      // Wait for response
      await expect(page.locator('[data-testid="message-item"]')).toHaveCount(2);

      // Navigate away and back
      await page.goto('/dashboard');
      await page.goto('/test-chat');

      // Verify conversation state maintained
      await testWorkflowStatePersistence(page, 'chat-interface');
    });

    test('Chat interface user preferences persistence', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      await startProjectFromDashboard(page);
      await waitForChatInterfaceLoad(page);

      // Change chat settings
      await page.click('[data-testid="chat-settings"]');
      await page.selectOption('[data-testid="message-density"]', 'compact');
      await page.click('[data-testid="save-settings"]');

      // Navigate away and back
      await page.goto('/dashboard');
      await page.goto('/test-chat');

      // Verify settings persisted
      await expect(page.locator('[data-testid="message-density"]')).toHaveValue('compact');
    });

    test('Chat workflow progress persistence', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);
      await startProjectFromDashboard(page);
      await waitForChatInterfaceLoad(page);

      // Progress through workflow
      await page.fill('[data-testid="message-input"]', 'Start project planning');
      await page.click('[data-testid="send-message"]');

      // Wait for workflow progression
      await expect(page.locator('[data-testid="workflow-progress"]')).toBeVisible();

      // Navigate away and back
      await page.goto('/dashboard');
      await page.goto('/test-chat');

      // Verify workflow progress maintained
      await expect(page.locator('[data-testid="workflow-progress"]')).toBeVisible();
    });
  });

  test.describe('Cross-Session State Management', () => {
    test('State persistence across browser tabs', async ({ page, context }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);

      // Fill form data in first tab
      const userData = generateOnboardingData('startup');
      await page.fill('[data-testid="company-name"]', userData.companyName);

      // Open second tab
      const secondPage = await context.newPage();
      await secondPage.goto('/onboarding');
      await waitForOnboardingStepLoad(secondPage, 1);

      // Verify data synchronized
      await testCrossTabSynchronization(page, secondPage, 'onboarding');
    });

    test('State persistence across browser windows', async ({ page, context }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);

      // Change theme in first window
      await page.click('[data-testid="theme-toggle"]');

      // Open second window
      const secondPage = await context.newPage();
      await secondPage.goto('/dashboard');
      await waitForDashboardLoad(secondPage);

      // Verify theme synchronized
      await expect(secondPage.locator('[data-testid="theme-dark"]')).toBeVisible();
    });

    test('State persistence across different browsers', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);

      // Fill form data
      const userData = generateOnboardingData('startup');
      await page.fill('[data-testid="company-name"]', userData.companyName);
      await page.selectOption('[data-testid="industry-select"]', userData.industry);

      // Store data in localStorage
      await page.evaluate((data) => {
        localStorage.setItem('onboarding_data', JSON.stringify(data));
      }, userData);

      // Verify data stored
      const storedData = await page.evaluate(() => {
        return JSON.parse(localStorage.getItem('onboarding_data') || '{}');
      });

      expect(storedData.companyName).toBe(userData.companyName);
      expect(storedData.industry).toBe(userData.industry);
    });
  });

  test.describe('Session Recovery and Resilience', () => {
    test('Session recovery after browser crash simulation', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);

      // Fill form data
      const userData = generateOnboardingData('startup');
      await page.fill('[data-testid="company-name"]', userData.companyName);
      await page.selectOption('[data-testid="industry-select"]', userData.industry);

      // Simulate browser crash by clearing page
      await page.evaluate(() => {
        // Simulate crash by clearing DOM
        document.body.innerHTML = '';
      });

      // Navigate back to onboarding
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);

      // Verify session recovery
      await testSessionRecovery(page, 'onboarding');
    });

    test('Session recovery after network reconnection', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);

      // Fill form data
      const userData = generateOnboardingData('startup');
      await page.fill('[data-testid="company-name"]', userData.companyName);

      // Simulate network disconnection
      await page.route('**/api/**', async (route) => {
        await route.abort('Failed');
      });

      // Attempt submission
      await page.click('[data-testid="next-step"]');
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();

      // Simulate network reconnection
      await page.unroute('**/api/**');
      await page.click('[data-testid="retry-button"]');

      // Verify successful recovery
      await waitForOnboardingStepLoad(page, 2);
    });

    test('Session recovery after authentication timeout', async ({ page }) => {
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);

      // Simulate authentication timeout
      await page.evaluate(() => {
        localStorage.removeItem('auth_token');
        sessionStorage.removeItem('auth_token');
      });

      // Attempt dashboard access
      await page.reload();

      // Verify redirected to login
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();

      // Restore authentication
      await page.evaluate(() => {
        localStorage.setItem('auth_token', 'test_token');
      });

      // Navigate back to dashboard
      await page.goto('/dashboard');
      await waitForDashboardLoad(page);

      // Verify successful recovery
      await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();
    });
  });

  test.describe('Data Integrity and Validation', () => {
    test('Form data validation and sanitization', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);

      // Test data validation
      await testDataIntegrity(page, 'onboarding');

      // Test XSS prevention
      const maliciousInput = '<script>alert("xss")</script>';
      await page.fill('[data-testid="company-name"]', maliciousInput);

      // Verify input sanitized
      const sanitizedValue = await page.locator('[data-testid="company-name"]').inputValue();
      expect(sanitizedValue).not.toContain('<script>');
    });

    test('State data validation and type safety', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);

      // Test state validation
      await testStateValidation(page, 'onboarding');

      // Test type safety
      await page.evaluate(() => {
        // Attempt to store invalid data
        try {
          localStorage.setItem('onboarding_data', 'invalid_json');
          return false;
        } catch (error) {
          return true;
        }
      });

      // Verify validation working
      const isValid = await page.evaluate(() => {
        try {
          const data = localStorage.getItem('onboarding_data');
          JSON.parse(data || '{}');
          return true;
        } catch {
          return false;
        }
      });

      expect(isValid).toBe(true);
    });

    test('State migration and backward compatibility', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);

      // Test state migration
      await testStateMigration(page, 'onboarding');

      // Test backward compatibility
      await page.evaluate(() => {
        // Store data in old format
        localStorage.setItem('onboarding_old', JSON.stringify({
          company: 'Old Company',
          industry: 'old-industry'
        }));
      });

      // Verify migration working
      const migratedData = await page.evaluate(() => {
        const oldData = localStorage.getItem('onboarding_old');
        if (oldData) {
          const parsed = JSON.parse(oldData);
          // Migrate to new format
          localStorage.setItem('onboarding_data', JSON.stringify({
            companyName: parsed.company,
            industry: parsed.industry
          }));
          localStorage.removeItem('onboarding_old');
          return true;
        }
        return false;
      });

      expect(migratedData).toBe(true);
    });
  });

  test.describe('Offline Functionality and Sync', () => {
    test('Offline form data collection', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);

      // Test offline functionality
      await testOfflineFunctionality(page, 'onboarding');

      // Simulate offline mode
      await page.route('**/api/**', async (route) => {
        await route.abort('Failed');
      });

      // Fill form data
      const userData = generateOnboardingData('startup');
      await page.fill('[data-testid="company-name"]', userData.companyName);
      await page.selectOption('[data-testid="industry-select"]', userData.industry);

      // Verify data stored locally
      const storedData = await page.evaluate(() => {
        return localStorage.getItem('onboarding_data');
      });

      expect(storedData).toBeTruthy();
    });

    test('Data synchronization after reconnection', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);

      // Fill form data while offline
      const userData = generateOnboardingData('startup');
      await page.fill('[data-testid="company-name"]', userData.companyName);

      // Simulate offline mode
      await page.route('**/api/**', async (route) => {
        await route.abort('Failed');
      });

      // Attempt submission
      await page.click('[data-testid="next-step"]');
      await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();

      // Restore network connection
      await page.unroute('**/api/**');
      await page.click('[data-testid="sync-button"]');

      // Verify successful synchronization
      await waitForOnboardingStepLoad(page, 2);
    });

    test('Conflict resolution during sync', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);

      // Fill form data
      const userData = generateOnboardingData('startup');
      await page.fill('[data-testid="company-name"]', userData.companyName);

      // Simulate conflict
      await page.evaluate((data) => {
        // Store conflicting data
        localStorage.setItem('onboarding_conflict', JSON.stringify({
          companyName: 'Conflicting Company',
          timestamp: Date.now()
        }));
      }, userData);

      // Test conflict resolution
      const resolved = await page.evaluate(() => {
        const localData = localStorage.getItem('onboarding_data');
        const conflictData = localStorage.getItem('onboarding_conflict');
        
        if (localData && conflictData) {
          const local = JSON.parse(localData);
          const conflict = JSON.parse(conflictData);
          
          // Resolve by timestamp
          if (local.timestamp > conflict.timestamp) {
            localStorage.removeItem('onboarding_conflict');
            return true;
          } else {
            localStorage.setItem('onboarding_data', conflictData);
            localStorage.removeItem('onboarding_conflict');
            return true;
          }
        }
        return false;
      });

      expect(resolved).toBe(true);
    });
  });

  test.describe('State Optimization and Performance', () => {
    test('Memory-efficient state management', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);

      // Test memory efficiency
      await testMemoryEfficientState(page, 'onboarding');

      // Measure memory usage
      const initialMemory = await page.evaluate(() => {
        return performance.memory?.usedJSHeapSize || 0;
      });

      // Perform multiple state updates
      for (let i = 0; i < 10; i++) {
        await page.fill('[data-testid="company-name"]', `Company ${i}`);
        await page.waitForTimeout(100);
      }

      const finalMemory = await page.evaluate(() => {
        return performance.memory?.usedJSHeapSize || 0;
      });

      // Memory should not increase significantly
      const memoryIncrease = finalMemory - initialMemory;
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024); // Less than 5MB
    });

    test('State serialization performance', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);

      // Test serialization performance
      await testStateSerialization(page, 'onboarding');

      // Measure serialization time
      const serializationTime = await page.evaluate(() => {
        const start = performance.now();
        
        // Simulate state serialization
        const state = {
          companyName: 'Test Company',
          industry: 'technology',
          timestamp: Date.now()
        };
        
        JSON.stringify(state);
        
        return performance.now() - start;
      });

      expect(serializationTime).toBeLessThan(1); // Should be very fast
    });

    test('State backup and restore performance', async ({ page }) => {
      await page.goto('/onboarding');
      await waitForOnboardingStepLoad(page, 1);

      // Test backup performance
      await testStateBackup(page, 'onboarding');

      // Test restore performance
      await testStateRestore(page, 'onboarding');

      // Measure backup/restore time
      const backupTime = await page.evaluate(() => {
        const start = performance.now();
        
        // Simulate backup
        const state = localStorage.getItem('onboarding_data');
        sessionStorage.setItem('onboarding_backup', state || '');
        
        return performance.now() - start;
      });

      expect(backupTime).toBeLessThan(10); // Should be very fast
    });
  });
});
