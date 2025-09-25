import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { v4 as uuidv4 } from 'uuid';
import { Server } from 'http';

interface WebSocketClient {
  id: string;
  socket: WebSocket;
  sessionId?: string;
  userId?: string;
  isAuthenticated: boolean;
  lastPing: number;
  projectId?: string;
  boardId?: string;
}

interface AgentStatusUpdate {
  sessionId: string;
  agentId: string;
  status: 'speaking' | 'thinking' | 'listening' | 'idle';
  metadata?: any;
}

interface UserMessage {
  sessionId: string;
  userId: string;
  message: string;
  targetAgentId?: string;
}

interface ActivityEvent {
  sessionId: string;
  activityType: 'tool_used' | 'site_visited' | 'document_read' | 'content_created';
  description: string;
  metadata?: any;
}

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients = new Map<string, WebSocketClient>();
  private sessionRooms = new Map<string, Set<string>>();
  private projectRooms = new Map<string, Set<string>>();
  private boardRooms = new Map<string, Set<string>>();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  initialize(server: Server) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws',
      verifyClient: this.verifyClient.bind(this)
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    this.startHeartbeat();
    
    console.log('WebSocket server initialized');
  }

  private verifyClient(info: { origin: string; secure: boolean; req: IncomingMessage }) {
    // Basic verification - in production, verify JWT token from query params
    return true;
  }

  private handleConnection(socket: WebSocket, request: IncomingMessage) {
    const clientId = uuidv4();
    const client: WebSocketClient = {
      id: clientId,
      socket,
      isAuthenticated: false,
      lastPing: Date.now()
    };

    this.clients.set(clientId, client);
    console.log(`WebSocket client connected: ${clientId}`);

    socket.on('message', (data: Buffer) => {
      this.handleMessage(clientId, data);
    });

    socket.on('close', () => {
      this.handleDisconnection(clientId);
    });

    socket.on('pong', () => {
      const client = this.clients.get(clientId);
      if (client) {
        client.lastPing = Date.now();
      }
    });

    socket.on('error', (error) => {
      console.error(`WebSocket error for client ${clientId}:`, error);
      this.handleDisconnection(clientId);
    });

    // Send connection acknowledgment
    this.sendToClient(clientId, {
      type: 'connection_ack',
      clientId
    });
  }

  private handleMessage(clientId: string, data: Buffer) {
    try {
      const message = JSON.parse(data.toString());
      const client = this.clients.get(clientId);
      
      if (!client) return;

      switch (message.type) {
        case 'auth':
          this.handleAuth(clientId, message);
          break;
        case 'join_session':
          this.handleJoinSession(clientId, message);
          break;
        case 'join_project':
          this.handleJoinProject(clientId, message);
          break;
        case 'leave_project':
          this.handleLeaveProject(clientId, message);
          break;
        case 'join_board':
          this.handleJoinBoard(clientId, message);
          break;
        case 'leave_board':
          this.handleLeaveBoard(clientId, message);
          break;
        case 'user_message':
          this.handleUserMessage(clientId, message);
          break;
        case 'ping':
          this.sendToClient(clientId, { type: 'pong' });
          break;
        default:
          console.warn(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  private handleAuth(clientId: string, message: any) {
    const client = this.clients.get(clientId);
    if (!client) return;

    // In production, verify JWT token here
    // For now, accept any auth with userId
    if (message.token && message.userId) {
      client.isAuthenticated = true;
      client.userId = message.userId;
      
      this.sendToClient(clientId, {
        type: 'auth_success',
        userId: message.userId
      });
    } else {
      this.sendToClient(clientId, {
        type: 'auth_error',
        message: 'Invalid authentication'
      });
    }
  }

  private handleJoinSession(clientId: string, message: any) {
    const client = this.clients.get(clientId);
    if (!client || !client.isAuthenticated) {
      this.sendToClient(clientId, {
        type: 'error',
        message: 'Authentication required'
      });
      return;
    }

    const sessionId = message.sessionId;
    if (!sessionId) {
      this.sendToClient(clientId, {
        type: 'error',
        message: 'Session ID required'
      });
      return;
    }

    // Leave previous session if any
    if (client.sessionId) {
      this.leaveSession(clientId, client.sessionId);
    }

    // Join new session
    client.sessionId = sessionId;
    if (!this.sessionRooms.has(sessionId)) {
      this.sessionRooms.set(sessionId, new Set());
    }
    this.sessionRooms.get(sessionId)!.add(clientId);

    this.sendToClient(clientId, {
      type: 'session_joined',
      sessionId
    });

    // Notify others in the session
    this.broadcastToSession(sessionId, {
      type: 'user_joined',
      userId: client.userId,
      sessionId
    }, clientId);
  }

  private handleJoinProject(clientId: string, message: any) {
    const client = this.clients.get(clientId);
    if (!client || !client.isAuthenticated) {
      this.sendToClient(clientId, {
        type: 'error',
        message: 'Authentication required'
      });
      return;
    }

    const projectId = message.projectId;
    if (!projectId) {
      this.sendToClient(clientId, {
        type: 'error',
        message: 'Project ID required'
      });
      return;
    }

    // Leave previous project if any
    if (client.projectId) {
      this.leaveProject(clientId, client.projectId);
    }

    // Join new project
    client.projectId = projectId;
    if (!this.projectRooms.has(projectId)) {
      this.projectRooms.set(projectId, new Set());
    }
    this.projectRooms.get(projectId)!.add(clientId);

    this.sendToClient(clientId, {
      type: 'project_joined',
      projectId
    });

    // Notify others in the project
    this.broadcastToProject(projectId, {
      type: 'user_joined_project',
      userId: client.userId,
      projectId
    }, clientId);
  }

  private handleLeaveProject(clientId: string, message: any) {
    const client = this.clients.get(clientId);
    if (!client || !client.isAuthenticated) {
      this.sendToClient(clientId, {
        type: 'error',
        message: 'Authentication required'
      });
      return;
    }

    const projectId = message.projectId;
    if (!projectId) {
      this.sendToClient(clientId, {
        type: 'error',
        message: 'Project ID required'
      });
      return;
    }

    if (client.projectId === projectId) {
      this.leaveProject(clientId, projectId);
    }
  }

  private handleJoinBoard(clientId: string, message: any) {
    const client = this.clients.get(clientId);
    if (!client || !client.isAuthenticated) {
      this.sendToClient(clientId, {
        type: 'error',
        message: 'Authentication required'
      });
      return;
    }

    const boardId = message.boardId;
    if (!boardId) {
      this.sendToClient(clientId, {
        type: 'error',
        message: 'Board ID required'
      });
      return;
    }

    // Leave previous board if any
    if (client.boardId) {
      this.leaveBoard(clientId, client.boardId);
    }

    // Join new board
    client.boardId = boardId;
    if (!this.boardRooms.has(boardId)) {
      this.boardRooms.set(boardId, new Set());
    }
    this.boardRooms.get(boardId)!.add(clientId);

    this.sendToClient(clientId, {
      type: 'board_joined',
      boardId
    });

    // Notify others in the board
    this.broadcastToBoard(boardId, {
      type: 'user_joined_board',
      userId: client.userId,
      boardId
    }, clientId);
  }

  private handleLeaveBoard(clientId: string, message: any) {
    const client = this.clients.get(clientId);
    if (!client || !client.isAuthenticated) {
      this.sendToClient(clientId, {
        type: 'error',
        message: 'Authentication required'
      });
      return;
    }

    const boardId = message.boardId;
    if (!boardId) {
      this.sendToClient(clientId, {
        type: 'error',
        message: 'Board ID required'
      });
      return;
    }

    if (client.boardId === boardId) {
      this.leaveBoard(clientId, boardId);
    }
  }

  private handleUserMessage(clientId: string, message: UserMessage) {
    const client = this.clients.get(clientId);
    if (!client || !client.isAuthenticated || !client.sessionId) return;

    // Broadcast user message to session
    this.broadcastToSession(client.sessionId, {
      type: 'user_message',
      userId: client.userId,
      message: message.message,
      targetAgentId: message.targetAgentId,
      timestamp: new Date().toISOString()
    });
  }

  private handleDisconnection(clientId: string) {
    const client = this.clients.get(clientId);
    if (client) {
      if (client.sessionId) {
        this.leaveSession(clientId, client.sessionId);
        
        // Notify others in the session
        if (client.userId) {
          this.broadcastToSession(client.sessionId, {
            type: 'user_left',
            userId: client.userId,
            sessionId: client.sessionId
          });
        }
      }
      if (client.projectId) {
        this.leaveProject(clientId, client.projectId);
        if (client.userId) {
          this.broadcastToProject(client.projectId, {
            type: 'user_left_project',
            userId: client.userId,
            projectId: client.projectId
          }, clientId);
        }
      }
      if (client.boardId) {
        this.leaveBoard(clientId, client.boardId);
        if (client.userId) {
          this.broadcastToBoard(client.boardId, {
            type: 'user_left_board',
            userId: client.userId,
            boardId: client.boardId
          }, clientId);
        }
      }
      this.clients.delete(clientId);
    }
    console.log(`WebSocket client disconnected: ${clientId}`);
  }

  private leaveSession(clientId: string, sessionId: string) {
    const sessionClients = this.sessionRooms.get(sessionId);
    if (sessionClients) {
      sessionClients.delete(clientId);
      if (sessionClients.size === 0) {
        this.sessionRooms.delete(sessionId);
      }
    }
  }

  private sendToClient(clientId: string, message: any) {
    const client = this.clients.get(clientId);
    if (client && client.socket.readyState === WebSocket.OPEN) {
      try {
        client.socket.send(JSON.stringify(message));
      } catch (error) {
        console.error(`Error sending message to client ${clientId}:`, error);
      }
    }
  }

  private broadcastToSession(sessionId: string, message: any, excludeClientId?: string) {
    const sessionClients = this.sessionRooms.get(sessionId);
    if (!sessionClients) return;

    sessionClients.forEach(clientId => {
      if (clientId !== excludeClientId) {
        this.sendToClient(clientId, message);
      }
    });
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      
      this.clients.forEach((client, clientId) => {
        if (now - client.lastPing > 60000) { // 60 seconds timeout
          console.log(`Client ${clientId} timed out`);
          client.socket.terminate();
          this.handleDisconnection(clientId);
        } else if (client.socket.readyState === WebSocket.OPEN) {
          client.socket.ping();
        }
      });
    }, 30000); // Check every 30 seconds
  }

  // Public methods for broadcasting from API routes
  public broadcastAgentStatusUpdate(update: AgentStatusUpdate) {
    this.broadcastToSession(update.sessionId, {
      type: 'agent_status_update',
      ...update,
      timestamp: new Date().toISOString()
    });
  }

  public broadcastAgentMessage(sessionId: string, agentId: string, message: string, metadata?: any) {
    this.broadcastToSession(sessionId, {
      type: 'agent_message',
      sessionId,
      agentId,
      message,
      metadata,
      timestamp: new Date().toISOString()
    });
  }

  public broadcastActivityEvent(event: ActivityEvent) {
    this.broadcastToSession(event.sessionId, {
      type: 'activity_event',
      ...event,
      timestamp: new Date().toISOString()
    });
  }

  public broadcastTaskUpdate(userId: string | undefined, event: string, payload: any) {
    const message = {
      type: 'task_update',
      event,
      payload,
      timestamp: new Date().toISOString()
    };

    if (payload.projectId) {
      this.broadcastToProject(payload.projectId, message);
    } else if (payload.boardId) {
      this.broadcastToBoard(payload.boardId, message);
    } else {
      // Broadcast to all authenticated clients if no specific scope
      this.broadcastToAuthenticatedClients(message);
    }
  }

  public broadcastBoardUpdate(userId: string | undefined, event: string, payload: any) {
    const message = {
      type: 'board_update',
      event,
      payload,
      timestamp: new Date().toISOString()
    };

    if (payload.projectId) {
      this.broadcastToProject(payload.projectId, message);
    } else if (payload.boardId) {
      this.broadcastToBoard(payload.boardId, message);
    } else {
      this.broadcastToAuthenticatedClients(message);
    }
  }

  public broadcastProjectUpdate(userId: string | undefined, event: string, payload: any) {
    const message = {
      type: 'project_update',
      event,
      payload,
      timestamp: new Date().toISOString()
    };

    if (payload.projectId) {
      this.broadcastToProject(payload.projectId, message);
    } else {
      this.broadcastToAuthenticatedClients(message);
    }
  }

  public joinProject(clientId: string, projectId: string) {
    const client = this.clients.get(clientId);
    if (client) {
      client.projectId = projectId;
      
      if (!this.projectRooms.has(projectId)) {
        this.projectRooms.set(projectId, new Set());
      }
      this.projectRooms.get(projectId)!.add(clientId);
      
      console.log(`Client ${clientId} joined project ${projectId}`);
    }
  }

  public leaveProject(clientId: string, projectId: string) {
    const client = this.clients.get(clientId);
    if (client && client.projectId === projectId) {
      client.projectId = undefined;
      this.projectRooms.get(projectId)?.delete(clientId);
      
      if (this.projectRooms.get(projectId)?.size === 0) {
        this.projectRooms.delete(projectId);
      }
      
      console.log(`Client ${clientId} left project ${projectId}`);
    }
  }

  public joinBoard(clientId: string, boardId: string) {
    const client = this.clients.get(clientId);
    if (client) {
      client.boardId = boardId;
      
      if (!this.boardRooms.has(boardId)) {
        this.boardRooms.set(boardId, new Set());
      }
      this.boardRooms.get(boardId)!.add(clientId);
      
      console.log(`Client ${clientId} joined board ${boardId}`);
    }
  }

  public leaveBoard(clientId: string, boardId: string) {
    const client = this.clients.get(clientId);
    if (client && client.boardId === boardId) {
      client.boardId = undefined;
      this.boardRooms.get(boardId)?.delete(clientId);
      
      if (this.boardRooms.get(boardId)?.size === 0) {
        this.boardRooms.delete(boardId);
      }
      
      console.log(`Client ${clientId} left board ${boardId}`);
    }
  }

  private broadcastToProject(projectId: string, message: any, excludeClientId?: string) {
    const projectClients = this.projectRooms.get(projectId);
    if (projectClients) {
      projectClients.forEach(clientId => {
        if (clientId !== excludeClientId) {
          this.sendToClient(clientId, message);
        }
      });
    }
  }

  private broadcastToBoard(boardId: string, message: any, excludeClientId?: string) {
    const boardClients = this.boardRooms.get(boardId);
    if (boardClients) {
      boardClients.forEach(clientId => {
        if (clientId !== excludeClientId) {
          this.sendToClient(clientId, message);
        }
      });
    }
  }

  private broadcastToAuthenticatedClients(message: any) {
    this.clients.forEach((client, clientId) => {
      if (client.isAuthenticated) {
        this.sendToClient(clientId, message);
      }
    });
  }

  public getSessionConnections(sessionId: string): number {
    return this.sessionRooms.get(sessionId)?.size || 0;
  }

  public isHealthy(): boolean {
    return this.wss !== null && this.wss.clients.size >= 0;
  }

  public shutdown() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    if (this.wss) {
      this.wss.close();
    }
    
    this.clients.clear();
    this.sessionRooms.clear();
  }
}

