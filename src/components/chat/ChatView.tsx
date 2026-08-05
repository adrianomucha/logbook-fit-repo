import { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';
import { Message, Client } from '@/types';
import { Send, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Server-side cap on message content (sendMessageSchema)
const MAX_MESSAGE_LENGTH = 5000;

const NEAR_BOTTOM_THRESHOLD = 100; // px from bottom to count as "at bottom"

interface ChatViewProps {
  client: Client;
  messages: Message[];
  currentUserId: string;
  currentUserName: string;
  onSendMessage: (content: string) => void | Promise<void>;
  /** True when older messages exist beyond what's loaded */
  hasEarlier?: boolean;
  /** Loads the next page of older messages (prepended above) */
  onLoadEarlier?: () => void | Promise<void>;
  /** Optional initial message to prefill the input (e.g., for flagged exercise context) */
  initialPrefill?: string;
  /** Optional: custom height class (default: h-[600px]) */
  heightClass?: string;
  /** Optional: name of the person on the other end (shown in empty state) */
  peerName?: string;
  /** Optional: tappable conversation starter chips for the empty state */
  conversationStarters?: string[];
}

/**
 * Compute Messenger-style bubble rounding.
 * Full rounding = 1.25rem (20px). Flattened corner = 0.25rem (4px).
 * The "tail" corner is bottom-right for outgoing, bottom-left for incoming.
 * First-in-group gets full top, last-in-group gets full bottom on the tail side.
 */
function bubbleRadius(
  isCurrentUser: boolean,
  isFirstInGroup: boolean,
  isLastInGroup: boolean,
): string {
  // For outgoing: the right side is the "tail" side
  // For incoming: the left side is the "tail" side
  if (isCurrentUser) {
    const tl = '1.25rem'; // always full
    const bl = '1.25rem'; // always full
    const tr = isFirstInGroup ? '1.25rem' : '0.25rem';
    const br = isLastInGroup ? '1.25rem' : '0.25rem';
    return `${tl} ${tr} ${br} ${bl}`;
  } else {
    const tr = '1.25rem'; // always full
    const br = '1.25rem'; // always full
    const tl = isFirstInGroup ? '1.25rem' : '0.25rem';
    const bl = isLastInGroup ? '1.25rem' : '0.25rem';
    return `${tl} ${tr} ${br} ${bl}`;
  }
}

export function ChatView({
  client,
  messages,
  currentUserId,
  onSendMessage,
  hasEarlier,
  onLoadEarlier,
  initialPrefill,
  heightClass = 'h-[350px] sm:h-[600px]',
  peerName,
  conversationStarters,
}: ChatViewProps) {
  const [newMessage, setNewMessage] = useState('');
  const [unseenCount, setUnseenCount] = useState(0);
  const [isLoadingEarlier, setIsLoadingEarlier] = useState(false);
  const suppressAutoScrollRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const justSentRef = useRef(false);
  const prevCountRef = useRef(0);
  const initialLoadRef = useRef(true);

  // Handle initial prefill
  useEffect(() => {
    if (initialPrefill) {
      setNewMessage(initialPrefill);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.setSelectionRange(
          initialPrefill.length,
          initialPrefill.length
        );
      }, 0);
    }
  }, [initialPrefill]);

  const clientMessages = useMemo(
    () => messages.filter((msg) => msg.clientId === client.id),
    [messages, client.id]
  );

  // Track scroll position
  useEffect(() => {
    const viewport = scrollRef.current;
    if (!viewport) return;

    const handleScroll = () => {
      const distFromBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
      const wasNearBottom = isNearBottomRef.current;
      isNearBottomRef.current = distFromBottom <= NEAR_BOTTOM_THRESHOLD;
      if (!wasNearBottom && isNearBottomRef.current) {
        setUnseenCount(0);
      }
    };

    viewport.addEventListener('scroll', handleScroll, { passive: true });
    return () => viewport.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToBottom = useCallback((instant?: boolean) => {
    const viewport = scrollRef.current;
    if (!viewport) return;
    if (instant) {
      viewport.scrollTop = viewport.scrollHeight;
    } else {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
    }
    setUnseenCount(0);
    isNearBottomRef.current = true;
  }, []);

  // Initial load — pin to bottom before paint
  useLayoutEffect(() => {
    if (initialLoadRef.current && clientMessages.length > 0) {
      initialLoadRef.current = false;
      const viewport = scrollRef.current;
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
      isNearBottomRef.current = true;
    }
  }, [clientMessages.length]);

  // Subsequent messages — smart auto-scroll
  useEffect(() => {
    const count = clientMessages.length;
    const prevCount = prevCountRef.current;
    prevCountRef.current = count;

    if (prevCount === 0) return;
    const newMessages = count - prevCount;
    if (newMessages <= 0) return;

    // Older pages arriving above must not trigger "new message" behavior
    if (suppressAutoScrollRef.current) {
      suppressAutoScrollRef.current = false;
      return;
    }

    if (justSentRef.current) {
      justSentRef.current = false;
      requestAnimationFrame(() => scrollToBottom(false));
      return;
    }

    if (isNearBottomRef.current) {
      requestAnimationFrame(() => scrollToBottom(false));
      return;
    }

    setUnseenCount((prev) => prev + newMessages);
  }, [clientMessages.length, scrollToBottom]);

  const handleLoadEarlier = useCallback(async () => {
    if (!onLoadEarlier || isLoadingEarlier) return;
    const viewport = scrollRef.current;
    const prevHeight = viewport?.scrollHeight ?? 0;
    const prevTop = viewport?.scrollTop ?? 0;
    setIsLoadingEarlier(true);
    suppressAutoScrollRef.current = true;
    try {
      await onLoadEarlier();
      // Keep the same messages in view — prepended content grows scrollHeight
      requestAnimationFrame(() => {
        if (viewport) {
          viewport.scrollTop = viewport.scrollHeight - prevHeight + prevTop;
        }
      });
    } finally {
      setIsLoadingEarlier(false);
    }
  }, [onLoadEarlier, isLoadingEarlier]);

  const handleSend = useCallback(async () => {
    const content = newMessage.trim();
    if (!content) return;
    justSentRef.current = true;
    setNewMessage('');
    try {
      await onSendMessage(content);
    } catch {
      // Restore the draft so a failed send never eats the message
      setNewMessage(content);
      toast.error('Message failed to send. Please try again.');
    }
  }, [newMessage, onSendMessage]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const chatLabel = `Chat with ${client.name}`;
  const peerFirst = peerName?.split(' ')[0] || client.name?.split(' ')[0] || 'Coach';

  // Pre-compute grouping info for each message
  const groupInfo = useMemo(() => {
    return clientMessages.map((msg, idx) => {
      const prev = idx > 0 ? clientMessages[idx - 1] : null;
      const next = idx < clientMessages.length - 1 ? clientMessages[idx + 1] : null;
      const msgDate = new Date(msg.timestamp);
      const prevDate = prev ? new Date(prev.timestamp) : null;
      const nextDate = next ? new Date(next.timestamp) : null;

      const showDateSep = !prevDate || msgDate.toDateString() !== prevDate.toDateString();
      const nextIsNewDay = !nextDate || msgDate.toDateString() !== nextDate.toDateString();

      const sameSenderAsPrev = prev?.senderId === msg.senderId && !showDateSep;
      const sameSenderAsNext = next?.senderId === msg.senderId && !nextIsNewDay;

      const isFirstInGroup = !sameSenderAsPrev;
      const isLastInGroup = !sameSenderAsNext;

      return { showDateSep, isFirstInGroup, isLastInGroup, msgDate };
    });
  }, [clientMessages]);

  const hasInput = newMessage.trim().length > 0;

  return (
    <section aria-label={chatLabel} className="h-full flex flex-col min-h-0">
      <div className={cn('flex flex-col min-h-0', heightClass)}>
        {/* Message area */}
        <div
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4"
        >
          <div className={cn("flex flex-col min-h-full", clientMessages.length === 0 ? "justify-center" : "justify-end")}>
            <div
              role="log"
              aria-live="polite"
              aria-label="Message history"
              className="pb-2 pt-4"
            >
              {/* Load earlier messages */}
              {hasEarlier && onLoadEarlier && clientMessages.length > 0 && (
                <div className="flex justify-center pb-2">
                  <button
                    onClick={handleLoadEarlier}
                    disabled={isLoadingEarlier}
                    className="font-mono text-[10px] uppercase tracking-[0.15em] font-bold px-3.5 py-2 rounded-full bg-muted/60 text-muted-foreground hover:text-foreground transition-colors touch-manipulation disabled:opacity-50"
                  >
                    {isLoadingEarlier ? 'Loading…' : 'Load earlier messages'}
                  </button>
                </div>
              )}

              {/* Empty state */}
              {clientMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center text-center space-y-4 min-h-[200px] py-8">
                  <div className="space-y-2">
                    <div className="text-3xl select-none mb-1">👋</div>
                    <p className="text-sm font-medium antialiased">
                      Start the conversation
                    </p>
                    <p className="text-xs text-muted-foreground antialiased">
                      Drop {peerFirst} a note. They&apos;ll see it next time they open the app.
                    </p>
                  </div>
                  {conversationStarters && conversationStarters.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-2 pt-2">
                      {conversationStarters.map((starter) => (
                        <button
                          key={starter}
                          onClick={() => {
                            setNewMessage(starter);
                            inputRef.current?.focus();
                          }}
                          className="text-[11px] uppercase tracking-wider font-bold px-3.5 py-2 rounded-full bg-muted/60 text-foreground hover:bg-foreground hover:text-background active:scale-[0.97] transition-[background-color,color,transform] duration-150 touch-manipulation min-h-[44px]"
                        >
                          {starter}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Messages */}
              {clientMessages.map((message, idx) => {
                const isCurrentUser = message.senderId === currentUserId;
                const { showDateSep, isFirstInGroup, isLastInGroup, msgDate } = groupInfo[idx];

                return (
                  <div key={message.id}>
                    {/* Date separator */}
                    {showDateSep && (
                      <div className="flex justify-center py-4">
                        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-medium">
                          {format(msgDate, 'EEEE, MMM d')}
                        </span>
                      </div>
                    )}

                    <div
                      className={cn(
                        'flex',
                        isCurrentUser ? 'justify-end' : 'justify-start',
                        isFirstInGroup ? 'mt-4' : 'mt-[5px]'
                      )}
                    >
                      <div
                        className={cn(
                          'max-w-[80%] sm:max-w-[65%] px-4 py-2.5',
                          isCurrentUser
                            ? 'bg-foreground text-background'
                            : 'bg-muted/50'
                        )}
                        style={{ borderRadius: bubbleRadius(isCurrentUser, isFirstInGroup, isLastInGroup) }}
                      >
                        {/* Exercise context card */}
                        {message.exerciseContext && (
                          <div className={cn(
                            'rounded-lg px-3 py-2.5 mb-2 -mx-0.5',
                            isCurrentUser
                              ? 'bg-background/10'
                              : 'bg-muted/50'
                          )}>
                            <p className="text-[10px] uppercase tracking-[0.12em] font-medium opacity-50 mb-0.5">Exercise</p>
                            <p className="text-sm font-bold tracking-tight truncate">{message.exerciseContext.exerciseName}</p>
                            <p className="text-[10px] uppercase tracking-[0.12em] font-medium opacity-50 mt-0.5">
                              {message.exerciseContext.prescription} · {message.exerciseContext.setsCompleted}/{message.exerciseContext.totalSets} sets
                            </p>
                            {message.exerciseContext.flagNote && (
                              <p className="font-prose text-[13px] mt-1.5 italic border-l-2 border-current/20 pl-2 opacity-70">
                                &ldquo;{message.exerciseContext.flagNote}&rdquo;
                              </p>
                            )}
                          </div>
                        )}

                        <p className="font-prose text-[15px] leading-[1.55] whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>

                    {/* Timestamp — only after last message in a group */}
                    {isLastInGroup && (
                      <p className={cn(
                        'font-mono text-[10px] text-muted-foreground mt-1.5 px-0.5',
                        isCurrentUser ? 'text-right' : 'text-left'
                      )}>
                        {format(msgDate, 'h:mm a')}
                      </p>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        {/* "New messages" pill */}
        {unseenCount > 0 && (
          <div className="flex justify-center -mt-4 mb-1 relative z-10">
            <button
              onClick={() => scrollToBottom(false)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-foreground text-background text-[10px] uppercase tracking-[0.15em] font-bold shadow-lg hover:bg-foreground/90 transition-colors animate-in fade-in slide-in-from-bottom-2 duration-200 touch-manipulation rounded-full tap-target"
            >
              <ChevronDown className="w-3 h-3" />
              {unseenCount === 1 ? '1 new' : `${unseenCount} new`}
            </button>
          </div>
        )}

        {/* Input bar — hairline separator anchors the composer, like card footers elsewhere */}
        <div className="px-3 sm:px-4 py-2.5 border-t border-border/50">
          <div className="flex gap-2 items-center">
            <label htmlFor="chat-message-input" className="sr-only">
              Message to {client.name}
            </label>
            {/* The bg-muted/40 → /60 tint measures 1.02:1 — invisible as a focus
                indicator on its own, so the ring carries it. */}
            <div className="flex-1 flex items-center bg-muted/40 rounded-full px-4 min-h-[44px] transition-colors duration-150 focus-within:bg-muted/60 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background">
              <input
                id="chat-message-input"
                ref={inputRef}
                type="text"
                placeholder={`Message ${peerFirst}...`}
                value={newMessage}
                maxLength={MAX_MESSAGE_LENGTH}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                // text-base (16px) on mobile keeps iOS from zooming the page in
                // on focus; the composer keeps its 15px prose size from sm up
                className="flex-1 bg-transparent font-prose text-base sm:text-[15px] placeholder:font-prose placeholder:text-muted-foreground focus:outline-none py-2.5"
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!hasInput}
              className={cn(
                'shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-[background-color,color,transform] duration-200 ease-out touch-manipulation tap-target',
                hasInput
                  ? 'bg-foreground text-background hover:bg-foreground/90 active:scale-95 scale-100'
                  : 'bg-muted/40 text-muted-foreground/30 scale-90 pointer-events-none'
              )}
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
