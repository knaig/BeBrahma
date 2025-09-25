'use client';

import React from 'react';

type Item = { url: string; title?: string; status: 'queued' | 'crawling' | 'extracted' | 'analyzing' | 'done' | 'failed' };

export const PreviewContext = React.createContext<{ items: Item[]; setItems: (items: Item[]) => void }>({ items: [], setItems: () => {} });

export function PreviewProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<Item[]>([]);
  return (
    <PreviewContext.Provider value={{ items, setItems }}>
      {children}
    </PreviewContext.Provider>
  );
}


