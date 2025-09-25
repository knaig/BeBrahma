import React, { useState, useRef, useEffect } from 'react';
import { AgentTabs } from './AgentTabs';
import { DecisionHub } from './DecisionHub';
import { VisualAnalytics } from './VisualAnalytics';
import { MindMap } from './MindMap';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai' | 'agent';
  timestamp: Date;
  agentId?: string;
  agentName?: string;
  agentTitle?: string;
  department?: string;
  type?: 'user_input' | 'agent_contribution' | 'decision_point' | 'user_approval';
  metadata?: {
    tokens?: number;
    cost?: number;
    model?: string;
    dataPoints?: string[];
    source?: string;
    thinkingTime?: number;
    department?: string;
    messages?: any[];
    decisionDocument?: string;
    confidence?: number;
    sampleSize?: number;
    dataQueries?: any[];
    effort?: string;
    strategy?: string;
    questions?: string[];
    nextSteps?: string[];
    scenarios?: string;
  };
}

interface ProgressState {
  phase: 'planning' | 'agent_selection' | 'data_gathering' | 'analysis' | 'decision_making' | 'complete';
  currentPhase: string;
  overallProgress: number;
  agents: Array<{
    agentId: string;
    agentName: string;
    agentTitle: string;
    department: string;
    status: 'waiting' | 'planning' | 'researching' | 'analyzing' | 'thinking' | 'contributing' | 'complete' | 'error';
    currentTask: string;
    progress: number;
    estimatedTime?: number;
    dataSources?: string[];
    insights?: string[];
    error?: string;
  }>;
  estimatedTotalTime: number;
  currentBudget: number;
  totalBudget: number;
}

interface NOCRoomLayoutProps {
  messages: Message[];
  decisionDocument: string;
  progressState: ProgressState;
  onProgressUpdate: (progressState: ProgressState) => void;
}

export function NOCRoomLayout({ 
  messages, 
  decisionDocument, 
  progressState, 
  onProgressUpdate 
}: NOCRoomLayoutProps) {
  const [activeWorkspace, setActiveWorkspace] = useState<'main' | 'decision' | 'analytics' | 'mindmap'>('main');
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const workspaceComponents = {
    main: (
      <div className="flex flex-col h-full">
        {/* Main Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-3xl rounded-lg p-4 ${
                  message.sender === 'user'
                    ? 'bg-purple-500 text-white'
                    : message.sender === 'agent'
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                }`}
              >
                {message.agentName && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-sm">{message.agentName}</span>
                    <span className="text-xs opacity-75">{message.agentTitle}</span>
                    <span className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">
                      {message.department}
                    </span>
                  </div>
                )}
                <div className="prose prose-sm max-w-none">
                  {message.content}
                </div>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
      </div>
    ),
    decision: <DecisionHub decisionDocument={decisionDocument} />,
    analytics: <VisualAnalytics messages={messages} progressState={progressState} />,
    mindmap: <MindMap progressState={progressState} />
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Workspace Navigation */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setActiveWorkspace('main')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeWorkspace === 'main'
                ? 'bg-purple-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            💬 Main Chat
          </button>
          <button
            onClick={() => setActiveWorkspace('decision')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeWorkspace === 'decision'
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            🎯 Decision Hub
          </button>
          <button
            onClick={() => setActiveWorkspace('analytics')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeWorkspace === 'analytics'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            📊 Analytics
          </button>
          <button
            onClick={() => setActiveWorkspace('mindmap')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeWorkspace === 'mindmap'
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            🧠 Mind Map
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex">
        {/* Left Panel: Main Workspace */}
        <div className="flex-1 bg-white dark:bg-gray-900">
          {workspaceComponents[activeWorkspace]}
        </div>

        {/* Right Panel: Agent Workspaces */}
        <div className="w-96 bg-gray-50 dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700">
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              🤖 Agent Workspaces
            </h3>
            
            {/* Agent Selection */}
            <div className="space-y-2 mb-4">
              {progressState.agents.map((agent) => (
                <button
                  key={agent.agentId}
                  onClick={() => setSelectedAgent(agent.agentId)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedAgent === agent.agentId
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {agent.agentName}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {agent.agentTitle}
                      </div>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${
                      agent.status === 'complete' ? 'bg-green-500' :
                      agent.status === 'error' ? 'bg-red-500' :
                      'bg-yellow-500'
                    }`} />
                  </div>
                  <div className="mt-2">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      {agent.currentTask}
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${agent.progress}%` }}
                      />
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Selected Agent Details */}
            {selectedAgent && (
              <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                  Agent Details
                </h4>
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <div>Status: {progressState.agents.find(a => a.agentId === selectedAgent)?.status}</div>
                  <div>Progress: {progressState.agents.find(a => a.agentId === selectedAgent)?.progress}%</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
