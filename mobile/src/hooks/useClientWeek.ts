import useSWR from 'swr';
import type { WeekOverview } from '@logbook/shared/types/api';
import type { PlanDetail } from '@logbook/shared/types/plan-detail';

const POLL_MS = 30_000;

/** GET /api/client/week-overview — which week, and each day's status. */
export function useClientWeekOverview() {
  const { data, error, isLoading, mutate } = useSWR<WeekOverview>('/api/client/week-overview', {
    revalidateOnFocus: true,
    refreshInterval: POLL_MS,
  });
  return { weekOverview: data ?? null, error, isLoading, refresh: mutate };
}

/** GET /api/client/plan — the full plan, for exercise lists. */
export function useClientPlan() {
  const { data, error, isLoading, mutate } = useSWR<PlanDetail>('/api/client/plan', {
    revalidateOnFocus: true,
    refreshInterval: POLL_MS,
  });
  return { plan: data ?? null, error, isLoading, refresh: mutate };
}
