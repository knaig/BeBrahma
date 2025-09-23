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
  current