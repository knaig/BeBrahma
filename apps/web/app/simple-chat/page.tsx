'use client';

import { useState, useEffect } from 'react';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai' | 'agent';
  timestamp: string;
  agentId?: string;
  agentName?: string;
  agentTitle?: string;
  type?: string;
  metadata?: any;
}

interface ChatResponse {
  success: boolean;
  messages: Message[];
  stage: string;
}

export default function SimpleChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [currentStage, setCurrentStage] = useState('');
  const [showDecisionButtons, setShowDecisionButtons] = useState(false);
  const [decisionOptions, setDecisionOptions] = useState<string[]>([]);
  const [isConversationComplete, setIsConversationComplete] = useState(true); // Track conversation completion

  const API_BASE = process.env.NEXT_PUBLIC_CHAT_API_URL || 'http://localhost:3002/api';

  // Start new session
  const startSession = async () => {
    if (!input.trim()) return;

    setIsLoading(true);
    setIsConversationComplete(false); // Lock buttons during conversation
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(newSessionId);

    // Add user message
    const userMessage: Message = {
      id: `user_${Date.now()}`,
      content: input,
      sender: 'user',
      timestamp: new Date().toISOString(),
      type: 'user_input'
    };

    setMessages([userMessage]);

    try {
      const response = await fetch(`${API_BASE}/chat/crew/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: newSessionId,
          task: input
        })
      });

      if (response.ok) {
        const data: ChatResponse = await response.json();
        setCurrentStage(data.stage);

        // Add all AI messages
        const aiMessages = data.messages.filter(msg => msg.sender !== 'user');
        setMessages(prev => [...prev, ...aiMessages]);

        // Check if we have a decision point
        checkForDecisionPoint(data.messages);
      }
    } catch (error) {
      console.error('Error starting session:', error);
    } finally {
      setIsLoading(false);
      setInput('');
      setIsConversationComplete(true); // Unlock buttons after conversation complete
    }
  };

  // Get next crew turn
  const getNextTurn = async () => {
    if (!sessionId) return;

    setIsLoading(true);
    setIsConversationComplete(false); // Lock buttons during conversation
    try {
      const response = await fetch(`${API_BASE}/chat/crew/next`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });

      if (response.ok) {
        const data: ChatResponse = await response.json();
        setCurrentStage(data.stage);

        // Add new messages
        const newMessages = data.messages.filter(msg =>
          !messages.some(existing => existing.id === msg.id)
        );

        if (newMessages.length > 0) {
          setMessages(prev => [...prev, ...newMessages]);
          checkForDecisionPoint(newMessages);
        }
      }
    } catch (error) {
      console.error('Error getting next turn:', error);
    } finally {
      setIsLoading(false);
      setIsConversationComplete(true); // Unlock buttons after conversation complete
    }
  };

  // Check if any message is a decision point
  const checkForDecisionPoint = (messages: Message[]) => {
    const decisionMessage = messages.find(msg => msg.type === 'decision_point');
    if (decisionMessage && decisionMessage.metadata?.options) {
      setShowDecisionButtons(true);
      setDecisionOptions(decisionMessage.metadata.options);
    }
  };

  // Handle decision
  const handleDecision = async (decision: string) => {
    if (!sessionId) return;

    setIsLoading(true);
    setIsConversationComplete(false); // Lock buttons during conversation
    setShowDecisionButtons(false);

    // Add decision message
    const decisionMessage: Message = {
      id: `decision_${Date.now()}`,
      content: `**Your Decision**: ${decision.charAt(0).toUpperCase() + decision.slice(1)}`,
      sender: 'user',
      timestamp: new Date().toISOString(),
      type: 'user_approval'
    };

    setMessages(prev => [...prev, decisionMessage]);

    try {
      const response = await fetch(`${API_BASE}/chat/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          decision,
          userMessage: 'Continue analysis'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentStage(data.stage);

        // Get next turn after decision
        setTimeout(() => getNextTurn(), 1000);
      }
    } catch (error) {
      console.error('Error handling decision:', error);
    } finally {
      setIsLoading(false);
      setIsConversationComplete(true); // Unlock buttons after conversation complete
    }
  };

  // NO AUTO-ADVANCEMENT - User must click "Next" for each step
  // useEffect(() => {
  //   if (sessionId && !showDecisionButtons && !isLoading && messages.length > 0) {
  //     const lastMessage = messages[messages.length - 1];
  //     if (lastMessage.sender !== 'user' && lastMessage.type !== 'decision_point') {
  //       // Auto-advance after a short delay
  //       const timer = setTimeout(() => getNextTurn(), 2000);
  //       return () => clearTimeout(timer);
  //     }
  //   }
  // }, [sessionId, showDecisionButtons, isLoading, messages]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 transition-colors">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 mb-6 transition-colors">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">🚀 BeBrahma Simple Chat</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-4">Direct CLI-to-UI mapping - Simple and effective</p>

          {sessionId && (
            <div className="flex items-center gap-4 text-sm">
              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                Session: {sessionId.slice(0, 20)}...
              </span>
              <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full">
                Stage: {currentStage || 'Initializing...'}
              </span>
            </div>
          )}
        </div>

        {/* Chat Input */}
        {!sessionId && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 mb-6 transition-colors">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Describe your SaaS business idea..."
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyPress={(e) => e.key === 'Enter' && startSession()}
              />
              <button
                onClick={startSession}
                disabled={!input.trim() || isLoading || !isConversationComplete}
                className="px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Starting...' : !isConversationComplete ? '⏳ Wait...' : 'Start Analysis'}
              </button>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 mb-6 transition-colors">
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-3xl px-4 py-3 rounded-lg ${message.sender === 'user'
                      ? 'bg-blue-600 dark:bg-blue-500 text-white'
                      : message.type === 'decision_point'
                        ? 'bg-yellow-100 dark:bg-yellow-900 border-2 border-yellow-400 dark:border-yellow-600 dark:text-white'
                        : 'bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white'
                    }`}
                >
                  {message.agentName && (
                    <div className="text-xs font-semibold mb-1 text-gray-600 dark:text-gray-300">
                      {message.agentName} ({message.agentTitle})
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  <div className="text-xs mt-2 opacity-70">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Decision Buttons */}
        {showDecisionButtons && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4 text-center">🎯 Decision Point - Choose Next Action:</h3>
            <div className="flex gap-3 justify-center">
              {decisionOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => handleDecision(option)}
                  disabled={isLoading || !isConversationComplete}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? '⏳ Wait...' : option.charAt(0).toUpperCase() + option.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Manual Next Button */}
        {sessionId && !showDecisionButtons && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-center">
              <button
                onClick={getNextTurn}
                disabled={isLoading || !isConversationComplete}
                className="px-8 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-semibold"
              >
                {isLoading ? '⏳ Processing...' : !isConversationComplete ? '🔒 Wait...' : '🔄 Get Next Turn'}
              </button>
              <p className="text-sm text-gray-600 mt-2">
                Click to manually advance - One conversation at a time
              </p>
            </div>
          </div>
        )}

        {/* Status */}
        {isLoading && (
          <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
            ⏳ Processing...
          </div>
        )}

        {/* Conversation Lock Status */}
        {!isConversationComplete && !isLoading && (
          <div className="fixed bottom-4 left-4 bg-yellow-600 text-white px-4 py-2 rounded-lg shadow-lg">
            🔒 Conversation in progress - Please wait...
          </div>
        )}
      </div>
    </div>
  );
}
