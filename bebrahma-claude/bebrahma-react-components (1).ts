// apps/web/components/ChatInterface.tsx

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles } from 'lucide-react';
import { Message } from './Message';
import { Stage } from '@bebrahma/types';

interface ChatInterfaceProps {
  messages: any[];
  onSendMessage: (message: string) => void;
  isProcessing: boolean;
  currentStage: Stage;
}

export function ChatInterface({
  messages,
  onSendMessage,
  isProcessing,
  currentStage,
}: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isProcessing) {
      onSendMessage(input);
      setInput('');
    }
  };

  const placeholders = {
    DEFINE: "Describe the problem you want to solve...",
    RESEARCH: "Ask about market data or competitors...",
    EVALUATE: "Request opportunity assessment...",
    GTM: "Describe your target customer...",
    BUILD: "Specify technical requirements...",
    LAUNCH: "Ask about launch preparations...",
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Sparkles className="w-12 h-12 mb-4 text-indigo-400" />
            <h3 className="text-lg font-medium mb-2">Start a conversation</h3>
            <p className="text-sm text-center max-w-md">
              I'm your virtual co-founder. Let's work together to transform your idea into a successful startup.
            </p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <Message key={index} message={message} />
            ))}
            {isProcessing && (
              <div className="flex items-center space-x-2 text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">AI agents are collaborating...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Form */}
      <div className="border-t border-gray-200 px-6 py-4">
        <form onSubmit={handleSubmit} className="flex items-end space-x-4">
          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder={placeholders[currentStage]}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={3}
              disabled={isProcessing}
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isProcessing}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isProcessing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

// apps/web/components/Message.tsx

import { Check, AlertCircle, Link2 } from 'lucide-react';
import { Citation } from '@bebrahma/types';

interface MessageProps {
  message: {
    role: string;
    content: string;
    agentName?: string;
    citations?: Citation[];
    timestamp: Date;
  };
}

