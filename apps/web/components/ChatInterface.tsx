"use client";

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight, Send, Download, Users, FileText, BarChart3, TrendingUp, Target, Zap, Brain, MessageSquare, CircleDot } from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Progress } from './ui/progress';
import { AgentTabs } from './AgentTabs';
import ContextEngineeringPanel from './ContextEngineeringPanel';
import langgraphClient, { WorkflowMessage, WorkflowState } from '../lib/langgraphClient';

// UI Logger for debugging
class UILogger {
  private logs: string[] = [];
  private maxLogs = 1000;

  log(component: string, action: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${component}] ${action}${data ? ` | ${JSON.stringify(data, null, 2)}` : ''}`;
    this.logs.push(logEntry);
    
    // Keep only last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    
    // Also log to console for immediate visibility
    console.log(logEntry);
    
    // Save to localStorage for persistence across page reloads
    try {
      localStorage.setItem('bebrahma_ui_logs', JSON.stringify(this.logs));
    } catch (e) {
      console.warn('Could not save logs to localStorage:', e);
    }
  }

  getLogs(): string[] {
    return [...this.logs];
  }

  exportLogs(): string {
    return this.logs.join('\n');
  }

  clearLogs() {
    this.logs = [];
    try {
      localStorage.removeItem('bebrahma_ui_logs');
    } catch (e) {
      console.warn('Could not clear logs from localStorage:', e);
    }
  }

  // Load logs from localStorage on initialization
  loadPersistedLogs() {
    try {
      const persisted = localStorage.getItem('bebrahma_ui_logs');
      if (persisted) {
        this.logs = JSON.parse(persisted);
        console.log(`[UILogger] Loaded ${this.logs.length} persisted logs`);
      }
    } catch (e) {
      console.warn('Could not load persisted logs:', e);
    }
  }
}

// Global UI logger instance
const uiLogger = new UILogger();

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai' | 'agent';
  timestamp: Date;
  agentId?: string;
  agentName?: string;
  agentTitle?: string;
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
    evidenceMessageIds?: string[];
  };
}

interface AgentProgress {
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
}

interface ProgressState {
  phase: 'planning' | 'agent_selection' | 'data_gathering' | 'analysis' | 'decision_making' | 'complete';
  currentPhase: string;
  overallProgress: number;
  agents: AgentProgress[];
  estimatedTotalTime: number;
  currentBudget: number;
  totalBudget: number;
}

interface Agent {
  id: string;
  name: string;
  title?: string;
  description: string;
  type: string;
  department?: string;
}

interface ChatInterfaceProps {
  onProgressUpdate?: (progressState: ProgressState) => void;
  onNewMessage?: (message: Message) => void;
  onDecisionPoint?: () => void;
  sessionIdOverride?: string;
  initialUserMessage?: string;
  onProceedToNextStep?: () => void;
  stepModeOneByOne?: boolean;
  workflowStep?: string;
  onSessionReady?: (sessionId: string) => void;
}

export default function ChatInterface({ onProgressUpdate, onNewMessage, onDecisionPoint, sessionIdOverride, initialUserMessage, onProceedToNextStep, stepModeOneByOne = true, workflowStep, onSessionReady }: ChatInterfaceProps) {
  // Initialize logger
  useEffect(() => {
    uiLogger.loadPersistedLogs();
    uiLogger.log('ChatInterface', 'Component initialized', { sessionIdOverride, initialUserMessage, stepModeOneByOne, workflowStep });
  }, []);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome_1',
      content: `# 🚀 Welcome to BeBrahma - Your SaaS Co-Founder!

I'm your **SaaS-specialized AI business team**, built exclusively for B2B SaaS founders. I understand SaaS metrics, challenges, and opportunities better than any generalist solution.

## 🎯 **How BeBrahma Works for SaaS:**

### **Stage 1: SaaS Idea to Evidence**
- Problem-Solution Fit Analysis for SaaS models
- SaaS Market Sizing with recurring revenue potential
- Competitive SaaS landscape analysis
- SaaS business model validation (Freemium vs Premium, seat-based vs usage-based)
- Technology stack recommendations for SaaS
- Compliance requirements (GDPR, SOC2, security standards)

### **Stage 2: SaaS GTM Execution**
- SaaS-specific ICP definition with decision-maker mapping
- Product-led vs Sales-led growth strategy selection
- Pricing strategy workshop (usage-based, per-seat, tiered)
- Free trial/freemium strategy optimization
- Product-led growth tactics and viral loops
- Enterprise vs SMB strategy development

### **Stage 3: SaaS Strategic Management**
- SaaS growth stage analysis and metric tracking
- Cohort analysis and retention optimization
- Expansion revenue opportunities and upsell strategies
- Competitive response and feature parity analysis
- Funding readiness and SaaS investor deck optimization

## 👥 **Your SaaS Expert Team:**
- **🎯 SaaS Business Model Expert**: Pricing, packaging, revenue optimization
- **🚀 Product-Led Growth Specialist**: In-product growth, onboarding, activation
- **💼 SaaS Sales Strategy**: B2B sales processes, enterprise approaches
- **🤝 Customer Success Manager**: Retention, expansion, health scoring
- **💰 SaaS Finance Analyst**: Unit economics, SaaS metrics, funding prep
- **🔒 Compliance & Security Expert**: SOC2, GDPR, enterprise requirements

**What SaaS business idea would you like to explore today?**`,
      sender: 'ai',
      timestamp: new Date(),
      agentId: 'system',
      agentName: 'SaaS Business Team'
    }
  ]);

  // Log initial state
  useEffect(() => {
    uiLogger.log('ChatInterface', 'Initial messages state', { count: messages.length, firstMessageId: messages[0]?.id });
  }, []);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState('crew');
  const [sessionId, setSessionId] = useState<string>(sessionIdOverride || `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`);
  const [showDecisionDocument, setShowDecisionDocument] = useState(false);
  const [decisionDocument, setDecisionDocument] = useState('');
  const [activeTab, setActiveTab] = useState('chat');
  const [showContextPanel, setShowContextPanel] = useState(false);
  const [progressState, setProgressState] = useState<ProgressState>({
    phase: 'planning',
    currentPhase: 'Initializing SaaS analysis...',
    overallProgress: 0,
    agents: [],
    estimatedTotalTime: 0,
    currentBudget: 0,
    totalBudget: 200
  });

  // React ref to track current session state outside of React state
  const sessionStateRef = useRef({
    messageCount: 1, // Start with 1 for welcome message
    hasStartedSession: false
  });

  // Call onSessionReady when sessionId is set
  useEffect(() => {
    if (sessionId && onSessionReady) {
      onSessionReady(sessionId);
    }
  }, [sessionId, onSessionReady]);

  // Log state changes
  useEffect(() => {
    uiLogger.log('ChatInterface', 'State changed', { 
      isLoading, 
      selectedAgent, 
      sessionId, 
      showDecisionDocument, 
      activeTab, 
      showContextPanel,
      progressPhase: progressState.phase,
      progressCurrentPhase: progressState.currentPhase,
      progressOverall: progressState.overallProgress
    });
  }, [isLoading, selectedAgent, sessionId, showDecisionDocument, activeTab, showContextPanel, progressState.phase, progressState.currentPhase, progressState.overallProgress]);

  // Debug: Monitor progressState changes specifically
  useEffect(() => {
    console.log('🔍 DEBUG: progressState changed', progressState);
  }, [progressState]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [queuedMessages, setQueuedMessages] = useState<Message[]>([]);
  const [askProceed, setAskProceed] = useState(false);
  // Track used ids to prevent duplicate React keys across renders
  const usedIdsRef = useRef<Set<string>>(new Set(['welcome_1']));
  const seqRef = useRef<number>(0);

  // Log queued messages changes
  useEffect(() => {
    uiLogger.log('ChatInterface', 'Queued messages changed', { count: queuedMessages.length, messageIds: queuedMessages.map((m: Message) => m.id) });
  }, [queuedMessages]);

  // Log askProceed changes
  useEffect(() => {
    uiLogger.log('ChatInterface', 'AskProceed changed', { askProceed });
  }, [askProceed]);

  const normalizeId = (proposed?: string, fallbackBase?: string): string => {
    let base = (proposed || fallbackBase || '').toString();
    base = base.replace(/["']/g, '').replace(/\s+/g, '_');
    if (!base) base = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    let id = base;
    if (usedIdsRef.current.has(id)) {
      // add a monotonic suffix to ensure uniqueness
      id = `${base}__${++seqRef.current}`;
      while (usedIdsRef.current.has(id)) id = `${base}__${++seqRef.current}`;
    }
    usedIdsRef.current.add(id);
    uiLogger.log('ChatInterface', 'Normalized ID', { original: proposed, normalized: id });
    return id;
  };
  // Keyboard: N to release next; A/R/F/P to act on decision (only when a decision is pending)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const key = e.key.toLowerCase();
      if (key === 'n') {
        e.preventDefault();
        uiLogger.log('ChatInterface', 'Keyboard shortcut pressed', { key: 'n', action: 'releaseNext' });
        releaseNext();
        return;
      }
      // Only allow decision hotkeys when a decision prompt is visible
      if (!askProceed) return;
      if (key === 'a') { 
        e.preventDefault(); 
        uiLogger.log('ChatInterface', 'Keyboard shortcut pressed', { key: 'a', action: 'approve' });
        handleUserApproval('approve'); 
      }
      if (key === 'r') { 
        e.preventDefault(); 
        uiLogger.log('ChatInterface', 'Keyboard shortcut pressed', { key: 'r', action: 'reject' });
        handleUserApproval('reject'); 
      }
      if (key === 'f') { 
        e.preventDefault(); 
        uiLogger.log('ChatInterface', 'Keyboard shortcut pressed', { key: 'f', action: 'refine' });
        handleUserApproval('refine'); 
      }
      if (key === 'p') { 
        e.preventDefault(); 
        uiLogger.log('ChatInterface', 'Keyboard shortcut pressed', { key: 'p', action: 'pause' });
        handleUserApproval('pause'); 
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [queuedMessages, askProceed]);

  // Step-aware prompt suggestions (borrowed from CrewAIInterface, simplified)
  const getStepLabel = (step?: string): string => {
    const labels: Record<string, string> = {
      PROBLEM_CAPTURE: 'Problem Capture',
      PROBLEM_CLARIFICATION: 'Problem Clarification',
      SOLUTION_BRAINSTORM: 'Solution Brainstorm',
      COMPETITOR_ANALYSIS: 'Competitor Analysis',
      SCA_ANALYSIS: 'SCA Analysis',
      MVP_PLANNING: 'MVP Planning',
      TASK_GENERATION: 'Task Generation',
    };
    return step ? labels[step] || step : '';
  };

  const getPromptSuggestions = (step?: string): string[] => {
    const s: Record<string, string[]> = {
      PROBLEM_CAPTURE: [
        'Help me structure my problem statement',
        'What makes a strong problem description?',
        'Probe my idea to surface hidden assumptions',
      ],
      PROBLEM_CLARIFICATION: [
        'Make this problem statement clearer',
        'What questions should I ask about target users?',
        'Identify concrete pain points',
      ],
      SOLUTION_BRAINSTORM: [
        'Evaluate solution options and trade-offs',
        'What differentiators matter most?',
        'Feasibility risks to watch for',
      ],
      COMPETITOR_ANALYSIS: [
        'Analyze these competitors and gaps',
        'Who are underserved user segments?',
        'Positioning ideas to stand out',
      ],
      SCA_ANALYSIS: [
        'Which advantages are sustainable?',
        'How to strengthen our moat?',
        'What evidence supports these SCAs?',
      ],
      MVP_PLANNING: [
        'Prioritize MVP features for impact',
        'Lean plan with timeline and risks',
        'What to defer vs. build now?',
      ],
      TASK_GENERATION: [
        'Break down tasks with dependencies',
        'Estimate effort and sequence',
        'Risky tasks to spike first',
      ],
    };
    if (!step) return [
      'Validate this business idea',
      'Biggest risks and mitigations',
      'How should I price my SaaS?',
    ];
    return s[step] || [];
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const startProgressPolling = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    progressIntervalRef.current = setInterval(async () => {
      try {
        const base = process.env.NEXT_PUBLIC_CHAT_API_URL || 
         `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"}/api`;
        console.log('[ProgressPolling] tick', { base, sessionId, at: new Date().toISOString() });
        const response = await fetch(`${base}/chat/progress/${sessionId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            console.log('[ProgressPolling] state', data.progressState);
            setProgressState(data.progressState);
          }
        }
      } catch (error) {
        console.error('Progress polling error:', error);
      }
    }, 2000);
  };

  const stopProgressPolling = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    return () => {
      stopProgressPolling();
    };
  }, []);

  useEffect(() => {
    if (sessionIdOverride) setSessionId(sessionIdOverride);
  }, [sessionIdOverride]);

  // Utility to send arbitrary text as a user message (used for auto-start)
/**
 * Sends arbitrary text as a user message and starts the AI workflow
 * @param text - The text message to send
 */
  const sendText = async (text: string) => {
    if (!text.trim() || isLoading) return;
    
    uiLogger.log('ChatInterface', 'sendText called', { text, isLoading, sessionId, workflowStep });
    
    const userMessage: Message = {
      id: Date.now().toString(),
      content: text,
      sender: 'user',
      timestamp: new Date(),
      type: 'user_input'
    };
    setMessages(prev => [...prev, userMessage]);
    // Update ref synchronously to track current state
    sessionStateRef.current.messageCount += 1;
    sessionStateRef.current.hasStartedSession = true;
    
    uiLogger.log('ChatInterface', 'User message added', { messageId: userMessage.id, content: text, totalMessages: sessionStateRef.current.messageCount });
    
    setIsLoading(true);
    startProgressPolling();
    
    try {
      console.log('[Chat] start workflow', { sessionId, task: text });
      uiLogger.log('ChatInterface', 'Starting workflow session via LangGraph', { sessionId, task: text });
      
      const response = await langgraphClient.startWorkflowSession(text, sessionId);
      
      if (!response.success) {
        uiLogger.log('ChatInterface', 'Workflow start failed', { error: response.error });
        const errorMsg: Message = {
          id: Date.now().toString(),
          content: `Failed to start workflow: ${response.error || 'Unknown error'}`,
          sender: 'ai',
          timestamp: new Date(),
          agentId: 'system'
        };
        setMessages(prev => [...prev, errorMsg]);
        return;
      }

      console.log('[Chat] workflow started successfully', response);
      uiLogger.log('ChatInterface', 'Workflow started successfully', { 
        messageCount: response.messages?.length, 
        stage: response.stage 
      });
      
      // Process workflow messages
      const workflowMessages = response.messages || [];
      const newMessages = workflowMessages.map((msg: WorkflowMessage, i: number) => ({
        id: normalizeId(msg.id, `msg_${Date.now()}_${i}`),
        content: msg.content,
        sender: 'agent' as const,
        timestamp: new Date(msg.timestamp || Date.now()),
        agentId: msg.agentId || 'system',
        agentName: msg.agentName,
        agentTitle: msg.agentTitle,
        department: msg.agentDepartment,
        type: msg.metadata?.type || 'agent_contribution',
        metadata: msg.metadata
      }));
      
      // Update progress state from workflow stage
      if (response.stage) {
        const stageLabels: Record<string, string> = {
          'PROBLEM_CAPTURE': 'Problem Capture',
          'PROBLEM_CLARIFICATION': 'Problem Clarification', 
          'SOLUTION_BRAINSTORM': 'Solution Brainstorm',
          'COMPETITOR_ANALYSIS': 'Competitor Analysis',
          'SCA_ANALYSIS': 'SCA Analysis',
          'MVP_PLANNING': 'MVP Planning',
          'TASK_GENERATION': 'Task Generation'
        };
        
        const newPhase = stageLabels[response.stage] || response.stage;
        
        setProgressState(prev => ({
          ...prev,
          phase: 'agent_selection',
          currentPhase: newPhase,
          overallProgress: 20
        }));
        
        uiLogger.log('ChatInterface', 'Progress state updated from workflow start', { 
          stage: response.stage,
          newPhase
        });
      }
      
      // Add messages based on step mode
      if (stepModeOneByOne) {
        setQueuedMessages(prev => [...prev, ...newMessages]);
        uiLogger.log('ChatInterface', 'Messages queued (step mode)', { queuedCount: queuedMessages.length + newMessages.length });
      } else {
        setMessages(prev => [...prev, ...newMessages]);
        sessionStateRef.current.messageCount += newMessages.length;
        uiLogger.log('ChatInterface', 'Messages added directly', { totalCount: sessionStateRef.current.messageCount });
      }
      
      // Handle decision points
      if (response.pendingDecision) {
        setAskProceed(true);
        uiLogger.log('ChatInterface', 'Decision point detected');
        onDecisionPoint?.();
      }
      
      try {
        newMessages.forEach((m: Message) => onNewMessage?.(m));
      } catch {}
      
    } catch (err) {
      uiLogger.log('ChatInterface', 'sendText error', { error: err instanceof Error ? err.message : String(err) });
      const errorMsg: Message = {
        id: Date.now().toString(),
        content: `Network error while contacting the workflow service: ${err instanceof Error ? err.message : String(err)}`,
        sender: 'ai',
        timestamp: new Date(),
        agentId: 'system'
      };
      setMessages(prev => [...prev, errorMsg]);
      // Update ref synchronously
      sessionStateRef.current.messageCount += 1;
    } finally {
      setIsLoading(false);
      stopProgressPolling();
      uiLogger.log('ChatInterface', 'sendText completed', { isLoading: false });
    }
  };

  // Auto-start chat once with provided initial user message
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (initialUserMessage && !autoStartedRef.current) {
      autoStartedRef.current = true;
      sendText(initialUserMessage);
    }
  }, [initialUserMessage]);

  // Notify parent component of progress updates
  useEffect(() => {
    if (onProgressUpdate) {
      onProgressUpdate(progressState);
    }
  }, [progressState, onProgressUpdate]);

  useEffect(() => {
    // Initialize with empty data - no API calls needed for basic functionality
  }, []);



  const downloadDecisionDocument = () => {
    if (decisionDocument) {
      const blob = new Blob([decisionDocument], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `saas-business-analysis-${new Date().toISOString().split('T')[0]}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

/**
 * Handles form submission for user messages
 * @param e - The form submission event
 */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    uiLogger.log('ChatInterface', 'handleSubmit called', { input: input.trim(), isLoading, sessionId });

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: 'user',
      timestamp: new Date(),
      type: 'user_input'
    };

