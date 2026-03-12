import useSWR from 'swr';
import type { WeekOverview } from '@/types/api';

export function useClientWeekOverview() {
  const { data, error, isLoading, mutate } = useSWR<WeekOverview>(
    '/api/client/week-overview',
    {
      revalidateOnFocus: true,
      refreshInterval: 30_000,
    }
  );

  return {
    weekOverview: data ?? null,
    error,
    isLoading,
    refresh: mutate,
  };
}
