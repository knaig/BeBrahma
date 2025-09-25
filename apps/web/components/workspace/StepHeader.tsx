'use client';

import React from 'react';
import langgraphClient from '@/lib/langgraphClient';

export function StepHeader() {
  const [workflowState, setWorkflowState] = React.useState<any>(null);
  const [sessionId] = React.useState(() => `session_${Date.now()}`);

  React.useEffect(() => {
    const pollStatus = async () => {
      try {
        const status = await langgraphClient.getWorkflowStatus(sessionId);
        setWorkflowState(status);
      } catch (error) {
        console.warn('Failed to get workflow status:', error);
      }
    };
    
    pollStatus();
    const interval = setInterval(pollStatus, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [sessionId]);

  const step = workflowState ? { id: workflowState.stage, name: workflowState.stage } : null;

  if (!step) return null;

  const onNext = async () => {
    if (!workflowState?.sessionId) return;
    try {
      await langgraphClient.getNextMessage(workflowState.sessionId);
    } catch (error) {
      console.error('Failed to advance workflow step:', error);
    }
  };

  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <div className="text-xs text-gray-500 dark:text-gray-400">Workflow Step</div>
        <div className="text-sm font-semibold">{step.name}</div>
      </div>
      <button onClick={onNext} className="px-3 py-1.5 rounded bg-green-600 text-white text-sm">Next Step</button>
    </div>
  );
}


