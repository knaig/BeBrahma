export interface WorkflowMessage {
  id?: string;
  content: string;
  agentId: string;
  agentName?: string;
  agentTitle?: string;
  agentDepartment?: string;
  timestamp?: string;
  metadata?: Record<string, any>;
}

export interface WorkflowState {
  sessionId: string;
  stage: string | null;
  stageStatus: string | null;
  stageProgress: Record<string, any>;
  pendingDecision: boolean;
  decisionOptions: string[];
  messages: WorkflowMessage[];
}

export interface StartWorkflowRequest {
  sessionId: string;
  task: string;
  context?: Record<string, any>;
}

export interface NextMessageRequest {
  sessionId: string;
}

export interface DecisionRequest {
  sessionId: string;
  decision: string;
  userMessage?: string;
}

export interface ContinueSessionRequest {
  sessionId: string;
  userMessage: string;
}

export interface WorkflowResponse {
  success: boolean;
  messages?: WorkflowMessage[];
  stage?: string | null;
  stageStatus?: string | null;
  stageProgress?: Record<string, any>;
  pendingDecision?: boolean;
  decisionOptions?: string[];
  error?: string;
}

class LangGraphClient {
  private baseURL: string;

  constructor() {
    this.baseURL = '/api';
  }

  private async makeRequest(
    endpoint: string,
    options: RequestInit = {},
    maxRetries: number = 2,
    baseDelay: number = 300
  ): Promise<any> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      try {
        const response = await fetch(`${this.baseURL}${endpoint}`, {
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
          signal: controller.signal,
          ...options,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          const error = new Error(`HTTP ${response.status}: ${errorText}`);
          
          // Don't retry on 4xx errors (client errors)
          if (response.status >= 400 && response.status < 500) {
            throw error;
          }
          
          lastError = error;
          
          // If this was the last attempt, throw the error
          if (attempt === maxRetries) {
            throw error;
          }
          
          // Wait before retrying with exponential backoff
          const delay = baseDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        return response.json();
      } catch (error) {
        clearTimeout(timeoutId);
        
        // Handle AbortError (timeout) and network errors
        if (error instanceof Error) {
          lastError = error;
          
          // Don't retry on AbortError unless it's a timeout
          if (error.name === 'AbortError') {
            if (attempt === maxRetries) {
              throw new Error('Request timed out after retries');
            }
          }
          // Don't retry on TypeError (network/CORS errors) on last attempt
          else if (error.name === 'TypeError' && attempt === maxRetries) {
            throw error;
          }
        }
        
        // If this was the last attempt, throw the last error
        if (attempt === maxRetries) {
          throw lastError || error;
        }
        
        // Wait before retrying with exponential backoff
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError || new Error('Request failed after retries');
  }

  async startWorkflowSession(
    taskDescription: string,
    sessionId?: string
  ): Promise<WorkflowResponse> {
    const requestSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return this.makeRequest('/chat/crew/start', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: requestSessionId,
        task: taskDescription,
        context: {}
      } as StartWorkflowRequest),
    });
  }

  async getNextMessage(sessionId: string): Promise<WorkflowResponse> {
    return this.makeRequest('/chat/crew/next', {
      method: 'POST',
      body: JSON.stringify({
        sessionId
      } as NextMessageRequest),
    });
  }

  async getWorkflowStatus(sessionId: string): Promise<WorkflowState> {
    const response = await this.makeRequest(`/chat/crew/status/${sessionId}`, {
      method: 'GET',
    });
    
    return {
      sessionId,
      stage: response.stage || null,
      stageStatus: response.stageStatus || null,
      stageProgress: response.stageProgress || {},
      pendingDecision: response.pendingDecision || false,
      decisionOptions: response.decisionOptions || [],
      messages: response.messages || []
    };
  }

  async sendDecision(
    sessionId: string,
    decision: string,
    userMessage?: string
  ): Promise<WorkflowResponse> {
    return this.makeRequest('/chat/crew/decision', {
      method: 'POST',
      body: JSON.stringify({
        sessionId,
        decision,
        userMessage: userMessage || 'User decision'
      } as DecisionRequest),
    });
  }

  async continueSession(
    sessionId: string,
    userMessage: string
  ): Promise<WorkflowResponse> {
    return this.makeRequest('/chat/crew/continue', {
      method: 'POST',
      body: JSON.stringify({
        sessionId,
        phase: 'next',
        userMessage
      }),
    });
  }

  async getMemory(sessionId: string): Promise<any> {
    return this.makeRequest(`/chat/memory/${sessionId}`, {
      method: 'GET',
    });
  }

  async getNotes(sessionId: string): Promise<any> {
    return this.makeRequest(`/chat/notes/${sessionId}`, {
      method: 'GET',
    });
  }

  async summarize(sessionId: string, content: string): Promise<any> {
    return this.makeRequest('/chat/summarize', {
      method: 'POST',
      body: JSON.stringify({
        sessionId,
        content
      }),
    });
  }

  async getTools(): Promise<any> {
    return this.makeRequest('/chat/tools', {
      method: 'GET',
    });
  }

  async getToolTraces(sessionId: string): Promise<any> {
    return this.makeRequest(`/chat/tools/traces/${sessionId}`, {
      method: 'GET',
    });
  }

  async getTrace(sessionId: string): Promise<any> {
    return this.makeRequest(`/chat/trace/${sessionId}`, {
      method: 'GET',
    });
  }

  async getProgress(sessionId: string): Promise<any> {
    return this.makeRequest(`/chat/progress/${sessionId}`, {
      method: 'GET',
    });
  }
}

export const langgraphClient = new LangGraphClient();
export default langgraphClient;