    setMessages(prev => [...prev, userMessage]);
    // Update ref synchronously to track current state
    sessionStateRef.current.messageCount += 1;
    
    uiLogger.log('ChatInterface', 'User message added in handleSubmit', { messageId: userMessage.id, content: input, totalMessages: sessionStateRef.current.messageCount });
    
    setInput('');
    setIsLoading(true);

    // Start progress polling
    startProgressPolling();

    try {
      const baseUrl = process.env.NEXT_PUBLIC_CHAT_API_URL || 
         `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"}/api`;
      
      // FIXED: Check if we already have a session and continue it instead of starting new one
      let response;
      if (sessionStateRef.current.messageCount > 1) {
        // Continue existing session
        console.log('[Chat] Continuing existing session:', sessionId);
        uiLogger.log('ChatInterface', 'Continuing existing session', { sessionId, messageCount: sessionStateRef.current.messageCount });
        response = await fetch(`${baseUrl}/chat/crew/next`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId
          }),
        });
      } else {
        // Start new session only for first message
        console.log('[Chat] Starting new session:', sessionId);
        uiLogger.log('ChatInterface', 'Starting new session', { sessionId, messageCount: sessionStateRef.current.messageCount });
        response = await fetch(`${baseUrl}/chat/crew/start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId,
            task: input,
            context: { stepId: workflowStep || '' }
          }),
        });
      }

      uiLogger.log('ChatInterface', 'API response received in handleSubmit', { status: response.status, ok: response.ok, endpoint: sessionStateRef.current.messageCount > 1 ? '/chat/crew/next' : '/chat/crew/start' });

      if (response.ok) {
        const data = await response.json();
        
        if (data.success) {
          // Filter out user messages from API response (we already added the user message)
          const nonUserMessages = data.messages.filter((msg: any) => msg.sender !== 'user');
          uiLogger.log('ChatInterface', 'Non-user messages filtered in handleSubmit', { total: data.messages?.length, nonUser: nonUserMessages.length });
          
          const newMessages = nonUserMessages.map((msg: any, index: number) => ({
            id: msg.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${index}`,
            content: msg.content,
            sender: msg.sender === 'user' ? 'user' : 
                    msg.sender === 'agent' ? 'agent' : 'ai',
            timestamp: new Date(msg.timestamp || Date.now()),
            agentId: msg.agentId || 'system',
            agentName: msg.agentName,
            agentTitle: msg.agentTitle,
            department: msg.metadata?.department,
            type: msg.type,
            metadata: msg.metadata
          }));
          
          uiLogger.log('ChatInterface', 'New messages created in handleSubmit', { count: newMessages.length, messageIds: newMessages.map((m: Message) => m.id) });
          
          // Update progress state for continued session
          if (sessionStateRef.current.messageCount > 1) { // This is a continued session
            setProgressState(prev => ({
              ...prev,
              phase: 'analysis',
              currentPhase: 'Continuing Analysis',
              overallProgress: Math.min(prev.overallProgress + 10, 100)
            }));
            
            uiLogger.log('ChatInterface', 'Progress state updated for continued session', { 
              newPhase: 'analysis',
              newProgress: Math.min(progressState.overallProgress + 10, 100),
              oldPhase: progressState.currentPhase,
              oldProgress: progressState.overallProgress
            });
          }
          
          // De-duplicate by id to prevent React key collisions
          const existingIds = new Set([...messages, ...queuedMessages].map((m: Message) => m.id));
          const deduped = newMessages.filter((m: Message) => !existingIds.has(m.id));
          uiLogger.log('ChatInterface', 'Messages deduplicated', { original: newMessages.length, deduped: deduped.length });
          
          if (stepModeOneByOne) {
            setQueuedMessages(prev => [...prev, ...deduped]);
            uiLogger.log('ChatInterface', 'Messages queued in handleSubmit (step mode)', { queuedCount: queuedMessages.length + deduped.length });
          } else if (deduped.length > 0) {
            setMessages(prev => [...prev, ...deduped]);
            uiLogger.log('ChatInterface', 'Messages added directly in handleSubmit', { totalCount: messages.length + deduped.length });
          }

          try {
            newMessages.forEach((m: Message) => onNewMessage?.(m));
            if (nonUserMessages.some((m: any) => m.type === 'decision_point')) {
              uiLogger.log('ChatInterface', 'Decision point detected in handleSubmit');
              onDecisionPoint?.();
            }
          } catch {}

          if (data.metadata?.decisionDocument) {
            setDecisionDocument(data.metadata.decisionDocument);
            uiLogger.log('ChatInterface', 'Decision document set in handleSubmit', { hasContent: !!data.metadata.decisionDocument });
          }
        } else {
          console.error('API response error:', data);
          uiLogger.log('ChatInterface', 'API response error in handleSubmit', { success: data.success, error: data.error });
          const errorMsg: Message = {
            id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            content: '❌ **Error**: Failed to get response from AI team. Please try again.',
            sender: 'ai',
            timestamp: new Date(),
            agentId: 'system'
          };
          setMessages(prev => [...prev, errorMsg]);
          // Update ref synchronously
          sessionStateRef.current.messageCount += 1;
          try { onNewMessage?.(errorMsg); } catch {}
        }
      } else {
        console.error('API request failed:', response.status);
        uiLogger.log('ChatInterface', 'API request failed in handleSubmit', { status: response.status });
        const errorMsg: Message = {
          id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          content: '❌ **Error**: Failed to connect to AI team. Please check your connection and try again.',
          sender: 'ai',
          timestamp: new Date(),
          agentId: 'system'
        };
        setMessages(prev => [...prev, errorMsg]);
        // Update ref synchronously
        sessionStateRef.current.messageCount += 1;
        try { onNewMessage?.(errorMsg); } catch {}
      }
    } catch (error) {
      console.error('Request error:', error);
      uiLogger.log('ChatInterface', 'Request error in handleSubmit', { error: error instanceof Error ? error.message : String(error) });
      const errorMsg: Message = {
        id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: '❌ **Error**: Network error. Please check your connection and try again.',
        sender: 'ai',
        timestamp: new Date(),
        agentId: 'system'
      };
      setMessages(prev => [...prev, errorMsg]);
      // Update ref synchronously
      sessionStateRef.current.messageCount += 1;
    } finally {
      setIsLoading(false);
      stopProgressPolling();
      uiLogger.log('ChatInterface', 'handleSubmit completed', { isLoading: false });
    }
  };

  // Release next queued assistant/agent message
