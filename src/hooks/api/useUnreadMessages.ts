'use client';

import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import type { UnreadSummary } from '@/types/api';

/** Shared SWR key so every consumer (navs, toasts) hits one request. */
export const UNREAD_MESSAGES_KEY = '/api/messages/unread';

/**
 * Unread message counts for the signed-in user.
 *
 * Polled app-wide from the navs, so the interval is the "how stale can a
 * badge be" dial — not the chat's freshness, which `useMessages` owns with a
 * much faster poll while a thread is open.
 */
export function useUnreadMessages(pollMs = 15_000) {
  const { status } = useSession();
  const { data, error, isLoading, mutate } = useSWR<UnreadSummary>(
    status === 'authenticated' ? UNREAD_MESSAGES_KEY : null,
    {
      refreshInterval: pollMs,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      // Badges must never show a number the user already cleared elsewhere
      keepPreviousData: true,
    }
  );

  return {
    total: data?.total ?? 0,
    threads: data?.threads ?? [],
    error,
    isLoading,
    refresh: mutate,
  };
}
