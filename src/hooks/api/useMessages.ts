import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { apiFetch } from '@/lib/api-client';
import type { MessageThread, ApiMessage } from '@/types/api';

interface UseMessagesOptions {
  /**
   * Mark the other party's messages as read when fetching. Pass true only
   * while the chat is actually on screen — the dashboard polls this thread
   * from every tab, and marking on every poll silently "reads" messages the
   * user never saw.
   */
  markRead?: boolean;
}

export function useMessages(
  otherUserId: string | null,
  { markRead = false }: UseMessagesOptions = {}
) {
  const { data, error, isLoading, mutate } = useSWR<MessageThread>(
    otherUserId
      ? `/api/messages/${otherUserId}${markRead ? '?markRead=1' : ''}`
      : null,
    // No push channel exists — poll so new messages appear without a reload
    { refreshInterval: 30_000, revalidateOnFocus: true }
  );

  // Older pages live outside the SWR cache: the 30s poll replaces the cache
  // with the newest page only, and must not throw away loaded history.
  const [olderPages, setOlderPages] = useState<ApiMessage[]>([]);
  const [olderHasMore, setOlderHasMore] = useState<boolean | null>(null);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  useEffect(() => {
    setOlderPages([]);
    setOlderHasMore(null);
  }, [otherUserId]);

  const loadOlder = async () => {
    if (!otherUserId || isLoadingOlder) return;
    const cursor =
      olderPages.length > 0
        ? olderPages[olderPages.length - 1].id
        : data?.nextCursor;
    if (!cursor) return;
    setIsLoadingOlder(true);
    try {
      const page = await apiFetch<MessageThread>(
        `/api/messages/${otherUserId}?cursor=${encodeURIComponent(cursor)}`
      );
      setOlderPages((prev) => [...prev, ...page.messages]);
      setOlderHasMore(page.hasMore);
    } finally {
      setIsLoadingOlder(false);
    }
  };

  // Newest-first throughout; dedupe in case the poll window overlaps a page
  const messages = useMemo(() => {
    const latest = data?.messages ?? [];
    if (olderPages.length === 0) return latest;
    const seen = new Set(latest.map((m) => m.id));
    return [...latest, ...olderPages.filter((m) => !seen.has(m.id))];
  }, [data, olderPages]);

  const sendMessage = async (content: string) => {
    if (!otherUserId) return;
    const msg = await apiFetch<ApiMessage>('/api/messages', {
      method: 'POST',
      body: JSON.stringify({ recipientId: otherUserId, content }),
    });
    // Optimistically add the message to the thread
    mutate(
      (current) =>
        current
          ? { ...current, messages: [msg, ...current.messages] }
          : current,
      { revalidate: false }
    );
    return msg;
  };

  return {
    messages,
    hasMore: olderHasMore ?? data?.hasMore ?? false,
    nextCursor: data?.nextCursor ?? null,
    isLoadingOlder,
    loadOlder,
    error,
    isLoading,
    sendMessage,
    refresh: mutate,
  };
}
