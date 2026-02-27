import useSWR from 'swr';
import type { DashboardClient } from '@/types/api';

export function useCoachDashboard() {
  const { data, error, isLoading, mutate } = useSWR<DashboardClient[]>(
    '/api/coach/dashboard'
  );

  return {
    clients: data ?? [],
    error,
    isLoading,
    refresh: mutate,
  };
}
