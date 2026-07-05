'use client';

import { useState } from 'react';
import { ChatIcon, CloseIcon } from './icons';

const QUICK_REPLIES = [
  { q: 'Where is my order?', a: 'Head to Account → Orders to see live status: placed, confirmed, shipped, or delivered.' },
  { q: 'Do you ship outside Beirut?', a: 'Yes — we deliver across all of Lebanon. Cash on delivery is available everywhere.' },
  { q: 'How do returns work?', a: 'Open Account → Returns within 14 days of delivery and pick the item you want to exchange or return.' },
];

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ from: 'bot' | 'user'; text: string }[]>([
    { from: 'bot', text: "Hey! I'm the Atlas assistant. Ask me about orders, sizing, or returns — or jump straight to WhatsApp." },
  ]);

  const ask = (text: string) => {
    setMessages(m => [...m, { from: 'user', text }]);
    const found = QUICK_REPLIES.find(r => r.q === text);
    setTimeout(() => {
      setMessages(m => [
        ...m,
        { from: 'bot', text: found ? found.a : "I couldn't find that in my quick answers — tap below to continue on WhatsApp with our team." },
      ]);
    }, 400);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <div className="mb-3 w-80 max-w-[90vw] rounded-2xl bg-chalk dark:bg-pitch border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden animate-rise">
          <div className="bg-ink text-chalk dark:bg-pitchline px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium">Atlas Support</span>
            <button onClick={() => setOpen(false)} aria-label="Close chat"><CloseIcon className="w-4 h-4" /></button>
          </div>
          <div className="h-64 overflow-y-auto px-4 py-3 space-y-2 text-sm">
            {messages.map((m, i) => (
              <div key={i} className={m.from === 'bot' ? 'text-left' : 'text-right'}>
                <span className={`inline-block px-3 py-2 rounded-xl ${m.from === 'bot' ? 'bg-black/5 dark:bg-white/10' : 'bg-volt text-ink'}`}>
                  {m.text}
                </span>
              </div>
            ))}
          </div>
          <div className="p-3 border-t border-black/10 dark:border-white/10 space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {QUICK_REPLIES.map(r => (
                <button key={r.q} onClick={() => ask(r.q)} className="text-xs border border-black/10 dark:border-white/20 rounded-full px-2.5 py-1">
                  {r.q}
                </button>
              ))}
            </div>
            <a
              href="https://wa.me/9610000000"
              target="_blank"
              className="block text-center text-sm bg-[#25D366] text-white rounded-full py-2 font-medium"
            >
              Continue on WhatsApp
            </a>
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-14 h-14 rounded-full bg-volt text-ink shadow-2xl flex items-center justify-center"
        aria-label="Open support chat"
      >
        {open ? <CloseIcon className="w-5 h-5" /> : <ChatIcon className="w-6 h-6" />}
      </button>
    </div>
  );
}
