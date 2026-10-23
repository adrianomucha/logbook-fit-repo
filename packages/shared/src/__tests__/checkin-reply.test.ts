import { describe, it, expect } from 'vitest';
import { freshCheckInReply, latestCheckInReply } from '../checkin-reply';

const now = new Date('2026-10-23T12:00:00Z');
const reply = (id: string, completedAt: string, coachResponse = 'Nice work') => ({
  id,
  status: 'completed' as const,
  completedAt,
  coachResponse,
});

describe('check-in reply', () => {
  it('picks the newest reply regardless of order', () => {
    const list = [reply('a', '2026-10-01T00:00:00Z'), reply('b', '2026-10-20T00:00:00Z'), reply('c', '2026-10-10T00:00:00Z')];
    expect(latestCheckInReply(list)?.id).toBe('b');
  });

  it('skips check-ins without a reply', () => {
    const list = [
      reply('a', '2026-10-01T00:00:00Z'),
      { id: 'b', status: 'responded' as const, completedAt: '2026-10-20T00:00:00Z', coachResponse: 'x' },
      reply('c', '2026-10-21T00:00:00Z', '   '),
    ];
    expect(latestCheckInReply(list)?.id).toBe('a');
  });

  it('shows a reply from within the last week', () => {
    expect(freshCheckInReply([reply('a', '2026-10-20T09:00:00Z')], now)?.id).toBe('a');
  });

  it('steps aside once the reply is over a week old', () => {
    expect(freshCheckInReply([reply('a', '2026-10-15T09:00:00Z')], now)).toBeNull();
  });

  it('is null with no replies', () => {
    expect(freshCheckInReply([], now)).toBeNull();
  });
});
