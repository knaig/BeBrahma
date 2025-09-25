'use client';

import React from 'react';

export interface ResearchSessionEntry {
  id: string;
  query: string;
  role: string;
  mode: 'off' | 'conservative' | 'standard' | 'aggressive';
  timestamp: number;
  summary?: string;
  citations?: Array<{ source: string; url?: string; snippet?: string }>;
}

export const ResearchHistoryContext = React.createContext<{
  sessions: ResearchSessionEntry[];
  addSession: (s: ResearchSessionEntry) => void;
  clear: () => void;
}>({ sessions: [], addSession: () => {}, clear: () => {} });

export function ResearchHistoryProvider({ children }: { children: React.ReactNode }) {
  const [sessions, setSessions] = React.useState<ResearchSessionEntry[]>([]);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem('bebrahma_research_history');
      if (raw) setSessions(JSON.parse(raw));
    } catch {}
  }, []);

  const persist = (next: ResearchSessionEntry[]) => {
    setSessions(next);
    try { localStorage.setItem('bebrahma_research_history', JSON.stringify(next)); } catch {}
  };

  const addSession = (s: ResearchSessionEntry) => {
    persist([s, ...sessions].slice(0, 100));
  };

  const clear = () => persist([]);

  return (
    <ResearchHistoryContext.Provider value={{ sessions, addSession, clear }}>
      {children}
    </ResearchHistoryContext.Provider>
  );
}


