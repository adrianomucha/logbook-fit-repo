import { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';
import { Message, Client } from '@/types';
import { Button } from '@/components/ui/button';
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
      // Focus and move cursor to end
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.setSelectionRange(
          initialPrefill.length,
          initialPrefill.length
        );
      }, 0);
    }
  }, [initialPrefill]);

  // Memoize message filtering to avoid re-computing on every render
  const clientMessages = useMemo(
    () => messages.filter((msg) => msg.clientId === client.id),
    [messages, client.id]
  );

  // Track scroll position to know if user is "at the bottom"
  useEffect(() => {
    const viewport = scrollRef.current;
    if (!viewport) return;

    const handleScroll = () => {
      const distFromBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
      const wasNearBottom = isNearBottomRef.current;
      isNearBottomRef.current = distFromBottom <= NEAR_BOTTOM_THRESHOLD;
      // Clear unseen count when user scrolls to bottom
      if (!wasNearBottom && isNearBottomRef.current) {
        setUnseenCount(0);
      }
    };

    viewport.addEventListener('scroll', handleScroll, { passive: true });
    return () => viewport.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll helper
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

  // Initial load — pin to bottom before paint (no flash at top).
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

    // Skip initial load (handled by useLayoutEffect above)
    if (prevCount === 0) return;

    const newMessages = count - prevCount;
    if (newMessages <= 0) return;

    // User just sent a message — always scroll
    if (justSentRef.current) {
      justSentRef.current = false;
      requestAnimationFrame(() => scrollToBottom(false));
      return;
    }

    // Incoming message while near bottom — auto-scroll
    if (isNearBottomRef.current) {
      requestAnimationFrame(() => scrollToBottom(false));
      return;
    }

    // Incoming message while scrolled up — don't scroll, show pill
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

  return (
    <section aria-label={chatLabel} className="h-full flex flex-col min-h-0">
      <div className={cn('flex flex-col min-h-0 overflow-hidden border border-border rounded-lg', heightClass)}>
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
              className="space-y-1 pb-4 pt-4"
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
                          className="text-[11px] uppercase tracking-wider font-bold px-3.5 py-2 rounded-md bg-muted/60 text-foreground hover:bg-foreground hover:text-background transition-colors touch-manipulation min-h-[44px]"
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
                const prevMsg = idx > 0 ? clientMessages[idx - 1] : null;
                const sameSender = prevMsg?.senderId === message.senderId;
                // Show date separator when day changes
                const msgDate = new Date(message.timestamp);
                const prevDate = prevMsg ? new Date(prevMsg.timestamp) : null;
                const showDateSep = !prevDate || msgDate.toDateString() !== prevDate.toDateString();

                return (
                  <div key={message.id}>
                    {/* Date separator */}
                    {showDateSep && (
                      <div className="flex items-center gap-3 py-4">
                        <div className="flex-1 border-t border-border/50" />
                        <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/60 font-medium">
                          {format(msgDate, 'EEEE, MMM d')}
                        </span>
                        <div className="flex-1 border-t border-border/50" />
                      </div>
                    )}

                    <div
                      className={cn(
                        'flex',
                        isCurrentUser ? 'justify-end' : 'justify-start',
                        sameSender && !showDateSep ? 'mt-0.5' : 'mt-3'
                      )}
                    >
                      <div
                        className={cn(
                          'max-w-[85%] sm:max-w-[70%]',
                          isCurrentUser
                            ? 'bg-foreground text-background rounded-lg px-3.5 py-2.5'
                            : 'bg-muted/40 rounded-lg px-3.5 py-2.5'
                        )}
                      >
                        {/* Sender label — only on first message in a group */}
                        {!sameSender && !isCurrentUser && (
                          <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-medium mb-1">
                            {peerFirst}
                          </p>
                        )}

                        {/* Exercise context card (attached when client flags an exercise) */}
                        {message.exerciseContext && (
                          <div className={cn(
                            'rounded-md px-2.5 py-2 mb-2',
                            isCurrentUser
                              ? 'bg-background/10'
                              : 'bg-muted/40'
                          )}>
                            <p className="text-[10px] uppercase tracking-[0.12em] font-medium opacity-60 mb-0.5">Exercise</p>
                            <p className="text-sm font-bold tracking-tight truncate">{message.exerciseContext.exerciseName}</p>
                            <p className="text-[10px] uppercase tracking-[0.12em] font-medium opacity-60 mt-0.5">
                              {message.exerciseContext.prescription} · {message.exerciseContext.setsCompleted}/{message.exerciseContext.totalSets} sets
                            </p>
                            {message.exerciseContext.flagNote && (
                              <p className="text-xs mt-1.5 italic border-l-2 border-current/20 pl-2 opacity-70">
                                &ldquo;{message.exerciseContext.flagNote}&rdquo;
                              </p>
                            )}
                          </div>
                        )}

                        <p className="text-[13px] sm:text-sm leading-relaxed">{message.content}</p>
                        <p className={cn(
                          'text-[10px] uppercase tracking-[0.12em] font-medium mt-1.5',
                          isCurrentUser ? 'opacity-50' : 'text-muted-foreground/50'
                        )}>
                          {format(msgDate, 'h:mm a')}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        {/* "New messages" pill */}
        {unseenCount > 0 && (
          <div className="flex justify-center -mt-5 mb-1 relative z-10">
            <button
              onClick={() => scrollToBottom(false)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-foreground text-background text-[10px] uppercase tracking-[0.15em] font-bold shadow-lg hover:bg-foreground/90 transition-all animate-in fade-in slide-in-from-bottom-2 duration-200 touch-manipulation rounded-md"
            >
              <ChevronDown className="w-3 h-3" />
              {unseenCount === 1 ? '1 new' : `${unseenCount} new`}
            </button>
          </div>
        )}

        {/* Input bar */}
        <div className="p-3 sm:p-4 border-t border-border bg-muted/20">
          <div className="flex gap-2 items-center">
            <label htmlFor="chat-message-input" className="sr-only">
              Message to {client.name}
            </label>
            <input
              id="chat-message-input"
              ref={inputRef}
              type="text"
              placeholder={`Message ${peerFirst}...`}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground/40 focus:outline-none min-h-[44px] px-1"
            />
            <Button
              onClick={handleSend}
              disabled={!newMessage.trim()}
              className="shrink-0 h-10 px-4 bg-foreground text-background hover:bg-foreground/90 font-bold uppercase tracking-wider text-[11px] touch-manipulation disabled:opacity-30"
              aria-label="Send message"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              Send
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
