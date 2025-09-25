import { PrismaClient, AgentPersona, AgentRole } from '@prisma/client';

const prisma = new PrismaClient();

interface PersonalityTraits {
  formality: number; // 0-1 scale
  enthusiasm: number; // 0-1 scale  
  analyticalness: number; // 0-1 scale
  empathy: number; // 0-1 scale
  directness: number; // 0-1 scale
}

interface AgentConfig {
  id: string;
  name: string;
  role: AgentRole;
  position: { x: number; y: number };
  status: 'idle' | 'thinking' | 'speaking' | 'listening';
  avatar: string;
  color: string;
  persona?: AgentPersona;
}

export class AgentPersonalityService {
  
  /**
   * Load agent persona from database
   */
  async getAgentPersona(role: AgentRole): Promise<AgentPersona | null> {
    try {
      return await prisma.agentPersona.findUnique({
        where: { role }
      });
    } catch (error) {
      console.error('Error loading agent persona:', error);
      return null;
    }
  }

  /**
   * Load all agent personas
   */
  async getAllAgentPersonas(): Promise<AgentPersona[]> {
    try {
      return await prisma.agentPersona.findMany({
        orderBy: { role: 'asc' }
      });
    } catch (error) {
      console.error('Error loading agent personas:', error);
      return [];
    }
  }

  /**
   * Apply personality-driven message transformation
   */
  applyPersonalityToMessage(message: string, persona: AgentPersona): string {
    const traits = persona.personalityTraits as PersonalityTraits;
    let enhancedMessage = message;

    // Apply formality level
    if (traits.formality > 0.8) {
      // High formality - add professional language
      enhancedMessage = this.addFormalLanguage(enhancedMessage);
    } else if (traits.formality < 0.4) {
      // Low formality - add casual language
      enhancedMessage = this.addCasualLanguage(enhancedMessage);
    }

    // Apply enthusiasm level
    if (traits.enthusiasm > 0.8) {
      // High enthusiasm - add energetic language and emojis
      enhancedMessage = this.addEnthusiasm(enhancedMessage);
    }

    // Apply analytical nature
    if (traits.analyticalness > 0.8) {
      // High analytical - add data-driven language
      enhancedMessage = this.addAnalyticalLanguage(enhancedMessage, persona.role);
    }

    // Apply empathy
    if (traits.empathy > 0.7) {
      // High empathy - add considerate language
      enhancedMessage = this.addEmpathyLanguage(enhancedMessage);
    }

    // Apply directness
    if (traits.directness > 0.8) {
      // High directness - make message more concise and direct
      enhancedMessage = this.addDirectness(enhancedMessage);
    }

    return enhancedMessage;
  }

  /**
   * Generate personality-aware prompt for LLM
   */
  generatePersonalityPrompt(userMessage: string, persona: AgentPersona, context?: string): string {
    const basePrompt = `You are ${persona.name}, ${persona.title} in the ${persona.department} department.

Your speaking style: ${persona.speakingStyle}

Personality traits: ${JSON.stringify(persona.personalityTraits)}

Please respond to the following message in character, maintaining your unique personality and speaking style:

${context ? `Context: ${context}\n` : ''}User message: "${userMessage}"

Remember to:
1. Stay true to your role as ${persona.role}
2. Use your characteristic speaking style
3. Apply your personality traits consistently
4. Provide insights relevant to your expertise area`;

    return basePrompt;
  }

  /**
   * Get default agent configuration compatible with VirtualMeetingRoom
   */
  async getDefaultAgentConfig(): Promise<AgentConfig[]> {
    const personas = await this.getAllAgentPersonas();
    
    const defaultPositions = [
      { x: 300, y: 150 }, // Top
      { x: 450, y: 200 }, // Top-right
      { x: 500, y: 350 }, // Right
      { x: 450, y: 500 }, // Bottom-right
      { x: 300, y: 550 }, // Bottom
      { x: 150, y: 500 }, // Bottom-left
      { x: 100, y: 350 }, // Left
      { x: 150, y: 200 }, // Top-left
    ];

    return personas.map((persona, index) => ({
      id: persona.id,
      name: persona.name,
      role: persona.role,
      position: defaultPositions[index] || { x: 300, y: 300 },
      status: 'idle' as const,
      avatar: persona.avatarUrl || '',
      color: persona.colorHex,
      persona
    }));
  }

