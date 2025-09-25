'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Send, 
  Bot, 
  User, 
  Lightbulb, 
  Target, 
  Zap, 
  Search, 
  CheckCircle, 
  TrendingUp, 
  ClipboardList,
  Users,
  Shield,
  Brain,
  BarChart3,
  Eye,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  Edit3,
  Play,
  Pause,
  Circle
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  workflowStep: string;
  problem?: {
    rawInput?: string;
    clarifiedProblem?: string;
  };
  solutions: Array<{
    id: string;
    title: string;
  }>;
  selectedSolution?: string;
}

interface WorkflowChatWidgetProps {
  project: Project;
  onUpdate: (project: Project) => void;
}

interface Agent {
  id: string;
  name: string;
  role: string;
  department: string;
  avatar: string;
  status: 'thinking' | 'speaking' | 'listening' | 'idle';
}

interface ChatMessage {
  id: string;
  type: 'user' | 'agent' | 'system' | 'decision';
  agentId?: string;
  content: string;
  timestamp: Date;
  metadata?: {
    confidence?: number;
    reasoning?: string;
    sources?: string[];
  };
}

interface Decision {
  id: string;
  title: string;
  description: string;
  options: string[];
  agentRecommendations: { [agentId: string]: string };
  userChoice?: string;
  status: 'pending' | 'approved' | 'rejected' | 'modified';
}

