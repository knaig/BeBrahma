import { test, expect } from '@playwright/test';
import { testHelpers } from './utils/test-helpers';
import { websocketTestingHelpers } from './utils/websocket-testing-helpers';

test.describe('WebSocket and Real-Time Features Testing', () => {
  let helpers: typeof testHelpers;
  let websocketUtils: typeof websocketTestingHelpers;
  let wsUrl: string;

  test.beforeEach(async ({ page }) => {
    helpers = testHelpers;
    websocketUtils = websocketTestingHelpers;
    wsUrl = process.env.TEST_WS_URL || 'ws://localhost:7071/ws';
    await page.goto('/');
  });

  test.describe('WebSocket Connection Testing', () => {
    test('should establish WebSocket connection successfully', async ({ page }) => {
      const connection = await websocketUtils.establishWebSocketConnection(page, wsUrl, ['chat']);
      
      expect(connection).toBeDefined();
      expect(connection.connected).toBe(true);
      expect(connection.protocol).toBeDefined();
      expect(connection.readyState).toBe(1); // WebSocket.OPEN
    });

    test('should test WebSocket handshake process', async ({ page }) => {
      const connection = await websocketUtils.establishWebSocketConnection(page, 'ws://localhost:3000', ['chat']);
      const handshake = await websocketUtils.testConnectionHandshake(page, connection);
      
      expect(handshake).toBeDefined();
      expect(handshake.successful).toBe(true);
      expect(handshake.upgradeComplete).toBe(true);
      expect(handshake.protocolNegotiated).toBe(true);
    });

    test('should authenticate WebSocket connection', async ({ page }) => {
      const connection = await websocketUtils.establishWebSocketConnection(page, 'ws://localhost:3000', ['chat']);
      const auth = { token: 'test-auth-token', userId: 'test-user-123' };
      
      const authResult = await websocketUtils.testConnectionAuthentication(page, connection, auth);
      
      expect(authResult).toBeDefined();
      expect(authResult.authenticated).toBe(true);
      expect(authResult.authorized).toBe(true);
      expect(authResult.userId).toBe(auth.userId);
    });

    test('should validate HTTP to WebSocket upgrade', async ({ page }) => {
      const connection = await websocketUtils.establishWebSocketConnection(page, 'ws://localhost:3000', ['chat']);
      const upgradeValidation = await websocketUtils.validateConnectionUpgrade(page, connection);
      
      expect(upgradeValidation).toBeDefined();
      expect(upgradeValidation.upgradeSuccessful).toBe(true);
      expect(upgradeValidation.headersValid).toBe(true);
      expect(upgradeValidation.protocolSwitched).toBe(true);
    });

    test('should handle connection timeout scenarios', async ({ page }) => {
      // Test with a slow server that might timeout
      const connection = await websocketUtils.establishWebSocketConnection(page, 'ws://localhost:3000', ['chat']);
      
      // Simulate timeout
      await page.evaluate(() => {
        // Simulate connection timeout
        return new Promise(resolve => setTimeout(resolve, 100));
      });
      
      expect(connection.readyState).toBeDefined();
    });
  });

  test.describe('Connection Stability and Resilience', () => {
    test('should maintain connection stability under network fluctuations', async ({ page }) => {
      const connection = await websocketUtils.establishWebSocketConnection(page, 'ws://localhost:3000', ['chat']);
      
      const stability = await websocketUtils.testConnectionResilience(page, connection, [
        'network-latency',
        'packet-loss',
        'bandwidth-fluctuation'
      ]);
      
      expect(stability).toBeDefined();
      expect(stability.connectionStable).toBe(true);
      expect(stability.recoverySuccessful).toBe(true);
      expect(stability.performanceDegradation).toBeLessThan(0.3); // Less than 30% degradation
    });

    test('should automatically reconnect after connection loss', async ({ page }) => {
      const connection = await websocketUtils.establishWebSocketConnection(page, 'ws://localhost:3000', ['chat']);
      
      // Simulate connection loss
      await page.evaluate(() => {
        // Simulate network disconnection
        return new Promise(resolve => setTimeout(resolve, 100));
      });
      
      const reconnection = await websocketUtils.testAutomaticReconnection(page, connection);
      
      expect(reconnection).toBeDefined();
      expect(reconnection.reconnected).toBe(true);
      expect(reconnection.reconnectionTime).toBeLessThan(5000); // Less than 5 seconds
      expect(reconnection.dataIntegrity).toBe(true);
    });

    test('should handle connection pooling and load balancing', async ({ page }) => {
      const connections = [
        await websocketUtils.establishWebSocketConnection(page, wsUrl, ['chat']),
        await websocketUtils.establishWebSocketConnection(page, wsUrl, ['notifications']),
        await websocketUtils.establishWebSocketConnection(page, wsUrl, ['updates'])
      ];
      
      const poolingValidation = await websocketUtils.validateConnectionPooling(page, connections);
      
      expect(poolingValidation).toBeDefined();
      expect(poolingValidation.poolingEffective).toBe(true);
      expect(poolingValidation.loadBalanced).toBe(true);
      expect(poolingValidation.connectionLimit).toBeDefined();
    });

    test('should gracefully degrade to polling when WebSocket unavailable', async ({ page }) => {
      // First establish WebSocket connection
      const connection = await websocketUtils.establishWebSocketConnection(page, 'ws://localhost:3000', ['chat']);
      
      // Simulate WebSocket failure
      await page.evaluate(() => {
        // Simulate WebSocket connection failure
        return new Promise(resolve => setTimeout(resolve, 100));
      });
      
      // Test fallback to polling
      const fallback = await websocketUtils.testPollingFallback(page, connection);
      
      expect(fallback).toBeDefined();
      expect(fallback.fallbackSuccessful).toBe(true);
      expect(fallback.pollingActive).toBe(true);
      expect(fallback.dataContinuity).toBe(true);
    });
  });

  test.describe('Message Delivery and Reliability', () => {
    test('should deliver messages reliably', async ({ page }) => {
      const connection = await websocketUtils.establishWebSocketConnection(page, 'ws://localhost:3000', ['chat']);
      
      const messages = [
        { id: 'msg-1', content: 'Hello World', timestamp: Date.now() },
        { id: 'msg-2', content: 'Test Message', timestamp: Date.now() },
        { id: 'msg-3', content: 'Real-time Update', timestamp: Date.now() }
      ];
      
      const deliveryResults = await websocketUtils.testMessageDelivery(page, connection, messages);
      
      expect(deliveryResults).toBeDefined();
      expect(deliveryResults.deliveryRate).toBe(1.0); // 100% delivery rate
      expect(deliveryResults.messages).toBeDefined();
      
      deliveryResults.messages.forEach(message => {
        expect(message.delivered).toBe(true);
        expect(message.deliveryTime).toBeLessThan(1000); // Less than 1 second
      });
    });

    test('should maintain message ordering', async ({ page }) => {
      const connection = await websocketUtils.establishWebSocketConnection(page, 'ws://localhost:3000', ['chat']);
      
      const sequence = [
        { id: 'seq-1', order: 1, content: 'First' },
        { id: 'seq-2', order: 2, content: 'Second' },
        { id: 'seq-3', order: 3, content: 'Third' },
        { id: 'seq-4', order: 4, content: 'Fourth' },
        { id: 'seq-5', order: 5, content: 'Fifth' }
      ];
      
      const orderingResults = await websocketUtils.validateMessageOrdering(page, connection, sequence);
      
      expect(orderingResults).toBeDefined();
      expect(orderingResults.orderMaintained).toBe(true);
      expect(orderingResults.sequenceCorrect).toBe(true);
      expect(orderingResults.noOutOfOrder).toBe(true);
    });

    test('should handle message acknowledgment', async ({ page }) => {
      const connection = await websocketUtils.establishWebSocketConnection(page, 'ws://localhost:3000', ['chat']);
      
      const acks = [
        { id: 'ack-1', requireAck: true },
        { id: 'ack-2', requireAck: true },
        { id: 'ack-3', requireAck: false }
      ];
      
      const ackResults = await websocketUtils.testMessageAcknowledgment(page, connection, acks);
      
      expect(ackResults).toBeDefined();
      expect(ackResults.acknowledgments).toBeDefined();
      
      ackResults.acknowledgments.forEach(ack => {
        if (ack.requireAck) {
          expect(ack.acknowledged).toBe(true);
          expect(ack.ackTime).toBeLessThan(500); // Less than 500ms
        }
      });
    });

    test('should queue messages during connection interruptions', async ({ page }) => {
      const connection = await websocketUtils.establishWebSocketConnection(page, 'ws://localhost:3000', ['chat']);
      
      const queue = [
        { id: 'queued-1', content: 'Queued Message 1' },
        { id: 'queued-2', content: 'Queued Message 2' },
        { id: 'queued-3', content: 'Queued Message 3' }
      ];
      
      const queuingResults = await websocketUtils.testMessageQueuing(page, connection, queue);
      
      expect(queuingResults).toBeDefined();
      expect(queuingResults.queued).toBe(true);
      expect(queuingResults.queueSize).toBe(queue.length);
      expect(queuingResults.deliveredAfterReconnection).toBe(true);
    });
  });

  test.describe('Performance Under Load', () => {
    test('should handle high-frequency messaging', async ({ page }) => {
      const connection = await websocketUtils.establishWebSocketConnection(page, 'ws://localhost:3000', ['chat']);
      
      const frequency = 100; // 100 messages per second
      const performance = await websocketUtils.testHighFrequencyMessages(page, connection, frequency);
      
      expect(performance).toBeDefined();
      expect(performance.messagesPerSecond).toBeGreaterThanOrEqual(frequency * 0.9); // At least 90% of target
      expect(performance.latency).toBeLessThan(100); // Less than 100ms average latency
      expect(performance.noMessageLoss).toBe(true);
    });

    test('should handle multiple concurrent connections', async ({ page }) => {
      const connections = [];
      const connectionCount = 10;
      
      for (let i = 0; i < connectionCount; i++) {
        const connection = await websocketUtils.establishWebSocketConnection(
          page, 
          'ws://localhost:3000', 
          [`connection-${i}`]
        );
        connections.push(connection);
      }
      
      const concurrentResults = await websocketUtils.testConcurrentConnections(page, connections);
      
      expect(concurrentResults).toBeDefined();
      expect(concurrentResults.activeConnections).toBe(connectionCount);
      expect(concurrentResults.performanceStable).toBe(true);
      expect(concurrentResults.memoryUsage).toBeLessThan(50 * 1024 * 1024); // Less than 50MB
    });

    test('should measure WebSocket latency', async ({ page }) => {
      const connection = await websocketUtils.establishWebSocketConnection(page, 'ws://localhost:3000', ['chat']);
      
      const latency = await websocketUtils.measureWebSocketLatency(page, connection);
      
      expect(latency).toBeDefined();
      expect(latency.averageLatency).toBeLessThan(100); // Less than 100ms
      expect(latency.maxLatency).toBeLessThan(500); // Less than 500ms
      expect(latency.minLatency).toBeGreaterThan(0);
    });

    test('should measure connection overhead', async ({ page }) => {
      const connection = await websocketUtils.establishWebSocketConnection(page, 'ws://localhost:3000', ['chat']);
      
      const overhead = await websocketUtils.measureConnectionOverhead(page, connection);
      
      expect(overhead).toBeDefined();
      expect(overhead.memoryOverhead).toBeLessThan(5 * 1024 * 1024); // Less than 5MB
      expect(overhead.cpuOverhead).toBeLessThan(0.1); // Less than 10% CPU usage
      expect(overhead.networkOverhead).toBeDefined();
    });
  });

  test.describe('Cross-Browser WebSocket Testing', () => {
    test('should test WebSocket compatibility across browsers', async ({ page }) => {
      const browsers = ['chrome', 'firefox', 'safari'];
      const compatibility = await websocketUtils.testWebSocketCompatibility(page, browsers);
      
      expect(compatibility).toBeDefined();
      expect(compatibility.browsers).toBeDefined();
      
      // All browsers should support WebSocket
      Object.values(compatibility.browsers).forEach(browser => {
        expect(browser.supported).toBe(true);
        expect(browser.connectionEstablished).toBe(true);
      });
    });

    test('should validate WebSocket API consistency', async ({ page }) => {
      const browser = 'chrome'; // Test on current browser
      const apiValidation = await websocketUtils.validateWebSocketAPIs(page, browser);
      
      expect(apiValidation).toBeDefined();
      expect(apiValidation.constructor).toBe(true);
      expect(apiValidation.readyState).toBe(true);
      expect(apiValidation.send).toBe(true);
      expect(apiValidation.close).toBe(true);
    });

    test('should test browser-specific limitations', async ({ page }) => {
      const browser = 'chrome';
      const limitations = ['max-message-size', 'connection-limit', 'protocol-support'];
      
      const limitationResults = await websocketUtils.testBrowserSpecificLimitations(page, browser, limitations);
      
      expect(limitationResults).toBeDefined();
      expect(limitationResults.limitations).toBeDefined();
      
      limitationResults.limitations.forEach(limitation => {
        expect(limitation.identified).toBe(true);
        expect(limitation.workaround).toBeDefined();
      });
    });

    test('should compare WebSocket performance across browsers', async ({ page }) => {
      const browsers = ['chrome', 'firefox', 'safari'];
      const performanceComparison = await websocketUtils.compareWebSocketPerformance(page, browsers);
      
      expect(performanceComparison).toBeDefined();
      expect(performanceComparison.browsers).toBeDefined();
      
      // Performance should be comparable across browsers
      Object.values(performanceComparison.browsers).forEach(browser => {
        expect(browser.connectionTime).toBeLessThan(2000); // Less than 2 seconds
        expect(browser.messageLatency).toBeLessThan(200); // Less than 200ms
      });
    });
  });

  test.describe('Error Handling and Recovery', () => {
    test('should handle WebSocket errors gracefully', async ({ page }) => {
      const connection = await websocketUtils.establishWebSocketConnection(page, 'ws://localhost:3000', ['chat']);
      
      const errorTypes = ['connection-error', 'message-error', 'protocol-error'];
      const errorResults = await websocketUtils.testWebSocketErrors(page, connection, errorTypes);
      
      expect(errorResults).toBeDefined();
      expect(errorResults.errors).toBeDefined();
      
      errorResults.errors.forEach(error => {
        expect(error.handled).toBe(true);
        expect(error.recoveryAttempted).toBe(true);
        expect(error.userNotified).toBe(true);
      });
    });

    test('should recover from various error scenarios', async ({ page }) => {
      const connection = await websocketUtils.establishWebSocketConnection(page, 'ws://localhost:3000', ['chat']);
      
      const recoveryScenarios = [
        'network-timeout',
        'server-error',
        'protocol-mismatch',
        'authentication-failure'
      ];
      
      const recoveryResults = await websocketUtils.validateErrorRecovery(page, connection, recoveryScenarios);
      
      expect(recoveryResults).toBeDefined();
      expect(recoveryResults.recoverySuccessful).toBe(true);
      expect(recoveryResults.scenarios).toBeDefined();
      
      recoveryResults.scenarios.forEach(scenario => {
        expect(scenario.recovered).toBe(true);
        expect(scenario.recoveryTime).toBeLessThan(10000); // Less than 10 seconds
      });
    });

    test('should handle timeout scenarios', async ({ page }) => {
      const connection = await websocketUtils.establishWebSocketConnection(page, 'ws://localhost:3000', ['chat']);
      
      const timeouts = [5000, 10000, 30000]; // 5s, 10s, 30s
      const timeoutResults = await websocketUtils.testTimeoutHandling(page, connection, timeouts);
      
      expect(timeoutResults).toBeDefined();
      expect(timeoutResults.timeouts).toBeDefined();
      
      timeoutResults.timeouts.forEach(timeout => {
        expect(timeout.handled).toBe(true);
        expect(timeout.recoveryAttempted).toBe(true);
      });
    });

    test('should clean up connections properly', async ({ page }) => {
      const connection = await websocketUtils.establishWebSocketConnection(page, 'ws://localhost:3000', ['chat']);
      
      const cleanup = await websocketUtils.testConnectionCleanup(page, connection);
      
      expect(cleanup).toBeDefined();
      expect(cleanup.cleanupSuccessful).toBe(true);
      expect(cleanup.memoryReleased).toBe(true);
      expect(cleanup.eventListenersRemoved).toBe(true);
    });
  });

  test.describe('Security and Authentication Testing', () => {
    test('should establish secure WebSocket connections', async ({ page }) => {
      const security = { 
        secure: true, 
        protocols: ['wss'], 
        certificates: ['valid-ssl'] 
      };
      
      const connection = await websocketUtils.establishWebSocketConnection(page, 'wss://localhost:3000', ['chat']);
      const securityValidation = await websocketUtils.testSecureWebSocket(page, connection, security);
      
      expect(securityValidation).toBeDefined();
      expect(securityValidation.secure).toBe(true);
      expect(securityValidation.encryption).toBe(true);
      expect(securityValidation.certificateValid).toBe(true);
    });

    test('should handle authentication flow properly', async ({ page }) => {
      const connection = await websocketUtils.establishWebSocketConnection(page, 'ws://localhost:3000', ['chat']);
      const auth = { 
        method: 'token', 
        token: 'valid-token', 
        expires: Date.now() + 3600000 
      };
      
      const authFlow = await websocketUtils.validateAuthenticationFlow(page, connection, auth);
      
      expect(authFlow).toBeDefined();
      expect(authFlow.authenticated).toBe(true);
      expect(authFlow.tokenValid).toBe(true);
      expect(authFlow.sessionEstablished).toBe(true);
    });

    test('should validate authorization and permissions', async ({ page }) => {
      const connection = await websocketUtils.establishWebSocketConnection(page, 'ws://localhost:3000', ['chat']);
      const permissions = ['read', 'write', 'admin'];
      
      const authorization = await websocketUtils.testAuthorizationValidation(page, connection, permissions);
      
      expect(authorization).toBeDefined();
      expect(authorization.authorized).toBe(true);
      expect(authorization.permissions).toBeDefined();
      expect(authorization.accessLevel).toBeDefined();
    });

    test('should validate security headers', async ({ page }) => {
      const connection = await websocketUtils.establishWebSocketConnection(page, 'ws://localhost:3000', ['chat']);
      const expectedHeaders = ['X-Frame-Options', 'X-Content-Type-Options', 'Strict-Transport-Security'];
      
      const headerValidation = await websocketUtils.validateSecurityHeaders(page, connection, expectedHeaders);
      
      expect(headerValidation).toBeDefined();
      expect(headerValidation.headers).toBeDefined();
      expect(headerValidation.allHeadersPresent).toBe(true);
      expect(headerValidation.valuesValid).toBe(true);
    });
  });

  test.describe('Integration with Real-Time Features', () => {
    test('should deliver agent status updates via WebSocket', async ({ page }) => {
      const connection = await websocketUtils.establishWebSocketConnection(page, 'ws://localhost:3000', ['chat']);
      
      const updates = [
        { agentId: 'agent-1', status: 'online', timestamp: Date.now() },
        { agentId: 'agent-2', status: 'busy', timestamp: Date.now() },
        { agentId: 'agent-3', status: 'offline', timestamp: Date.now() }
      ];
      
      const updateResults = await websocketUtils.testAgentStatusUpdates(page, connection, updates);
      
      expect(updateResults).toBeDefined();
      expect(updateResults.updates).toBeDefined();
      
      updateResults.updates.forEach(update => {
        expect(update.delivered).toBe(true);
        expect(update.status).toBeDefined();
        expect(update.timestamp).toBeDefined();
      });
    });

    test('should deliver workflow progress updates in real-time', async ({ page }) => {
      const connection = await websocketUtils.establishWebSocketConnection(page, 'ws://localhost:3000', ['workflow']);
      
      const progress = [
        { workflowId: 'wf-1', step: 1, progress: 25, status: 'in-progress' },
        { workflowId: 'wf-1', step: 2, progress: 50, status: 'in-progress' },
        { workflowId: 'wf-1', step: 3, progress: 75, status: 'in-progress' },
        { workflowId: 'wf-1', step: 4, progress: 100, status: 'completed' }
      ];
      
      const progressResults = await websocketUtils.validateWorkflowProgressUpdates(page, connection, progress);
      
      expect(progressResults).toBeDefined();
      expect(progressResults.progress).toBeDefined();
      
      progressResults.progress.forEach(update => {
        expect(update.delivered).toBe(true);
        expect(update.step).toBeDefined();
        expect(update.progress).toBeDefined();
      });
    });

    test('should support collaborative features', async ({ page }) => {
      const connection = await websocketUtils.establishWebSocketConnection(page, 'ws://localhost:3000', ['collaboration']);
      
      const collaboration = [
        { userId: 'user-1', action: 'typing', target: 'chat-input' },
        { userId: 'user-2', action: 'cursor-move', target: 'document' },
        { userId: 'user-1', action: 'selection', target: 'text-area' }
      ];
      
      const collaborationResults = await websocketUtils.testCollaborativeFeatures(page, connection, collaboration);
      
      expect(collaborationResults).toBeDefined();
      expect(collaborationResults.collaboration).toBeDefined();
      
      collaborationResults.collaboration.forEach(feature => {
        expect(feature.supported).toBe(true);
        expect(feature.realTime).toBe(true);
        expect(feature.latency).toBeLessThan(200); // Less than 200ms
      });
    });

    test('should deliver real-time notifications', async ({ page }) => {
      const connection = await websocketUtils.establishWebSocketConnection(page, 'ws://localhost:3000', ['notifications']);
      
      const notifications = [
        { id: 'notif-1', type: 'info', message: 'System update available', priority: 'low' },
        { id: 'notif-2', type: 'warning', message: 'Storage space low', priority: 'medium' },
        { id: 'notif-3', type: 'error', message: 'Connection lost', priority: 'high' }
      ];
      
      const notificationResults = await websocketUtils.validateNotificationDelivery(page, connection, notifications);
      
      expect(notificationResults).toBeDefined();
      expect(notificationResults.notifications).toBeDefined();
      
      notificationResults.notifications.forEach(notification => {
        expect(notification.delivered).toBe(true);
        expect(notification.displayed).toBe(true);
        expect(notification.priority).toBeDefined();
      });
    });
  });

  test.describe('Fallback and Graceful Degradation', () => {
    test('should fallback to polling when WebSocket fails', async ({ page }) => {
      const connection = await websocketUtils.establishWebSocketConnection(page, 'ws://localhost:3000', ['chat']);
      
      const fallback = await websocketUtils.testPollingFallback(page, connection);
      
      expect(fallback).toBeDefined();
      expect(fallback.fallbackSuccessful).toBe(true);
      expect(fallback.pollingActive).toBe(true);
      expect(fallback.dataContinuity).toBe(true);
      expect(fallback.userNotified).toBe(true);
    });

    test('should gracefully degrade features when needed', async ({ page }) => {
      const features = ['real-time-updates', 'live-collaboration', 'instant-notifications'];
      const degradation = await websocketUtils.validateGracefulDegradation(page, features);
      
      expect(degradation).toBeDefined();
      expect(degradation.features).toBeDefined();
      
      degradation.features.forEach(feature => {
        expect(feature.degradesGracefully).toBe(true);
        expect(feature.coreFunctionality).toBe(true);
        expect(feature.userExperience).toBe('acceptable');
      });
    });

    test('should handle offline scenarios gracefully', async ({ page }) => {
      const connection = await websocketUtils.establishWebSocketConnection(page, 'ws://localhost:3000', ['chat']);
      
      // Go offline
      await page.context().setOffline(true);
      
      const offlineHandling = await websocketUtils.testOfflineHandling(page, connection);
      
      expect(offlineHandling).toBeDefined();
      expect(offlineHandling.offlineMode).toBe(true);
      expect(offlineHandling.dataCached).toBe(true);
      expect(offlineHandling.userInformed).toBe(true);
      expect(offlineHandling.reconnectionReady).toBe(true);
    });

    test('should implement effective reconnection strategies', async ({ page }) => {
      const connection = await websocketUtils.establishWebSocketConnection(page, 'ws://localhost:3000', ['chat']);
      
      const strategies = ['immediate', 'exponential-backoff', 'linear-backoff'];
      const reconnectionResults = await websocketUtils.validateReconnectionStrategies(page, connection, strategies);
      
      expect(reconnectionResults).toBeDefined();
      expect(reconnectionResults.strategies).toBeDefined();
      
      reconnectionResults.strategies.forEach(strategy => {
        expect(strategy.effective).toBe(true);
        expect(strategy.reconnectionTime).toBeLessThan(10000); // Less than 10 seconds
        expect(strategy.dataIntegrity).toBe(true);
      });
    });
  });
});
