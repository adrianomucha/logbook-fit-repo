import { useState } from 'react';
import { Message } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Dumbbell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface ClientChatProps {
  messages: Message[];
  currentUserId: string;
  currentUserName: string;
  coachName: string;
  onSendMessage: (content: string) => void;
}

export function ClientChat({
  messages,
  currentUserId,
  currentUserName,
  coachName,
  onSendMessage
}: ClientChatProps) {
  const [newMessage, setNewMessage] = useState('');

  const handleSend = () => {
    if (newMessage.trim()) {
      onSendMessage(newMessage);
      setNewMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="flex flex-col h-[calc(100vh-12rem)] sm:h-[600px]">
      <CardHeader>
        <CardTitle className="text-lg">Chat with {coachName}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 px-6">
          <div className="space-y-4 pb-4">
            {messages.map((message) => {
              const isCurrentUser = message.senderId === currentUserId;
              return (
              <div
                key={message.id}
                className={cn('flex', isCurrentUser ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[85%] sm:max-w-[70%] rounded-lg p-3',
                    isCurrentUser
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  {/* Exercise context card if present */}
                  {message.exerciseContext && (
                    <div className={cn(
                      'rounded p-2 mb-2 text-xs',
                      isCurrentUser
                        ? 'bg-primary-foreground/10'
                        : 'bg-background/50'
                    )}>
                      <div className="flex items-center gap-1">
                        <Dumbbell className="w-3 h-3" />
                        <span className="font-medium">{message.exerciseContext.exerciseName}</span>
                      </div>
                      <p className={cn(isCurrentUser ? 'opacity-80' : 'text-muted-foreground')}>
                        {message.exerciseContext.prescription} · {message.exerciseContext.setsCompleted}/{message.exerciseContext.totalSets} sets done
                      </p>
                      {message.exerciseContext.flagNote && (
                        <p className="italic mt-1">
                          Note: "{message.exerciseContext.flagNote}"
                        </p>
                      )}
                    </div>
                  )}
                  <p className="text-sm">{message.content}</p>
                  <p className="text-xs mt-1 opacity-70">
                    {format(new Date(message.timestamp), 'MMM d, h:mm a')}
                  </p>
                </div>
              </div>
            ); })}
            {messages.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No messages yet. Start a conversation with your coach!
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              placeholder="Message your coach..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <Button onClick={handleSend} size="icon" className="shrink-0 touch-manipulation">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
