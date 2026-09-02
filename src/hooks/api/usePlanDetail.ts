import useSWR from 'swr';
import type { PlanDetail } from '@logbook/shared/types/plan-detail';

export type { PlanDetail };

export function usePlanDetail(planId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<PlanDetail>(
    planId ? `/api/plans/${planId}` : null
  );

  return {
    plan: data ?? null,
    error,
    isLoading,
    refresh: mutate,
  };
}
