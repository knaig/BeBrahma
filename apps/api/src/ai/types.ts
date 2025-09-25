export interface AIAgent {
  id: string;
  name: string;
  description: string;
  expertise: string[];
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  tools: string[];
}

export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai' | 'agent';
  timestamp: Date;
  agentId?: string;
  agentName?: string;
  agentTitle?: string;
  department?: string;
  type?: string;
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
    dataPlan?: any;
    internalResponse?: any;
    selectedAgents?: Array<{
      id: string;
      name: string;
      department: string;
      expertise: string[];
      strategy: string;
    }>;
  };
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface ChatSession {
  id: string;
  userId: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AIResponse {
  content: string;
  agentId: string;
  model: string;
  tokens: number;
  cost: number;
  metadata?: {
    model: string;
    temperature: number;
    maxTokens: number;
    dataQueries?: any[];
    confidence?: number;
    sampleSize?: number;
    [key: string]: any; // Allow additional properties
  };
}

export interface AgentContext {
  sessionId: string;
  userId: string;
  conversationHistory: ChatMessage[];
  availableTools: string[];
  userPreferences: Record<string, any>;
  previousMessages?: any[]; // Add this for compatibility
}

export interface AIModel {
  name: string;
  provider: 'openai' | 'anthropic';
  maxTokens: number;
  costPerToken: number;
}

export interface ModelConfig {
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
}
