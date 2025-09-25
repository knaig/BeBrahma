'use client';

import React from 'react';
import { SidebarSteps } from './SidebarSteps';
import { TopNav } from './TopNav';
import { ChatFAB, ChatPanel } from './ChatSidePanel';
import ChatInterface from '@/components/ChatInterface';
import { StepWorkspace } from './StepWorkspace';
import { FirecrawlPane } from './FirecrawlPane';
import { DocsPane, type DocEntry } from './DocsPane';
import { ActionsPane, type ActionItem } from './ActionsPane';
import QuadActivityDashboard from '@/components/dashboard/QuadActivityDashboard';
import langgraphClient from '@/lib/langgraphClient';
// Removed StepHeader per request; control stays in sidebar and chat

type TabKey = 'workspace' | 'firecrawl' | 'docs' | 'actions' | 'dashboard' | 'projects' | 'templates';

export function WorkspaceShell({ initialTab }: { initialTab?: TabKey }) {
  const [tab, setTab] = React.useState<TabKey>(initialTab ?? 'workspace');
  const [docs, setDocs] = React.useState<DocEntry[]>([]);
  const [actions, setActions] = React.useState<ActionItem[]>([]);
  const [showChat, setShowChat] = React.useState(false);
  const [unread, setUnread] = React.useState(0);
  const [, forceRender] = React.useState(0);
  const [sessionId, setSessionId] = React.useState<string | null>(null);

  // Poll workflow status for changes
  React.useEffect(() => {
    const pollWorkflowStatus = async () => {
      try {
        // This will be used when we have an active session
        // const status = await langgraphClient.getWorkflowStatus(sessionId);
        // forceRender((n) => n + 1);
      } catch (error) {
        console.warn('Failed to poll workflow status:', error);
      }
    };

    const interval = setInterval(pollWorkflowStatus, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcuts
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod) {
        if (e.key === '1') setTab('workspace');
        if (e.key === '2') setTab('firecrawl');
        if (e.key === '3') setTab('docs');
        if (e.key === '4') setTab('actions');
        if (e.key === '5') setTab('dashboard');
        if (e.key === '6') setTab('projects');
        if (e.key === '7') setTab('templates');
        if (e.key.toLowerCase() === 'j') {
          e.preventDefault();
          document.getElementById('bebrahma-chat')?.classList.toggle('hidden');
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleTabChange = (newTab: string) => {
    if (newTab === 'tracker') {
      setTab('actions');
    } else if (newTab === 'projects') {
      // Navigate to projects page
      window.location.href = '/projects';
      return;
    } else if (newTab === 'templates') {
      // Navigate to templates page
      window.location.href = '/templates';
      return;
    } else {
      setTab(newTab as TabKey);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900">
      {/* Main content left: Chat 2/3 width */}
      <div className="flex-1 flex flex-col relative lg:w-2/3 w-full">
        <TopNav
          activeTab={(tab === 'actions' ? 'tracker' : tab) as any}
          onTabChange={handleTabChange}
        />
        <div className="flex-1 overflow-hidden">
          <ChatInterface
            onNewMessage={() => setUnread((n) => n + (showChat ? 0 : 1))}
            onDecisionPoint={() => setUnread((n) => n + (showChat ? 0 : 1))}
            initialUserMessage={''}
            stepModeOneByOne
            onProceedToNextStep={async () => {
              // Step completion is now handled through the LangGraph workflow
              console.log('Step completion handled by LangGraph workflow');
            }}
            onSessionReady={(id: string) => setSessionId(id)}
          />
        </div>
        {/* Optional FAB remains for notifications on smaller screens */}
        <ChatFAB show={showChat} unread={unread} onToggle={() => { setShowChat((s) => !s); setUnread(0); }} />
      </div>
      {/* Right: 1/3 width workflow widgets with visible steps */}
      <div className="hidden lg:flex lg:flex-col lg:w-1/3 border-l border-gray-200 dark:border-gray-800">
        {tab === 'dashboard' ? (
          <div className="flex-1 overflow-hidden">
            {sessionId && <QuadActivityDashboard sessionId={sessionId} />}
            {!sessionId && (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <p>Activity dashboard will appear here</p>
                  <p className="text-sm">Start a session to see real-time activity</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4">
            <div className="mb-3">
              <SidebarSteps sessionId={sessionId} />
            </div>
            {tab === 'workspace' && (
              <StepWorkspace
                sessionId={sessionId}
                onContinue={async (data) => {
                  // Step data updates are now handled through the LangGraph workflow
                  console.log('Step data updates handled by LangGraph workflow:', data);
                }}
              />
            )}
            {tab === 'docs' && (
              <DocsPane
                sessionId={sessionId}
                entries={docs}
                addEntry={(e) => setDocs(prev => [...prev, { id: `d_${Date.now()}`, createdAt: new Date(), ...e }])}
              />
            )}
            {tab === 'actions' && (
              <ActionsPane
                sessionId={sessionId}
                items={actions}
                addItem={(i) => setActions(prev => [...prev, { id: `a_${Date.now()}`, ...i }])}
                updateItem={(id, patch) => setActions(prev => prev.map(x => x.id === id ? { ...x, ...patch } : x))}
              />
            )}
            {tab === 'firecrawl' && (
              <FirecrawlPane
                sessionId={sessionId}
                onAddDoc={(d) => setDocs(prev => [...prev, { id: `d_${Date.now()}`, createdAt: new Date(), ...d }])}
                onSendToChat={(c) => alert('Sent to chat: ' + c)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}


