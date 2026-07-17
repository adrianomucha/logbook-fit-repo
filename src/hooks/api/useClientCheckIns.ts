import useSWR from 'swr';
import type { ClientCheckIn } from '@/types/api';

export function useClientCheckIns() {
  const { data, error, isLoading, mutate } = useSWR<ClientCheckIn[]>(
    '/api/client/check-ins',
    // Poll like the rest of the dashboard: this GET is also what lazily
    // creates the weekly scheduled check-in, so without it a client who
    // keeps the app open never sees (or even triggers) a new check-in.
    { refreshInterval: 30_000, revalidateOnFocus: true }
  );

  return {
    checkIns: data ?? [],
    error,
    isLoading,
    refresh: mutate,
  };
}
