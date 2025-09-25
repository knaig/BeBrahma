import { ConversationSummaryBufferMemory } from 'langchain/memory';
import { ChatOpenAI } from '@langchain/openai';
import { PrismaClient } from '@prisma/client';

export interface ConversationSession {
  id: string;
  userId: string;
  sessionId: string;
  problem: string;
  messages: Message[];
  summary: string;
  createdAt: Date;
  updatedAt: Date;
  metadata: {
    insights?: string[];
    recommendations?: string[];
    marketTrends?: string[];
    userPreferences?: string[];
    analysisType?: string;
    confidence?: number;
    dataSources?: string[];
    planPhase?: string;
    archived?: boolean;
    archiveReason?: string;
    finalMessageCount?: number;
    archivedAt?: Date;
  };
}

export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'agent' | 'ai' | 'planner';
  timestamp: Date;
  metadata?: {
    insights?: string[];
    confidence?: number;
    dataSources?: string[];
    planPhase?: string;
  };
}

export interface MemoryContext {
  chatHistory: string;
  summary: string;
  insights: string[];
  marketTrends: string[];
  userPreferences: string[];
  currentSession: ConversationSession | null;
}

export interface SessionArchive {
  reason: string;
  finalMessageCount: number;
  summary: string;
  archivedAt: Date;
}

export interface SessionStats {
  totalMessages: number;
  sessionDuration: number;
  averageMessageLength: number;
  userMessageCount: number;
  aiMessageCount: number;
  lastActivity: Date;
}

export class ConversationMemoryManager {
  private memory: ConversationSummaryBufferMemory;
  private prisma: PrismaClient;
  private currentSession: ConversationSession | null = null;
  private messageBuffer: Message[] = [];
  private readonly MAX_BUFFER_SIZE = 50; // Increased buffer size
  private sessionCache: Map<string, ConversationSession> = new Map();

