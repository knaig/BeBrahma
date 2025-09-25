'use client';

import React from 'react';
import langgraphClient from '@/lib/langgraphClient';
import { STEP_ORDER } from '@/lib/constants/steps';

export function StepProgress({ sessionId }: { sessionId: string | null }) {
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

  const steps = STEP_ORDER.map(id => ({ id, name: id, status: 'pending' }));
  const current = workflowState ? { id: workflowState.stage, name: workflowState.stage } : null;

  const items = STEP_ORDER.map(id => steps.find(s => s.id === id)).filter(Boolean) as typeof steps;

  return (
    <div className="w-full bg-white dark:bg-gray-900 border-b dark:border-gray-800">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {items.map((s, idx) => {
            const isActive = current?.id === s.id;
            return (
              <button
                key={s.id}
                onClick={() => console.log('Step navigation handled by LangGraph workflow:', s.id)}
                className="flex items-center gap-2 group"
                title={s.name}
              >
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold border ${
                  isActive ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700'
                }`}>{idx + 1}</span>
                <span className={`text-xs ${isActive ? 'text-blue-700 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'} max-w-[100px] text-left`}>{s.name.split(' ').slice(0,2).join(' ')}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}


