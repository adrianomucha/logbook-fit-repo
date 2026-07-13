import useSWR from 'swr';
import type { CoachInvite } from '@/types/api';

export function useCoachInvites() {
  const { data, error, isLoading, mutate } = useSWR<CoachInvite[]>(
    '/api/invites'
  );

  return {
    invites: data ?? [],
    error,
    isLoading,
    refresh: mutate,
  };
}