// Export singleton instance
export const webSocketManager = new WebSocketManager();

// Helper functions for use in routes
export function broadcastAgentStatus(sessionId: string, agentId: string, status: AgentStatusUpdate['status'], metadata?: any) {
  webSocketManager.broadcastAgentStatusUpdate({
    sessionId,
    agentId,
    status,
    metadata
  });
}

export function broadcastAgentMessage(sessionId: string, agentId: string, message: string, metadata?: any) {
  webSocketManager.broadcastAgentMessage(sessionId, agentId, message, metadata);
}

export function broadcastActivityEvent(sessionId: string, activityType: ActivityEvent['activityType'], description: string, metadata?: any) {
  webSocketManager.broadcastActivityEvent({
    sessionId,
    activityType,
    description,
    metadata
  });
}

export function broadcastTaskUpdate(userId: string | undefined, event: string, payload: any) {
  webSocketManager.broadcastTaskUpdate(userId, event, payload);
}

export function broadcastBoardUpdate(userId: string | undefined, event: string, payload: any) {
  webSocketManager.broadcastBoardUpdate(userId, event, payload);
}

export function broadcastProjectUpdate(userId: string | undefined, event: string, payload: any) {
  webSocketManager.broadcastProjectUpdate(userId, event, payload);
}

export function getSessionConnections(sessionId: string): number {
  return webSocketManager.getSessionConnections(sessionId);
}