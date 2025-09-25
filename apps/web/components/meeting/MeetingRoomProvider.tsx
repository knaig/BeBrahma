'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import useMeetingSocket, { Agent, Message, ConnectionStatus } from '../../hooks/useMeetingSocket';
import { handleError, logError } from '../../utils/errorHandling';

interface DecisionWorkflow {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  approvedBy?: string;
  metadata?: any;
}

interface MeetingRoomContextType {
  // Connection state
  connectionStatus: ConnectionStatus;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  
  // Agent data
  agents: Agent[];
  activeAgents: Agent[];
  connectedAgents: Agent[];
  
  // Message data
  messages: Message[];
  
  // Decision workflow
  decisions: DecisionWorkflow[];
  
  // Actions
  sendMessage: (content: string, targetAgentId?: string) => void;
  updateAgentStatus: (agentId: string, status: Agent['currentStatus'], metadata?: any) => Promise<void>;
  clearMessages: () => void;
  reconnect: () => void;
  
  // Decision actions
  createDecision: (title: string, description: string, metadata?: any) => void;
  approveDecision: (decisionId: string, approvedBy: string) => void;
  rejectDecision: (decisionId: string, rejectedBy: string) => void;
  
  // Utility functions
  getAgentByRole: (role: string) => Agent | undefined;
  getAgentById: (id: string) => Agent | undefined;
  isAgentActive: (agentId: string) => boolean;
}

const MeetingRoomContext = createContext<MeetingRoomContextType | undefined>(undefined);

interface MeetingRoomProviderProps {
  sessionId: string;
  children: ReactNode;
}

export default function MeetingRoomProvider({ sessionId, children }: MeetingRoomProviderProps) {
  const [decisions, setDecisions] = useState<DecisionWorkflow[]>([]);
  const [contextError, setContextError] = useState<string | null>(null);
  
  // Use the WebSocket hook
  const {
    connectionStatus,
    error: socketError,
    agents,
    messages,
    sendMessage: socketSendMessage,
    updateAgentStatus: socketUpdateAgentStatus,
    clearMessages,
    reconnect,
    isConnected,
    isConnecting,
    activeAgents,
    connectedAgents
  } = useMeetingSocket({ sessionId });

  // Enhanced send message with error handling
  const sendMessage = useCallback((content: string, targetAgentId?: string) => {
    try {
      setContextError(null);
      socketSendMessage(content, targetAgentId);
    } catch (error) {
      const appError = handleError(error, { context: 'MeetingRoomProvider.sendMessage', content, targetAgentId });
      setContextError(appError.userMessage || 'Failed to send message');
      logError(appError);
    }
  }, [socketSendMessage]);

  // Enhanced update agent status with error handling
  const updateAgentStatus = useCallback(async (
    agentId: string, 
    status: Agent['currentStatus'], 
    metadata?: any
  ) => {
    try {
      setContextError(null);
      await socketUpdateAgentStatus(agentId, status, metadata);
    } catch (error) {
      const appError = handleError(error, { 
        context: 'MeetingRoomProvider.updateAgentStatus', 
        agentId, 
        status, 
        metadata 
      });
      setContextError(appError.userMessage || 'Failed to update agent status');
      logError(appError);
      throw error; // Re-throw to allow caller to handle
    }
  }, [socketUpdateAgentStatus]);

  // Decision workflow management
  const createDecision = useCallback((title: string, description: string, metadata?: any) => {
    try {
      setContextError(null);
      const newDecision: DecisionWorkflow = {
        id: Date.now().toString(),
        title,
        description,
        status: 'pending',
        createdAt: new Date().toISOString(),
        metadata
      };
      
      setDecisions(prev => [...prev, newDecision]);
      
      // Notify agents about new decision (could trigger WebSocket message)
      sendMessage(`New decision created: ${title}`, undefined);
      
    } catch (error) {
      const appError = handleError(error, { context: 'createDecision', title, description });
      setContextError(appError.userMessage || 'Failed to create decision');
      logError(appError);
    }
  }, [sendMessage]);

  const approveDecision = useCallback((decisionId: string, approvedBy: string) => {
    try {
      setContextError(null);
      setDecisions(prev => prev.map(decision => 
        decision.id === decisionId 
          ? { ...decision, status: 'approved' as const, approvedBy }
          : decision
      ));
      
      // Notify agents about approval
      const decision = decisions.find(d => d.id === decisionId);
      if (decision) {
        sendMessage(`Decision approved: ${decision.title}`, undefined);
      }
      
    } catch (error) {
      const appError = handleError(error, { context: 'approveDecision', decisionId, approvedBy });
      setContextError(appError.userMessage || 'Failed to approve decision');
      logError(appError);
    }
  }, [decisions, sendMessage]);

  const rejectDecision = useCallback((decisionId: string, rejectedBy: string) => {
    try {
      setContextError(null);
      setDecisions(prev => prev.map(decision => 
        decision.id === decisionId 
          ? { ...decision, status: 'rejected' as const, approvedBy: rejectedBy }
          : decision
      ));
      
      // Notify agents about rejection
      const decision = decisions.find(d => d.id === decisionId);
      if (decision) {
        sendMessage(`Decision rejected: ${decision.title}`, undefined);
      }
      
    } catch (error) {
      const appError = handleError(error, { context: 'rejectDecision', decisionId, rejectedBy });
      setContextError(appError.userMessage || 'Failed to reject decision');
      logError(appError);
    }
  }, [decisions, sendMessage]);

  // Utility functions
  const getAgentByRole = useCallback((role: string): Agent | undefined => {
    return agents.find(agent => agent.persona.role.toLowerCase() === role.toLowerCase());
  }, [agents]);

  const getAgentById = useCallback((id: string): Agent | undefined => {
    return agents.find(agent => agent.id === id || agent.agentId === id);
  }, [agents]);

  const isAgentActive = useCallback((agentId: string): boolean => {
    const agent = getAgentById(agentId);
    return agent ? agent.currentStatus !== 'idle' : false;
  }, [getAgentById]);

  // Combine errors
  const combinedError = contextError || socketError;

  const contextValue: MeetingRoomContextType = {
    // Connection state
    connectionStatus,
    isConnected,
    isConnecting,
    error: combinedError,
    
    // Agent data
    agents,
    activeAgents,
    connectedAgents,
    
    // Message data
    messages,
    
    // Decision workflow
    decisions,
    
    // Actions
    sendMessage,
    updateAgentStatus,
    clearMessages,
    reconnect,
    
    // Decision actions
    createDecision,
    approveDecision,
    rejectDecision,
    
    // Utility functions
    getAgentByRole,
    getAgentById,
    isAgentActive
  };

  return (
    <MeetingRoomContext.Provider value={contextValue}>
      {children}
    </MeetingRoomContext.Provider>
  );
}

// Custom hook to use the MeetingRoom context
export function useMeetingRoom(): MeetingRoomContextType {
  const context = useContext(MeetingRoomContext);
  
  if (context === undefined) {
    throw new Error('useMeetingRoom must be used within a MeetingRoomProvider');
  }
  
  return context;
}

// Export types for use in other components
export type { DecisionWorkflow, MeetingRoomContextType };