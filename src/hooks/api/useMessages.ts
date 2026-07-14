import useSWR from 'swr';
import { apiFetch } from '@/lib/api-client';
import type { MessageThread, ApiMessage } from '@/types/api';

export function useMessages(otherUserId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<MessageThread>(
    otherUserId ? `/api/messages/${otherUserId}` : null,
    // No push channel exists — poll so new messages appear without a reload
    { refreshInterval: 30_000, revalidateOnFocus: true }
  );

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
    messages: data?.messages ?? [],
    hasMore: data?.hasMore ?? false,
    nextCursor: data?.nextCursor ?? null,
    error,
    isLoading,
    sendMessage,
    refresh: mutate,
  };
}
