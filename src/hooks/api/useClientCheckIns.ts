import useSWR from 'swr';
import type { ClientCheckIn } from '@/types/api';

export function useClientCheckIns() {
  const { data, error, isLoading, mutate } = useSWR<ClientCheckIn[]>(
    '/api/client/check-ins'
  );

  return {
    checkIns: data ?? [],
    error,
    isLoading,
    refresh: mutate,
  };
}
