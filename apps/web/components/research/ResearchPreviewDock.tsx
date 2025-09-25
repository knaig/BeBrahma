'use client';

import React from 'react';

export interface PreviewItem {
  url: string;
  title?: string;
  status: 'queued' | 'crawling' | 'extracted' | 'analyzing' | 'done' | 'failed';
}

export function ResearchPreviewDock({
  items,
  initialOpen = false
}: {
  items: PreviewItem[];
  initialOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(initialOpen);

  const statusBadge = (s: PreviewItem['status']) => {
    const map: Record<PreviewItem['status'], string> = {
      queued: 'bg-gray-200 text-gray-700',
      crawling: 'bg-blue-100 text-blue-700',
      extracted: 'bg-indigo-100 text-indigo-700',
      analyzing: 'bg-purple-100 text-purple-700',
      done: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700'
    };
    return <span className={`px-2 py-0.5 rounded text-[10px] ${map[s]}`}>{s}</span>;
  };

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <button
        onClick={() => setOpen(o => !o)}
        className="mb-2 shadow-lg rounded-full px-3 py-2 text-sm bg-white border border-gray-200 hover:shadow-xl"
        title="Toggle research previews"
      >
        {open ? 'Hide Research Previews' : 'Show Research Previews'}
      </button>
      {open && (
        <div className="w-[380px] max-h-[60vh] overflow-y-auto rounded-lg shadow-2xl bg-white border border-gray-200 p-3 space-y-3">
          <div className="text-sm font-semibold">Live Research Previews</div>
          {items.length === 0 ? (
            <div className="text-xs text-gray-500">No active previews</div>
          ) : (
            items.map((it, i) => (
              <div key={`${it.url}-${i}`} className="border rounded-md overflow-hidden">
                <div className="flex items-center justify-between px-2 py-1 bg-gray-50 border-b">
                  <div className="truncate text-xs">
                    <a className="text-blue-600 hover:underline" href={it.url} target="_blank" rel="noreferrer">{it.title || it.url}</a>
                  </div>
                  {statusBadge(it.status)}
                </div>
                {/* Mini preview using iframe if allowed; else fallback to empty body */}
                <div className="h-32 bg-white">
                  <iframe
                    src={it.url}
                    className="w-full h-full"
                    sandbox="allow-forms allow-pointer-lock allow-popups allow-same-origin allow-scripts allow-top-navigation-by-user-activation"
                  />
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}


