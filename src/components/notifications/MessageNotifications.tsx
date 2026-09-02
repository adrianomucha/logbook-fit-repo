'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useUnreadMessages } from '@/hooks/api/useUnreadMessages';
import { MessageToast } from './MessageToast';
import type { UnreadThread } from '@/types/api';

/** Where this thread lives in whichever app is rendering us. */
function threadHref(thread: UnreadThread): string {
  // A sender with a client profile means we're the coach: that conversation
  // lives on the client's profile page. Otherwise we're the client.
  return thread.clientProfileId
    ? `/coach/clients/${thread.clientProfileId}?chat=1`
    : '/client?tab=chat';
}

/** True when the thread's chat is already open in front of the user. */
function isViewingThread(thread: UnreadThread): boolean {
  if (typeof window === 'undefined') return false;
  if (document.visibilityState !== 'visible') return false;
  const { pathname, search } = window.location;
  if (thread.clientProfileId) {
    return pathname === `/coach/clients/${thread.clientProfileId}`;
  }
  return pathname === '/client' && new URLSearchParams(search).get('tab') === 'chat';
}

/**
 * In-app arrival notice for new messages.
 *
 * Mounted app-wide so a message announces itself from any screen, not just
 * the chat tab. This is the half of "message notifications" that works with
 * the app open; Web Push (lib/push.ts + public/sw.js) covers it being closed.
 */
export function MessageNotifications() {
  const { threads, hasLoaded } = useUnreadMessages();
  // userId → newest message timestamp already announced. Null until the first
  // response lands: the backlog waiting at sign-in is history, not news.
  const announcedRef = useRef<Map<string, string> | null>(null);

  useEffect(() => {
    // Wait for real data. `threads` is an empty array until the first response
    // resolves, and seeding the baseline from it announced the entire unread
    // backlog as new messages on every page load.
    if (!hasLoaded) return;

    if (announcedRef.current === null) {
      announcedRef.current = new Map(
        threads.map((thread) => [thread.userId, thread.lastMessageAt ?? ''])
      );
      return;
    }

    const announced = announcedRef.current;
    for (const thread of threads) {
      const stamp = thread.lastMessageAt ?? '';
      // ISO-8601 timestamps compare correctly as strings
      if (stamp && (announced.get(thread.userId) ?? '') >= stamp) continue;
      announced.set(thread.userId, stamp);
      if (isViewingThread(thread)) continue;

      const name = thread.name || 'Someone';
      const href = threadHref(thread);
      toast.custom(
        (id) => (
          <MessageToast
            toastId={id}
            name={name}
            avatarUrl={thread.avatarUrl}
            preview={thread.preview}
            href={href}
          />
        ),
        {
          // Keyed by sender, so a rapid second message replaces that person's
          // notice instead of stacking a near-duplicate card
          id: `message-${thread.userId}`,
          // A notice carrying an action needs longer than the 4s default
          duration: 8000,
        }
      );
    }
  }, [threads, hasLoaded]);

  return null;
}
