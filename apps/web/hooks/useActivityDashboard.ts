import { useEffect, useState, useRef, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';

export interface ActivityEvent {
  id: string;
  type: 'tool_used' | 'site_visited' | 'document_read' | 'content_created';
  description: string;
  timestamp: string;
  metadata?: any;
}

export interface ToolUsage {
  toolName: string;
  callCount: number;
  successRate: number;
  lastUsed: string;
  metadata?: any;
}

export interface SiteVisit {
  url: string;
  title: string;
  visitCount: number;
  lastVisited: string;
  metadata?: any;
}

export interface DocumentRead {
  title: string;
  type: 'note' | 'summary' | 'document';
  content: string;
  timestamp: string;
  metadata?: any;
}

export interface ContentCreated {
  title: string;
  type: 'message' | 'summary' | 'analysis';
  content: string;
  timestamp: string;
  metadata?: any;
}

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseActivityDashboardOptions {
  sessionId: string;
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

export function useActivityDashboard({
  sessionId,
  autoConnect = true,
  reconnectAttempts = 5,
  reconnectDelay = 3000
}: UseActivityDashboardOptions) {
  const { user } = useUser();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Dashboard data
  const [toolsUsed, setToolsUsed] = useState<ToolUsage[]>([]);
  const [sitesBrowsed, setSitesBrowsed] = useState<SiteVisit[]>([]);
  const [documentsRead, setDocumentsRead] = useState<DocumentRead[]>([]);
  const [contentCreated, setContentCreated] = useState<ContentCreated[]>([]);
  const [activityFeed, setActivityFeed] = useState<ActivityEvent[]>([]);
  
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

  // Fetch initial activity data
  const fetchActivityData = useCallback(async () => {
    if (!user || !sessionId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Fetch tool traces
      const toolsResponse = await fetch(`/api/chat/tools/traces/${sessionId}`, {
        headers: {
          'user-id': user.id,
          'Authorization': `Bearer ${await user.getToken()}`
        }
      });
      
      // Fetch memory data
      const memoryResponse = await fetch(`/api/chat/memory/${sessionId}`, {
        headers: {
          'user-id': user.id,
          'Authorization': `Bearer ${await user.getToken()}`
        }
      });
      
      if (toolsResponse.ok) {
        const toolsData = await toolsResponse.json();
        transformAndSetToolsData(toolsData);
      }
      
      if (memoryResponse.ok) {
        const memoryData = await memoryResponse.json();
        transformAndSetMemoryData(memoryData);
      }
      
    } catch (error) {
      console.error('Error fetching activity data:', error);
      setError('Failed to fetch activity data');
    } finally {
      setLoading(false);
    }
  }, [sessionId, user]);

  // Transform tools data from crew service
  const transformAndSetToolsData = useCallback((toolsData: any) => {
    if (!toolsData?.tool_calls) return;
    
    const toolUsageMap = new Map<string, ToolUsage>();
    const siteVisitsMap = new Map<string, SiteVisit>();
    
    toolsData.tool_calls.forEach((call: any) => {
      // Process tool usage
      const toolName = call.tool_name;
      if (toolUsageMap.has(toolName)) {
        const existing = toolUsageMap.get(toolName)!;
        existing.callCount++;
        existing.lastUsed = call.timestamp > existing.lastUsed ? call.timestamp : existing.lastUsed;
        if (call.status === 'success') {
          existing.successRate = ((existing.successRate * (existing.callCount - 1)) + 1) / existing.callCount;
        } else {
          existing.successRate = (existing.successRate * (existing.callCount - 1)) / existing.callCount;
        }
      } else {
        toolUsageMap.set(toolName, {
          toolName,
          callCount: 1,
          successRate: call.status === 'success' ? 1 : 0,
          lastUsed: call.timestamp,
          metadata: call.metadata
        });
      }
      
      // Process site visits from firecrawl tools
      if (toolName.startsWith('firecrawl_') || toolName.includes('browse') || toolName.includes('crawl')) {
        const url = call.metadata?.url || call.result?.url;
        const title = call.metadata?.title || call.result?.title || 'Unknown Page';
        
        if (url) {
          if (siteVisitsMap.has(url)) {
            const existing = siteVisitsMap.get(url)!;
            existing.visitCount++;
            existing.lastVisited = call.timestamp > existing.lastVisited ? call.timestamp : existing.lastVisited;
          } else {
            siteVisitsMap.set(url, {
              url,
              title,
              visitCount: 1,
              lastVisited: call.timestamp,
              metadata: call.metadata
            });
          }
        }
      }
    });
    
    setToolsUsed(Array.from(toolUsageMap.values()).sort((a, b) => 
      new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime()
    ));
    
    setSitesBrowsed(Array.from(siteVisitsMap.values()).sort((a, b) => 
      new Date(b.lastVisited).getTime() - new Date(a.lastVisited).getTime()
    ));
  }, []);

  // Transform memory data from crew service
  const transformAndSetMemoryData = useCallback((memoryData: any) => {
    const documents: DocumentRead[] = [];
    const content: ContentCreated[] = [];
    
    // Process notes as documents read
    if (memoryData?.notes) {
      memoryData.notes.forEach((note: any) => {
        documents.push({
          title: note.title || 'Research Note',
          type: 'note',
          content: note.content,
          timestamp: note.timestamp,
          metadata: note.metadata
        });
      });
    }
    
    // Process summaries as both documents and content
    if (memoryData?.summaries) {
      memoryData.summaries.forEach((summary: any) => {
        documents.push({
          title: summary.title || 'Summary',
          type: 'summary',
          content: summary.content,
          timestamp: summary.timestamp,
          metadata: summary.metadata
        });
        
        content.push({
          title: summary.title || 'Generated Summary',
          type: 'summary',
          content: summary.content,
          timestamp: summary.timestamp,
          metadata: summary.metadata
        });
      });
    }
    
    // Process messages as content created
    if (memoryData?.messages) {
      memoryData.messages.forEach((message: any) => {
        if (message.type === 'agent' && message.content) {
          content.push({
            title: `Agent Response - ${new Date(message.timestamp).toLocaleTimeString()}`,
            type: 'message',
            content: message.content,
            timestamp: message.timestamp,
            metadata: message.metadata
          });
        }
      });
    }
    
    setDocumentsRead(documents.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ));
    
    setContentCreated(content.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ));
  }, []);

  // Connect to WebSocket
  const connect = useCallback(async () => {
    if (!user || socketRef.current?.readyState === WebSocket.OPEN) return;
    
    try {
      setConnectionStatus('connecting');
      setError(null);
      
      const wsUrl = getWebSocketUrl();
      const socket = new WebSocket(wsUrl);
      
      socket.onopen = async () => {
        console.log('Activity Dashboard WebSocket connected');
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
        console.log('Activity Dashboard WebSocket closed:', event.code, event.reason);
        setConnectionStatus('disconnected');
        socketRef.current = null;
        
        // Reconnect if not intentional close
        if (!isIntentionalClose.current && reconnectCountRef.current < reconnectAttempts) {
          reconnectCountRef.current++;
          console.log(`Reconnecting activity dashboard... attempt ${reconnectCountRef.current}`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectDelay);
        }
      };
      
      socket.onerror = (error) => {
        console.error('Activity Dashboard WebSocket error:', error);
        setConnectionStatus('error');
        setError('Connection error occurred');
      };
      
      socketRef.current = socket;
      
    } catch (error) {
      console.error('Error connecting to Activity Dashboard WebSocket:', error);
      setConnectionStatus('error');
      setError('Failed to connect to server');
    }
  }, [user, sessionId, getWebSocketUrl, reconnectAttempts, reconnectDelay]);

  // Handle incoming WebSocket messages
  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case 'connection_ack':
        console.log('Activity Dashboard connection acknowledged');
        break;
        
      case 'auth_success':
        console.log('Activity Dashboard authentication successful');
        break;
        
      case 'auth_error':
        console.error('Activity Dashboard authentication failed:', message.message);
        setError('Authentication failed');
        break;
        
      case 'session_joined':
        console.log('Joined activity session:', message.sessionId);
        fetchActivityData(); // Load initial data after joining session
        break;
        
      case 'activity_event':
        handleActivityEvent(message);
        break;
        
      case 'error':
        console.error('Activity Dashboard WebSocket error:', message.message);
        setError(message.message);
        break;
        
      default:
        console.warn('Unknown Activity Dashboard WebSocket message type:', message.type);
    }
  }, [fetchActivityData]);

  // Handle real-time activity events
  const handleActivityEvent = useCallback((message: any) => {
    const activityEvent: ActivityEvent = {
      id: Date.now().toString(),
      type: message.activityType,
      description: message.description,
      timestamp: message.timestamp || new Date().toISOString(),
      metadata: message.metadata
    };
    
    // Add to activity feed
    setActivityFeed(prev => [activityEvent, ...prev].slice(0, 100)); // Keep last 100 events
    
    // Update relevant sections based on activity type
    switch (message.activityType) {
      case 'tool_used':
        setToolsUsed(prev => {
          const existing = prev.find(tool => tool.toolName === message.metadata?.toolName);
          if (existing) {
            return prev.map(tool => 
              tool.toolName === message.metadata?.toolName
                ? {
                    ...tool,
                    callCount: tool.callCount + 1,
                    lastUsed: activityEvent.timestamp,
                    successRate: message.metadata?.success 
                      ? ((tool.successRate * tool.callCount) + 1) / (tool.callCount + 1)
                      : (tool.successRate * tool.callCount) / (tool.callCount + 1)
                  }
                : tool
            );
          } else {
            return [{
              toolName: message.metadata?.toolName || 'Unknown Tool',
              callCount: 1,
              successRate: message.metadata?.success ? 1 : 0,
              lastUsed: activityEvent.timestamp,
              metadata: message.metadata
            }, ...prev];
          }
        });
        break;
        
      case 'site_visited':
        setSitesBrowsed(prev => {
          const existing = prev.find(site => site.url === message.metadata?.url);
          if (existing) {
            return prev.map(site => 
              site.url === message.metadata?.url
                ? {
                    ...site,
                    visitCount: site.visitCount + 1,
                    lastVisited: activityEvent.timestamp
                  }
                : site
            );
          } else {
            return [{
              url: message.metadata?.url || 'Unknown URL',
              title: message.metadata?.title || 'Unknown Page',
              visitCount: 1,
              lastVisited: activityEvent.timestamp,
              metadata: message.metadata
            }, ...prev];
          }
        });
        break;
        
      case 'document_read':
        setDocumentsRead(prev => [{
          title: message.metadata?.title || 'New Document',
          type: message.metadata?.type || 'document',
          content: message.metadata?.content || message.description,
          timestamp: activityEvent.timestamp,
          metadata: message.metadata
        }, ...prev]);
        break;
        
      case 'content_created':
        setContentCreated(prev => [{
          title: message.metadata?.title || 'New Content',
          type: message.metadata?.type || 'analysis',
          content: message.metadata?.content || message.description,
          timestamp: activityEvent.timestamp,
          metadata: message.metadata
        }, ...prev]);
        break;
    }
  }, []);

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

  // Refresh activity data
  const refreshData = useCallback(() => {
    fetchActivityData();
  }, [fetchActivityData]);

  // Reset connection
  const reconnect = useCallback(() => {
    disconnect();
    isIntentionalClose.current = false;
    reconnectCountRef.current = 0;
    setTimeout(() => connect(), 1000);
  }, [disconnect, connect]);

  // Auto-connect on mount and fetch initial data
  useEffect(() => {
    if (user && sessionId) {
      if (autoConnect) {
        connect();
      }
      fetchActivityData();
    }
    
    return () => {
      disconnect();
    };
  }, [user, sessionId, autoConnect, connect, disconnect, fetchActivityData]);

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
    loading,
    error,
    
    // Dashboard data
    toolsUsed,
    sitesBrowsed,
    documentsRead,
    contentCreated,
    activityFeed,
    
    // Actions
    connect,
    disconnect,
    reconnect,
    refreshData,
    
    // Computed values
    isConnected: connectionStatus === 'connected',
    isConnecting: connectionStatus === 'connecting',
    totalTools: toolsUsed.length,
    totalSites: sitesBrowsed.length,
    totalDocuments: documentsRead.length,
    totalContent: contentCreated.length,
    recentActivity: activityFeed.slice(0, 10)
  };
}

export default useActivityDashboard;