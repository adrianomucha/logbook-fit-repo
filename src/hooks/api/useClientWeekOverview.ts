import useSWR from 'swr';
import type { WeekOverview } from '@/types/api';

export function useClientWeekOverview() {
  const { data, error, isLoading, mutate } = useSWR<WeekOverview>(
    '/api/client/week-overview'
  );

  return {
    weekOverview: data ?? null,
    error,
    isLoading,
    refresh: mutate,
  };
}