export function Message({ message }: MessageProps) {
  const isUser = message.role === 'user';
  const isAgent = message.agentName;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-2xl ${isUser ? 'order-2' : ''}`}>
        {/* Agent Name Badge */}
        {isAgent && (
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-xs font-medium text-gray-500">
              {message.agentName}
            </span>
          </div>
        )}

        {/* Message Content */}
        <div
          className={`px-4 py-2 rounded-lg ${
            isUser
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-900'
          }`}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>

          {/* Citations */}
          {message.citations && message.citations.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="text-xs font-medium mb-2 flex items-center">
                <Link2 className="w-3 h-3 mr-1" />
                Sources:
              </div>
              <div className="space-y-1">
                {message.citations.map((citation, index) => (
                  <a
                    key={index}
                    href={citation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs text-blue-600 hover:underline"
                  >
                    {citation.title}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Timestamp */}
        <div className="text-xs text-gray-400 mt-1">
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}

// apps/web/components/StageNavigation.tsx

import { Check, Circle, Lock } from 'lucide-react';
import { Stage } from '@bebrahma/types';

interface StageNavigationProps {
  currentStage: Stage;
  onStageSelect: (stage: Stage) => void;
  completedStages: Stage[];
}

const STAGES: { id: Stage; label: string; icon: string }[] = [
  { id: 'DEFINE', label: 'Define', icon: '📝' },
  { id: 'RESEARCH', label: 'Research', icon: '🔍' },
  { id: 'EVALUATE', label: 'Evaluate', icon: '⚖️' },
  { id: 'GTM', label: 'GTM', icon: '🚀' },
  { id: 'BUILD', label: 'Build', icon: '🛠️' },
  { id: 'LAUNCH', label: 'Launch', icon: '🎯' },
];

export function StageNavigation({
  currentStage,
  onStageSelect,
  completedStages,
}: StageNavigationProps) {
  const getStageStatus = (stage: Stage) => {
    if (completedStages.includes(stage)) return 'completed';
    if (stage === currentStage) return 'current';
    return 'locked';
  };

  return (
    <nav className="p-4 space-y-2">
      {STAGES.map((stage) => {
        const status = getStageStatus(stage.id);
        const isClickable = status !== 'locked';

        return (
          <button
            key={stage.id}
            onClick={() => isClickable && onStageSelect(stage.id)}
            disabled={!isClickable}
            className={`
              w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors
              ${status === 'current' ? 'bg-indigo-50 text-indigo-700' : ''}
              ${status === 'completed' ? 'text-gray-700 hover:bg-gray-50' : ''}
              ${status === 'locked' ? 'text-gray-400 cursor-not-allowed' : ''}
            `}
          >
            {/* Status Icon */}
            <div className="flex-shrink-0">
              {status === 'completed' && <Check className="w-5 h-5 text-green-500" />}
              {status === 'current' && <Circle className="w-5 h-5 text-indigo-600" />}
              {status === 'locked' && <Lock className="w-5 h-5 text-gray-400" />}
            </div>

            {/* Stage Info */}
            <div className="flex-1 text-left">
              <div className="flex items-center">
                <span className="mr-2">{stage.icon}</span>
                <span className="font-medium">{stage.label}</span>
              </div>
            </div>
          </button>
        );
      })}
    </nav>
  );
}

// apps/web/components/ActionCards.tsx

import { FileText, TrendingUp, Target, Code, ExternalLink, Download } from 'lucide-react';
import { Stage } from '@bebrahma/types';

interface ActionCardsProps {
  artifacts: any[];
  currentStage: Stage;
  onExport: (artifact: any, format: string) => void;
  onAction: (action: string, data: any) => void;
}

export function ActionCards({
  artifacts,
  currentStage,
  onExport,
  onAction,
}: ActionCardsProps) {
  const getCardIcon = (type: string) => {
    switch (type) {
      case 'PROBLEM_BRIEF': return <FileText className="w-5 h-5" />;
      case 'MARKET_SNAPSHOT': return <TrendingUp className="w-5 h-5" />;
      case 'GTM_SEED': return <Target className="w-5 h-5" />;
      case 'BUILD_PROMPT': return <Code className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  if (artifacts.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-sm">No outputs yet</p>
        <p className="text-xs mt-1">Start a conversation to generate artifacts</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {artifacts.map((artifact) => (
        <div
          key={artifact.id}
          className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          {/* Card Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-2">
              {getCardIcon(artifact.type)}
              <h4 className="font-medium text-gray-900">{artifact.name}</h4>
            </div>
            {artifact.confidence && (
              <span className="text-xs text-gray-500">
                {Math.round(artifact.confidence * 100)}% confidence
              </span>
            )}
          </div>

          {/* Card Content Preview */}
          <div className="text-sm text-gray-600 mb-3">
            {getArtifactPreview(artifact)}
          </div>

          {/* Sources */}
          {artifact.sources && artifact.sources.length > 0 && (
            <div className="mb-3 p-2 bg-gray-50 rounded text-xs">
              <div className="font-medium mb-1">Sources:</div>
              {artifact.sources.slice(0, 2).map((source: any, index: number) => (
                <a
                  key={index}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline block truncate"
                >
                  {source.title}
                </a>
              ))}
              {artifact.sources.length > 2 && (
                <span className="text-gray-500">
                  +{artifact.sources.length - 2} more
                </span>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {artifact.type === 'BUILD_PROMPT' && (
              <button
                onClick={() => onAction('open-in-cursor', artifact)}
                className="flex items-center space-x-1 px-3 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Open in Cursor</span>
              </button>
            )}
            
            <button
              onClick={() => onExport(artifact, 'notion')}
              className="flex items-center space-x-1 px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200"
            >
              <Download className="w-3 h-3" />
              <span>Export to Notion</span>
            </button>

            <button
              onClick={() => onExport(artifact, 'pdf')}
              className="flex items-center space-x-1 px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200"
            >
              <Download className="w-3 h-3" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function getArtifactPreview(artifact: any): string {
  const content = artifact.content;
  
  switch (artifact.type) {
    case 'PROBLEM_BRIEF':
      return content.statement?.substring(0, 100) + '...' || 'Problem statement';
    case 'MARKET_SNAPSHOT':
      return `Market size: ${content.marketSize?.value || 'N/A'}, ${content.competitors?.length || 0} competitors identified`;
    case 'GTM_SEED':
      return `${content.personas?.length || 0} personas, ${content.experiments?.length || 0} experiments planned`;
    case 'BUILD_PROMPT':
      return `${content.userStories?.length || 0} user stories, ${content.apiEndpoints?.length || 0} API endpoints`;
    default:
      return 'View details';
  }
}