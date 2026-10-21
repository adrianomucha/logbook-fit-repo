import { describe, it, expect } from 'vitest';
import { chatRowsNewestFirst } from '../chat-rows';
import { apiMessagesToMessages } from '../adapters/api';
import type { ApiMessage } from '../types/api';

// Local-time timestamps, so day boundaries hold in any test timezone
const at = (day: number, hour: number) => new Date(2026, 9, day, hour, 0, 0).toISOString();

function apiMessage(id: string, senderId: string, createdAt: string): ApiMessage {
  return {
    id,
    content: id,
    createdAt,
    readAt: null,
    senderId,
    recipientId: senderId === 'coach' ? 'client' : 'coach',
    sender: { name: senderId },
    exerciseContext: null,
  } as ApiMessage;
}

// The thread endpoint answers newest first; the adapter turns that into
// conversation order — the path the native chat screen takes
const thread = apiMessagesToMessages(
  [
    apiMessage('m4', 'client', at(21, 9)),
    apiMessage('m3', 'coach', at(20, 18)),
    apiMessage('m2', 'coach', at(20, 17)),
    apiMessage('m1', 'client', at(19, 8)),
  ],
  'client-profile'
);

describe('chatRowsNewestFirst', () => {
  it('puts the newest message first, for an inverted list to show at the bottom', () => {
    const rows = chatRowsNewestFirst(thread);
    expect(rows.map((r) => r.message.id)).toEqual(['m4', 'm3', 'm2', 'm1']);
    expect(rows[0].isNewest).toBe(true);
    expect(rows.filter((r) => r.isNewest)).toHaveLength(1);
  });

  it('puts a date separator above the first message of each day', () => {
    const sep = Object.fromEntries(chatRowsNewestFirst(thread).map((r) => [r.message.id, r.showDateSep]));
    expect(sep).toEqual({ m1: true, m2: true, m3: false, m4: true });
  });

  it('groups consecutive messages from one sender on the same day', () => {
    const byId = Object.fromEntries(chatRowsNewestFirst(thread).map((r) => [r.message.id, r]));
    expect(byId.m2).toMatchObject({ isFirstInGroup: true, isLastInGroup: false });
    expect(byId.m3).toMatchObject({ isFirstInGroup: false, isLastInGroup: true });
    expect(byId.m4).toMatchObject({ isFirstInGroup: true, isLastInGroup: true });
  });

  it('handles an empty thread', () => {
    expect(chatRowsNewestFirst([])).toEqual([]);
  });
});
