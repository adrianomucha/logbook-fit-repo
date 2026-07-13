import useSWR from 'swr';
import type { CoachClient, PastClient } from '@/types/api';

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

/** Ended relationships — the coach's archive of past clients. */
export function usePastClients() {
  const { data, error, isLoading, mutate } = useSWR<PastClient[]>(
    '/api/coach/clients?status=ended'
  );

  return {
    pastClients: data ?? [],
    error,
    isLoading,
    refresh: mutate,
  };
}
