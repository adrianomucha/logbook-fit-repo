import { useEffect, useMemo, useRef, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { apiFetch } from '@/lib/api-client';
import { UNREAD_MESSAGES_KEY } from '@/hooks/api/useUnreadMessages';
import type { MessageThread, ApiMessage } from '@/types/api';

/**
 * How fast an open chat picks up the other side's messages. Short enough to
 * read as instant in conversation; the thread payload is one page of messages,
 * so this is a cheap request to repeat.
 */
export const ACTIVE_POLL_MS = 3_000;
/** A thread that isn't on screen only needs to be fresh enough for badges. */
export const BACKGROUND_POLL_MS = 20_000;

interface UseMessagesOptions {
  /**
   * Mark the other party's messages as read when fetching. Pass true only
   * while the chat is actually on screen — the dashboard polls this thread
   * from every tab, and marking on every poll silently "reads" messages the
   * user never saw.
   */
  markRead?: boolean;
  /**
   * The chat is on screen. Switches the poll to conversation speed and makes
   * returning to the app (tab focus, PWA resume) refetch immediately instead
   * of waiting out the interval.
   */
  active?: boolean;
}

export function useMessages(
  otherUserId: string | null,
  { markRead = false, active = false }: UseMessagesOptions = {}
) {
  const { mutate: globalMutate } = useSWRConfig();
  const { data, error, isLoading, mutate } = useSWR<MessageThread>(
    otherUserId
      ? `/api/messages/${otherUserId}${markRead ? '?markRead=1' : ''}`
      : null,
    {
      // No push channel to the page exists (notifications are delivered by the
      // service worker, which can't hand data to an open tab), so the thread
      // polls — fast while it's being read, lazily when it isn't.
      refreshInterval: active ? ACTIVE_POLL_MS : BACKGROUND_POLL_MS,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      // Must stay under the poll interval or SWR dedupes the polls away
      dedupingInterval: 1_000,
      keepPreviousData: true,
    }
  );

  // SWR's focus revalidation misses the case that actually bit users: an
  // installed PWA resumed from the background fires `visibilitychange` without
  // a window `focus`, so the thread sat on whatever it had when it was
  // suspended until the app was force-closed and reopened.
  useEffect(() => {
    if (!otherUserId) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        mutate();
        globalMutate(UNREAD_MESSAGES_KEY);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pageshow', onVisible);
    };
  }, [otherUserId, mutate, globalMutate]);

  // Reading a thread clears its unread count — refresh the badge as soon as
  // the chat opens rather than up to a poll later.
  const unreadTouchedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!markRead || !otherUserId || !data) return;
    const key = `${otherUserId}:${data.messages[0]?.id ?? ''}`;
    if (unreadTouchedRef.current === key) return;
    unreadTouchedRef.current = key;
    globalMutate(UNREAD_MESSAGES_KEY);
  }, [markRead, otherUserId, data, globalMutate]);

  // Older pages live outside the SWR cache: the poll replaces the cache
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
    // Optimistically add the message to the thread, then revalidate so the
    // sent bubble is backed by the server's copy (and any message that
    // crossed it in flight shows up immediately).
    mutate(
      (current) =>
        current
          ? { ...current, messages: [msg, ...current.messages] }
          : current,
      { revalidate: true }
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
