import useSWR from 'swr';
import type { UnreadSummary } from '@logbook/shared/types/api';
import { useAuth } from '@/lib/auth';

/** Shared SWR key so every consumer hits one request. */
export const UNREAD_MESSAGES_KEY = '/api/messages/unread';

/** Unread message counts for the signed-in user — drives the Chat tab badge. */
export function useUnreadMessages(pollMs = 15_000) {
  const { status } = useAuth();
  const { data, error, isLoading, mutate } = useSWR<UnreadSummary>(
    status === 'signed-in' ? UNREAD_MESSAGES_KEY : null,
    { refreshInterval: pollMs, revalidateOnFocus: true, keepPreviousData: true }
  );
  return {
    total: data?.total ?? 0,
    threads: data?.threads ?? [],
    hasLoaded: data !== undefined,
    error,
    isLoading,
    refresh: mutate,
  };
}
