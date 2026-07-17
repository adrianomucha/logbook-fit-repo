// Coach-side hook: fetches a client's detail from the coach API.
import useSWR from 'swr';
import type { ClientDetail } from '@/types/api';

export function useCoachClientProfile(clientProfileId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<ClientDetail>(
    clientProfileId ? `/api/coach/clients/${clientProfileId}` : null,
    // Check-in state and workout history move while the workspace is open
    { refreshInterval: 30_000, revalidateOnFocus: true }
  );

  return {
    client: data ?? null,
    error,
    isLoading,
    refresh: mutate,
  };
}
