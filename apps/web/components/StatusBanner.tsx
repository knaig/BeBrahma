'use client';

import React, { useEffect, useState } from 'react';

type Health = {
  status: string;
  environment: string;
  apiUrl: string;
  frontendUrl: string;
  llm?: { openai?: boolean; anthropic?: boolean };
};

export function StatusBanner() {
  const [apiHealthy, setApiHealthy] = useState<boolean | null>(null);
  const [llmOpenAI, setLlmOpenAI] = useState<boolean | null>(null);
  const [llmAnthropic, setLlmAnthropic] = useState<boolean | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [online, setOnline] = useState<boolean>(true);

  async function checkHealth() {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${apiBase}/health`, { cache: 'no-store' });
      if (!res.ok) throw new Error('API unhealthy');
      const data: Health = await res.json();
      setApiHealthy(true);
      setLlmOpenAI(Boolean(data.llm?.openai));
      setLlmAnthropic(Boolean(data.llm?.anthropic));
    } catch {
      setApiHealthy(false);
      setLlmOpenAI(null);
      setLlmAnthropic(null);
    } finally {
      setLastChecked(new Date());
    }
  }

  useEffect(() => {
    setOnline(navigator.onLine);
    const onUp = () => setOnline(true);
    const onDown = () => setOnline(false);
    window.addEventListener('online', onUp);
    window.addEventListener('offline', onDown);
    checkHealth();
    const id = setInterval(checkHealth, 15000);
    return () => {
      clearInterval(id);
      window.removeEventListener('online', onUp);
      window.removeEventListener('offline', onDown);
    };
  }, []);

  const showBanner = apiHealthy === false || !online || llmOpenAI === false || llmAnthropic === false;
  if (!showBanner) return null;

  return (
    <div className="w-full bg-yellow-100 border-b border-yellow-300 text-yellow-900 text-sm">
      <div className="max-w-6xl mx-auto px-4 py-2 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center">
          {!online && <span>⚠️ Offline: No internet connection</span>}
          {apiHealthy === false && <span>⚠️ API unreachable</span>}
          {llmOpenAI === false && <span>⚠️ OpenAI not configured</span>}
          {llmAnthropic === false && <span>⚠️ Anthropic not configured</span>}
        </div>
        <div className="flex items-center gap-2">
          {lastChecked && <span className="text-xs text-yellow-800">Checked {lastChecked.toLocaleTimeString()}</span>}
          <button onClick={checkHealth} className="px-2 py-1 text-xs rounded bg-yellow-200 hover:bg-yellow-300 border border-yellow-400">
            Recheck
          </button>
        </div>
      </div>
    </div>
  );
}


