import { useEffect, useState, useRef, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';

export interface AgentPersona {
  id: string;
  role: string;
  name: string;
  title: string;
  department: string;
  avatarUrl?: string;
  colorHex: string;
  speakingStyle: string;
  defaultStatus: 'speaking' | 'thinking' | 'listening' | 'idle';
  personalityTraits: any;
}

export interface Agent {
  id: string;
  sessionId: string;
  agentId: string;
  currentStatus: 'speaking' | 'thinking' | 'listening' | 'idle';
  lastActivity: string;
  metadata?: any;
  persona: AgentPersona;
}

export interface Message {
  id: string;
  type: 'user' | 'agent';
  content: string;
  sender: string;
  timestamp: string;
  agentId?: string;
  metadata?: any;
}

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseMeetingSocketOptions {
  sessionId: string;
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

export function useMeetingSocket({
  sessionId,
  autoConnect = true,
  reconnectAttempts = 5,
  reconnectDelay = 3000
}: UseMeetingSocketOptions) {
  const { user } = useUser();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectCountRef = useRef(0);
  const isIntentionalClose = useRef(false);

  // Get WebSocket URL from environment or default to same host
  const getWebSocketUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = process.env.NEXT_PUBLIC_WS_SERVER_URL || window.location.host;
    return `${protocol}//${host}/ws`;
  }, []);

  // Load initial agents from API
  const loadAgents = useCallback(async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/agents/session/${sessionId}`, {
        headers: {
          'user-id': user.id,
          'Authorization': `Bearer ${await user.getToken()}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAgents(data.agents || []);
      } else {
        console.error('Failed to load agents:', response.statusText);
      }
    } catch (error) {
      console.error('Error loading agents:', error);
    }
  }, [sessionId, user]);

  // Connect to WebSocket
  const connect = useCallback(async () => {
    if (!user || socketRef.current?.readyState === WebSocket.OPEN) return;
    
    try {
      setConnectionStatus('connecting');
      setError(null);
      
      const wsUrl = getWebSocketUrl();
      const socket = new WebSocket(wsUrl);
      
      socket.onopen = async () => {
        console.log('WebSocket connected');
        setConnectionStatus('connected');
        reconnectCountRef.current = 0;
        
        // Authenticate
        const token = await user.getToken();
        socket.send(JSON.stringify({
          type: 'auth',
          token,
          userId: user.id
        }));
        
        // Join session room
        socket.send(JSON.stringify({
          type: 'join_session',
          sessionId
        }));
      };
      
      socket.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      socket.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setConnectionStatus('disconnected');
        socketRef.current = null;
        
        // Reconnect if not intentional close
        if (!isIntentionalClose.current && reconnectCountRef.current < reconnectAttempts) {
          reconnectCountRef.current++;
          console.log(`Reconnecting... attempt ${reconnectCountRef.current}`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectDelay);
        }
      };
      
      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
        setError('Connection error occurred');
      };
      
      socketRef.current = socket;
      
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      setConnectionStatus('error');
      setError('Failed to connect to server');
    }
  }, [user, sessionId, getWebSocketUrl, reconnectAttempts, reconnectDelay]);

  // Handle incoming WebSocket messages
  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case 'connection_ack':
        console.log('Connection acknowledged');
        break;
        
      case 'auth_success':
        console.log('Authentication successful');
        break;
        
      case 'auth_error':
        console.error('Authentication failed:', message.message);
        setError('Authentication failed');
        break;
        
      case 'session_joined':
        console.log('Joined session:', message.sessionId);
        loadAgents(); // Load agents after joining session
        break;
        
      case 'agent_status_update':
        setAgents(prev => prev.map(agent => 
          agent.agentId === message.agentId 
            ? { ...agent, currentStatus: message.status, metadata: message.metadata }
            : agent
        ));
        break;
        
      case 'agent_message':
        const agentMessage: Message = {
          id: Date.now().toString(),
          type: 'agent',
          content: message.message,
          sender: message.agentId,
          timestamp: message.timestamp,
          agentId: message.agentId,
          metadata: message.metadata
        };
        setMessages(prev => [...prev, agentMessage]);
        break;
        
      case 'user_message':
        if (message.userId !== user?.id) { // Don't duplicate our own messages
          const userMessage: Message = {
            id: Date.now().toString(),
            type: 'user',
            content: message.message,
            sender: message.userId,
            timestamp: message.timestamp,
            metadata: message.metadata
          };
          setMessages(prev => [...prev, userMessage]);
        }
        break;
        
      case 'user_joined':
        console.log('User joined session:', message.userId);
        break;
        
      case 'user_left':
        console.log('User left session:', message.userId);
        break;
        
      case 'error':
        console.error('WebSocket error:', message.message);
        setError(message.message);
        break;
        
      default:
        console.warn('Unknown WebSocket message type:', message.type);
    }
  }, [user?.id, loadAgents]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    isIntentionalClose.current = true;
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    
    setConnectionStatus('disconnected');
  }, []);

  // Send user message
  const sendMessage = useCallback((content: string, targetAgentId?: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN && user) {
      const message = {
        type: 'user_message',
        sessionId,
        userId: user.id,
        message: content,
        targetAgentId
      };
      
      socketRef.current.send(JSON.stringify(message));
      
      // Add to local messages immediately
      const userMessage: Message = {
        id: Date.now().toString(),
        type: 'user',
        content,
        sender: user.id,
        timestamp: new Date().toISOString(),
        metadata: { targetAgentId }
      };
      setMessages(prev => [...prev, userMessage]);
    }
  }, [sessionId, user]);

  // Update agent status (usually called from API responses)
  const updateAgentStatus = useCallback(async (agentId: string, status: Agent['currentStatus'], metadata?: any) => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/agents/session/${sessionId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': user.id,
          'Authorization': `Bearer ${await user.getToken()}`
        },
        body: JSON.stringify({
          agentId,
          status,
          metadata
        })
      });
      
      if (!response.ok) {
        console.error('Failed to update agent status:', response.statusText);
      }
    } catch (error) {
      console.error('Error updating agent status:', error);
    }
  }, [sessionId, user]);

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Reset connection
  const reconnect = useCallback(() => {
    disconnect();
    isIntentionalClose.current = false;
    reconnectCountRef.current = 0;
    setTimeout(() => connect(), 1000);
  }, [disconnect, connect]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && user) {
      connect();
    }
    
    return () => {
      disconnect();
    };
  }, [autoConnect, user, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return {
    // Connection state
    connectionStatus,
    error,
    
    // Data
    agents,
    messages,
    
    // Actions
    connect,
    disconnect,
    reconnect,
    sendMessage,
    updateAgentStatus,
    clearMessages,
    
    // Computed values
    isConnected: connectionStatus === 'connected',
    isConnecting: connectionStatus === 'connecting',
    connectedAgents: agents.filter(agent => agent.currentStatus !== 'idle'),
    activeAgents: agents.filter(agent => agent.currentStatus === 'speaking')
  };
}

export default useMeetingSocket;