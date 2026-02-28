import useSWR from 'swr';
import type { PlanDetail } from './usePlanDetail';

/** Fetches the client's active plan from GET /api/client/plan */
export function useClientPlan() {
  const { data, error, isLoading, mutate } = useSWR<PlanDetail>(
    '/api/client/plan'
  );

  return {
    plan: data ?? null,
    error,
    isLoading,
    refresh: mutate,
  };
}
