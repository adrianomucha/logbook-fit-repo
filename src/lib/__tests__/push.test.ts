import { describe, it, expect, vi } from 'vitest';

// Pure helpers only — no prisma, no push transport
vi.mock('@/lib/prisma', () => ({ default: {} }));

import { previewText } from '../push';
import { urlBase64ToUint8Array } from '../push-client';

describe('previewText', () => {
  it('passes a short message through untouched', () => {
    expect(previewText('Nice session today')).toBe('Nice session today');
  });

  it('collapses newlines and runs of whitespace — lock screens are one line', () => {
    expect(previewText('Hey\n\n  how did   squats go?')).toBe(
      'Hey how did squats go?'
    );
  });

  it('truncates to the limit with an ellipsis', () => {
    const preview = previewText('a'.repeat(200), 20);
    expect(preview).toHaveLength(20);
    expect(preview.endsWith('…')).toBe(true);
  });

  it('does not add an ellipsis at exactly the limit', () => {
    expect(previewText('abcde', 5)).toBe('abcde');
  });
});

describe('urlBase64ToUint8Array', () => {
  it('decodes unpadded base64url the way PushManager expects', () => {
    // "hello" → base64 "aGVsbG8=" → base64url without padding "aGVsbG8"
    expect(Array.from(urlBase64ToUint8Array('aGVsbG8'))).toEqual([
      104, 101, 108, 108, 111,
    ]);
  });

  it('maps the URL-safe alphabet back to standard base64', () => {
    // 0xFB 0xFF decodes from "+/8=" in standard base64 → "-_8" in base64url
    expect(Array.from(urlBase64ToUint8Array('-_8'))).toEqual([251, 255]);
  });

  it('round-trips a VAPID-length key (65 raw bytes)', () => {
    const raw = Uint8Array.from({ length: 65 }, (_, i) => (i * 7) % 256);
    const base64url = Buffer.from(raw)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    expect(Array.from(urlBase64ToUint8Array(base64url))).toEqual(Array.from(raw));
  });
});
