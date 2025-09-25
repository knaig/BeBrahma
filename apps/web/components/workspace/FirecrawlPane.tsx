'use client';

import React from 'react';
import { useUser } from '@clerk/nextjs';
import langgraphClient from '@/lib/langgraphClient';

export interface FireTab {
  id: string;
  url: string;
  title?: string;
}

export function FirecrawlPane({
  onAddDoc,
  onSendToChat,
  sessionId,
}: {
  onAddDoc: (entry: { title: string; content: string; stepId?: string; source: 'firecrawl'; link?: string }) => void;
  onSendToChat: (content: string) => void;
  sessionId: string | null;
}) {
  const { user } = useUser();
  const [workflowState, setWorkflowState] = React.useState<any>(null);
  const [wsConnection, setWsConnection] = React.useState<WebSocket | null>(null);

  // Poll workflow status for step information
  React.useEffect(() => {
    if (!sessionId) return;
    
    const pollStatus = async () => {
      try {
        const status = await langgraphClient.getWorkflowStatus(sessionId);
        setWorkflowState(status);
      } catch (error) {
        console.warn('Failed to get workflow status:', error);
      }
    };
    
    pollStatus();
    const interval = setInterval(pollStatus, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [sessionId]);

  const steps = workflowState ? [{ id: workflowState.stage, name: workflowState.stage }] : [];
  const current = workflowState ? { id: workflowState.stage, name: workflowState.stage } : null;

  const [tabs, setTabs] = React.useState<FireTab[]>([{ id: `t_${Date.now()}`, url: 'https://bebrahma.ai', title: 'BeBrahma' }]);
  const [activeId, setActiveId] = React.useState<string>(tabs[0].id);
  const [newUrl, setNewUrl] = React.useState('');
  const active = tabs.find(t => t.id === activeId) || tabs[0];

  // WebSocket connection for activity tracking
  React.useEffect(() => {
    if (!user || !sessionId) return;

    const connectWS = async () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = process.env.NEXT_PUBLIC_WS_SERVER_URL || window.location.host;
        const wsUrl = `${protocol}//${host}/ws`;
        
        const socket = new WebSocket(wsUrl);
        
        socket.onopen = async () => {
          console.log('FirecrawlPane WebSocket connected');
          
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
        
        socket.onerror = (error) => {
          console.error('FirecrawlPane WebSocket error:', error);
        };
        
        socket.onclose = () => {
          console.log('FirecrawlPane WebSocket closed');
          setWsConnection(null);
        };
        
        setWsConnection(socket);
      } catch (error) {
        console.error('Failed to connect FirecrawlPane WebSocket:', error);
      }
    };

    connectWS();

    return () => {
      if (wsConnection) {
        wsConnection.close();
        setWsConnection(null);
      }
    };
  }, [user, sessionId]);

  // Track activity via API
  const trackActivity = React.useCallback(async (activityType: string, description: string, metadata: any) => {
    if (!sessionId || !user) return;

    try {
      await fetch('/api/activity/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': user.id,
          'Authorization': `Bearer ${await user.getToken()}`
        },
        body: JSON.stringify({
          sessionId,
          activityType,
          description,
          metadata
        })
      });
    } catch (error) {
      console.error('Failed to track activity:', error);
    }
  }, [sessionId, user]);

  const addTab = () => {
    const url = newUrl.trim();
    if (!url) return;
    const id = `t_${Date.now()}`;
    
    // Extract title from URL for better display
    let title = url;
    try {
      const urlObj = new URL(url);
      title = urlObj.hostname;
    } catch (e) {
      title = url.substring(0, 30) + (url.length > 30 ? '...' : '');
    }
    
    const newTab = { id, url, title };
    setTabs(prev => [...prev, newTab]);
    setActiveId(id);
    setNewUrl('');
    
    // Track site visit activity
    trackActivity('site_visited', `Opened new tab: ${title}`, {
      url,
      title,
      tabId: id,
      action: 'tab_opened'
    });
  };

  const closeTab = (id: string) => {
    const closingTab = tabs.find(t => t.id === id);
    setTabs(prev => {
      const idx = prev.findIndex(t => t.id === id);
      const next = prev.filter(t => t.id !== id);
      if (activeId === id && next.length) setActiveId(next[Math.max(0, idx - 1)].id);
      return next;
    });
    
    // Track tab close activity
    if (closingTab) {
      trackActivity('site_visited', `Closed tab: ${closingTab.title || closingTab.url}`, {
        url: closingTab.url,
        title: closingTab.title,
        tabId: id,
        action: 'tab_closed'
      });
    }
  };

  const annotateToDocs = () => {
    const stepId = current?.id;
    onAddDoc({
      title: `Research note: ${active?.title || active?.url}`,
      content: `Source: ${active?.url}`,
      stepId,
      source: 'firecrawl',
      link: active?.url,
    });
    
    // Track document annotation activity
    trackActivity('document_read', `Annotated page: ${active?.title || active?.url}`, {
      url: active?.url,
      title: active?.title,
      stepId,
      action: 'annotated_to_docs'
    });
  };

  const sendToChat = () => {
    onSendToChat(`Please review this page and summarize key insights: ${active?.url}`);
    
    // Track send to chat activity
    trackActivity('content_created', `Sent page to chat: ${active?.title || active?.url}`, {
      url: active?.url,
      title: active?.title,
      action: 'sent_to_chat'
    });
  };

  // Track tab switching
  const handleTabSwitch = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab && tabId !== activeId) {
      setActiveId(tabId);
      
      // Track tab switch activity
      trackActivity('site_visited', `Switched to tab: ${tab.title || tab.url}`, {
        url: tab.url,
        title: tab.title,
        tabId: tabId,
        action: 'tab_switched'
      });
    }
  };

  return (
    <div className="h-full bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-3 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <input
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addTab(); }}
          placeholder="Enter URL and press Enter"
          className="flex-1 px-3 py-2 rounded border dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
        />
        <button onClick={addTab} className="px-3 py-2 rounded bg-blue-600 text-white text-sm">Add</button>
        <div className="ml-auto flex items-center gap-2">
          <select className="px-2 py-1 rounded border text-sm dark:border-gray-700 bg-white dark:bg-gray-900">
            {steps.map((s) => (
              <option key={s.id} value={s.id} selected={s.id === current?.id}>{s.name}</option>
            ))}
          </select>
          <button onClick={annotateToDocs} className="px-3 py-2 rounded border text-sm">Annotate</button>
          <button onClick={sendToChat} className="px-3 py-2 rounded bg-indigo-600 text-white text-sm">Send to chat</button>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto">
        {tabs.map(t => (
          <div key={t.id} className={`flex items-center gap-2 px-2 py-1 rounded border text-xs cursor-pointer ${activeId === t.id ? 'bg-gray-100 dark:bg-gray-900 border-gray-300 dark:border-gray-700' : 'border-transparent hover:border-gray-300'}`} onClick={() => handleTabSwitch(t.id)}>
            <span className="max-w-[180px] truncate">{t.title || t.url}</span>
            <button onClick={(e) => { e.stopPropagation(); closeTab(t.id); }} className="text-gray-500 hover:text-gray-800">×</button>
          </div>
        ))}
        
        {/* Activity indicator */}
        {wsConnection && (
          <div className="ml-2 flex items-center gap-1 text-xs text-green-600">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Activity tracking</span>
          </div>
        )}
      </div>

      <div className="flex-1">
        {active && (
          <iframe key={active.id} src={active.url} className="w-full h-[70vh] rounded border dark:border-gray-700" />
        )}
      </div>
    </div>
  );
}


