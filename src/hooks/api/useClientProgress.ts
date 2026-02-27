import useSWR from 'swr';
import type { ClientProgress } from '@/types/api';

export function useClientProgress() {
  const { data, error, isLoading, mutate } = useSWR<ClientProgress>(
    '/api/client/progress'
  );

  return {
    progress: data ?? null,
    error,
    isLoading,
    refresh: mutate,
  };
}