  constructor(apiKey: string) {
    const llm = new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName: 'gpt-3.5-turbo',
      temperature: 0.1,
    });
    
    this.memory = new ConversationSummaryBufferMemory({
      llm,
      maxTokenLimit: 2000, // Increased token limit
      memoryKey: 'chat_history',
      returnMessages: false,
    });
    
    this.prisma = new PrismaClient();
  }

  async initializeSession(userId: string, sessionId: string, problem: string): Promise<ConversationSession> {
    try {
      const sessionKey = `${userId}_${sessionId}`;
      
      // Check cache first
      if (this.sessionCache.has(sessionKey)) {
        const cachedSession = this.sessionCache.get(sessionKey)!;
        if (!cachedSession.metadata.archived) {
          this.currentSession = cachedSession;
          this.messageBuffer = [...cachedSession.messages];
          await this.loadExistingMemory(this.currentSession);
          return this.currentSession;
        }
      }

      // Try to find existing session in database
      let session = await this.prisma.conversationSession.findUnique({
        where: { userId_sessionId: { userId, sessionId } }
      });

      if (session && !(session.metadata as any)?.archived) {
        // Resume existing session
        this.currentSession = {
          ...session,
          messages: (session.messages as any[]).map(msg => ({
            id: msg.id,
            content: msg.content,
            sender: msg.sender,
            timestamp: new Date(msg.timestamp),
            metadata: msg.metadata || {}
          })),
          metadata: {
            ...(session.metadata as any),
            archived: false
          },
          createdAt: session.createdAt,
          updatedAt: session.updatedAt
        };
        
        // Load recent messages into buffer
        this.messageBuffer = [...this.currentSession.messages];
        await this.loadExistingMemory(this.currentSession);
        
        // Cache the session
        this.sessionCache.set(sessionKey, this.currentSession);
      } else {
        // Create new session
        this.currentSession = {
          id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId,
          sessionId,
          problem,
          messages: [],
          summary: '',
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: {
            archived: false,
            insights: [],
            recommendations: [],
            marketTrends: [],
            userPreferences: [],
            analysisType: 'conversation',
            confidence: 0.8,
            dataSources: [],
            planPhase: 'initialization'
          }
        };
        
        // Initialize memory
        await this.memory.clear();
        await this.memory.saveContext(
          { input: `Session started for problem: ${problem}` },
          { output: 'Session initialized successfully' }
        );
        
        // Cache the new session
        this.sessionCache.set(sessionKey, this.currentSession);
      }
      
      return this.currentSession;
    } catch (error) {
      console.error('Error initializing session:', error);
      throw error;
    }
  }

  async saveMessage(message: Message): Promise<void> {
    try {
      if (!this.currentSession) {
        throw new Error('No active session to save message to');
      }

      // Add to buffer
      this.messageBuffer.push(message);
      if (this.messageBuffer.length > this.MAX_BUFFER_SIZE) {
        this.messageBuffer.shift();
      }
      
      // Update current session messages
      this.currentSession.messages.push(message);
      this.currentSession.updatedAt = new Date();
      
      // Update session in database if it exists
      try {
        await this.prisma.conversationSession.upsert({
          where: { userId_sessionId: { userId: this.currentSession.userId, sessionId: this.currentSession.sessionId } },
          update: { 
            updatedAt: new Date(),
            messages: this.currentSession.messages.map(msg => ({
              id: msg.id,
              content: msg.content,
              sender: msg.sender,
              timestamp: msg.timestamp.toISOString(),
              metadata: msg.metadata || {}
            }))
          },
          create: {
            userId: this.currentSession.userId,
            sessionId: this.currentSession.sessionId,
            problem: this.currentSession.problem,
            messages: this.currentSession.messages.map(msg => ({
              id: msg.id,
              content: msg.content,
              sender: msg.sender,
              timestamp: msg.timestamp.toISOString(),
              metadata: msg.metadata || {}
            })),
            summary: this.currentSession.summary,
            metadata: this.currentSession.metadata,
            createdAt: this.currentSession.createdAt,
            updatedAt: this.currentSession.updatedAt
          }
        });
      } catch (dbError) {
        console.warn('Database update failed, continuing with memory:', dbError);
      }
      
      // Save to memory
      await this.memory.saveContext(
        { input: message.content },
        { output: `Message from ${message.sender} processed` }
      );
      
    } catch (error) {
      console.error('Error saving message:', error);
      throw error;
    }
  }

  async getMemoryContext(): Promise<MemoryContext> {
    try {
      if (!this.currentSession) {
        throw new Error('No active session to get context from');
      }

      // Get recent conversation history
      const recentMessages = this.messageBuffer.slice(-10);
      const chatHistory = recentMessages
        .map(msg => `${msg.sender}: ${msg.content}`)
        .join('\n');

      // Get memory summary
      const memoryVariables = await this.memory.loadMemoryVariables({});
      const summary = memoryVariables['chat_history'] || 'No conversation history available';

      return {
        chatHistory,
        summary,
        insights: this.currentSession.metadata.insights || [],
        marketTrends: this.currentSession.metadata.marketTrends || [],
        userPreferences: this.currentSession.metadata.userPreferences || [],
        currentSession: this.currentSession
      };
    } catch (error) {
      console.error('Error getting memory context:', error);
      return {
        chatHistory: '',
        summary: 'No context available',
        insights: [],
        marketTrends: [],
        userPreferences: [],
        currentSession: null
      };
    }
  }

  async getSummary(): Promise<string> {
    try {
      if (!this.currentSession) {
        return 'No active session';
      }

      const memoryVariables = await this.memory.loadMemoryVariables({});
      return memoryVariables['chat_history'] || 'No conversation summary available';
    } catch (error) {
      console.error('Error getting summary:', error);
      return 'Error retrieving conversation summary';
    }
  }

  async loadExistingMemory(session: ConversationSession): Promise<void> {
    try {
      if (!session.messages || session.messages.length === 0) {
        return;
      }

      // Clear existing memory
      await this.memory.clear();

      // Load conversation history into memory
      for (const message of session.messages) {
        await this.memory.saveContext(
          { input: message.content },
          { output: `Message from ${message.sender} loaded` }
        );
      }

      console.log(`Loaded ${session.messages.length} messages into memory for session ${session.sessionId}`);
    } catch (error) {
      console.error('Error loading existing memory:', error);
    }
  }

  async archiveSession(archiveData: SessionArchive): Promise<any> {
    try {
      if (!this.currentSession) {
        console.warn('No active session to archive, skipping archive operation');
        return null;
      }
      
      // Mark session as archived in metadata
      this.currentSession.metadata.archived = true;
      this.currentSession.metadata.archiveReason = archiveData.reason;
      this.currentSession.metadata.finalMessageCount = archiveData.finalMessageCount;
      this.currentSession.metadata.archivedAt = archiveData.archivedAt;
      
      // Update session in database
      try {
        const archive = await this.prisma.conversationSession.update({
          where: { userId_sessionId: { userId: this.currentSession.userId, sessionId: this.currentSession.sessionId } },
          data: {
            summary: archiveData.summary,
            metadata: this.currentSession.metadata
          }
        });
        
        // Remove from cache
        const sessionKey = `${this.currentSession.userId}_${this.currentSession.sessionId}`;
        this.sessionCache.delete(sessionKey);
        
        // Clear current session
        this.currentSession = null;
        this.messageBuffer = [];
        await this.memory.clear();
        
        return archive;
      } catch (dbError) {
        console.warn('Database archive failed, but session marked as archived in memory:', dbError);
        return this.currentSession;
      }
    } catch (error) {
      console.error('Error archiving session:', error);
      return null;
    }
  }

  async getMemoryBuffer(limit: number = 20): Promise<Message[]> {
    try {
      const actualLimit = Math.min(limit, this.MAX_BUFFER_SIZE);
      return this.messageBuffer.slice(-actualLimit);
    } catch (error) {
      console.error('Error getting memory buffer:', error);
      return [];
    }
  }

  async updateSessionMetadata(metadata: any): Promise<ConversationSession | null> {
    try {
      if (!this.currentSession) {
        throw new Error('No active session to update');
      }
      
      // Update metadata
      this.currentSession.metadata = {
        ...this.currentSession.metadata,
        ...metadata
      };
      
      // Update in database
      try {
        await this.prisma.conversationSession.update({
          where: { userId_sessionId: { userId: this.currentSession.userId, sessionId: this.currentSession.sessionId } },
          data: { 
            metadata: this.currentSession.metadata,
            updatedAt: new Date()
          }
        });
      } catch (dbError) {
        console.warn('Database metadata update failed, continuing with memory update:', dbError);
      }
      
      return this.currentSession;
    } catch (error) {
      console.error('Error updating session metadata:', error);
      throw error;
    }
  }

  async getSessionStats(): Promise<SessionStats> {
    try {
      if (!this.currentSession) {
        throw new Error('No active session');
      }
      
      const now = new Date();
      const sessionDuration = now.getTime() - this.currentSession.createdAt.getTime();
      
      const userMessages = this.messageBuffer.filter(m => m.sender === 'user');
      const aiMessages = this.messageBuffer.filter(m => m.sender !== 'user');
      
      const totalLength = this.messageBuffer.reduce((sum, m) => sum + m.content.length, 0);
      const averageLength = this.messageBuffer.length > 0 ? totalLength / this.messageBuffer.length : 0;
      
      return {
        totalMessages: this.messageBuffer.length,
        sessionDuration,
        averageMessageLength: Math.round(averageLength),
        userMessageCount: userMessages.length,
        aiMessageCount: aiMessages.length,
        lastActivity: this.currentSession.updatedAt
      };
    } catch (error) {
      console.error('Error getting session stats:', error);
      throw error;
    }
  }

  async clearSession(): Promise<void> {
    try {
      if (this.currentSession) {
        const sessionKey = `${this.currentSession.userId}_${this.currentSession.sessionId}`;
        this.sessionCache.delete(sessionKey);
      }
      
      this.currentSession = null;
      this.messageBuffer = [];
      await this.memory.clear();
    } catch (error) {
      console.error('Error clearing session:', error);
    }
  }

  async getActiveSession(): Promise<ConversationSession | null> {
    return this.currentSession;
  }

  async isSessionActive(): Promise<boolean> {
    return this.currentSession !== null && !this.currentSession.metadata.archived;
  }
}
