import useSWR from 'swr';
import type { ClientDetail } from '@/types/api';

export function useClientProfile(clientProfileId: string | null) {
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
