'use client';

import React from 'react';
import langgraphClient from '@/lib/langgraphClient';

type Status = 'todo' | 'doing' | 'done';
export interface ActionItem {
  id: string;
  title: string;
  status: Status;
  stepId?: string;
  assignee?: string;
  due?: string;
}

export function ActionsPane({ items, addItem, updateItem, sessionId }: {
  items: ActionItem[];
  addItem: (i: Omit<ActionItem, 'id'>) => void;
  updateItem: (id: string, patch: Partial<ActionItem>) => void;
  sessionId: string | null;
}) {
  const [workflowState, setWorkflowState] = React.useState<any>(null);

  // Poll workflow status for step information
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
    const interval = setInterval(pollStatus, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [sessionId]);

  const steps = workflowState ? [{ id: workflowState.stage, name: workflowState.stage }] : [];

  const [title, setTitle] = React.useState('');
  const [stepId, setStepId] = React.useState<string | undefined>(workflowState?.stage);

  const create = () => {
    if (!title.trim()) return;
    addItem({ title: title.trim(), status: 'todo', stepId });
    setTitle('');
  };

  const lane = (status: Status, label: string) => (
    <div className="flex-1 min-h-[60vh] bg-gray-50 dark:bg-gray-900 border rounded p-3 space-y-2 dark:border-gray-700">
      <div className="text-sm font-semibold mb-1">{label}</div>
      {items.filter(i => i.status === status).map(i => (
        <div key={i.id} className="p-2 rounded border bg-white dark:bg-gray-800 dark:border-gray-700">
          <div className="text-sm font-medium">{i.title}</div>
          {i.stepId && <div className="text-xs text-gray-500">{steps.find(s => s.id === i.stepId)?.name}</div>}
          <div className="flex items-center gap-2 mt-2">
            <select value={i.status} onChange={(e) => updateItem(i.id, { status: e.target.value as Status })} className="text-xs px-2 py-1 rounded border dark:border-gray-700 bg-white dark:bg-gray-900">
              <option value="todo">To Do</option>
              <option value="doing">In Progress</option>
              <option value="done">Done</option>
            </select>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="h-full bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New action…" className="flex-1 px-3 py-2 rounded border text-sm dark:border-gray-700 bg-white dark:bg-gray-900" />
        <select value={stepId} onChange={(e) => setStepId(e.target.value)} className="px-2 py-1 rounded border text-sm dark:border-gray-700 bg-white dark:bg-gray-900">
          <option value="">No step</option>
          {steps.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
        </select>
        <button onClick={create} className="px-3 py-2 rounded bg-blue-600 text-white text-sm">Add</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {lane('todo', 'To Do')}
        {lane('doing', 'In Progress')}
        {lane('done', 'Done')}
      </div>
    </div>
  );
}


