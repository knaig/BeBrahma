import { AIAgent, AIResponse, AgentContext } from './types';
import { getAgentById } from '../agents/agent-definitions';
import { getProfessionalAgentById } from '../agents/personality-agents';
import { BUSINESS_AGENTS } from '../agents/business-agents';

export class AIService {
  private get openaiApiKey(): string {
    return process.env['OPENAI_API_KEY'] || '';
  }

  private get anthropicApiKey(): string {
    return process.env['ANTHROPIC_API_KEY'] || '';
  }

  private get perplexityApiKey(): string {
    return process.env['PERPLEXITY_API_KEY'] || '';
  }

  async generateResponse(
    userMessage: string,
    agentId: string,
    context: AgentContext
  ): Promise<AIResponse> {
    // First try to find the agent in regular agent definitions
    let agent = getAgentById(agentId);
    
    // If not found there, try professional agents
    if (!agent) {
      agent = getProfessionalAgentById(agentId);
    }
    
    // If not found there, try business agents
    if (!agent) {
      const businessAgent = BUSINESS_AGENTS.find(a => a.id === agentId);
      if (businessAgent) {
        // Convert BusinessAgent to AIAgent format
        agent = {
          id: businessAgent.id,
          name: businessAgent.name,
          description: businessAgent.title,
          expertise: businessAgent.expertise,
          model: businessAgent.model,
          temperature: businessAgent.temperature,
          maxTokens: businessAgent.maxTokens,
          systemPrompt: businessAgent.systemPrompt,
          tools: businessAgent.tools
        };
      }
    }
    
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    // Determine which model to use based on agent configuration and available APIs
    if (agent.model.includes('gpt') && this.openaiApiKey) {
      return this.generateOpenAIResponse(userMessage, agent, context);
    } else if (agent.model.includes('claude') && this.anthropicApiKey) {
      return this.generateClaudeResponse(userMessage, agent, context);
    } else if (agent.model.includes('perplexity') && this.perplexityApiKey) {
      return this.generatePerplexityResponse(userMessage, agent);
    } else if (this.perplexityApiKey) {
      // Fallback to Perplexity if available
      return this.generatePerplexityResponse(userMessage, agent);
    } else if (this.openaiApiKey) {
      // Fallback to OpenAI if available
      return this.generateOpenAIResponse(userMessage, agent, context);
    } else if (this.anthropicApiKey) {
      // Fallback to Anthropic if available
      return this.generateClaudeResponse(userMessage, agent, context);
    } else {
      throw new Error('No AI API keys configured. Please configure PERPLEXITY_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY');
    }
  }

