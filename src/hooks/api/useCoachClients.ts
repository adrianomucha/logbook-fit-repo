import useSWR from 'swr';
import type { CoachClient, PastClient, PastClientArchive } from '@/types/api';

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

/** One past client's read-only record (workouts, check-ins, conversation). */
export function usePastClient(clientProfileId: string | null) {
  const { data, error, isLoading } = useSWR<PastClientArchive>(
    clientProfileId ? `/api/coach/clients/${clientProfileId}/archive` : null
  );

  return { archive: data ?? null, error, isLoading };
}
