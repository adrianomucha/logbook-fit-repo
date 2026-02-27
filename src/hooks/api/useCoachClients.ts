import useSWR from 'swr';
import type { CoachClient } from '@/types/api';

export function useCoachClients() {
  const { data, error, isLoading, mutate } = useSWR<CoachClient[]>(
    '/api/coach/clients'
  );

  return {
    clients: data ?? [],
    error,
    isLoading,
    refresh: mutate,
  };
}
