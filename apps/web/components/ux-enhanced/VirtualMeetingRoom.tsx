'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Circle, Users, MessageCircle, Play, Pause, AlertTriangle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { useAsyncOperation } from '../../hooks/useAsyncOperation';
import { handleError, createUserInputError, logError } from '../../utils/errorHandling';
import useMeetingSocket, { Agent, Message } from '../../hooks/useMeetingSocket';
import AgentStatusIndicator from '../meeting/AgentStatusIndicator';
import PersonalityAvatar from '../meeting/PersonalityAvatar';

interface AgentInfo {
  id: string;
  role: 'PM' | 'CEO' | 'CTO' | 'Growth' | 'Research' | 'Data' | 'Strategy' | 'DevOps';
  name: string;
  status: 'speaking' | 'listening' | 'thinking' | 'idle';
  avatar: string;
  color: string;
}

interface ChatMessage {
  id: string;
  content: string;
  agent: string;
  timestamp: Date;
  type: 'text' | 'analysis' | 'decision' | 'action';
}

interface VirtualMeetingRoomProps {
  sessionId: string;
  currentStage?: string;
  onStageProgress?: () => void;
  // Legacy props - kept for backward compatibility but no longer used
  agents?: AgentInfo[];
  messages?: ChatMessage[];
  onUserMessage?: (message: string) => void;
}

const AGENT_CONFIG = {
  PM: { color: '#3B82F6', name: 'Project Manager' },
  CEO: { color: '#F59E0B', name: 'Chief Executive' },
  CTO: { color: '#10B981', name: 'Chief Technology Officer' },
  Growth: { color: '#8B5CF6', name: 'Growth Strategist' },
  Research: { color: '#EF4444', name: 'Research Analyst' },
  Data: { color: '#06B6D4', name: 'Data Scientist' },
  Strategy: { color: '#F97316', name: 'Strategy Consultant' },
  DevOps: { color: '#84CC16', name: 'DevOps Engineer' }
};

