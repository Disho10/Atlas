'use client';

import { useState, useRef, useEffect } from 'react';
import { ChatIcon, CloseIcon } from './icons';
import { chatbotReply } from '@/app/chat/actions';
import { useSiteSettings } from './Providers';
import { whatsappLink } from '@/lib/settings';

const QUICK_REPLIES = ['How long does delivery take?', 'How do returns work?', 'What sizes do you carry?', 'Track my order'];

export default function ChatWidget() {
  const { settings } = useSiteSettings();
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
          <div className="relative bg-ink text-chalk px-4 py-3 flex items-center justify-between overflow-hidden">
            <span className="absolute top-0 right-8 w-3 h-full bg-volt/90 -skew-x-[20deg]" aria-hidden="true" />
            <span className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-volt opacity-75 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-volt" />
              </span>
              <span className="text-sm font-medium tracking-wide">Atlas Support</span>
              <span className="text-[10px] uppercase tracking-widest2 text-chalk/50 font-mono">Live</span>
            </span>
            <button onClick={() => setOpen(false)} aria-label="Close chat" className="relative z-10 hover:opacity-70 transition-opacity"><CloseIcon className="w-4 h-4" /></button>
          </div>
          <div ref={scrollRef} className="h-64 overflow-y-auto px-4 py-3 space-y-2 text-sm">
            {messages.map((m, i) => (
              <div key={i} className={m.from === 'bot' ? 'text-left' : 'text-right'}>
                <span className={`inline-block px-3 py-2 max-w-[85%] leading-snug ${m.from === 'bot' ? 'bg-black/5 dark:bg-white/10 rounded-r-xl rounded-tl-xl' : 'bg-volt text-ink rounded-l-xl rounded-tr-xl font-medium'}`}>
                  {m.text}
                </span>
              </div>
            ))}
            {thinking && (
              <div className="text-left">
                <span className="inline-flex items-center gap-1 px-3 py-2 rounded-r-xl rounded-tl-xl bg-black/5 dark:bg-white/10 text-steel">
                  <span className="w-1.5 h-1.5 rounded-full bg-steel animate-bounce [animation-delay:-0.2s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-steel animate-bounce [animation-delay:-0.1s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-steel animate-bounce" />
                </span>
              </div>
            )}
          </div>
          <div className="p-3 border-t border-black/10 dark:border-white/10 space-y-2">
            {messages.length <= 1 && (
              <div className="flex flex-wrap gap-1.5">
                {QUICK_REPLIES.map(q => (
                  <button key={q} onClick={() => send(q)} className="text-xs border border-black/10 dark:border-white/20 rounded-full px-2.5 py-1 btn-press hover:border-volt hover:text-ink hover:bg-volt/90 dark:hover:text-ink transition-colors">{q}</button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send(input)}
                placeholder="Type a message or ATL- number…"
                className="flex-1 border border-black/15 dark:border-white/20 bg-transparent rounded-full px-4 py-2 text-sm font-mono focus-visible:border-volt"
              />
              <button onClick={() => send(input)} disabled={thinking} className="bg-volt text-ink rounded-full px-4 text-sm font-medium btn-press disabled:opacity-50">Send</button>
            </div>
            {showWhatsApp && (
              <a href={whatsappLink(settings.whatsappNumber)} target="_blank" rel="noopener noreferrer" className="block text-center text-sm bg-[#25D366] text-white rounded-full py-2 font-medium btn-press">
                Continue on WhatsApp
              </a>
            )}
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen(o => !o)}
        className="relative w-14 h-14 rounded-full bg-volt text-ink shadow-2xl flex items-center justify-center float-idle btn-press"
        aria-label="Open support chat"
      >
        {!open && (
          <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full rounded-full bg-crimson opacity-75 animate-ping" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-crimson border-2 border-chalk dark:border-pitch" />
          </span>
        )}
        {open ? <CloseIcon className="w-5 h-5" /> : <ChatIcon className="w-6 h-6" />}
      </button>
    </div>
  );
}
