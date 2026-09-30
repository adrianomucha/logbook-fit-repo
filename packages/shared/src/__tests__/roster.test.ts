import { describe, expect, it } from 'vitest';
import type { DashboardClient } from '../types/api';
import { clientSignal, rosterAction, rosterSummary, splitRoster } from '../roster';

function client(overrides: Partial<DashboardClient> = {}): DashboardClient {
  return {
    clientProfileId: 'cp1',
    user: { id: 'u1', name: 'Jean', email: 'jean@example.com', avatarUrl: null },
    activePlan: { id: 'p1', name: '4-Week Strength Foundation', durationWeeks: 4 },
    lastWorkoutAt: null,
    pendingCheckIn: null,
    isSample: false,
    joinedAt: '2026-09-01T00:00:00Z',
    awaitingHello: false,
    planStatus: 'ACTIVE',
    urgency: 'ON_TRACK',
    urgencyOrder: 5,
    ...overrides,
  };
}

describe('rosterAction', () => {
  it('names the next plan for a client whose plan ended', () => {
    expect(rosterAction(client({ urgency: 'PLAN_ENDED' }))).toEqual({
      label: 'Assign Next Plan',
      target: 'profile',
    });
  });

  it('puts a submitted check-in first, even for an at-risk client', () => {
    const c = client({
      urgency: 'AT_RISK',
      pendingCheckIn: { id: 'c1', status: 'CLIENT_RESPONDED', createdAt: '' },
    });
    expect(rosterAction(c)).toEqual({ label: 'Review Check-in', target: 'check-in' });
  });

  it('opens a new client with a hello', () => {
    const c = client({ urgency: 'NEEDS_PLAN', awaitingHello: true });
    expect(rosterAction(c)).toEqual({ label: 'Say Hello', target: 'chat' });
  });

  it('leaves a check-in the client has yet to answer off the to-do list', () => {
    const c = client({
      urgency: 'CHECKIN_DUE',
      pendingCheckIn: { id: 'c1', status: 'PENDING', createdAt: '' },
    });
    expect(rosterAction(c)).toBeNull();
  });

  it('asks for a reply when an otherwise calm client wrote in', () => {
    expect(rosterAction(client(), 0)).toBeNull();
    expect(rosterAction(client(), 2)).toEqual({ label: 'Reply', target: 'chat' });
  });
});

describe('splitRoster', () => {
  it('keeps urgency order within each group', () => {
    const a = client({ clientProfileId: 'a', user: { id: 'ua', name: 'A', email: 'a@x', avatarUrl: null }, urgency: 'NEEDS_PLAN' });
    const b = client({ clientProfileId: 'b', user: { id: 'ub', name: 'B', email: 'b@x', avatarUrl: null }, urgency: 'PLAN_ENDED' });
    const c = client({ clientProfileId: 'c', user: { id: 'uc', name: 'C', email: 'c@x', avatarUrl: null } });
    const d = client({ clientProfileId: 'd', user: { id: 'ud', name: 'D', email: 'd@x', avatarUrl: null } });

    const { toDo, rest } = splitRoster([a, b, c, d], new Map([['ud', 1]]));
    expect(toDo.map((x) => x.clientProfileId)).toEqual(['a', 'b', 'd']);
    expect(rest.map((x) => x.clientProfileId)).toEqual(['c']);
  });
});

describe('rosterSummary', () => {
  // Wednesday, so the week began on Monday the 28th
  const now = new Date(2026, 8, 30, 18, 0);

  it('counts clients who trained since Monday', () => {
    const clients = [
      client({ lastWorkoutAt: new Date(2026, 8, 30, 9).toISOString() }),
      client({ lastWorkoutAt: new Date(2026, 8, 28, 7).toISOString() }),
      client({ lastWorkoutAt: new Date(2026, 8, 27, 20).toISOString() }),
      client({ lastWorkoutAt: null }),
    ];
    expect(rosterSummary(clients, now)).toBe('4 clients · 2 trained this week');
  });

  it('uses the singular for one client', () => {
    expect(rosterSummary([client()], now)).toBe('1 client · 0 trained this week');
  });
});

describe('clientSignal', () => {
  it('names the finished plan instead of repeating the Plan Ended chip', () => {
    expect(clientSignal(client({ urgency: 'PLAN_ENDED' }))).toEqual({
      lead: '4-Week Strength Foundation finished',
      rest: [],
    });
    expect(clientSignal(client({ urgency: 'PLAN_ENDED', activePlan: null }))).toEqual({
      lead: 'Ready for their next block',
      rest: [],
    });
  });

  it('marks an on-track client with no workouts as just started, not at risk', () => {
    expect(clientSignal(client({ urgency: 'ON_TRACK', lastWorkoutAt: null }))).toEqual({
      rest: ['4-Week Strength Foundation', 'just started, no workouts yet'],
    });
  });

  it('leads an at-risk client with no workouts with the silence', () => {
    expect(clientSignal(client({ urgency: 'AT_RISK', lastWorkoutAt: null }))).toEqual({
      lead: 'No workouts yet',
      rest: ['4-Week Strength Foundation'],
    });
  });
});
