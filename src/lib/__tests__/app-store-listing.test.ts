import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * APP_STORE_LISTING.md is pasted into App Store Connect by hand. Apple
 * rejects a field that is too long only at the moment of pasting, so the
 * limits are checked here, where an edit can still be fixed.
 */
const LIMITS: Record<string, number> = {
  name: 30,
  subtitle: 30,
  promotional: 170,
  description: 4000,
  keywords: 100,
  whatsnew: 4000,
  reviewnotes: 4000,
};

const doc = readFileSync(path.resolve(__dirname, '../../../APP_STORE_LISTING.md'), 'utf8');

function field(name: string): string {
  const match = new RegExp('```' + name + '\\n([\\s\\S]*?)\\n```').exec(doc);
  if (!match) throw new Error(`No "${name}" block in APP_STORE_LISTING.md`);
  return match[1];
}

describe('App Store listing', () => {
  it.each(Object.entries(LIMITS))('%s fits in %i characters', (name, limit) => {
    const text = field(name);
    expect(text.length).toBeGreaterThan(0);
    expect(text.length).toBeLessThanOrEqual(limit);
  });

  it('keywords are comma separated with no wasted spaces, and repeat nothing from the name or subtitle', () => {
    const keywords = field('keywords').split(',');
    expect(keywords.every((k) => k === k.trim() && k.length > 0)).toBe(true);
    expect(new Set(keywords).size).toBe(keywords.length);
    const taken = `${field('name')} ${field('subtitle')}`.toLowerCase().split(/[^a-z]+/);
    for (const keyword of keywords) {
      for (const word of keyword.split(' ')) expect(taken).not.toContain(word);
    }
  });

  it('never uses an em dash, and holds no credentials', () => {
    expect(doc).not.toContain(String.fromCharCode(0x2014));
    expect(doc).not.toMatch(/password\s*[:=]/i);
  });

  it('does not promise what the app does not do', () => {
    const text = `${field('description')} ${field('promotional')}`.toLowerCase();
    for (const claim of ['ipad', 'android', 'apple watch', 'apple health', 'nutrition', 'free trial', 'subscription']) {
      expect(text).not.toContain(claim);
    }
  });
});
