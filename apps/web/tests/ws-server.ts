import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';

interface WSMessage {
  type: string;
  id?: string;
  content?: any;
  timestamp: string;
  status?: string;
  progress?: number;
  step?: number;
}

class WebSocketTestServer {
  private wss: WebSocketServer;
  private server: any;
  private port: number;
  private connections: Map<string, WebSocket> = new Map();
  private messageCount = 0;

  constructor(port: number = 7071) {
    this.port = port;
    this.server = createServer();
    this.wss = new WebSocketServer({ server: this.server });
    this.setupWebSocketServer();
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws: WebSocket, request: any) => {
      const connectionId = this.generateConnectionId();
      this.connections.set(connectionId, ws);

      console.log(`WebSocket connection established: ${connectionId}`);

      // Send welcome message
      this.sendMessage(ws, {
        type: 'connection',
        id: connectionId,
        content: 'Connected to test WebSocket server',
        timestamp: new Date().toISOString(),
        status: 'connected'
      });

      ws.on('message', (data: Buffer) => {
        try {
          const message: WSMessage = JSON.parse(data.toString());
          this.handleMessage(ws, message, connectionId);
        } catch (error) {
          console.error('Error parsing message:', error);
          this.sendError(ws, 'Invalid message format');
        }
      });

      ws.on('close', () => {
        console.log(`WebSocket connection closed: ${connectionId}`);
        this.connections.delete(connectionId);
      });

      ws.on('error', (error) => {
        console.error(`WebSocket error for ${connectionId}:`, error);
        this.connections.delete(connectionId);
      });
    });
  }

  private handleMessage(ws: WebSocket, message: WSMessage, connectionId: string) {
    console.log(`Received message from ${connectionId}:`, message);

    switch (message.type) {
      case 'ping':
        this.sendMessage(ws, {
          type: 'pong',
          id: message.id,
          content: 'pong',
          timestamp: new Date().toISOString()
        });
        break;

      case 'chat':
        this.sendMessage(ws, {
          type: 'chat-ack',
          id: message.id,
          content: `Message received: ${message.content}`,
          timestamp: new Date().toISOString(),
          status: 'delivered'
        });
        break;

      case 'subscribe':
        if (message.content?.channel === 'agent-status') {
          this.startAgentStatusUpdates(ws, message.content.agentId);
        } else if (message.content?.channel === 'workflow-progress') {
          this.startWorkflowProgressUpdates(ws, message.content.workflowId);
        }
        break;

      case 'unsubscribe':
        // Stop updates for the specified channel
        break;

      case 'echo':
        this.sendMessage(ws, {
          type: 'echo',
          id: message.id,
          content: message.content,
          timestamp: new Date().toISOString()
        });
        break;

      default:
        this.sendMessage(ws, {
          type: 'unknown',
          id: message.id,
          content: `Unknown message type: ${message.type}`,
          timestamp: new Date().toISOString(),
          status: 'error'
        });
    }
  }

  private startAgentStatusUpdates(ws: WebSocket, agentId: string) {
    const statuses = ['idle', 'working', 'completed', 'error'];
    let statusIndex = 0;

    const interval = setInterval(() => {
      if (statusIndex >= statuses.length) {
        clearInterval(interval);
        return;
      }

      this.sendMessage(ws, {
        type: 'agent-status-update',
        id: `status-${this.messageCount++}`,
        content: {
          agentId,
          status: statuses[statusIndex],
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });

      statusIndex++;
    }, 1000);
  }

  private startWorkflowProgressUpdates(ws: WebSocket, workflowId: string) {
    const steps = [
      { step: 1, progress: 25, status: 'in-progress' },
      { step: 2, progress: 50, status: 'in-progress' },
      { step: 3, progress: 75, status: 'in-progress' },
      { step: 4, progress: 100, status: 'completed' }
    ];
    let stepIndex = 0;

    const interval = setInterval(() => {
      if (stepIndex >= steps.length) {
        clearInterval(interval);
        return;
      }

      this.sendMessage(ws, {
        type: 'workflow-progress-update',
        id: `progress-${this.messageCount++}`,
        content: {
          workflowId,
          ...steps[stepIndex],
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });

      stepIndex++;
    }, 1500);
  }

  private sendMessage(ws: WebSocket, message: WSMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private sendError(ws: WebSocket, errorMessage: string) {
    this.sendMessage(ws, {
      type: 'error',
      id: `error-${this.messageCount++}`,
      content: errorMessage,
      timestamp: new Date().toISOString(),
      status: 'error'
    });
  }

  private generateConnectionId(): string {
    return `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  public start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.listen(this.port, () => {
        console.log(`WebSocket test server running on port ${this.port}`);
        console.log(`WebSocket URL: ws://localhost:${this.port}/ws`);
        resolve();
      });

      this.server.on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
          console.error(`Port ${this.port} is already in use`);
        } else {
          console.error('Server error:', error);
        }
        reject(error);
      });
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      this.wss.close(() => {
        this.server.close(() => {
          console.log('WebSocket test server stopped');
          resolve();
        });
      });
    });
  }

  public getConnectionCount(): number {
    return this.connections.size;
  }

  public broadcast(message: WSMessage) {
    this.connections.forEach((ws) => {
      this.sendMessage(ws, message);
    });
  }
}

// Export for use in tests
export { WebSocketTestServer };

// Start server if this file is run directly
if (require.main === module) {
  const server = new WebSocketTestServer();
  server.start().catch(console.error);

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down WebSocket test server...');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\nShutting down WebSocket test server...');
    await server.stop();
    process.exit(0);
  });
}