  /**
   * Format message with agent's speaking style
   */
  formatMessageWithPersonality(message: string, persona: AgentPersona): {
    content: string;
    style: string;
    metadata: any;
  } {
    const enhancedMessage = this.applyPersonalityToMessage(message, persona);
    
    return {
      content: enhancedMessage,
      style: persona.speakingStyle,
      metadata: {
        agentName: persona.name,
        agentRole: persona.role,
        department: persona.department,
        personalityTraits: persona.personalityTraits,
        colorHex: persona.colorHex
      }
    };
  }

  // Private helper methods for personality transformations

  private addFormalLanguage(message: string): string {
    // Add formal language patterns
    const formalPhrases = [
      { from: /^(\w)/, to: 'I would like to $1' },
      { from: /\bwant to\b/g, to: 'would like to' },
      { from: /\bthink\b/g, to: 'believe' },
      { from: /\bgood\b/g, to: 'excellent' }
    ];

    let result = message;
    formalPhrases.forEach(phrase => {
      result = result.replace(phrase.from, phrase.to);
    });

    return result;
  }

  private addCasualLanguage(message: string): string {
    // Add casual language patterns
    const casualPhrases = [
      { from: /I believe/g, to: 'I think' },
      { from: /excellent/g, to: 'great' },
      { from: /furthermore/g, to: 'also' }
    ];

    let result = message;
    casualPhrases.forEach(phrase => {
      result = result.replace(phrase.from, phrase.to);
    });

    return result;
  }

  private addEnthusiasm(message: string): string {
    // Add enthusiastic language
    const enthusiasticWords = ['fantastic', 'exciting', 'amazing', 'brilliant'];
    const emojis = ['💡', '🚀', '✨', '🎯'];
    
    // Add an enthusiastic word occasionally
    if (Math.random() > 0.7) {
      const word = enthusiasticWords[Math.floor(Math.random() * enthusiasticWords.length)];
      message = message.replace(/\bgood\b/g, word);
    }

    // Add an emoji occasionally
    if (Math.random() > 0.8) {
      const emoji = emojis[Math.floor(Math.random() * emojis.length)];
      message += ` ${emoji}`;
    }

    return message;
  }

  private addAnalyticalLanguage(message: string, role: AgentRole): string {
    // Add role-specific analytical language
    const analyticalPhrases: { [key in AgentRole]?: string[] } = {
      Data: ['Based on the metrics', 'The data suggests', 'Statistical analysis shows'],
      Research: ['Research indicates', 'Studies show', 'Evidence suggests'],
      Strategy: ['Strategic analysis reveals', 'Market research shows', 'Competitive analysis indicates'],
      CTO: ['Technical analysis shows', 'System metrics indicate', 'Performance data suggests'],
      PM: ['User research shows', 'Product metrics indicate', 'Usage data suggests']
    };

    const phrases = analyticalPhrases[role];
    if (phrases && Math.random() > 0.6) {
      const phrase = phrases[Math.floor(Math.random() * phrases.length)];
      message = `${phrase} that ${message.toLowerCase()}`;
    }

    return message;
  }

  private addEmpathyLanguage(message: string): string {
    // Add empathetic language patterns
    const empathyPhrases = [
      'I understand that',
      'I appreciate your perspective on',
      'I can see how',
      'Thank you for sharing'
    ];

    if (Math.random() > 0.7) {
      const phrase = empathyPhrases[Math.floor(Math.random() * empathyPhrases.length)];
      message = `${phrase} ${message.toLowerCase()}`;
    }

    return message;
  }

  private addDirectness(message: string): string {
    // Make message more direct and concise
    const directReplacements = [
      { from: /I think that maybe we could/g, to: 'We should' },
      { from: /It might be a good idea to/g, to: 'We need to' },
      { from: /Perhaps we should consider/g, to: 'We must' },
      { from: /\bI believe\b/g, to: 'I know' }
    ];

    let result = message;
    directReplacements.forEach(replacement => {
      result = result.replace(replacement.from, replacement.to);
    });

    return result;
  }
}

// Export singleton instance
export const agentPersonalityService = new AgentPersonalityService();