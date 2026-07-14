import useSWR from 'swr';
import type { DashboardClient } from '@/types/api';

export function useCoachDashboard() {
  const { data, error, isLoading, mutate } = useSWR<DashboardClient[]>(
    '/api/coach/dashboard',
    // Urgency changes while the tab sits open (check-in responses, the 7-day
    // at-risk line) — keep it live like the client app's 30s polling
    { refreshInterval: 30_000, revalidateOnFocus: true }
  );

  return {
    clients: data ?? [],
    error,
    isLoading,
    refresh: mutate,
  };
}
