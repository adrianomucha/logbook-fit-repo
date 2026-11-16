import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { appStoreUrl, clientNeeds, getOffer, offerMode, OFFER_COPY } from '../offer';

const KEYS = ['OPEN_COACH_SIGNUP', 'NEXT_PUBLIC_APP_STORE_URL'] as const;
let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
  for (const k of KEYS) delete process.env[k];
});
afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

/** Every string in a copy set */
function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === 'object') return Object.values(value).flatMap(strings);
  return [];
}

describe('offerMode', () => {
  it('sells the waitlist while coach signup is invite-only (the default)', () => {
    expect(offerMode()).toBe('waitlist');
    process.env.OPEN_COACH_SIGNUP = 'false';
    expect(offerMode()).toBe('waitlist');
  });

  it('follows the same switch signup does', () => {
    process.env.OPEN_COACH_SIGNUP = 'true';
    expect(offerMode()).toBe('open');
    expect(getOffer().copy).toBe(OFFER_COPY.open);
  });
});

describe('the two offers', () => {
  it('the waitlist asks for an invite and never points at signup', () => {
    const text = strings(OFFER_COPY.waitlist);
    expect(OFFER_COPY.waitlist.midCta).toEqual({ label: 'Request an invite', href: '#waitlist' });
    expect(text.some((t) => t.includes('/signup'))).toBe(false);
  });

  it('open signup points at signup and promises nothing the waitlist exists for', () => {
    const text = strings(OFFER_COPY.open).join(' ').toLowerCase();
    expect(OFFER_COPY.open.midCta.href).toBe('/signup');
    for (const word of ['waitlist', 'your invite', 'spot opens', 'batch', 'setup call', 'private beta']) {
      expect(text).not.toContain(word);
    }
  });

  it('both say it is free and keep the founding-price promise', () => {
    for (const mode of ['waitlist', 'open'] as const) {
      expect(OFFER_COPY[mode].price).toContain('free');
      expect(OFFER_COPY[mode].price).toContain('founding price');
      expect(OFFER_COPY[mode].structured.description).toContain('Free');
    }
  });

  it('tells search engines the right availability', () => {
    expect(OFFER_COPY.waitlist.structured.availability).toMatch(/PreOrder$/);
    expect(OFFER_COPY.open.structured.availability).toMatch(/InStock$/);
  });

  it('never uses an em dash', () => {
    for (const text of [...strings(OFFER_COPY), clientNeeds(true), clientNeeds(false)]) {
      expect(text).not.toContain(String.fromCharCode(0x2014));
    }
  });
});

describe('appStoreUrl', () => {
  it('is off until the app has a store page', () => {
    expect(appStoreUrl()).toBeNull();
    expect(getOffer().appStoreUrl).toBeNull();
  });

  it('accepts an App Store address', () => {
    process.env.NEXT_PUBLIC_APP_STORE_URL = ' https://apps.apple.com/us/app/logbook-fit/id1234567890 ';
    expect(appStoreUrl()).toBe('https://apps.apple.com/us/app/logbook-fit/id1234567890');
  });

  it('ignores anything that is not one, so a typo cannot put a bad link on the homepage', () => {
    for (const bad of ['http://apps.apple.com/app/id1', 'https://apps.apple.com.evil.example/app', 'https://example.com', 'not a url', 'javascript:alert(1)']) {
      process.env.NEXT_PUBLIC_APP_STORE_URL = bad;
      expect(appStoreUrl()).toBeNull();
    }
  });
});

describe('clientNeeds', () => {
  it('names the iPhone app only once it exists', () => {
    expect(clientNeeds(true)).toContain('iPhone app');
    expect(clientNeeds(false)).not.toContain('iPhone app');
    expect(clientNeeds(false)).toContain('home screen');
  });
});
