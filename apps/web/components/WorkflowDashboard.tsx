
'use client';

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ResearchPanel } from '@/components/research/ResearchPanel';
import { ResearchHistoryDrawer } from '@/components/research/ResearchHistoryDrawer';
import langgraphClient from '@/lib/langgraphClient';
import type { WorkflowState } from '@/lib/langgraphClient';
import { workflowController } from '@/lib/workflowController';
import { agentOrchestrator } from '@/lib/agentOrchestrator';

// Legacy types for compatibility
interface WorkflowStep {
  id: string;
  name: string;
  status: string;
}

interface Agent {
  id: string;
  name: string;
  status: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  currentStep: string;
  progress: number;
}

export function WorkflowDashboard() {
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [clientTimestamp, setClientTimestamp] = useState<string>('');
  const [workflowState, setWorkflowState] = useState<WorkflowState | null>(null);
  const [currentStep, setCurrentStep] = useState<WorkflowStep | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isConversationActive, setIsConversationActive] = useState(false);
  const [conversationMessages, setConversationMessages] = useState<any[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [visibleMessageCount, setVisibleMessageCount] = useState(0);
  const [isDark, setIsDark] = useState(false);
  const [showDecisionLog, setShowDecisionLog] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'simple' | 'advanced'>('simple');
  const [exportStatus, setExportStatus] = useState<string>('');
  const [openProjectConfig, setOpenProjectConfig] = useState<{ baseUrl: string; apiToken: string; projectId: string }>({ baseUrl: '', apiToken: '', projectId: '' });
  const [researchMode, setResearchMode] = useState<'off' | 'conservative' | 'standard' | 'aggressive'>('standard');
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const isDev = process.env.NODE_ENV !== 'production';
  const messageUpdateIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = React.useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = React.useRef<HTMLDivElement | null>(null);
  const problemInputRef = React.useRef<HTMLTextAreaElement | null>(null);
  const lastMessageCountRef = React.useRef<number>(0);
  // Preview items via context
  const previewCtx = (() => {
    try {
      const { PreviewContext } = require('@/lib/research/PreviewContext');
      return (React.useContext(PreviewContext as any) as unknown) as { items: any[]; setItems: (items: any[]) => void };
    } catch {
      return { items: [], setItems: () => { } } as any;
    }
  })();

  // Auto-scroll to newest visible message
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      try {
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      } catch { }
    }
  }, [visibleMessageCount, conversationMessages.length]);

  // Session ID for LangGraph client
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  // Poll workflow status using LangGraph client
  useEffect(() => {
    const pollWorkflowStatus = async () => {
      try {
        if (activeProject) {
          const status = await langgraphClient.getWorkflowStatus(sessionId);
          setWorkflowState(status);
          setCurrentStep(status.stage ? { id: status.stage, name: status.stage, status: status.stageStatus || 'active' } : null);
          // Mock agents for compatibility
          setAgents([
            { id: 'agent1', name: 'Business Analyst', status: 'active' },
            { id: 'agent2', name: 'Market Researcher', status: 'active' },
            { id: 'agent3', name: 'Technical Lead', status: 'active' }
          ]);
        }
      } catch (error) {
        console.warn('Failed to poll workflow status:', error);
      }
    };

    if (activeProject) {
      pollWorkflowStatus();
      const interval = setInterval(pollWorkflowStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [activeProject, sessionId]);

  // Debug: Monitor activeProject changes
  useEffect(() => {
    console.log('WorkflowDashboard: activeProject changed:', activeProject);
  }, [activeProject]);

  // Debug: Component mount
  useEffect(() => {
    console.log('WorkflowDashboard: Component mounted');
    // Set timestamp only on client side to avoid hydration mismatch
    setClientTimestamp(Date.now().toString());

    // Subscribe to workflow state changes
    const unsubscribe = workflowController.subscribe((state) => {
      setWorkflowState(state);
      setCurrentStep(workflowController.getCurrentStep() || null);
      setAgents(workflowController.getAllAgents());

      // Don't automatically set conversation active - only when actual conversation starts
      // setIsConversationActive(state.conversationStatus === 'active');
    });

    // Initialize with current state
    setWorkflowState(workflowController.getCurrentState());
    setCurrentStep(workflowController.getCurrentStep() || null);
    setAgents(workflowController.getAllAgents());

    return () => {
      unsubscribe();
      // Clear any existing message update intervals
      if (messageUpdateIntervalRef.current) {
        clearInterval(messageUpdateIntervalRef.current);
        messageUpdateIntervalRef.current = null;
      }
    };
  }, []);

  const createNewProject = () => {
    try {
      console.log('WorkflowDashboard: createNewProject called');

      // Reset conversation state
      setIsConversationActive(false);
      setConversationMessages([]);
      setVisibleMessageCount(0);
      setUserInput('');

      const newProject: Project = {
        id: `project_${Date.now()}`,
        name: 'New Startup Project',
        description: 'AI-powered startup development project',
        createdAt: new Date(),
        currentStep: '',
        progress: 0
      };

      setActiveProject(newProject);

      // Start the workflow
      workflowController.startStep('PROBLEM_CAPTURE');

      console.log('WorkflowDashboard: New project created and workflow started');
    } catch (error) {
      console.error('Error creating new project:', error);
    }
  };

  const startConversation = async () => {
    try {
      console.log('🔍 DEBUG: startConversation called');

      // Prevent multiple simultaneous calls
      if (isConversationActive) {
        console.log('🔍 DEBUG: Conversation already active, ignoring call');
        return;
      }

      // Get current step directly from workflow controller to avoid race conditions
      const activeStep = workflowController.getCurrentStep();
      console.log('🔍 DEBUG: activeStep from workflow controller:', activeStep);

      if (!activeStep) {
        console.error('No active step found. Please start a project first.');
        return;
      }
      console.log('Starting conversation for step:', activeStep.id);

      try {
        // Get user input first
        const problemInput = userInput.trim();

        // Don't start conversation if no user input
        if (!problemInput) {
          console.log('No user input provided, not starting conversation');
          try { problemInputRef.current?.focus(); } catch { }
          return;
        }

        console.log('🔍 DEBUG: About to call startConversationForStep for step:', activeStep.id);
        const flow = agentOrchestrator.startConversationForStep(activeStep.id, problemInput);
        console.log('🔍 DEBUG: Flow returned from startConversationForStep:', flow);
        console.log('🔍 DEBUG: Flow messages count:', flow?.messages?.length || 0);

        // Mark state active in workflow controller for UI consistency
        try { workflowController.resumeConversation(); } catch { }
        setIsConversationActive(true);

        // Immediately release the first pending message (system intro)
        const firstMsg = agentOrchestrator.releaseNextMessage(activeStep.id);
        if (firstMsg) {
          setConversationMessages([firstMsg]);
          setVisibleMessageCount(1);
          lastMessageCountRef.current = 1;
        }
        // Pre-buffer a few next messages to avoid stall
        try {
          for (let i = 0; i < 3; i++) {
            if (!agentOrchestrator.hasNext(activeStep.id)) break;
            const released = agentOrchestrator.releaseNextMessage(activeStep.id);
            if (!released) break;
          }
          const after = agentOrchestrator.getConversationFlow(activeStep.id);
          if (after) {
            setConversationMessages([...after.messages]);
            setVisibleMessageCount(after.messages.length);
            lastMessageCountRef.current = after.messages.length;
          }
        } catch { }

        // Set up a timer to update conversation messages
        messageUpdateIntervalRef.current = setInterval(() => {
          try {
            const updatedFlow = agentOrchestrator.getConversationFlow(activeStep.id);
            if (updatedFlow) {
              // Auto-generate up to N messages per tick to advance phases quickly
              try {
                let advanced = false;
                for (let i = 0; i < 5; i++) {
                  if (!agentOrchestrator.hasNext(activeStep.id)) break;
                  const released = agentOrchestrator.releaseNextMessage(activeStep.id);
                  if (!released) break;
                  advanced = true;
                }
                const after = agentOrchestrator.getConversationFlow(activeStep.id) || updatedFlow;
                const count = after.messages.length;
                if (advanced || count !== lastMessageCountRef.current) {
                  setConversationMessages([...after.messages]);
                  setVisibleMessageCount(count);
                  lastMessageCountRef.current = count;
                  console.log('Flow phase/status:', (after as any).phase, after.status, 'msgs:', count);
                }
              } catch (e) {
                console.warn('Auto-advance failed:', e);
              }
            }

            // Stop updating if conversation is complete or waiting approval
            if (updatedFlow?.status === 'complete' || updatedFlow?.status === 'waiting_approval') {
              try { workflowController.pauseConversation(); } catch { }
              setIsConversationActive(false);
              if (messageUpdateIntervalRef.current) {
                clearInterval(messageUpdateIntervalRef.current);
                messageUpdateIntervalRef.current = null;
              }
            }
          } catch (intervalError) {
            console.error('Error in message update interval:', intervalError);
            // Clear the interval on error to prevent infinite errors
            if (messageUpdateIntervalRef.current) {
              clearInterval(messageUpdateIntervalRef.current);
              messageUpdateIntervalRef.current = null;
            }
          }
        }, 500); // Update every 500ms for more responsive UI

        console.log('Conversation flow started:', flow);

        // Verify the flow was stored properly
        const storedFlow = agentOrchestrator.getConversationFlow(activeStep.id);
        console.log('🔍 DEBUG: Stored flow retrieved:', storedFlow);
        console.log('🔍 DEBUG: Stored flow messages count:', storedFlow?.messages?.length || 0);

      } catch (conversationError) {
        console.error('Error starting conversation:', conversationError);
        setIsConversationActive(false);
        throw conversationError; // Re-throw to be caught by outer try-catch
      }
    } catch (error) {
      console.error('Error in startConversation:', error);
      setIsConversationActive(false);
      // Show user-friendly error message
      alert('Failed to start conversation. Please try again.');
    }
  };

  const pauseConversation = () => {
    if (!currentStep) return;

    try {
      agentOrchestrator.pauseConversation(currentStep.id);
      setIsConversationActive(false);
      console.log('Conversation paused');
    } catch (error) {
      console.error('Error pausing conversation:', error);
    }
  };

  const resumeConversation = () => {
    if (!currentStep) return;

    try {
      agentOrchestrator.resumeConversation(currentStep.id);
      setIsConversationActive(true);
      console.log('Conversation resumed');
    } catch (error) {
      console.error('Error resuming conversation:', error);
    }
  };

  const completeCurrentStep = () => {
    if (!currentStep) return;

    try {
      if (workflowController.canCompleteStep(currentStep.id)) {
        workflowController.completeStep(currentStep.id);
        console.log('Step completed:', currentStep.id);
      } else {
        console.log('Step cannot be completed yet');
      }
    } catch (error) {
      console.error('Error completing step:', error);
    }
  };

  const approveCurrentStep = () => {
    if (!currentStep) return;

    try {
      workflowController.approveStep(currentStep.id);
      console.log('Step approved:', currentStep.id);
    } catch (error) {
      console.error('Error approving step:', error);
    }
  };

  const moveToNextStep = () => {
    try {
      if (workflowController.moveToNextStep()) {
        console.log('Moved to next step');
      } else {
        console.log('Cannot move to next step');
      }
    } catch (error) {
      console.error('Error moving to next step:', error);
    }
  };

  const resetWorkflow = () => {
    try {
      workflowController.resetWorkflow();
      setActiveProject(null);
      console.log('Workflow reset');
    } catch (error) {
      console.error('Error resetting workflow:', error);
    }
  };

  const sendUserMessage = async () => {
    if (!userInput.trim() || !currentStep) return;

    try {
      setIsSending(true);
      // Add user message to conversation
      const userMessage = {
        id: `user-${Date.now()}`,
        agentId: 'user',
        content: userInput.trim(),
        timestamp: new Date(),
        type: 'question' as const,
        metadata: {
          confidence: 1.0,
          respondingTo: 'user-input'
        }
      };

      // Add to local state immediately
      setConversationMessages(prev => [...prev, userMessage]);
      setVisibleMessageCount(prev => Math.min(prev + 1, conversationMessages.length + 1));

      // Send to agent orchestrator for processing
      const response = await agentOrchestrator.processUserInput(currentStep.id, userInput.trim());

      // Clear input
      setUserInput('');
      setIsSending(false);

      console.log('User message sent, agent response:', response);
    } catch (error) {
      console.error('Error sending user message:', error);
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendUserMessage();
    }
  };

  const getProgress = () => {
    return workflowController.getProgress();
  };

  const getActiveAgents = () => {
    if (!currentStep) return [];
    return workflowController.getAgentsForStep(currentStep.id);
  };

  const getStepStatus = (stepId: string) => {
    const step = workflowController.getAllSteps().find(s => s.id === stepId);
    return step?.status || 'pending';
  };

  const getStepStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-gray-400';
      case 'active': return 'text-blue-500';
      case 'completed': return 'text-yellow-500';
      case 'approved': return 'text-green-500';
      default: return 'text-gray-400';
    }
  };

  const getStepStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'active': return '🔄';
      case 'completed': return '✅';
      case 'approved': return '🎯';
      default: return '⏳';
    }
  };

  // Primary action selector – single CTA based on state
  const getPrimaryAction = () => {
    const step = workflowController.getCurrentStep();
    if (!step) return { label: 'Start Project', disabled: !!activeProject, onClick: createNewProject };
    if (!isConversationActive) {
      return { label: 'Start', disabled: !userInput.trim(), onClick: startConversation };
    }
    if (agentOrchestrator.hasNext(step.id)) {
      return {
        label: 'Next message',
        disabled: false,
        onClick: () => {
          const activeStepLocal = workflowController.getCurrentStep();
          if (!activeStepLocal) return;
          const released = agentOrchestrator.releaseNextMessage(activeStepLocal.id);
          if (released) {
            setConversationMessages(prev => [...prev, released]);
            setVisibleMessageCount(prev => prev + 1);
          } else {
            setVisibleMessageCount(prev => Math.min(prev + 1, conversationMessages.length));
          }
        }
      };
    }
    if (step.status === 'completed') {
      return { label: 'Approve Step', disabled: false, onClick: approveCurrentStep };
    }
    if (step.status === 'approved') {
      return { label: 'Next Step', disabled: false, onClick: moveToNextStep };
    }
    if (workflowController.canCompleteStep(step.id)) {
      return { label: 'Complete Step', disabled: false, onClick: completeCurrentStep };
    }
    return { label: 'Guide Agents', disabled: false, onClick: () => messagesContainerRef.current?.scrollIntoView({ behavior: 'smooth' }) };
  };

  return (
    <div className={`min-h-screen p-6 ${isDark ? 'bg-gray-900 text-gray-100' : 'bg-gradient-to-br from-blue-50 to-indigo-100 text-gray-900'}`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className={`text-4xl font-bold mb-4 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
            🚀 BeBrahma - AI Co-Founder Workflow
          </h1>
          <p className={`text-xl ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            Your AI Co-Founder is ready to help you build your startup from idea to execution.
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              onClick={() => setIsDark(d => !d)}
              className="px-4 py-2 rounded-lg border border-gray-300 hover:border-gray-400 transition-colors"
            >
              {isDark ? '🌞 Light Mode' : '🌙 Dark Mode'}
            </button>
            <button
              onClick={() => setLayoutMode(m => (m === 'simple' ? 'advanced' : 'simple'))}
              className="px-4 py-2 rounded-lg border border-gray-300 hover:border-gray-400 transition-colors"
              title="Toggle layout complexity"
            >
              {layoutMode === 'simple' ? '🔧 Advanced View' : '👌 Simple View'}
            </button>
          </div>
        </div>

        {/* Debug Info (advanced only) */}
        {layoutMode === 'advanced' && (
          <div className={`${isDark ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'} rounded-lg p-4 mb-6 shadow-sm`}>
            <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Debug Info:</h3>
            <p>activeProject: {activeProject ? activeProject.name : 'NULL'}</p>
            <p>Timestamp: {clientTimestamp}</p>
            <p>Component Rendered: ✅</p>
            <p>React Working: ✅</p>
          </div>
        )}



        {/* Active Project */}
        {activeProject && (
          <div className="space-y-6">
            {/* Project Header */}
            <div className={`${isDark ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'} rounded-lg p-6 shadow-sm`}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">
                  {activeProject.name}
                </h2>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Progress</p>
                  <p className="text-2xl font-bold text-blue-600">{getProgress()}%</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${getProgress()}%` }}
                ></div>
              </div>

              {/* Current Step Info */}
              {currentStep && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">
                    Current Step: {currentStep.name}
                  </h3>
                  <p className="text-blue-700 mb-3">{currentStep.description}</p>
                  <div className="flex items-center gap-4">
                    <span className={`text-sm font-medium ${getStepStatusColor(currentStep.status)}`}>
                      {getStepStatusIcon(currentStep.status)} {currentStep.status}
                    </span>
                    <span className="text-sm text-gray-600">
                      Estimated Duration: {currentStep.estimatedDuration} minutes
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Workflow Steps */}
            <div className={`${isDark ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'} rounded-lg p-6 shadow-sm relative`}>
              <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Workflow Steps</h3>
              <button
                onClick={() => setShowDecisionLog(!showDecisionLog)}
                className="absolute top-4 right-4 text-sm px-3 py-1 rounded border border-gray-300 hover:border-gray-400"
              >
                {showDecisionLog ? 'Hide Decision Log' : 'Show Decision Log'}
              </button>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {workflowController.getAllSteps().map((step) => (
                  <div
                    key={step.id}
                    className={`p-4 rounded-lg border-2 transition-all ${isDark
                      ? (step.id === currentStep?.id ? 'border-blue-400 bg-gray-700' : 'border-gray-700 bg-gray-800')
                      : (step.id === currentStep?.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50')
                      }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-lg ${getStepStatusColor(step.status)}`}>
                        {getStepStatusIcon(step.status)}
                      </span>
                      <h4 className="font-semibold text-gray-900">{step.name}</h4>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{step.description}</p>
                    <div className="text-xs text-gray-500">
                      Duration: {step.estimatedDuration} min
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Agents */}
            {currentStep && (
              <div className={`${isDark ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'} rounded-lg p-6 shadow-sm`}>
                <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Active Agents</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getActiveAgents().map((agent) => (
                    <div
                      key={agent.id}
                      className={`p-4 rounded-lg border ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{agent.avatar}</span>
                        <div>
                          <h4 className="font-semibold text-gray-900">{agent.name}</h4>
                          <p className="text-sm text-gray-600">{agent.title}</p>
                        </div>
                        <ResearchHistoryDrawer open={showHistory} onClose={() => setShowHistory(false)} />

                        {/* Decision Log Sidebar (collapsible on large screens) */}
                        {showDecisionLog && (
                          <div className={`hidden lg:block fixed top-20 right-6 w-96 max-h-[70vh] overflow-y-auto rounded-lg border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-lg p-4`}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="font-semibold">Decision Log</div>
                              <button onClick={() => setShowDecisionLog(false)} className="text-xs text-gray-500 hover:text-gray-700">Close</button>
                            </div>
                            {conversationMessages
                              .filter((m: any) => m.type === 'consensus')
                              .slice(-5)
                              .map((m: any, i: number) => (
                                <div key={i} className="mb-3 p-3 rounded border">
                                  <div className="text-sm whitespace-pre-wrap">{m.content}</div>
                                  {Array.isArray(m.metadata?.citations) && m.metadata?.citations?.length > 0 && (
                                    <div className="mt-2 text-xs">
                                      <div className="font-semibold mb-1">Sources</div>
                                      <ul className="list-disc ml-4 space-y-1">
                                        {m.metadata.citations.map((c: any, j: number) => (
                                          <li key={j} className="truncate">
                                            {c.url ? (
                                              <a href={c.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{c.source}</a>
                                            ) : (
                                              <span>{c.source}</span>
                                            )}
                                            {c.snippet ? <span className="text-gray-500"> – {c.snippet}</span> : null}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {Array.isArray(m.metadata?.actions) && m.metadata?.actions?.length > 0 && (
                                    <div className="mt-2 text-xs">
                                      <div className="font-semibold mb-1">Actions</div>
                                      <ul className="list-disc ml-4 space-y-1">
                                        {m.metadata.actions.map((a: any, k: number) => (
                                          <li key={k}>
                                            <span className="font-medium">{a.title}</span>
                                            {a.priority ? <span className="ml-2 px-1.5 py-0.5 rounded bg-gray-100 border text-gray-700">{a.priority}</span> : null}
                                            {a.estimate ? <span className="ml-2 text-gray-500">({a.estimate})</span> : null}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mb-2">{agent.personality}</p>
                      <div className="text-xs text-gray-600">
                        Expertise: {agent.expertise.slice(0, 2).join(', ')}
                        {agent.expertise.length > 2 && '...'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Live Conversation Display */}
            {isConversationActive && currentStep && conversationMessages.length > 0 && (
              <div className={`rounded-lg p-6 shadow-sm ${isDark ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'}`}>
                <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>💬 Live Agent Conversation</h3>

                {/* User Input Area */}
                <div className="mb-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask agents a question or provide input..."
                      className={`flex-1 px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isDark ? 'bg-gray-900 border border-gray-700 text-gray-100 placeholder-gray-400' : 'border border-gray-300'}`}
                    />
                    <button
                      onClick={sendUserMessage}
                      disabled={!userInput.trim() || isSending}
                      className={`px-4 py-2 rounded-lg transition-colors disabled:cursor-not-allowed text-white ${isDark ? 'bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600' : 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400'}`}
                    >
                      {isSending ? 'Sending…' : '💬 Send'}
                    </button>
                  </div>
                  <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    You can ask questions, provide feedback, or guide the conversation
                  </p>
                </div>

                <div ref={messagesContainerRef} className={`rounded-lg p-4 min-h-[200px] border max-h-[400px] overflow-y-auto ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                  {conversationMessages.length > 0 ? (
                    <div className="space-y-3">
                      {conversationMessages.slice(0, visibleMessageCount).map((message, index) => {
                        // Handle system messages differently
                        if (message.agentId === 'system') {
                          return (
                            <div key={message.id || index} className={`p-4 rounded-lg mb-3 ${isDark ? 'bg-blue-900 border-blue-700' : 'bg-blue-50 border-blue-200'} border`}>
                              <div className={`text-sm prose prose-sm max-w-none ${isDark ? 'prose-invert' : ''}`}>
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                              </div>
                            </div>
                          );
                        }

                        // Handle thinking messages
                        if (message.metadata?.valueTag === 'thinking') {
                          return (
                            <div key={message.id || index} className={`text-center italic ${isDark ? 'text-gray-400' : 'text-gray-500'} text-sm py-2`}>
                              {message.content}
                            </div>
                          );
                        }

                        const agent = agents.find(a => a.id === message.agentId) ||
                          (message.agentId === 'user' ? { name: 'You', title: 'User', avatar: '👤' } : null);

                        return (
                          <div key={message.id || index} className={`flex gap-3 p-3 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                            <div className="flex-shrink-0">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${message.agentId === 'user' ? 'bg-green-100' : 'bg-blue-100'
                                }`}>
                                {agent?.avatar || '👤'}
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                                  {agent?.name || 'Unknown'}
                                </span>
                                <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {agent?.title || ''}
                                </span>
                                <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                  {message.timestamp?.toLocaleTimeString() || 'Now'}
                                </span>
                              </div>
                              {message.metadata?.respondingTo && (
                                <div className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                  Replying to: {message.metadata.respondingTo}
                                </div>
                              )}
                              <div className={`${isDark ? 'text-gray-200' : 'text-gray-700'} leading-relaxed prose prose-sm max-w-none ${isDark ? 'prose-invert' : ''}`}>
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                              </div>
                              {Array.isArray(message.metadata?.citations) && message.metadata?.citations?.length > 0 && (
                                <div className="mt-2 text-xs">
                                  <div className="font-semibold mb-1">Sources</div>
                                  <ul className="list-disc ml-4 space-y-1">
                                    {message.metadata.citations.map((c: any, i: number) => (
                                      <li key={i} className="truncate">
                                        {c.url ? (
                                          <a href={c.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{c.source}</a>
                                        ) : (
                                          <span>{c.source}</span>
                                        )}
                                        {c.snippet ? <span className="text-gray-500"> – {c.snippet}</span> : null}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {Array.isArray(message.metadata?.actions) && message.metadata?.actions?.length > 0 && (
                                <div className="mt-3 text-xs">
                                  <div className="font-semibold mb-1">Actions (Founder)</div>
                                  <ul className="list-disc ml-4 space-y-1">
                                    {message.metadata.actions.map((a: any, i: number) => (
                                      <li key={i}>
                                        <span className="font-medium">{a.title}</span>
                                        {a.priority ? <span className="ml-2 px-1.5 py-0.5 rounded bg-gray-100 border text-gray-700">{a.priority}</span> : null}
                                        {a.estimate ? <span className="ml-2 text-gray-500">({a.estimate})</span> : null}
                                        {a.description ? <div className="text-gray-600">{a.description}</div> : null}
                                      </li>
                                    ))}
                                  </ul>
                                  <div className="mt-2">
                                    <button
                                      onClick={async () => {
                                        try {
                                          setExportStatus('Exporting…');
                                          const res = await fetch('/api/workflow/task/export-actions', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                              config: openProjectConfig,
                                              actions: message.metadata?.actions
                                            })
                                          });
                                          const data = await res.json();
                                          if (!res.ok) throw new Error(data?.error || 'Export failed');
                                          setExportStatus('Exported to OpenProject');
                                        } catch (e: any) {
                                          setExportStatus(`Export failed: ${e.message}`);
                                        } finally {
                                          setTimeout(() => setExportStatus(''), 3000);
                                        }
                                      }}
                                      className="mt-1 text-xs px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700"
                                    >
                                      Export to OpenProject
                                    </button>
                                    {exportStatus && <span className="ml-2 text-xs text-gray-600">{exportStatus}</span>}
                                  </div>
                                </div>
                              )}
                              {message.metadata?.valueTag && (
                                <div className={`mt-1 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                  [{message.metadata.valueTag}]
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  ) : (
                    <div className="text-center text-gray-500">
                      {workflowState?.conversationStatus === 'active' && (
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          <span>Agents are discussing {currentStep.name}...</span>
                        </div>
                      )}
                      {workflowState?.conversationStatus === 'paused' && (
                        <div className="text-yellow-600">
                          ⏸️ Conversation paused - Click Resume to continue
                        </div>
                      )}
                      {workflowState?.conversationStatus === 'waiting_approval' && (
                        <div className="text-green-600">
                          ✅ Step completed! Review and approve to continue
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Next Message Button (styled inside conversation card) */}
                {(() => {
                  const step = workflowController.getCurrentStep();
                  const canShow = step && agentOrchestrator.hasNext(step.id);
                  return canShow ? (
                    <div className="mt-4 text-center">
                      <button
                        onClick={() => {
                          // Reveal next pending message from orchestrator (source of truth)
                          const activeStepLocal = workflowController.getCurrentStep();
                          if (!activeStepLocal) return;
                          const released = agentOrchestrator.releaseNextMessage(activeStepLocal.id);
                          if (released) {
                            setConversationMessages(prev => [...prev, released]);
                            setVisibleMessageCount(prev => prev + 1);
                          } else {
                            // Fallback: just increment if local state already has buffered messages
                            setVisibleMessageCount(prev => Math.min(prev + 1, conversationMessages.length));
                          }
                        }}
                        className={`inline-flex items-center gap-2 mx-auto px-6 py-2 rounded-full font-semibold transition-colors shadow ${isDark ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                          }`}
                      >
                        ▶ Next message
                      </button>
                    </div>
                  ) : null;
                })()}
              </div>
            )}

            {/* Minimal Controls */}
            <div className={`${isDark ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'} rounded-lg p-4 shadow-sm flex items-center gap-3`}>
              {/* Primary CTA */}
              {(() => {
                const action = getPrimaryAction();
                return (
                  <button
                    onClick={action.onClick}
                    disabled={action.disabled}
                    className={`px-4 py-2 rounded-lg font-semibold text-white ${action.disabled ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500'}`}
                  >
                    {action.label}
                  </button>
                );
              })()}
              {/* Overflow menu */}
              <div className="relative">
                <button onClick={() => setShowActionsMenu(v => !v)} className="px-3 py-2 rounded border text-sm">⋯</button>
                {showActionsMenu && (
                  <div className={`absolute mt-2 right-0 w-56 rounded border shadow-lg ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white'} z-20`}>
                    <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100" onClick={isConversationActive ? pauseConversation : resumeConversation}>
                      {isConversationActive ? 'Pause conversation' : 'Resume conversation'}
                    </button>
                    <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100" onClick={() => { setShowHistory(true); setShowActionsMenu(false); }}>
                      Research history
                    </button>
                    <div className="px-3 py-2 text-xs text-gray-500">Research mode</div>
                    <div className="px-3 pb-2">
                      <select
                        value={researchMode}
                        onChange={(e) => { const mode = e.target.value as typeof researchMode; setResearchMode(mode); console.log('Research mode set to:', mode); }}
                        className={`w-full text-sm border rounded px-2 py-1 ${isDark ? 'bg-gray-900 border-gray-700 text-gray-100' : ''}`}
                      >
                        <option value="off">Off</option>
                        <option value="conservative">Conservative</option>
                        <option value="standard">Standard</option>
                        <option value="aggressive">Aggressive</option>
                      </select>
                    </div>
                    <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100" onClick={resetWorkflow}>Reset workflow</button>
                  </div>
                )}
              </div>
              {/* Debug line */}
              {isDev && (
                <div className="ml-auto text-xs text-gray-500">isConversationActive={isConversationActive.toString()} | step={currentStep?.id || 'null'}</div>
              )}
            </div>

            {/* Step Template & Requirements */}
            {currentStep && (
              <div className={`${isDark ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'} rounded-lg p-6 shadow-sm`}>
                <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>📋 Step Template & Requirements</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className={`font-semibold mb-3 ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>Step Information</h4>
                    <div className="space-y-2 text-sm">
                      <p><strong>Name:</strong> {currentStep.name}</p>
                      <p><strong>Description:</strong> {currentStep.description}</p>
                      <p><strong>Status:</strong> <span className={`px-2 py-1 rounded text-xs ${getStepStatusColor(currentStep.status)}`}>{currentStep.status}</span></p>
                      <p><strong>Duration:</strong> {currentStep.estimatedDuration} minutes</p>
                    </div>
                  </div>
                  <div>
                    <h4 className={`font-semibold mb-3 ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>Required Data</h4>
                    <div className="space-y-2">
                      {currentStep.requiredData.map((data, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${isDark ? 'bg-gray-500' : 'bg-gray-400'}`}></div>
                          <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{data}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6">
                      <ResearchPanel query={userInput || currentStep.description} role={agents[0]?.id || 'agent'} mode={researchMode} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Workflow Actions */}
            <div className={`${isDark ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'} rounded-lg p-6 shadow-sm`}>
              <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Workflow Actions</h3>
              <div className="flex gap-4">
                <button
                  onClick={resetWorkflow}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                >
                  🔄 Reset Workflow
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Project Creation */}
        {!activeProject && (
          <div className={`${isDark ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'} rounded-lg p-8 shadow-sm text-center`}>
            <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>🚀 Start Your Startup Journey</h2>
            <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'} mb-6`}>
              Create a new project and collaborate with AI agents to develop your startup idea
            </p>
            <button
              onClick={createNewProject}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-colors shadow-lg hover:shadow-xl"
            >
              🚀 Start New Project
            </button>
          </div>
        )}

        {/* Live Conversation Input */}
        {currentStep && (
          <div className={`${isDark ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'} rounded-lg p-6 shadow-sm`}>
            <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>💬 Enter Your Problem Statement</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="problemInput" className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Describe the business problem or opportunity you want to explore:
                </label>
                <textarea
                  ref={problemInputRef}
                  id="problemInput"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="e.g., How can we create a sustainable food delivery service for urban areas?"
                  className={`w-full p-3 border rounded-lg resize-none ${isDark ? 'bg-gray-900 border-gray-700 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  rows={4}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={startConversation}
                  disabled={!userInput.trim() || isConversationActive}
                  className={`px-6 py-2 rounded-lg font-semibold text-white transition-colors ${!userInput.trim() || isConversationActive
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                >
                  {isConversationActive ? 'Conversation Active...' : '🚀 Start Discussion'}
                </button>
                {isConversationActive && (
                  <button
                    onClick={pauseConversation}
                    className="px-4 py-2 rounded-lg border border-gray-300 hover:border-gray-400 transition-colors"
                  >
                    ⏸️ Pause
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Template Display */}
        {currentStep && (
          <div className={`${isDark ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'} rounded-lg p-6 shadow-sm`}>
            <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>📋 Step Template</h3>
            <div className={`${isDark ? 'bg-gray-900' : 'bg-gray-50'} rounded-lg p-4`}>
              <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'} mb-2`}>
                <strong>Current Step:</strong> {currentStep.name}
              </p>
              <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'} mb-2`}>
                <strong>Description:</strong> {currentStep.description}
              </p>
              <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'} mb-2`}>
                <strong>Required Data:</strong> {currentStep.requiredData.join(', ')}
              </p>
              <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                <strong>Estimated Duration:</strong> {currentStep.estimatedDuration} minutes
              </p>
            </div>
          </div>
        )}

        {/* Test Buttons */}
        <div className="mt-8 space-y-4">
          <div className="flex flex-wrap gap-4">
            <button className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded">
              🔴 Simple Test Button
            </button>
            <button className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded">
              🟣 HTML Button Test
            </button>
            <button className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded">
              🐛 Debug Button
            </button>
            <button className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded">
              🧪 Manual Test Project
            </button>
            <button className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded">
              🔴 Direct State Test
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Floating research preview dock mounted at root level
export function ResearchPreviewDockMount({ items }: { items: { url: string; title?: string; status: 'queued' | 'crawling' | 'extracted' | 'analyzing' | 'done' | 'failed' }[] }) {
  return null;
}