/**
 * Releases the next queued assistant/agent message or requests the next turn from the API
 */
  const releaseNext = async () => {
    uiLogger.log('ChatInterface', 'releaseNext called', { queuedCount: queuedMessages.length, stepMode: stepModeOneByOne });
    
    // If we have pre-queued messages (from a prior API call), release one
    if (queuedMessages.length > 0) {
      const [next, ...rest] = queuedMessages;
      setQueuedMessages(rest);
      setMessages(prev => [...prev, next]);
      uiLogger.log('ChatInterface', 'Queued message released', { messageId: next.id, remainingQueued: rest.length, totalMessages: messages.length + 1 });
      
      if (next.type === 'decision_point') {
        setAskProceed(true);
        uiLogger.log('ChatInterface', 'Decision point message released, askProceed set to true');
        onDecisionPoint?.();
      }
      onNewMessage?.(next);
      return;
    }

    // Otherwise, request the next message from the workflow
    try {
      console.log('[Chat] getting next workflow message', { sessionId });
      uiLogger.log('ChatInterface', 'Requesting next workflow message via LangGraph', { sessionId });
      
      const response = await langgraphClient.getNextMessage(sessionId);
      
      if (!response.success) {
        uiLogger.log('ChatInterface', 'Next workflow message failed', { error: response.error });
        return;
      }
      
      console.log('[Chat] next workflow response', response);
      uiLogger.log('ChatInterface', 'Next workflow message received', { 
        success: response.success, 
        messageCount: response.messages?.length 
      });
      
      if (!response.messages || response.messages.length === 0) return;
      
      const workflowMessages = response.messages;
      const mapped = workflowMessages.map((msg: WorkflowMessage, i: number) => ({
        id: normalizeId(msg.id, `msg_${Date.now()}_${i}`),
        content: msg.content,
        sender: 'agent' as const,
        timestamp: new Date(msg.timestamp || Date.now()),
        agentId: msg.agentId || 'system',
        agentName: msg.agentName,
        agentTitle: msg.agentTitle,
        department: msg.agentDepartment,
        type: msg.metadata?.type || 'agent_contribution',
        metadata: msg.metadata
      }));
      
      uiLogger.log('ChatInterface', 'Next workflow messages mapped', { count: mapped.length, messageIds: mapped.map((m: Message) => m.id) });
      
      // Show only the first now; queue the rest for subsequent Next presses
      const [first, ...rest] = mapped;
      if (first) {
        setMessages(prev => {
          if (prev.some((m) => m.id === first.id)) return prev;
          return [...prev, first];
        });
        uiLogger.log('ChatInterface', 'First next workflow message displayed', { messageId: first.id, type: first.type });
        
        // Check for decision point from workflow response
        if (first.type === 'decision_point' || response.pendingDecision) {
          setAskProceed(true);
          uiLogger.log('ChatInterface', 'Decision point in next workflow message, askProceed set to true');
          onDecisionPoint?.();
        }
        onNewMessage?.(first);
      }
      if (rest.length > 0) {
        setQueuedMessages(prev => {
          const existingIds = new Set([...prev.map((m: Message) => m.id), ...messages.map((m: Message) => m.id)]);
          const filtered = rest.filter((m: Message) => !existingIds.has(m.id));
          return [...prev, ...filtered];
        });
        uiLogger.log('ChatInterface', 'Remaining next workflow messages queued', { count: rest.length, queuedCount: queuedMessages.length + rest.length });
      }
    } catch (error) {
      uiLogger.log('ChatInterface', 'Error in releaseNext', { error: error instanceof Error ? error.message : String(error) });
    }
  };

  // Prevent duplicate decision submissions
  const decisionInFlightRef = useRef(false);
  const handleUserApproval = async (response: 'approve' | 'reject' | 'refine' | 'pause') => {
    console.log('🔍 DEBUG: handleUserApproval ENTERED', { response, sessionId, isLoading, decisionInFlight: decisionInFlightRef.current });
    
    if (decisionInFlightRef.current) {
      uiLogger.log('ChatInterface', 'Decision already in flight, ignoring duplicate request', { response });
      return;
    }
    decisionInFlightRef.current = true;
    
    uiLogger.log('ChatInterface', 'handleUserApproval called', { response, sessionId, isLoading });
    
    try {
      // Add user decision message
      const decisionMessage: Message = {
        id: `decision_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: `**Your Decision**: ${response.charAt(0).toUpperCase() + response.slice(1)}`,
        sender: 'user',
        timestamp: new Date(),
        type: 'user_approval'
      };
      
      setMessages(prev => [...prev, decisionMessage]);
      uiLogger.log('ChatInterface', 'Decision message added', { messageId: decisionMessage.id, response, totalMessages: messages.length + 1 });
      
      setIsLoading(true);
      
      // Send decision via LangGraph client
      console.log('[Chat] sending decision via LangGraph', { sessionId, response });
      uiLogger.log('ChatInterface', 'Sending decision via LangGraph client', { response, sessionId });
      
      const decisionResponse = await langgraphClient.sendDecision(
        sessionId, 
        response, 
        messages[messages.length - 2]?.content || 'Continue analysis'
      );
      
      console.log('[Chat] decision response', decisionResponse);
      uiLogger.log('ChatInterface', 'Decision response received', { success: decisionResponse.success });

      if (decisionResponse.success) {
        // Add system response
        let systemMessage = '';
        switch (response) {
          case 'approve':
            systemMessage = `✅ **Approved!** Moving to next phase of analysis...`;
            break;
          case 'refine':
            systemMessage = `🔄 **Refining analysis...** The team will provide more detailed insights.`;
            break;
          case 'reject':
            systemMessage = `❌ **Rejected.** Starting fresh with a new approach...`;
            break;
          case 'pause':
            systemMessage = `⏸️ **Paused.** Analysis saved for later continuation.`;
            break;
        }
        
        const systemMsg: Message = {
          id: `system_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          content: systemMessage,
          sender: 'ai',
          timestamp: new Date(),
          agentId: 'system',
          type: 'user_approval'
        };
        
        setMessages(prev => [...prev, systemMsg]);
        uiLogger.log('ChatInterface', 'System response message added', { messageId: systemMsg.id, response, totalMessages: messages.length + 1 });
        try { onNewMessage?.(systemMsg); } catch {}
        
        // Process workflow messages from decision response
        if (decisionResponse.messages && decisionResponse.messages.length > 0) {
          const workflowMessages = decisionResponse.messages;
          const newMessages = workflowMessages.map((msg: WorkflowMessage, i: number) => ({
            id: normalizeId(msg.id, `msg_${Date.now()}_${i}`),
            content: msg.content,
            sender: 'agent' as const,
            timestamp: new Date(msg.timestamp || Date.now()),
            agentId: msg.agentId || 'system',
            agentName: msg.agentName,
            agentTitle: msg.agentTitle,
            department: msg.agentDepartment,
            type: msg.metadata?.type || 'agent_contribution',
            metadata: msg.metadata
          }));
          
          uiLogger.log('ChatInterface', 'Decision response messages created', { count: newMessages.length, messageIds: newMessages.map((m: Message) => m.id) });
          
          // Update progress state from workflow stage
          if (decisionResponse.stage) {
            const stageLabels: Record<string, string> = {
              'PROBLEM_CAPTURE': 'Problem Capture',
              'PROBLEM_CLARIFICATION': 'Problem Clarification', 
              'SOLUTION_BRAINSTORM': 'Solution Brainstorm',
              'COMPETITOR_ANALYSIS': 'Competitor Analysis',
              'SCA_ANALYSIS': 'SCA Analysis',
              'MVP_PLANNING': 'MVP Planning',
              'TASK_GENERATION': 'Task Generation'
            };
            
            const newPhase = stageLabels[decisionResponse.stage] || decisionResponse.stage;
            const newProgress = Math.min(progressState.overallProgress + 25, 100);
            
            setProgressState(prev => ({
              ...prev,
              phase: 'analysis',
              currentPhase: newPhase,
              overallProgress: newProgress
            }));
            
            uiLogger.log('ChatInterface', 'Progress state updated from decision response', { 
              newStage: decisionResponse.stage, 
              newPhase, 
              newProgress
            });
          }
          
          if (stepModeOneByOne) {
            setQueuedMessages(prev => [...prev, ...newMessages]);
            uiLogger.log('ChatInterface', 'Decision response messages queued (step mode)', { queuedCount: queuedMessages.length + newMessages.length });
          } else {
            setMessages(prev => [...prev, ...newMessages]);
            uiLogger.log('ChatInterface', 'Decision response messages added directly', { totalCount: messages.length + newMessages.length });
          }
          
          // Handle decision points
          if (decisionResponse.pendingDecision) {
            setAskProceed(true);
            uiLogger.log('ChatInterface', 'Decision point detected in decision response');
            onDecisionPoint?.();
          }
          
          try {
            newMessages.forEach((m: Message) => onNewMessage?.(m));
          } catch {}
        }
      }
    } catch (error) {
      console.error('Error processing user approval:', error);
      uiLogger.log('ChatInterface', 'Error in handleUserApproval', { error: error instanceof Error ? error.message : String(error), response });
      
      const errorMsg: Message = {
        id: Date.now().toString(),
        content: '❌ **Error**: Something went wrong. Please try again.',
        sender: 'ai',
        timestamp: new Date(),
        agentId: 'system',
        type: 'user_approval'
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      decisionInFlightRef.current = false;
      uiLogger.log('ChatInterface', 'handleUserApproval completed', { isLoading: false, decisionInFlight: false });
    }
  };

  const renderMessage = (message: Message) => {
    const isUser = message.sender === 'user';
    const isAgent = message.sender === 'agent';
    const isSystem = message.agentId === 'system';
    const isDecisionPoint = message.type === 'decision_point';

    return (
      <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6`}>
        {/* Avatar */}
        {!isUser && (
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm mr-3">
            {isAgent && message.agentName ? message.agentName.charAt(0) : '🤖'}
          </div>
        )}

        {/* Message Container */}
        <div data-testid={isUser ? 'user-message' : isAgent ? 'agent-message' : 'ai-message'} className={`max-w-3xl ${isUser ? 'order-2' : 'order-1'}`}>
          {/* Agent Header */}
          {isAgent && message.agentName && (
            <div className="mb-2">
              <div className="flex items-center gap-2">
                <span data-testid="agent-name" className="font-semibold text-gray-900 dark:text-white">
                  {message.agentName}
                </span>
                {message.agentTitle && (
                  <span data-testid="agent-title" className="text-sm text-gray-600 dark:text-gray-400">
                    ({message.agentTitle})
                  </span>
                )}
                {message.metadata?.department && (
                  <span className="px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-full">
                    {message.metadata.department}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Message Content */}
          <div className={`rounded-2xl px-4 py-3 shadow-sm ${
            isUser
              ? 'bg-blue-500 text-white rounded-br-md'
              : isAgent
              ? 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-bl-md'
              : isSystem
              ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-bl-md'
              : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-gray-700 rounded-bl-md'
          }`}>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
            </div>
            
            {/* Decision Point Action Buttons */}
            {isDecisionPoint && (
              <div data-testid="decision-point" className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleUserApproval('approve')}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    ✅ Approve & Continue
                  </button>
                  <button
                    onClick={() => handleUserApproval('refine')}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    🔄 Discuss & Refine
                  </button>
                  <button
                    onClick={() => handleUserApproval('reject')}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    ❌ Reject & Restart
                  </button>
                  <button
                    onClick={() => handleUserApproval('pause')}
                    className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    ⏸️ Pause & Save
                  </button>
                </div>
                <div className="flex justify-end mt-2">
                  <button onClick={() => onProceedToNextStep?.()} className="px-3 py-1.5 rounded bg-green-600 text-white text-xs">Proceed to next step</button>
                </div>
              </div>
            )}
            {/* per-message Next removed; single floating control shown at container bottom */}
          </div>

          {/* Timestamp */}
          <div className={`text-xs text-gray-400 mt-1 ${
            isUser ? 'text-right' : 'text-left'
          }`}>
            {message.timestamp.getHours().toString().padStart(2, '0')}:{message.timestamp.getMinutes().toString().padStart(2, '0')}
          </div>

          {/* Metadata Cards */}
          {message.metadata && (
            <div className="mt-3 space-y-2">
              {/* Data Confidence */}
              {/* Confidence ribbon removed */}

              {/* Strategy & Effort */}
              {message.metadata.strategy && (
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                  <div className="text-xs text-blue-700 dark:text-blue-300">
                    <strong>🎯 Strategy:</strong> {message.metadata.strategy}
                  </div>
                </div>
              )}

              {message.metadata.effort && (
                <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                  <div className="text-xs text-green-700 dark:text-green-300">
                    <strong>⚡ Effort:</strong> {message.metadata.effort}
                  </div>
                </div>
              )}

              {/* Evidence: messageIds and data points */}
              {Array.isArray((message.metadata as any)?.evidenceMessageIds) && (message.metadata as any).evidenceMessageIds.length > 0 && (
                <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="text-xs text-gray-700 dark:text-gray-300 font-medium mb-1">🔗 Evidence (messageIds)</div>
                  <pre className="text-[11px] leading-4 whitespace-pre-wrap break-words text-gray-600 dark:text-gray-400">{((message.metadata as any).evidenceMessageIds as string[]).slice(0, 8).map(id => `• ${id}`).join('\n')}</pre>
                </div>
              )}

              {Array.isArray(message.metadata.dataPoints) && message.metadata.dataPoints.length > 0 && (
                <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
                  <div className="text-xs text-yellow-800 dark:text-yellow-300 font-medium mb-1">📑 Data Points</div>
                  <ul className="list-disc pl-4 text-[11px] text-yellow-800 dark:text-yellow-300">
                    {message.metadata.dataPoints.slice(0, 6).map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Avatar */}
        {isUser && (
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-sm ml-3 order-1">
            👤
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header with helper prompts */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                BeBrahma
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Your SaaS-Specialized AI Co-Founder
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Dashboard Link */}
            {sessionId && (
              <Link 
                href={`/workspace?tab=dashboard&session=${sessionId}`}
                className="flex items-center gap-2 px-3 py-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors border border-blue-200 dark:border-blue-700"
                title="View Activity Dashboard"
              >
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
            )}
            
            {/* Phase and availability chips per UX */}
            <span className="px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-xs text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600">
              Phase: {progressState.phase.replace('_',' ')}
            </span>
            <span className="px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-xs text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700">
              Stage: {progressState.currentPhase}
            </span>
            <span className="px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-xs text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700">
              Providers: OK
            </span>
            
            {/* Debug: Show raw state values */}
            <span className="px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-xs text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700">
              Debug: {progressState.phase} | {progressState.currentPhase} | {progressState.overallProgress}%
            </span>
            
            {/* Test button to manually update state */}
            <button
              onClick={() => {
                console.log('🔍 DEBUG: Manual state update test');
                setProgressState(prev => {
                  const newState = {
                    ...prev,
                    phase: 'analysis' as const,
                    currentPhase: 'Manual Test - ' + new Date().toLocaleTimeString(),
                    overallProgress: Math.min(prev.overallProgress + 10, 100)
                  };
                  console.log('🔍 DEBUG: Manual state update', { prev, newState });
                  return newState;
                });
              }}
              className="px-2 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-xs text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-700"
            >
              Test State
            </button>
            <button
              onClick={() => setShowDecisionDocument(!showDecisionDocument)}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/30 transition-colors"
            >
              <BarChart3 className="w-4 h-4" />
              {showDecisionDocument ? 'Hide' : 'Show'} Analysis
            </button>
            <button
              onClick={() => setShowContextPanel(!showContextPanel)}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-900/30 transition-colors"
            >
              <Brain className="w-4 h-4" />
              {showContextPanel ? 'Hide' : 'Show'} Context
            </button>
            
            {/* Meeting Room Link */}
            <Link 
              href={`/meeting/${sessionId}`}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/30 transition-colors"
            >
              <CircleDot className="w-4 h-4" />
              Meeting Room
            </Link>
            
            {/* Log Export Button */}
            <button
              onClick={() => {
                const logs = uiLogger.exportLogs();
                const blob = new Blob([logs], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `bebrahma-ui-logs-${new Date().toISOString().split('T')[0]}.txt`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                uiLogger.log('ChatInterface', 'Logs exported', { logCount: uiLogger.getLogs().length });
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              📋 Export Logs
            </button>
            
            {askProceed && (
              <button
                onClick={() => { 
                  setAskProceed(false); 
                  uiLogger.log('ChatInterface', 'Proceed to next step clicked');
                  onProceedToNextStep?.(); 
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                Proceed to next step
              </button>
            )}
            

            
            {decisionDocument && (
              <button
                onClick={() => {
                  downloadDecisionDocument();
                  uiLogger.log('ChatInterface', 'Decision document downloaded');
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-900/30 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            )}
          </div>
        </div>
        {/* Suggested prompts */}
        <div className="mt-3 text-xs text-gray-600 dark:text-gray-400">
          <div className="flex flex-wrap gap-1">
            {getPromptSuggestions(workflowStep).map((p, i) => (
              <button key={i} onClick={() => setInput(p)} className="px-2 py-1 border rounded text-xs hover:bg-gray-50 dark:hover:bg-gray-800">
                “{p}”
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div data-testid="chat-messages" className="flex-1 overflow-y-auto p-6 space-y-4 relative" style={{ scrollBehavior: 'smooth' }}>
            {messages.map(renderMessage)}
            
            {isLoading && (
              <div data-testid="loading-indicator" className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-700 rounded-xl p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                  <div>
                    <h3 className="text-xl font-semibold text-purple-800 dark:text-purple-200">
                      🚀 SaaS Business Team in Action
                    </h3>
                    <p className="text-sm text-purple-600 dark:text-purple-300">
                      {progressState.currentPhase}
                    </p>
                  </div>
                </div>

                {/* Overall Progress */}
                <div className="mb-6">
                  <div className="flex justify-between text-sm text-purple-700 dark:text-purple-300 mb-2">
                    <span>Overall Progress</span>
                    <span>{progressState.overallProgress}%</span>
                  </div>
                  <div className="w-full bg-purple-200 dark:bg-purple-700 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-blue-500 h-3 rounded-full transition-all duration-500 ease-out" 
                      style={{ width: `${progressState.overallProgress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Phase Indicator */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400">
                    <span className="font-medium">Current Phase:</span>
                    <span className="px-3 py-1 bg-purple-100 dark:bg-purple-800 rounded-full font-medium">
                      {progressState.phase.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Budget Tracking */}
                <div className="mb-6">
                  <div className="flex justify-between text-sm text-purple-700 dark:text-purple-300 mb-2">
                    <span>Budget Usage</span>
                    <span>${progressState.currentBudget} / ${progressState.totalBudget}</span>
                  </div>
                  <div className="w-full bg-purple-200 dark:bg-purple-700 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all duration-500 ease-out ${
                        progressState.currentBudget / progressState.totalBudget > 0.8 
                          ? 'bg-orange-500' 
                          : 'bg-gradient-to-r from-purple-500 to-blue-500'
                      }`}
                      style={{ width: `${Math.min((progressState.currentBudget / progressState.totalBudget) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Agent Activities */}
                {progressState.agents.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-medium text-purple-800 dark:text-purple-200 text-sm">
                      👥 Agent Activities
                    </h4>
                    {progressState.agents.map((agent) => (
                      <div key={agent.agentId} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${
                              agent.status === 'complete' ? 'bg-green-500' :
                              agent.status === 'error' ? 'bg-red-500' :
                              agent.status === 'waiting' ? 'bg-gray-400' :
                              'bg-purple-500 animate-pulse'
                            }`}></div>
                            <span className="font-medium text-gray-800 dark:text-gray-200">
                              {agent.agentName}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              ({agent.department})
                            </span>
                          </div>
                          <span className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                            {agent.progress}%
                          </span>
                        </div>
                        
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {agent.currentTask}
                        </div>
                        
                        {/* Agent Progress Bar */}
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-3">
                          <div 
                            className={`h-2 rounded-full transition-all duration-500 ease-out ${
                              agent.status === 'complete' ? 'bg-green-500' :
                              agent.status === 'error' ? 'bg-red-500' :
                              'bg-gradient-to-r from-purple-500 to-blue-500'
                            }`}
                            style={{ width: `${agent.progress}%` }}
                          ></div>
                        </div>
                        
                        {/* Agent Insights */}
                        {agent.insights && agent.insights.length > 0 && (
                          <div className="text-sm text-purple-600 dark:text-purple-400">
                            💡 {agent.insights[agent.insights.length - 1]}
                          </div>
                        )}
                        
                        {/* Agent Error */}
                        {agent.error && (
                          <div className="text-sm text-red-600 dark:text-red-400">
                            ❌ {agent.error}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Estimated Time */}
                {progressState.estimatedTotalTime > 0 && (
                  <div className="text-center text-sm text-purple-600 dark:text-purple-400 mt-6">
                    ⏱️ Estimated completion: {Math.ceil(progressState.estimatedTotalTime / 60)} minutes
                  </div>
                )}
              </div>
            )}
            
            <div ref={messagesEndRef} />
            {/* Floating Next control (always visible when queued) */}
            {stepModeOneByOne && (
              <div className="absolute bottom-4 right-6">
                <button onClick={releaseNext} title="N"
                  className="px-4 py-2 rounded-full bg-blue-600 text-white text-sm shadow-lg">
                  Next message ▸ (N)
                </button>
              </div>
            )}
          </div>

          {/* Input Form */}
          <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <form onSubmit={handleSubmit} className="flex gap-3">
              <input
                data-testid="chat-input"
                type="text"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  if (e.target.value.length > 0 && e.target.value.length % 10 === 0) {
                    uiLogger.log('ChatInterface', 'Input length milestone', { length: e.target.value.length });
                  }
                }}
                placeholder="Describe your SaaS business idea or ask a question..."
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                disabled={isLoading}
              />
              <button
                data-testid="send-button"
                type="submit"
                disabled={isLoading || !input.trim()}
                onClick={() => uiLogger.log('ChatInterface', 'Send button clicked', { hasInput: !!input.trim(), isLoading })}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-medium rounded-xl hover:from-purple-600 hover:to-blue-600 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>



        {/* Analysis Sidebar */}
        {showDecisionDocument && (
          <div className="w-96 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
            <AgentTabs
              messages={messages}
              decisionDocument={decisionDocument}
              activeTab={activeTab}
              onTabChange={(tab) => {
                setActiveTab(tab);
                uiLogger.log('ChatInterface', 'AgentTabs tab changed', { tab });
              }}
            />
          </div>
        )}

        {/* Context Engineering Sidebar */}
        {showContextPanel && (
          <div className="w-96 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
            <div className="p-4">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                Context Engineering
              </h3>
              <ContextEngineeringPanel 
                sessionId={sessionId}
                className="h-full"
              />
            </div>
          </div>
        )}


      </div>
    </div>
  );
}
