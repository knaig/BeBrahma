'use client';

import React from 'react';
import langgraphClient from '@/lib/langgraphClient';
import { STEP_ORDER } from '@/lib/constants/steps';

export function SidebarSteps({ sessionId }: { sessionId: string | null }) {
  const [workflowState, setWorkflowState] = React.useState<any>(null);

  React.useEffect(() => {
    if (!sessionId) return;
    
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

  const steps = STEP_ORDER.map(id => ({ id, name: id, description: `${id} stage` }));
  const current = workflowState ? { id: workflowState.stage, name: workflowState.stage } : null;

  return (
    <aside className="w-64 shrink-0 border-r bg-white dark:bg-gray-900 dark:border-gray-800">
      <div className="p-4 font-semibold text-gray-900 dark:text-gray-100">Steps</div>
      <nav className="px-2 pb-4 space-y-1">
        {steps.map((s) => {
          const isActive = current?.id === s.id;
          return (
            <button
              key={s.id}
              onClick={async () => {
                // Step navigation is now handled by the LangGraph workflow
                console.log('Step navigation handled by LangGraph workflow:', s.id);
              }}
              className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                isActive
                  ? 'bg-blue-50 border-blue-200 text-blue-900'
                  : 'bg-white border-gray-200 text-gray-800 hover:bg-gray-50'
              }`}
            >
              <div className="text-sm font-medium">{s.name}</div>
              <div className="text-xs text-gray-500">{s.description}</div>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}