export default function VirtualMeetingRoom({
  sessionId,
  currentStage = 'collaboration',
  onStageProgress
}: VirtualMeetingRoomProps) {
  const [isSessionActive, setIsSessionActive] = useState(true);
  const [userInput, setUserInput] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);

  // Use WebSocket hook for real-time agent data
  const {
    connectionStatus,
    error: socketError,
    agents,
    messages,
    sendMessage,
    updateAgentStatus,
    reconnect,
    isConnected,
    isConnecting,
    activeAgents,
    connectedAgents
  } = useMeetingSocket({ sessionId });

  const handleSendMessage = () => {
    try {
      // Clear any previous errors
      setInputError(null);
      
      if (!userInput.trim()) {
        const error = createUserInputError('Message cannot be empty', 'userInput');
        setInputError(error.userMessage);
        return;
      }
      
      if (userInput.length > 1000) {
        const error = createUserInputError('Message is too long (max 1000 characters)', 'userInput');
        setInputError(error.userMessage);
        return;
      }

      if (!isConnected) {
        setInputError('Not connected to server. Please wait for connection.');
        return;
      }
      
      // Send via WebSocket
      sendMessage(userInput, selectedAgent?.agentId);
      setUserInput('');
    } catch (error) {
      const appError = handleError(error, { context: 'handleSendMessage', userInput });
      setInputError(appError.userMessage || 'An error occurred while sending message');
      logError(appError);
    }
  };

  const getAgentPosition = (index: number, total: number) => {
    const angle = (index * 360) / total;
    const radius = 200; // Adjust based on viewport
    const x = Math.cos((angle - 90) * Math.PI / 180) * radius;
    const y = Math.sin((angle - 90) * Math.PI / 180) * radius;
    return { x, y };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'speaking': return '#EF4444';
      case 'thinking': return '#F59E0B';
      case 'listening': return '#10B981';
      default: return '#6B7280';
    }
  };

  const formatMessageWithPersonality = (message: Message) => {
    const agent = agents.find(a => a.agentId === message.agentId);
    if (!agent || message.type === 'user') return message;

    // Apply personality-based styling
    return {
      ...message,
      formattedContent: message.content,
      style: agent.persona?.speakingStyle,
      color: agent.persona?.colorHex,
      department: agent.persona?.department
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/10 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Circle className="w-8 h-8 text-blue-400" />
            <div>
              <h1 className="text-2xl font-bold">BeBrahma Virtual Meeting Room</h1>
              <p className="text-blue-200">Session: {sessionId}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Connection Status */}
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-lg ${
              isConnected ? 'bg-green-900/30 border border-green-400/30' : 
              isConnecting ? 'bg-yellow-900/30 border border-yellow-400/30' :
              'bg-red-900/30 border border-red-400/30'
            }`}>
              {isConnected ? <Wifi className="w-4 h-4 text-green-400" /> : <WifiOff className="w-4 h-4 text-red-400" />}
              <span className={`text-sm ${isConnected ? 'text-green-200' : isConnecting ? 'text-yellow-200' : 'text-red-200'}`}>
                {isConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'Disconnected'}
              </span>
              {!isConnected && (
                <button onClick={reconnect} className="text-blue-400 hover:text-blue-300">
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
            </div>
            
            <div className="bg-white/10 rounded-lg px-4 py-2">
              <span className="text-sm text-blue-200">Stage:</span>
              <span className="ml-2 font-semibold capitalize">{currentStage.replace('-', ' ')}</span>
            </div>
            
            <div className="bg-white/10 rounded-lg px-4 py-2">
              <span className="text-sm text-blue-200">Active:</span>
              <span className="ml-2 font-semibold">{activeAgents.length}/{agents.length}</span>
            </div>
            
            <button
              onClick={() => {
                try {
                  setIsSessionActive(!isSessionActive);
                  // In a real app, you might want to call an API here
                  // await updateSessionStatus(sessionId, !isSessionActive);
                } catch (error) {
                  const appError = handleError(error, { context: 'sessionControl', sessionId });
                  logError(appError);
                  // Revert the state change on error
                  setIsSessionActive(isSessionActive);
                }
              }}
              className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
                isSessionActive 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {isSessionActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isSessionActive ? 'Pause' : 'Resume'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Meeting Room */}
      <div className="relative max-w-7xl mx-auto p-8">
        {/* Central Chat Area */}
        <div className="relative z-10 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 mb-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-blue-200">Central Discussion</h2>
            <p className="text-sm text-gray-400">Real-time collaboration hub</p>
          </div>
          
          {/* Messages */}
          <div className="max-h-96 overflow-y-auto space-y-4">
            {messages.map((message) => {
              const formattedMessage = formatMessageWithPersonality(message);
              const agent = message.type === 'agent' ? agents.find(a => a.agentId === message.agentId) : null;
              
              return (
                <div
                  key={message.id}
                  className="bg-white/10 rounded-lg p-4 border-l-4"
                  style={{ 
                    borderLeftColor: message.type === 'agent' && agent ? agent.persona.colorHex : '#6B7280'
                  }}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    {message.type === 'agent' && agent ? (
                      <PersonalityAvatar 
                        agent={agent}
                        size="sm"
                        showTooltip={false}
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold">
                        U
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-blue-200">
                          {message.type === 'agent' && agent ? agent.persona.name : 'You'}
                        </span>
                        {message.type === 'agent' && agent && (
                          <span className="text-xs text-gray-400 bg-white/10 px-2 py-1 rounded">
                            {agent.persona.department}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                  <div className="ml-9">
                    <p className="text-gray-200">{message.content}</p>
                    {message.type === 'agent' && agent && agent.persona.speakingStyle && (
                      <div className="mt-2 text-xs text-gray-400 italic">
                        Style: {agent.persona.speakingStyle}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            
            {/* Connection Error Display */}
            {(socketError || !isConnected) && (
              <div className="bg-red-900/20 border border-red-400/30 rounded-lg p-4">
                <div className="flex items-center space-x-2 text-red-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm">
                    {socketError || 'Connection lost. Messages may not be delivered.'}
                  </span>
                </div>
              </div>
            )}
          </div>
          
          {/* User Input */}
          <div className="mt-6 space-y-3">
            <div className="flex space-x-3">
              <input
                type="text"
                value={userInput}
                onChange={(e) => {
                  setUserInput(e.target.value);
                  // Clear error when user starts typing
                  if (inputError) setInputError(null);
                }}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Join the discussion..."
                className={`flex-1 bg-white/10 border rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 ${
                  inputError 
                    ? 'border-red-400 focus:ring-red-400' 
                    : 'border-white/20 focus:ring-blue-400'
                }`}
                maxLength={1000}
              />
              <button
                onClick={handleSendMessage}
                className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!userInput.trim() || !isConnected}
              >
                Send
              </button>
            </div>
            
            {/* Error Display */}
            {inputError && (
              <div className="flex items-center space-x-2 text-red-400 text-sm bg-red-900/20 border border-red-400/30 rounded-lg px-3 py-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{inputError}</span>
              </div>
            )}
            
            {/* Character Count */}
            <div className="text-right text-xs text-gray-400">
              {userInput.length}/1000 characters
            </div>
          </div>
        </div>

        {/* Circular Agent Layout */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-96 h-96 border-2 border-white/10 rounded-full flex items-center justify-center">
              <div className="text-center">
                <Users className="w-12 h-12 text-blue-400 mx-auto mb-2" />
                <p className="text-blue-200 font-medium">Meeting Hub</p>
                <p className="text-sm text-gray-400">Active Agents: {agents.length}</p>
              </div>
            </div>
          </div>
          
          {/* Agents positioned in circle */}
          {agents.map((agent, index) => {
            const position = getAgentPosition(index, agents.length);
            
            return (
              <div
                key={agent.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                style={{
                  left: `calc(50% + ${position.x}px)`,
                  top: `calc(50% + ${position.y}px)`,
                }}
                onClick={() => {
                  try {
                    setSelectedAgent(agent);
                  } catch (error) {
                    const appError = handleError(error, { context: 'agentSelection', agentId: agent.id, sessionId });
                    logError(appError);
                  }
                }}
              >
                <div className="relative">
                  <PersonalityAvatar 
                    agent={agent}
                    size="lg"
                    showTooltip={true}
                  />
                  <AgentStatusIndicator 
                    status={agent.currentStatus}
                    className="absolute -top-1 -right-1"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Agent Details Modal */}
      <AnimatePresence>
        {selectedAgent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => {
              try {
                setSelectedAgent(null);
              } catch (error) {
                const appError = handleError(error, { context: 'modalBackdropClick', selectedAgent });
                logError(appError);
                // Force close on error
                setSelectedAgent(null);
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center space-x-4 mb-6">
                {selectedAgent && (
                  <>
                    <PersonalityAvatar 
                      agent={selectedAgent}
                      size="lg"
                      showTooltip={false}
                    />
                    <div>
                      <h3 className="text-xl font-semibold">{selectedAgent.persona.name}</h3>
                      <p className="text-blue-200">{selectedAgent.persona.title}</p>
                      <p className="text-sm text-gray-400">{selectedAgent.persona.department}</p>
                    </div>
                  </>
                )}
              </div>
              
              {/* Agent Personality Details */}
              {selectedAgent && (
                <div className="space-y-4 mb-6">
                  <div>
                    <h4 className="font-semibold text-blue-200 mb-2">Speaking Style</h4>
                    <p className="text-gray-300 text-sm">{selectedAgent.persona.speakingStyle}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-blue-200 mb-2">Current Status</h4>
                    <div className="flex items-center space-x-2">
                      <AgentStatusIndicator status={selectedAgent.currentStatus} />
                      <span className="capitalize text-gray-300">{selectedAgent.currentStatus}</span>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-blue-200 mb-2">Personality Traits</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {selectedAgent.persona.personalityTraits && Object.entries(selectedAgent.persona.personalityTraits).map(([trait, value]) => (
                        <div key={trait} className="flex justify-between">
                          <span className="text-gray-300 capitalize">{trait}:</span>
                          <span className="text-blue-200">{Math.round((value as number) * 100)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-blue-200 mb-2">Last Activity</h4>
                    <p className="text-gray-300 text-sm">
                      {new Date(selectedAgent.lastActivity).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
              
              <button
                onClick={() => {
                  try {
                    setSelectedAgent(null);
                  } catch (error) {
                    const appError = handleError(error, { context: 'closeAgentModal', selectedAgent });
                    logError(appError);
                    // Force close on error
                    setSelectedAgent(null);
                  }
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded-lg transition-colors"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
