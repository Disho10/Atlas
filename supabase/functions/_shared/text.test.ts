import { describe, it, expect } from 'vitest';
import { escapeMd, escapeHtml } from './text';

describe('escapeMd', () => {
  it('leaves plain text untouched', () => {
    expect(escapeMd('John Smith')).toBe('John Smith');
  });

  it('escapes Telegram Markdown formatting characters', () => {
    expect(escapeMd('*URGENT*')).toBe('\\*URGENT\\*');
    expect(escapeMd('[click here](http://evil.example)')).toBe('\\[click here](http://evil.example)');
    expect(escapeMd('_italic_ `code`')).toBe('\\_italic\\_ \\`code\\`');
  });

  it('handles null/undefined without throwing', () => {
    expect(escapeMd(null as unknown as string)).toBe('');
    expect(escapeMd(undefined as unknown as string)).toBe('');
  });
});

describe('escapeHtml', () => {
  it('leaves plain text untouched', () => {
    expect(escapeHtml('123 Main St')).toBe('123 Main St');
  });

  it('escapes HTML-significant characters so injected markup cannot render', () => {
    expect(escapeHtml('<img src=x onerror=alert(1)>')).toBe('&lt;img src=x onerror=alert(1)&gt;');
    expect(escapeHtml(`O'Brien & Sons "Ltd"`)).toBe('O&#39;Brien &amp; Sons &quot;Ltd&quot;');
  });

  it('handles null/undefined without throwing', () => {
    expect(escapeHtml(null as unknown as string)).toBe('');
  });
});
