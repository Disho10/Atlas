'use client';

import { useState, useRef, useEffect } from 'react';
import { ChatIcon, CloseIcon } from './icons';
import { chatbotReply } from '@/app/chat/actions';

const QUICK_REPLIES = ['How long does delivery take?', 'How do returns work?', 'What sizes do you carry?', 'Track my order'];

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [messages, setMessages] = useState<{ from: 'bot' | 'user'; text: string }[]>([
    { from: 'bot', text: "Hey! I'm the Atlas assistant. Ask me about shipping, sizing, or returns — or type your order number (ATL-…) and I'll look it up." },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages, thinking]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || thinking) return;
    setInput('');
    setMessages(m => [...m, { from: 'user', text: q }]);
    setThinking(true);
    const res = await chatbotReply(q);
    setThinking(false);
    setMessages(m => [...m, { from: 'bot', text: res.text }]);
    if (res.fallback) setShowWhatsApp(true);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <div className="mb-3 w-80 max-w-[90vw] rounded-2xl bg-chalk dark:bg-pitch border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden animate-rise">
          <div className="bg-ink text-chalk px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium">Atlas Support</span>
            <button onClick={() => setOpen(false)} aria-label="Close chat"><CloseIcon className="w-4 h-4" /></button>
          </div>
          <div ref={scrollRef} className="h-64 overflow-y-auto px-4 py-3 space-y-2 text-sm">
            {messages.map((m, i) => (
              <div key={i} className={m.from === 'bot' ? 'text-left' : 'text-right'}>
                <span className={`inline-block px-3 py-2 rounded-xl max-w-[85%] ${m.from === 'bot' ? 'bg-black/5 dark:bg-white/10' : 'bg-volt text-ink'}`}>
                  {m.text}
                </span>
              </div>
            ))}
            {thinking && <div className="text-left"><span className="inline-block px-3 py-2 rounded-xl bg-black/5 dark:bg-white/10 text-steel">…</span></div>}
          </div>
          <div className="p-3 border-t border-black/10 dark:border-white/10 space-y-2">
            {messages.length <= 1 && (
              <div className="flex flex-wrap gap-1.5">
                {QUICK_REPLIES.map(q => (
                  <button key={q} onClick={() => send(q)} className="text-xs border border-black/10 dark:border-white/20 rounded-full px-2.5 py-1">{q}</button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send(input)}
                placeholder="Type a message or ATL- number…"
                className="flex-1 border border-black/15 dark:border-white/20 bg-transparent rounded-full px-4 py-2 text-sm"
              />
              <button onClick={() => send(input)} disabled={thinking} className="bg-volt text-ink rounded-full px-4 text-sm font-medium btn-press disabled:opacity-50">Send</button>
            </div>
            {showWhatsApp && (
              <a href="https://wa.me/96181752873" target="_blank" rel="noopener noreferrer" className="block text-center text-sm bg-[#25D366] text-white rounded-full py-2 font-medium">
                Continue on WhatsApp
              </a>
            )}
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-14 h-14 rounded-full bg-volt text-ink shadow-2xl flex items-center justify-center float-idle btn-press"
        aria-label="Open support chat"
      >
        {open ? <CloseIcon className="w-5 h-5" /> : <ChatIcon className="w-6 h-6" />}
      </button>
    </div>
  );
}
