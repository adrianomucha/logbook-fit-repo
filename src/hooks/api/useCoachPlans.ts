import useSWR from 'swr';
import { apiFetch } from '@/lib/api-client';
import type { PlanSummary } from '@/types/api';

export function useCoachPlans() {
  const { data, error, isLoading, mutate } = useSWR<PlanSummary[]>('/api/plans');

  const createPlan = async (planData: {
    name: string;
    description?: string;
    durationWeeks?: number;
  }) => {
    const newPlan = await apiFetch<PlanSummary>('/api/plans', {
      method: 'POST',
      body: JSON.stringify(planData),
    });
    mutate();
    return newPlan;
  };

  const deletePlan = async (planId: string) => {
    await apiFetch(`/api/plans/${planId}`, { method: 'DELETE' });
    mutate();
  };

  return {
    plans: data ?? [],
    error,
    isLoading,
    createPlan,
    deletePlan,
    refresh: mutate,
  };
}
