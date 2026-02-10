import { useState, useEffect, useRef } from 'react';
import { Message, Client } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send } from 'lucide-react';
import { format } from 'date-fns';

interface ChatViewProps {
  client: Client;
  messages: Message[];
  currentUserId: string;
  currentUserName: string;
  onSendMessage: (content: string) => void;
  /** Optional initial message to prefill the input (e.g., for flagged exercise context) */
  initialPrefill?: string;
  /** Optional: hide the header for embedded use */
  hideHeader?: boolean;
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
  hideHeader = false,
  heightClass = 'h-[600px]',
}: ChatViewProps) {
  const [newMessage, setNewMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

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

  const clientMessages = messages.filter(
    (msg) => msg.senderId === client.id || msg.senderId === currentUserId
  );

  return (
    <Card className={`flex flex-col min-h-0 ${heightClass}`}>
      {!hideHeader && (
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Chat with {client.name.split(' ')[0]}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 px-6">
          <div className="space-y-4 pb-4">
            {clientMessages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.senderId === currentUserId ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    message.senderId === currentUserId
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <p className="text-xs mt-1 opacity-70">
                    {format(new Date(message.timestamp), 'MMM d, h:mm a')}
                  </p>
                </div>
              </div>
            ))}
            {clientMessages.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No messages yet. Start a conversation!
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            <Button onClick={handleSend} size="icon">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
