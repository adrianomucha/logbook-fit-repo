import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Message, Client } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Dumbbell } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

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
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  // Auto-scroll to bottom on new messages or initial load
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [clientMessages.length]);

  const handleSend = useCallback(() => {
    if (newMessage.trim()) {
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

  return (
    <section aria-label={chatLabel} className="h-full flex flex-col min-h-0">
      <Card className={cn('flex flex-col min-h-0 overflow-hidden', heightClass)}>
        <CardContent className="flex-1 flex flex-col min-h-0 p-0">
          <ScrollArea className="flex-1 min-h-0 px-3 sm:px-6">
            <div className="flex flex-col justify-end min-h-full">
              <div
                role="log"
                aria-live="polite"
                aria-label="Message history"
                className="space-y-3 sm:space-y-4 pb-4 pt-4"
              >
                {clientMessages.length === 0 && (
                  <div className="text-center py-8 text-sm text-muted-foreground space-y-3">
                    <div className="w-10 h-10 mx-auto rounded-full bg-muted flex items-center justify-center">
                      <Send className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                      <p>
                        {peerName
                          ? `Start a conversation with ${peerName.split(' ')[0] || peerName}`
                          : `No messages with ${client.name?.split(' ')[0] || 'this client'} yet`}
                      </p>
                      <p className="text-xs">Send a message to get started</p>
                    </div>
                    {conversationStarters && conversationStarters.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-2 pt-1">
                        {conversationStarters.map((starter) => (
                          <button
                            key={starter}
                            onClick={() => {
                              setNewMessage(starter);
                              inputRef.current?.focus();
                            }}
                            className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-muted transition-colors touch-manipulation"
                          >
                            {starter}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {clientMessages.map((message) => {
                  const isCurrentUser = message.senderId === currentUserId;
                  return (
                  <div
                    key={message.id}
                    className={cn('flex', isCurrentUser ? 'justify-end' : 'justify-start')}
                  >
                    <div
                      className={cn(
                        'max-w-[85%] sm:max-w-[70%] rounded-lg p-2.5 sm:p-3',
                        isCurrentUser
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      )}
                    >
                      {/* Exercise context card (attached when client flags an exercise) */}
                      {message.exerciseContext && (
                        <div className={cn(
                          'rounded p-2 mb-2 text-xs',
                          isCurrentUser
                            ? 'bg-primary-foreground/10'
                            : 'bg-background/50'
                        )}>
                          <div className="flex items-center gap-1 min-w-0">
                            <Dumbbell className="w-3 h-3 shrink-0" />
                            <span className="font-medium truncate">{message.exerciseContext.exerciseName}</span>
                          </div>
                          <p className={cn('truncate', isCurrentUser ? 'opacity-80' : 'text-muted-foreground')}>
                            {message.exerciseContext.prescription} · {message.exerciseContext.setsCompleted}/{message.exerciseContext.totalSets} sets done
                          </p>
                          {message.exerciseContext.flagNote && (
                            <p className="italic mt-1">
                              Note: &ldquo;{message.exerciseContext.flagNote}&rdquo;
                            </p>
                          )}
                        </div>
                      )}
                      <p className="text-[13px] sm:text-sm leading-relaxed">{message.content}</p>
                      <p className="text-[10px] sm:text-xs mt-1 opacity-70">
                        {format(new Date(message.timestamp), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </div>
          </ScrollArea>
          <div className="p-3 sm:p-4 border-t">
            <div className="flex gap-2">
              <label htmlFor="chat-message-input" className="sr-only">
                Message to {client.name}
              </label>
              <Input
                id="chat-message-input"
                ref={inputRef}
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyPress}
              />
              <Button
                onClick={handleSend}
                size="icon"
                disabled={!newMessage.trim()}
                className="shrink-0 min-h-[44px] min-w-[44px] touch-manipulation"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
