'use client';

import React from 'react';
import { ResearchHistoryContext } from '@/lib/research/HistoryContext';

export function ResearchHistoryDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { sessions, clear } = React.useContext(ResearchHistoryContext);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute top-0 right-0 h-full w-[380px] bg-white border-l border-gray-200 shadow-xl p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold">Research History</div>
          <div className="flex items-center gap-2">
            <button onClick={clear} className="text-xs px-2 py-1 rounded border">Clear</button>
            <button onClick={onClose} className="text-xs px-2 py-1 rounded border">Close</button>
          </div>
        </div>
        {sessions.length === 0 ? (
          <div className="text-sm text-gray-500">No research sessions yet</div>
        ) : (
          <ul className="space-y-3">
            {sessions.map(s => (
              <li key={s.id} className="border rounded p-3">
                <div className="text-xs text-gray-500">{new Date(s.timestamp).toLocaleString()} • {s.role} • {s.mode}</div>
                <div className="font-medium truncate" title={s.query}>{s.query}</div>
                {s.summary && <div className="text-sm text-gray-700 line-clamp-3 mt-1">{s.summary}</div>}
                {Array.isArray(s.citations) && s.citations.length > 0 && (
                  <div className="text-xs text-gray-500 mt-1">Sources: {s.citations.length}</div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}


