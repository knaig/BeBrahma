'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Phase = 'starting' | 'searching' | 'crawling' | 'extracting' | 'analyzing' | 'synthesizing' | 'complete' | 'error';

export function ResearchPanel({ query, role, mode }: { query: string; role: string; mode: 'off' | 'conservative' | 'standard' | 'aggressive' }) {
  const [events, setEvents] = React.useState<any[]>([]);
  const [summary, setSummary] = React.useState<string>('');
  const [citations, setCitations] = React.useState<any[]>([]);
  const [verbosity, setVerbosity] = React.useState<'brief' | 'standard' | 'detailed'>('standard');
  const [isRunning, setIsRunning] = React.useState(false);

  const start = React.useCallback(() => {
    setEvents([]);
    setSummary('');
    setCitations([]);
    setIsRunning(true);
    const url = `/api/research/stream?query=${encodeURIComponent(query)}&role=${encodeURIComponent(role)}&mode=${encodeURIComponent(mode)}`;
    const es = new EventSource(url);
    es.addEventListener('progress', (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      setEvents(prev => [...prev, data]);
    });
    es.addEventListener('summary_delta', (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      if (data?.delta) setSummary(prev => prev + data.delta);
    });
    es.addEventListener('complete', (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      setCitations(data?.citations || []);
      setIsRunning(false);
      es.close();
    });
    es.addEventListener('error', () => {
      setIsRunning(false);
      es.close();
    });
  }, [query, role, mode]);

  React.useEffect(() => {
    if (!query) return;
    start();
  }, [start]);

  const phaseIcon = (phase?: Phase) => {
    const spin = <span className="animate-spin inline-block">⏳</span>;
    switch (phase) {
      case 'starting': return '🚀';
      case 'searching': return spin;
      case 'crawling': return '🕷️';
      case 'extracting': return '🧩';
      case 'analyzing': return '📊';
      case 'synthesizing': return '🧠';
      case 'complete': return '✅';
      case 'error': return '⚠️';
      default: return '•';
    }
  };

  const filteredEvents = events.filter(e => {
    if (verbosity === 'brief') return ['starting', 'complete'].includes(e.phase);
    if (verbosity === 'standard') return true;
    return true; // detailed = all
  });

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold">Research Activity</div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500">Verbosity</label>
          <select className="text-sm border rounded px-2 py-1" value={verbosity} onChange={e => setVerbosity(e.target.value as any)}>
            <option value="brief">Brief</option>
            <option value="standard">Standard</option>
            <option value="detailed">Detailed</option>
          </select>
        </div>
      </div>
      {/* Summary */}
      {summary && (
        <div className="mb-4 bg-gray-50 rounded p-3 prose prose-sm max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary}</ReactMarkdown>
        </div>
      )}
      {/* Timeline */}
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {filteredEvents.map((e, idx) => (
          <div key={idx} className="flex items-start gap-2 text-sm">
            <div className="w-5 text-center">{phaseIcon(e.phase)}</div>
            <div>
              <div className="font-medium">{e.phase}</div>
              <div className="text-gray-600">{e.message}</div>
              {Array.isArray(e.urls) && e.urls.length > 0 && (
                <ul className="list-disc ml-5 text-gray-600">
                  {e.urls.map((u: string, i: number) => (<li key={i}>{u}</li>))}
                </ul>
              )}
            </div>
          </div>
        ))}
      </div>
      {/* Citations */}
      {citations.length > 0 && (
        <div className="mt-4">
          <div className="font-semibold mb-1">Sources & Evidence</div>
          <ul className="list-disc ml-5 text-sm">
            {citations.map((c, i) => (
              <li key={i}>
                {c.url ? <a className="text-blue-600 hover:underline" href={c.url} target="_blank" rel="noreferrer">{c.source}</a> : c.source}
                {c.snippet ? <span className="text-gray-500"> – {c.snippet}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-3 flex justify-end">
        <button onClick={start} disabled={isRunning} className="text-xs px-3 py-1 rounded border">
          {isRunning ? 'Running…' : 'Run again'}
        </button>
      </div>
    </div>
  );
}


