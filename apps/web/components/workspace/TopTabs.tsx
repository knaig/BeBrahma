'use client';

import React from 'react';

type Tab = 'workspace' | 'firecrawl' | 'docs' | 'actions';

export function TopTabs({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const item = (id: Tab, label: string) => (
    <button
      onClick={() => setTab(id)}
      className={`px-3 py-2 rounded-md text-sm font-medium border-b-2 transition-colors ${
        tab === id ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-600 hover:text-gray-900'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex items-center gap-2 border-b bg-white dark:bg-gray-900 dark:border-gray-800 px-4 h-12">
      {item('workspace', 'Workspace')}
      {item('firecrawl', 'Firecrawl')}
      {item('docs', 'Documentation')}
      {item('actions', 'Actions Tracker')}
      <div className="ml-auto text-xs text-gray-500">Press ⌘/Ctrl+K to quick-switch</div>
    </div>
  );
}


