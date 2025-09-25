'use client';

import React from 'react';

const CHAT_API = process.env.NEXT_PUBLIC_CHAT_API_URL;

export function ChatFAB(_props: { show: boolean; onToggle: () => void; unread?: number }) {
  // Chat FAB disabled per UX direction
  return null;
}

export function ChatPanel({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = React.useState<Array<{ id: string; sender: 'user' | 'ai' | 'agent'; content: string }>>([
    { id: 'w1', sender: 'ai', content: 'How can I help with your workflow?' },
  ]);
  const [input, setInput] = React.useState('');
  const [sessionId] = React.useState(`session_${Date.now()}`);
  const [loading, setLoading] = React.useState(false);
  const [needsApproval, setNeedsApproval] = React.useState<null | 'approve' | 'refine' | 'reject'>(null);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const user = { id: `u_${Date.now()}`, sender: 'user' as const, content: input };
    setMessages((prev) => [...prev, user]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch(`${CHAT_API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: user.content, sessionId, projectTitle: 'Workspace Chat' }),
      });
      const data = await res.json();
      if (data?.success && Array.isArray(data.messages)) {
        const nonUser = data.messages.filter((m: any) => m.sender !== 'user').map((m: any) => ({
          id: m.id || `m_${Math.random()}`,
          sender: m.sender === 'agent' ? 'agent' : 'ai',
          content: m.content,
        }));
        setMessages((prev) => [...prev, ...nonUser]);
        // Simple heuristic: if any message has type decision_point, flag approval
        if (data.messages.some((m: any) => m.type === 'decision_point')) {
          setNeedsApproval('approve');
        }
      } else {
        setMessages((prev) => [...prev, { id: `e_${Date.now()}`, sender: 'ai', content: 'Error connecting to AI.' }]);
      }
    } catch (e) {
      setMessages((prev) => [...prev, { id: `e_${Date.now()}`, sender: 'ai', content: 'Network error.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-[350px] h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 flex flex-col">
      <header className="px-4 py-3">
        <div className="flex items-center justify-between font-semibold">
          Multi-Agent Chat
          <button onClick={onClose} className="text-xl">×</button>
        </div>
        {needsApproval && (
          <div className="mt-2 p-2 rounded bg-yellow-50 border border-yellow-200 text-sm text-yellow-800">
            Action required: review and respond.
            <div className="mt-2 flex gap-2">
              <button className="px-2 py-1 rounded bg-green-600 text-white text-xs" onClick={() => setNeedsApproval(null)}>Approve</button>
              <button className="px-2 py-1 rounded bg-blue-600 text-white text-xs" onClick={() => setNeedsApproval(null)}>Refine</button>
              <button className="px-2 py-1 rounded bg-red-600 text-white text-xs" onClick={() => setNeedsApproval(null)}>Reject</button>
            </div>
          </div>
        )}
      </header>
      <ul className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
        {messages.map((m) => (
          <li key={m.id} className={m.sender === 'user' ? 'text-right' : 'text-left'}>
            <span className="inline-block px-3 py-2 rounded bg-gray-100 dark:bg-gray-800">
              {m.sender === 'ai' ? '🤖 ' : m.sender === 'agent' ? '👥 ' : ''}
              {m.content}
            </span>
          </li>
        ))}
      </ul>
      <div className="p-3 border-t border-gray-200 dark:border-gray-800 flex gap-2">
        <input
          className="flex-1 px-3 py-2 rounded border dark:border-gray-700 bg-white dark:bg-gray-800"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message…"
          disabled={loading}
        />
        <button onClick={sendMessage} disabled={loading || !input.trim()} className="px-4 py-2 rounded bg-blue-600 text-white">Send</button>
      </div>
    </div>
  );
}


