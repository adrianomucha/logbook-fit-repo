import { describe, expect, it, vi, beforeEach } from 'vitest';

const { track } = vi.hoisted(() => ({ track: vi.fn() }));
vi.mock('@vercel/analytics', () => ({ track }));

import { attributionFrom, signupKind, trackFunnel } from '../funnel';

beforeEach(() => vi.clearAllMocks());

describe('attributionFrom', () => {
  it('reads utm tags from the URL', () => {
    expect(
      attributionFrom('?utm_source=reddit&utm_medium=post&utm_campaign=launch', undefined, 'logbook.fit')
    ).toEqual({ source: 'reddit', medium: 'post', campaign: 'launch', referrer: undefined });
  });

  it('falls back to the referring site, then to direct', () => {
    expect(attributionFrom('', 'https://news.example.com/item?id=1', 'logbook.fit').source).toBe('news.example.com');
    expect(attributionFrom('', undefined, 'logbook.fit').source).toBe('direct');
  });

  it('does not count a visit from our own pages as a source', () => {
    expect(attributionFrom('', 'https://logbook.fit/pricing', 'logbook.fit').source).toBe('direct');
  });

  it('survives a malformed referrer', () => {
    expect(attributionFrom('', 'not a url', 'logbook.fit').source).toBe('direct');
  });

  it("uses the page's campaign only when the link has none", () => {
    expect(attributionFrom('', undefined, 'logbook.fit', 'checkin-template').campaign).toBe('checkin-template');
    expect(attributionFrom('?utm_campaign=x', undefined, 'logbook.fit', 'checkin-template').campaign).toBe('x');
  });
});

describe('signupKind', () => {
  it('tells the three signups apart', () => {
    expect(signupKind('invite-token', null)).toBe('client-invite');
    expect(signupKind(null, 'beta-token')).toBe('coach-beta-invite');
    expect(signupKind(null, null)).toBe('coach-open');
    // A client invite wins when both are present, as on the page
    expect(signupKind('invite-token', 'beta-token')).toBe('client-invite');
  });
});

describe('trackFunnel', () => {
  it('sends the step with its labels, dropping empty ones', () => {
    trackFunnel('Waitlist joined', { source: 'reddit', medium: undefined, campaign: 'launch' });
    expect(track).toHaveBeenCalledWith('Waitlist joined', { source: 'reddit', campaign: 'launch' });
  });

  it('never throws, so analytics cannot break a signup', () => {
    track.mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => trackFunnel('Signup completed', { kind: 'coach-open' })).not.toThrow();
  });
});
