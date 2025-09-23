// apps/web/app/page.tsx

'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { ChatInterface } from '@/components/ChatInterface';
import { StageNavigation } from '@/components/StageNavigation';
import { ActionCards } from '@/components/ActionCards';
import { useSSE } from '@/hooks/useSSE';
import { Stage, RunStatus } from '@bebrahma/types';

export default function HomePage() {
  const { data: session } = useSession();
  const [currentStage, setCurrentStage] = useState<Stage>('DEFINE');
  const [messages, setMessages] = useState<any[]>([]);
  const [artifacts, setArtifacts] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);

  // SSE connection for real-time updates
  const { connect, disconnect } = useSSE({
    onMessage: (data) => {
      if (data.type === 'agent.message') {
        setMessages(prev => [...prev, data.message]);
      } else if (data.type === 'artifact.created') {
        setArtifacts(prev => [...prev, data.artifact]);
      } else if (data.type === 'run.completed') {
        setIsProcessing(false);
      }
    },
    onError: (error) => {
      console.error('SSE error:', error);
      setIsProcessing(false);
    },
  });

  const handleSendMessage = async (message: string) => {
    if (!session) return;

    setIsProcessing(true);
    
    // Add user message to chat
    setMessages(prev => [...prev, {
      role: 'user',
      content: message,
      timestamp: new Date(),
    }]);

    try {
      // Start a new run
      const response = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: currentStage,
          input: message,
          projectId: session.projectId || 'new',
        }),
      });

      const { runId } = await response.json();
      setCurrentRunId(runId);

      // Connect to SSE for real-time updates
      connect(`/api/runs/${runId}/stream`);
    } catch (error) {
      console.error('Error starting run:', error);
      setIsProcessing(false);
    }
  };

  const handleStageChange = (stage: Stage) => {
    setCurrentStage(stage);
    // Load relevant artifacts for this stage
    loadStageArtifacts(stage);
  };

  const loadStageArtifacts = async (stage: Stage) => {
    // Fetch artifacts for the current stage
    const response = await fetch(`/api/artifacts?stage=${stage}`);
    const data = await response.json();
    setArtifacts(data.artifacts);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Sidebar - Stage Navigation */}
      <div className="w-64 bg-white border-r border-gray-200">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold text-gray-900">BeBrahma</h1>
          <p className="text-sm text-gray-600">Your AI Co-Founder</p>
        </div>
        <StageNavigation 
          currentStage={currentStage}
          onStageSelect={handleStageChange}
          completedStages={artifacts.map(a => a.stage)}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {getStageTitle(currentStage)}
          </h2>
          <p className="text-sm text-gray-600">
            {getStageDescription(currentStage)}
          </p>
        </div>

        {/* Chat and Cards Container */}
        <div className="flex-1 flex overflow-hidden">
          {/* Chat Interface */}
          <div className="flex-1 flex flex-col">
            <ChatInterface
              messages={messages}
              onSendMessage={handleSendMessage}
              isProcessing={isProcessing}
              currentStage={currentStage}
            />
          </div>

          {/* Action Cards Sidebar */}
          <div className="w-96 bg-white border-l border-gray-200 overflow-y-auto">
            <div className="p-4">
              <h3 className="text-lg font-semibold mb-4">Outputs</h3>
              <ActionCards 
                artifacts={artifacts}
                currentStage={currentStage}
                onExport={handleExport}
                onAction={handleAction}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  async function handleExport(artifact: any, format: string) {
    const response = await fetch('/api/artifacts/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artifactId: artifact.id, format }),
    });
    
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${artifact.name}.${format}`;
    a.click();
  }

  async function handleAction(action: string, data: any) {
    switch (action) {
      case 'open-in-cursor':
        window.open(`cursor://open?content=${encodeURIComponent(data.content)}`);
        break;
      case 'export-to-notion':
        await exportToNotion(data);
        break;
      case 'create-ga4-goal':
        await createGA4Goal(data);
        break;
      default:
        console.log('Unknown action:', action);
    }
  }
}

function getStageTitle(stage: Stage): string {
  const titles = {
    DEFINE: 'Define Your Problem',
    RESEARCH: 'Market Research',
    EVALUATE: 'Opportunity Evaluation',
    GTM: 'Go-to-Market Strategy',
    BUILD: 'Build Specification',
    LAUNCH: 'Launch Checklist',
  };
  return titles[stage];
}

function getStageDescription(stage: Stage): string {
  const descriptions = {
    DEFINE: 'Clarify and refine your problem statement',
    RESEARCH: 'Gather market data and competitor insights',
    EVALUATE: 'Assess the opportunity and risks',
    GTM: 'Plan your customer acquisition strategy',
    BUILD: 'Generate technical specifications for development',
    LAUNCH: 'Prepare for product launch',
  };
  return descriptions[stage];
}

async function exportToNotion(data: any) {
  // Implementation for Notion export
  await fetch('/api/integrations/notion/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

async function createGA4Goal(data: any) {
  // Implementation for GA4 goal creation
  await fetch('/api/integrations/ga4/goals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}