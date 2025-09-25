'use client';

import React from 'react';
import langgraphClient from '@/lib/langgraphClient';

export interface DocEntry {
  id: string;
  title: string;
  content: string;
  stepId?: string;
  link?: string;
  source?: 'firecrawl' | 'chat' | 'manual';
  createdAt: Date;
}

export function DocsPane({ entries, addEntry, sessionId }: { entries: DocEntry[]; addEntry: (e: Omit<DocEntry, 'id' | 'createdAt'>) => void; sessionId: string | null }) {
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
  const [query, setQuery] = React.useState('');
  const filtered = entries.filter(e => [e.title, e.content].join(' ').toLowerCase().includes(query.toLowerCase()));

  const [draft, setDraft] = React.useState({ title: '', content: '' });
  const [stepId, setStepId] = React.useState<string | undefined>(workflowState?.stage);

  const save = () => {
    if (!draft.title.trim() && !draft.content.trim()) return;
    addEntry({ title: draft.title.trim() || 'Untitled', content: draft.content.trim(), stepId, source: 'manual' });
    setDraft({ title: '', content: '' });
  };

  return (
    <div className="h-full bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search docs" className="flex-1 px-3 py-2 rounded border text-sm dark:border-gray-700 bg-white dark:bg-gray-900" />
        <select value={stepId} onChange={(e) => setStepId(e.target.value)} className="px-2 py-1 rounded border text-sm dark:border-gray-700 bg-white dark:bg-gray-900">
          <option value="">All steps</option>
          {steps.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="font-semibold">New entry</div>
          <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Title" className="w-full px-3 py-2 rounded border text-sm dark:border-gray-700 bg-white dark:bg-gray-900" />
          <textarea value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} placeholder="Notes, decisions, rationale..." rows={6} className="w-full px-3 py-2 rounded border text-sm dark:border-gray-700 bg-white dark:bg-gray-900" />
          <button onClick={save} className="px-3 py-2 rounded bg-blue-600 text-white text-sm">Save</button>
        </div>
        <div className="space-y-3">
          <div className="font-semibold">Entries</div>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {filtered.map(e => (
              <div key={e.id} className="p-3 border rounded bg-white dark:bg-gray-900 dark:border-gray-700">
                <div className="text-sm font-semibold">{e.title}</div>
                {e.stepId && <div className="text-xs text-gray-500">Linked: {steps.find(s => s.id === e.stepId)?.name}</div>}
                <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap mt-1">{e.content}</div>
                {e.link && <a href={e.link} target="_blank" className="text-xs text-blue-600">{e.link}</a>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


