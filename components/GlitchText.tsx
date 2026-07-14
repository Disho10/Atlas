// Wraps text in the .glitch-text CSS effect (see app/globals.css) — needs
// data-text to exactly match the visible content since the RGB-split
// layers are generated from that attribute, not from the element's actual
// children (CSS can't read text content otherwise).
export default function GlitchText({ text, className = '', as: Tag = 'span' }: { text: string; className?: string; as?: 'span' | 'h1' | 'h2' }) {
  return (
    <Tag className={`glitch-text ${className}`} data-text={text}>
      {text}
    </Tag>
  );
}
