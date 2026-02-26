import { useState, useEffect, useRef } from 'react';
import { Message, Client } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send } from 'lucide-react';
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
}

export function ChatView({
  client,
  messages,
  currentUserId,
  currentUserName,
  onSendMessage,
  initialPrefill,
  heightClass = 'h-[600px]',
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

  // Auto-scroll to bottom on new messages or initial load
  const clientMessages = messages.filter(
    (msg) => msg.clientId === client.id
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [clientMessages.length]);

  const handleSend = () => {
    if (newMessage.trim()) {
      onSendMessage(newMessage);
      setNewMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const chatLabel = `Chat with ${client.name}`;

  return (
    <section aria-label={chatLabel} className="h-full flex flex-col">
      <Card className={cn('flex flex-col min-h-0 h-full', heightClass)}>
        <CardContent className="flex-1 flex flex-col p-0">
          <ScrollArea className="flex-1 px-3 sm:px-6">
            <div className="flex flex-col justify-end min-h-full">
              <div
                role="log"
                aria-live="polite"
                aria-label="Message history"
                className="space-y-3 sm:space-y-4 pb-4 pt-4"
              >
                {clientMessages.length === 0 && (
                  <div className="text-center py-8 text-sm text-muted-foreground space-y-1">
                    <p className="text-base">💬</p>
                    <p>No messages with {client.name.split(' ')[0]} yet</p>
                    <p className="text-xs">Send a message to get started</p>
                  </div>
                )}
                {clientMessages.map((message) => {
                  const isCoach = message.senderId === currentUserId;
                  return (
                  <div
                    key={message.id}
                    className={cn('flex', isCoach ? 'justify-end' : 'justify-start')}
                  >
                    <div
                      className={cn(
                        'max-w-[85%] sm:max-w-[70%] rounded-lg p-2.5 sm:p-3',
                        isCoach
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      )}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className="text-xs mt-1 opacity-70">
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
                className="shrink-0 min-h-[44px] min-w-[44px]"
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
