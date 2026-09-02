import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import useSWR, { useSWRConfig } from 'swr';
import type { ApiMessage, MessageThread } from '@logbook/shared/types/api';
import { apiFetch } from '@/lib/api';
import { UNREAD_MESSAGES_KEY } from '@/hooks/useUnreadMessages';

/** Fast enough to read as instant in conversation; the payload is one page. */
export const ACTIVE_POLL_MS = 3_000;
/** A thread that isn't on screen only needs to be fresh enough for badges. */
export const BACKGROUND_POLL_MS = 20_000;

interface UseMessagesOptions {
  /** Mark the other party's messages read on fetch — only while the chat is on screen. */
  markRead?: boolean;
  /** The chat is on screen: conversation-speed polling. */
  active?: boolean;
}

/** The thread with one person — the web's useMessages, polling instead of a socket. */
export function useMessages(otherUserId: string | null, { markRead = false, active = false }: UseMessagesOptions = {}) {
  const { mutate: globalMutate } = useSWRConfig();
  const { data, error, isLoading, mutate } = useSWR<MessageThread>(
    otherUserId ? `/api/messages/${otherUserId}${markRead ? '?markRead=1' : ''}` : null,
    {
      refreshInterval: active ? ACTIVE_POLL_MS : BACKGROUND_POLL_MS,
      revalidateOnFocus: true,
      dedupingInterval: 1_000,
      keepPreviousData: true,
    }
  );

  // Coming back to the foreground refetches at once instead of waiting out
  // the interval — the native equivalent of the web's visibilitychange fix.
  useEffect(() => {
    if (!otherUserId) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void mutate();
        void globalMutate(UNREAD_MESSAGES_KEY);
      }
    });
    return () => sub.remove();
  }, [otherUserId, mutate, globalMutate]);

  // Reading a thread clears its unread count — refresh the badge right away.
  const unreadTouchedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!markRead || !otherUserId || !data) return;
    const key = `${otherUserId}:${data.messages[0]?.id ?? ''}`;
    if (unreadTouchedRef.current === key) return;
    unreadTouchedRef.current = key;
    void globalMutate(UNREAD_MESSAGES_KEY);
  }, [markRead, otherUserId, data, globalMutate]);

  // Older pages live outside the SWR cache so the poll can't discard them.
  const [olderPages, setOlderPages] = useState<ApiMessage[]>([]);
  const [olderHasMore, setOlderHasMore] = useState<boolean | null>(null);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  useEffect(() => {
    setOlderPages([]);
    setOlderHasMore(null);
  }, [otherUserId]);

  const loadOlder = async () => {
    if (!otherUserId || isLoadingOlder) return;
    const cursor = olderPages.length > 0 ? olderPages[olderPages.length - 1].id : data?.nextCursor;
    if (!cursor) return;
    setIsLoadingOlder(true);
    try {
      const page = await apiFetch<MessageThread>(`/api/messages/${otherUserId}?cursor=${encodeURIComponent(cursor)}`);
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
    void mutate((current) => (current ? { ...current, messages: [msg, ...current.messages] } : current), {
      revalidate: true,
    });
    return msg;
  };

  return {
    messages,
    hasMore: olderHasMore ?? data?.hasMore ?? false,
    isLoadingOlder,
    loadOlder,
    error,
    isLoading,
    sendMessage,
    refresh: mutate,
  };
}
