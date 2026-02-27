import useSWR from 'swr';
import type { ClientDetail } from '@/types/api';

export function useClientProfile(clientProfileId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<ClientDetail>(
    clientProfileId ? `/api/coach/clients/${clientProfileId}` : null
  );

  return {
    client: data ?? null,
    error,
    isLoading,
    refresh: mutate,
  };
}