export function WorkflowChatWidget({ project, onUpdate }: WorkflowChatWidgetProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'team' | 'decisions'>('chat');
  const [agents, setAgents] = useState<Agent[]>([
    {
      id: 'leadership',
      name: 'Captain Sarah',
      role: 'Leadership & Strategy',
      department: 'leadership',
      avatar: '👩‍💼',
      status: 'thinking'
    },
    {
      id: 'technical',
      name: 'Dr. Emily Rodriguez',
      role: 'CTO & Technical Lead',
      department: 'technical',
      avatar: '👩‍💻',
      status: 'listening'
    },
    {
      id: 'business',
      name: 'Michael Chen',
      role: 'Growth & Business Model',
      department: 'business',
      avatar: '👨‍💼',
      status: 'idle'
    },
    {
      id: 'domain',
      name: 'Domain Doctor Dave',
      role: 'Industry Expert',
      department: 'domain',
      avatar: '👨‍⚕️',
      status: 'idle'
    },
    {
      id: 'critical',
      name: 'Critical Cassandra',
      role: 'Risk Guardian',
      department: 'critical',
      avatar: '⚠️',
      status: 'idle'
    },
    {
      id: 'saas',
      name: 'SaaS Sage Sarah',
      role: 'SaaS Business Expert',
      department: 'saas',
      avatar: '💼',
      status: 'idle'
    }
  ]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [currentDecision, setCurrentDecision] = useState<Decision | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize with welcome message and agent introduction
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: '1',
        type: 'system',
        content: `🚀 **Welcome to the BeBrahma AI Co-Founder Meeting Room!**

Your AI team is ready to help you build your startup: **${project.name}**

**Current Workflow Step:** ${getStepLabel(project.workflowStep)}

**Your AI Team:**
• **Captain Sarah** (Leadership) - Strategic direction and team coordination
• **Dr. Emily Rodriguez** (Technical) - Technical feasibility and architecture
• **Michael Chen** (Business) - Business model and growth strategy
• **Domain Doctor Dave** (Industry) - Industry-specific insights
• **Critical Cassandra** (Risk) - Risk assessment and reality checks
• **SaaS Sage Sarah** (SaaS) - SaaS business model expertise

**How to use this meeting room:**
1. Ask questions about your current step
2. Agents will debate and provide insights
3. Approve, reject, or modify their recommendations
4. Decisions automatically update your workflow

What would you like to discuss about your ${getStepLabel(project.workflowStep).toLowerCase()} step?`,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, [project.workflowStep, project.name, messages.length]);

  const getStepLabel = (step: string): string => {
    const labels = {
      'PROBLEM_CAPTURE': 'Problem Capture',
      'PROBLEM_CLARIFICATION': 'Problem Clarification',
      'SOLUTION_BRAINSTORM': 'Solution Brainstorming',
      'COMPETITOR_ANALYSIS': 'Competitor Analysis',
      'SCA_ANALYSIS': 'SCA Analysis',
      'MVP_PLANNING': 'MVP Planning',
      'TASK_GENERATION': 'Task Generation'
    };
    return labels[step as keyof typeof labels] || step;
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Simulate multi-agent discussion
    await simulateMultiAgentDiscussion(inputValue, project);
    setIsLoading(false);
  };

  const simulateMultiAgentDiscussion = async (userInput: string, project: Project) => {
    setIsStreaming(true);
    
    // Agent 1 responds
    const agent1 = agents[0];
    setAgents(prev => prev.map(a => 
      a.id === agent1.id ? { ...a, status: 'speaking' } : a
    ));
    
    const response1 = await generateAgentResponse(agent1, userInput, project);
    const message1: ChatMessage = {
      id: Date.now().toString(),
      type: 'agent',
      agentId: agent1.id,
      content: response1,
      timestamp: new Date(),
      metadata: {
        confidence: 0.85,
        reasoning: 'Based on leadership principles and strategic thinking',
        sources: ['Startup strategy frameworks', 'Market analysis']
      }
    };
    
    setMessages(prev => [...prev, message1]);
    setAgents(prev => prev.map(a => 
      a.id === agent1.id ? { ...a, status: 'listening' } : a
    ));

    // Agent 2 responds
    const agent2 = agents[1];
    setAgents(prev => prev.map(a => 
      a.id === agent2.id ? { ...a, status: 'speaking' } : a
    ));
    
    const response2 = await generateAgentResponse(agent2, userInput, project);
    const message2: ChatMessage = {
      id: (Date.now() + 1).toString(),
      type: 'agent',
      agentId: agent2.id,
      content: response2,
      timestamp: new Date(),
      metadata: {
        confidence: 0.78,
        reasoning: 'From technical feasibility perspective',
        sources: ['Technical architecture patterns', 'Development best practices']
      }
    };
    
    setMessages(prev => [...prev, message2]);
    setAgents(prev => prev.map(a => 
      a.id === agent2.id ? { ...a, status: 'listening' } : a
    ));

    // Generate decision point
    const decision = generateDecisionPoint(userInput, project, [response1, response2]);
    if (decision) {
      setDecisions(prev => [...prev, decision]);
      setCurrentDecision(decision);
      
      const decisionMessage: ChatMessage = {
        id: (Date.now() + 2).toString(),
        type: 'decision',
        content: `🎯 **Decision Point: ${decision.title}**

${decision.description}

**Agent Recommendations:**
${Object.entries(decision.agentRecommendations).map(([agentId, rec]) => {
  const agent = agents.find(a => a.id === agentId);
  return `• ${agent?.avatar} **${agent?.name}**: ${rec}`;
}).join('\n')}

**Please choose:** Approve ✅ | Reject ❌ | Modify ✏️\n\n(Evidence and traceability will appear in the Analysis panel)`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, decisionMessage]);
    }

    // Reset agent statuses
    setAgents(prev => prev.map(a => ({ ...a, status: 'idle' })));
    setIsStreaming(false);
  };

  const generateAgentResponse = async (agent: Agent, userInput: string, project: Project): Promise<string> => {
    // Simulate agent thinking and response generation
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const step = project.workflowStep;
    const lowerInput = userInput.toLowerCase();
    
    if (agent.department === 'leadership') {
      return `**${agent.name} (Leadership):** From a strategic perspective, I see this as a ${step.toLowerCase()} opportunity. The key is to focus on the core value proposition and ensure we're solving a real market need. I recommend we prioritize clarity and market validation before moving to execution.`;
    } else if (agent.department === 'technical') {
      return `**${agent.name} (Technical):** Technically, this is feasible. I'd suggest we start with a simple prototype to validate the concept. The architecture should be scalable from day one, but we can iterate on the implementation.`;
    } else if (agent.department === 'business') {
      return `**${agent.name} (Business):** From a business model perspective, I see potential here. We should focus on customer acquisition costs and lifetime value. I recommend starting with a freemium model to validate demand.`;
    } else if (agent.department === 'critical') {
      return `**${agent.name} (Risk):** I need to raise some concerns. Have we validated that this problem actually exists? What's the evidence that customers will pay for this solution? We need to be realistic about the market size.`;
    }
    
    return `**${agent.name}:** I'm analyzing this from my perspective. Let me think through the implications...`;
  };

  const generateDecisionPoint = (userInput: string, project: Project, agentResponses: string[]): Decision | null => {
    const step = project.workflowStep;
    
    if (step === '') {
      return {
        id: Date.now().toString(),
        title: 'Problem Statement Validation',
        description: 'Based on our discussion, we need to validate if this problem statement is specific enough and addresses a real market need.',
        options: ['Proceed with current statement', 'Refine the problem statement', 'Research market validation'],
        agentRecommendations: {
          'leadership': 'Refine for clarity and market focus',
          'critical': 'Need more market validation',
          'business': 'Proceed but with customer interviews'
        },
        status: 'pending'
      };
    }
    
    if (step === '') {
      return {
        id: Date.now().toString(),
        title: 'Solution Selection',
        description: 'We have multiple solution approaches. Which direction should we pursue for MVP development?',
        options: ['Technical solution A', 'Business model B', 'Hybrid approach C'],
        agentRecommendations: {
          'technical': 'Solution A is most feasible',
          'business': 'Model B has better market fit',
          'leadership': 'Hybrid approach balances both'
        },
        status: 'pending'
      };
    }
    
    return null;
  };

  const handleDecision = (decisionId: string, action: 'approve' | 'reject' | 'modify', userChoice?: string) => {
    setDecisions(prev => prev.map(d => 
      d.id === decisionId 
        ? { ...d, status: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'modified', userChoice }
        : d
    ));
    
    const decision = decisions.find(d => d.id === decisionId);
    if (decision && action === 'approve') {
      // Update workflow based on decision
      updateWorkflowFromDecision(decision);
    }
    
    setCurrentDecision(null);
  };

  const updateWorkflowFromDecision = (decision: Decision) => {
    if (decision.title === 'Problem Statement Validation') {
      // Update problem statement in workflow
      onUpdate({
        ...project,
        problem: {
          ...project.problem,
          clarifiedProblem: `Validated problem statement: ${decision.description}`
        }
      });
    } else if (decision.title === 'Solution Selection') {
      // Update solution selection in workflow
      onUpdate({
        ...project,
        selectedSolution: decision.userChoice || 'Selected solution based on team consensus'
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'thinking': return <Brain className="h-4 w-4 text-blue-500" />;
      case 'speaking': return <MessageSquare className="h-4 w-4 text-green-500" />;
      case 'listening': return <Eye className="h-4 w-4 text-yellow-500" />;
      case 'idle': return <Pause className="h-4 w-4 text-gray-500" />;
      default: return <Circle className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center">
            <span className="text-2xl mr-2">🤖</span>
            AI Co-Founder Meeting Room
          </CardTitle>
          <div className="flex space-x-1">
            <Button
              variant={activeTab === 'chat' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('chat')}
            >
              💬 Chat
            </Button>
            <Button
              variant={activeTab === 'team' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('team')}
            >
              👥 Team
            </Button>
            <Button
              variant={activeTab === 'decisions' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('decisions')}
            >
              🎯 Decisions
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {activeTab === 'chat' && (
          <div className="flex flex-col h-96">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs lg:max-w-md p-3 rounded-lg ${
                    message.type === 'user' 
                      ? 'bg-blue-500 text-white' 
                      : message.type === 'agent'
                      ? 'bg-gray-100 text-gray-800'
                      : message.type === 'decision'
                      ? 'bg-yellow-50 border border-yellow-200 text-yellow-800'
                      : 'bg-gray-50 text-gray-600'
                  }`}>
                    {message.type === 'agent' && (
                      <div className="flex items-center mb-2">
                        <span className="mr-2">{agents.find(a => a.id === message.agentId)?.avatar}</span>
                        <span className="font-semibold text-sm">
                          {agents.find(a => a.id === message.agentId)?.name}
                        </span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {agents.find(a => a.id === message.agentId)?.role}
                        </Badge>
                      </div>
                    )}
                    <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                    {message.type === 'decision' && (
                      <div className="flex space-x-2 mt-3">
                        <Button size="sm" onClick={() => handleDecision(message.id, 'approve')} className="bg-green-600 hover:bg-green-700">
                          ✅ Approve
                        </Button>
                        <Button size="sm" onClick={() => handleDecision(message.id, 'reject')} variant="outline" className="border-red-200 text-red-600 hover:bg-red-50">
                          ❌ Reject
                        </Button>
                        <Button size="sm" onClick={() => handleDecision(message.id, 'modify')} variant="outline">
                          ✏️ Modify
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Input */}
            <div className="p-4 border-t">
              <div className="flex space-x-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask your AI team anything..."
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  disabled={isLoading}
                />
                <Button onClick={handleSendMessage} disabled={isLoading || !inputValue.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'team' && (
          <div className="p-4 space-y-3">
            <h3 className="font-semibold mb-3">Your AI Team Status</h3>
            {agents.map((agent) => (
              <div key={agent.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{agent.avatar}</span>
                  <div>
                    <div className="font-semibold">{agent.name}</div>
                    <div className="text-sm text-gray-600">{agent.role}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(agent.status)}
                  <Badge variant="outline" className="text-xs">
                    {agent.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {activeTab === 'decisions' && (
          <div className="p-4 space-y-3">
            <h3 className="font-semibold mb-3">Decision History</h3>
            {decisions.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No decisions made yet. Start a conversation to see decision points!</p>
            ) : (
              decisions.map((decision) => (
                <div key={decision.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">{decision.title}</h4>
                    <Badge variant={decision.status === 'approved' ? 'default' : decision.status === 'rejected' ? 'destructive' : 'outline'}>
                      {decision.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{decision.description}</p>
                  {decision.userChoice && (
                    <p className="text-sm text-green-600">✅ User choice: {decision.userChoice}</p>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
