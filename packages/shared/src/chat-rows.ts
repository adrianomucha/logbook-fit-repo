import type { Message } from './types';

export interface ChatRow {
  message: Message;
  showDateSep: boolean;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  isNewest: boolean;
  msgDate: Date;
}

/**
 * Bubble grouping for a chat, from messages in conversation order (oldest
 * first, which is what `apiMessagesToMessages` returns). A message opens a
 * group when the sender changes or a new day starts, and gets a date
 * separator above it when the day changes.
 *
 * Rows come back newest first, the order an inverted list (the native
 * ChatView) renders bottom-up. Feeding newest-first messages in here is
 * what once showed the iOS chat upside down.
 */
export function chatRowsNewestFirst(oldestFirst: Message[]): ChatRow[] {
  const rows = oldestFirst.map((msg, idx) => {
    const prev = idx > 0 ? oldestFirst[idx - 1] : null;
    const next = idx < oldestFirst.length - 1 ? oldestFirst[idx + 1] : null;
    const msgDate = new Date(msg.timestamp);
    const prevDate = prev ? new Date(prev.timestamp) : null;
    const nextDate = next ? new Date(next.timestamp) : null;
    const showDateSep = !prevDate || msgDate.toDateString() !== prevDate.toDateString();
    const nextIsNewDay = !nextDate || msgDate.toDateString() !== nextDate.toDateString();
    const sameSenderAsPrev = prev?.senderId === msg.senderId && !showDateSep;
    const sameSenderAsNext = next?.senderId === msg.senderId && !nextIsNewDay;
    return {
      message: msg,
      showDateSep,
      isFirstInGroup: !sameSenderAsPrev,
      isLastInGroup: !sameSenderAsNext,
      isNewest: idx === oldestFirst.length - 1,
      msgDate,
    };
  });
  return rows.reverse();
}