  private async generateClaudeResponse(
    userMessage: string,
    agent: AIAgent,
    context: AgentContext
  ): Promise<AIResponse> {
    if (!this.anthropicApiKey) {
      throw new Error('Anthropic API key not configured');
    }

    try {
      const messages = this.buildMessageHistory(agent, context, userMessage);
      
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.anthropicApiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: agent.model,
          max_tokens: agent.maxTokens,
          temperature: agent.temperature,
          messages: messages,
          system: agent.systemPrompt
        })
      });

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as any;
      const content = data.content[0]?.text || 'No response generated';
      const tokens = data.usage?.input_tokens + data.usage?.output_tokens || 0;
      const cost = this.calculateCost(agent.model, tokens);

      return {
        content,
        agentId: agent.id,
        model: agent.model,
        tokens,
        cost,
        metadata: {
          model: agent.model,
          temperature: agent.temperature,
          maxTokens: agent.maxTokens
        }
      };
    } catch (error) {
      console.error('Error generating Claude response:', error);
      throw new Error(`Failed to generate AI response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async generateOpenAIResponse(
    userMessage: string,
    agent: AIAgent,
    context: AgentContext
  ): Promise<AIResponse> {
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const messages = this.buildMessageHistory(agent, context, userMessage);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`
        },
        body: JSON.stringify({
          model: agent.model,
          max_tokens: agent.maxTokens,
          temperature: agent.temperature,
          messages: messages
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as any;
      const content = data.choices[0]?.message?.content || 'No response generated';
      const tokens = data.usage?.total_tokens || 0;
      const cost = this.calculateCost(agent.model, tokens);

      return {
        content,
        agentId: agent.id,
        model: agent.model,
        tokens,
        cost,
        metadata: {
          model: agent.model,
          temperature: agent.temperature,
          maxTokens: agent.maxTokens
        }
      };
    } catch (error) {
      console.error('Error generating OpenAI response:', error);
      throw new Error(`Failed to generate AI response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private buildMessageHistory(agent: AIAgent, context: AgentContext, userMessage: string): any[] {
    const messages = [
      { role: 'system', content: agent.systemPrompt },
      { role: 'user', content: userMessage }
    ];

    // Add conversation history if available
    if (context.conversationHistory && context.conversationHistory.length > 0) {
      const recentMessages = context.conversationHistory.slice(-5); // Last 5 messages
      recentMessages.forEach(msg => {
        messages.push({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.content
        });
      });
    }

    return messages;
  }

  private buildPerplexityMessages(agent: AIAgent, userMessage: string): any[] {
    // Perplexity expects a simpler format
    return [
      { role: 'system', content: agent.systemPrompt },
      { role: 'user', content: userMessage }
    ];
  }

  private calculateCost(model: string, tokens: number): number {
    const costPer1kTokens = this.getCostPer1kTokens(model);
    return (tokens / 1000) * costPer1kTokens;
  }

  private getCostPer1kTokens(model: string): number {
    const costMap: Record<string, number> = {
      'gpt-4-turbo-preview': 0.01,
      'gpt-4': 0.03,
      'gpt-3.5-turbo': 0.002,
      'claude-3-opus-20240229': 0.015,
      'claude-3-sonnet-20240229': 0.003,
      'claude-3-haiku-20240307': 0.00025,
      'perplexity-sonar': 0.0001 // Perplexity is very cost-effective
    };

    return costMap[model] || 0.01; // Default cost
  }

  async autoSelectAgent(userMessage: string): Promise<string> {
    // Simple keyword-based agent selection
    const message = userMessage.toLowerCase();
    
    if (message.includes('market') || message.includes('research') || message.includes('competitor')) {
      return 'research';
    } else if (message.includes('validate') || message.includes('test') || message.includes('customer')) {
      return 'validation';
    } else if (message.includes('strategy') || message.includes('business model') || message.includes('go-to-market')) {
      return 'strategy';
    } else if (message.includes('trend') || message.includes('opportunity') || message.includes('industry')) {
      return 'market';
    } else {
      return 'strategy'; // Default agent
    }
  }

  private async generatePerplexityResponse(
    userMessage: string,
    agent: AIAgent
  ): Promise<AIResponse> {
    if (!this.perplexityApiKey) {
      throw new Error('Perplexity API key not configured');
    }

    try {
      const messages = this.buildPerplexityMessages(agent, userMessage);
      
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.perplexityApiKey}`
        },
        body: JSON.stringify({
          model: 'sonar-pro',
          max_tokens: agent.maxTokens,
          temperature: agent.temperature,
          messages: messages
        })
      });

      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as any;
      const content = data.choices[0]?.message?.content || 'No response generated';
      const tokens = data.usage?.total_tokens || 0;
      const cost = this.calculateCost('perplexity-sonar', tokens);

      return {
        content,
        agentId: agent.id,
        model: 'perplexity-sonar',
        tokens,
        cost,
        metadata: {
          model: 'perplexity-sonar',
          temperature: agent.temperature,
          maxTokens: agent.maxTokens
        }
      };
    } catch (error) {
      console.error('Error generating Perplexity response:', error);
      throw new Error(`Failed to generate AI response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate a user-friendly response that shows relevant thinking steps
   * while hiding internal technical details
   */
  async generateUserFriendlyResponse(
    userMessage: string,
    agentId: string,
    context: AgentContext
  ): Promise<{ userResponse: string; internalResponse: AIResponse }> {
    // Get the full internal response first
    const internalResponse = await this.generateResponse(userMessage, agentId, context);
    
    // Create user-friendly version
    const userResponse = this.createUserFriendlyResponse(internalResponse, agentId);
    
    return {
      userResponse,
      internalResponse
    };
  }

  /**
   * Transform internal response into user-friendly format
   */
  private createUserFriendlyResponse(response: AIResponse, agentId: string): string {
    const agent = this.getAgentById(agentId);
    if (!agent) {
      return response.content;
    }

    // Extract the core content
    let userContent = response.content;

    // Add agent context in user-friendly way
    const agentContext = `**${agent.name}** (${agent.description})`;
    
    // Add thinking process indicators
    const thinkingSteps = this.extractThinkingSteps(userContent);
    
    // Format for user consumption
    return `${agentContext}\n\n${thinkingSteps}\n\n**Recommendation:**\n${userContent}`;
  }

  /**
   * Extract and format thinking steps from agent response
   */
  private extractThinkingSteps(content: string): string {
    // Look for common thinking patterns and format them nicely
    const steps = [];
    
    // Extract numbered lists, bullet points, or structured thinking
    const lines = content.split('\n');
    let currentStep = '';
    
    for (const line of lines) {
      if (line.match(/^\d+\./) || line.match(/^[-*•]/) || line.match(/^##/)) {
        if (currentStep) steps.push(currentStep.trim());
        currentStep = line;
      } else if (line.trim() && currentStep) {
        currentStep += ' ' + line.trim();
      }
    }
    if (currentStep) steps.push(currentStep.trim());

    if (steps.length > 0) {
      return `**My Thinking Process:**\n${steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}`;
    }

    // If no clear steps, create a summary
    return `**My Analysis:**\nI've analyzed your request and considered various factors including market conditions, best practices, and strategic implications.`;
  }

  /**
   * Get agent by ID from all available sources
   */
  private getAgentById(agentId: string): AIAgent | undefined {
    // Check personality agents first
    let agent = getProfessionalAgentById(agentId);
    
    // If not found there, try business agents
    if (!agent) {
      const businessAgent = BUSINESS_AGENTS.find(a => a.id === agentId);
      if (businessAgent) {
        // Convert BusinessAgent to AIAgent format
        agent = {
          id: businessAgent.id,
          name: businessAgent.name,
          description: businessAgent.title,
          expertise: businessAgent.expertise,
          model: businessAgent.model,
          temperature: businessAgent.temperature,
          maxTokens: businessAgent.maxTokens,
          systemPrompt: businessAgent.systemPrompt,
          tools: businessAgent.tools
        };
      }
    }
    
    return agent;
  }
}
