import { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';
import { Message, Client } from '@/types';
import { Send, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const NEAR_BOTTOM_THRESHOLD = 100; // px from bottom to count as "at bottom"

interface ChatViewProps {
  client: Client;
  messages: Message[];
  currentUserId: string;
  currentUserName: string;
  onSendMessage: (content: string) => void;
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
  currentUserName,
  onSendMessage,
  initialPrefill,
  heightClass = 'h-[350px] sm:h-[600px]',
  peerName,
  conversationStarters,
}: ChatViewProps) {
  const [newMessage, setNewMessage] = useState('');
  const [unseenCount, setUnseenCount] = useState(0);
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

  const handleSend = useCallback(() => {
    if (newMessage.trim()) {
      justSentRef.current = true;
      onSendMessage(newMessage);
      setNewMessage('');
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
          <div className="flex flex-col justify-end min-h-full">
            <div
              role="log"
              aria-live="polite"
              aria-label="Message history"
              className="pb-2 pt-4"
            >
              {/* Empty state */}
              {clientMessages.length === 0 && (
                <div className="py-12 text-center space-y-4">
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground font-medium">
                      No messages yet
                    </p>
                    <p className="text-sm text-muted-foreground/60">
                      Send {peerFirst} a message to get started
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
                          className="text-[11px] uppercase tracking-wider font-bold px-3.5 py-2 rounded-full bg-muted/60 text-foreground hover:bg-foreground hover:text-background active:scale-[0.97] transition-all duration-150 touch-manipulation min-h-[44px]"
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
                        <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/50 font-medium">
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
                              <p className="text-xs mt-1.5 italic border-l-2 border-current/20 pl-2 opacity-70">
                                &ldquo;{message.exerciseContext.flagNote}&rdquo;
                              </p>
                            )}
                          </div>
                        )}

                        <p className="text-sm leading-[1.65]">{message.content}</p>
                      </div>
                    </div>

                    {/* Timestamp — only after last message in a group */}
                    {isLastInGroup && (
                      <p className={cn(
                        'text-[10px] text-muted-foreground/40 mt-1.5 px-0.5',
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
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-foreground text-background text-[10px] uppercase tracking-[0.15em] font-bold shadow-lg hover:bg-foreground/90 transition-all animate-in fade-in slide-in-from-bottom-2 duration-200 touch-manipulation rounded-full"
            >
              <ChevronDown className="w-3 h-3" />
              {unseenCount === 1 ? '1 new' : `${unseenCount} new`}
            </button>
          </div>
        )}

        {/* Input bar */}
        <div className="px-3 sm:px-4 py-2.5">
          <div className="flex gap-2 items-center">
            <label htmlFor="chat-message-input" className="sr-only">
              Message to {client.name}
            </label>
            <div className="flex-1 flex items-center bg-muted/40 rounded-full px-4 min-h-[44px] transition-colors duration-150 focus-within:bg-muted/60">
              <input
                id="chat-message-input"
                ref={inputRef}
                type="text"
                placeholder={`Message ${peerFirst}...`}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground/40 focus:outline-none py-2.5"
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!hasInput}
              className={cn(
                'shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ease-out touch-manipulation',
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
