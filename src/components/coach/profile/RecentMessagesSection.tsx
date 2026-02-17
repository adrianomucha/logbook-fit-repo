import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { MessageSquare, Send, ArrowRight } from 'lucide-react';
import { Message, Client } from '@/types';
import { format, formatDistanceToNow } from 'date-fns';

interface RecentMessagesSectionProps {
  client: Client;
  messages: Message[];
  currentUserId: string;
  currentUserName: string;
  onSendMessage: (content: string) => void;
  initialMessage?: string; // Pre-filled message (e.g., from flagged exercise)
}

export function RecentMessagesSection({
  client,
  messages,
  currentUserId,
  currentUserName,
  onSendMessage,
  initialMessage,
}: RecentMessagesSectionProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [newMessage, setNewMessage] = useState(initialMessage || '');

  // Filter and sort messages for this client (using clientId for proper data isolation)
  const clientMessages = useMemo(() => {
    return messages
      .filter((msg) => msg.clientId === client.id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [messages, client.id]);

  // Get last 3 messages for preview
  const recentMessages = clientMessages.slice(0, 3).reverse();

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

  const openChat = (prefillMessage?: string) => {
    if (prefillMessage) {
      setNewMessage(prefillMessage);
    }
    setIsChatOpen(true);
  };

  return (
    <>
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Recent Messages
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1">
          {recentMessages.length > 0 ? (
            <div className="space-y-3">
              {recentMessages.map((message) => {
                const isCoach = message.senderId === currentUserId;
                return (
                  <div key={message.id} className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs shrink-0">
                      {isCoach ? '🏋️' : client.avatar?.charAt(0) || '👤'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {isCoach ? 'You' : client.name.split(' ')[0]}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(message.timestamp), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {message.content}
                      </p>
                    </div>
                  </div>
                );
              })}
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => openChat()}
              >
                Open chat
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-3">No messages yet</p>
              <Button variant="outline" size="sm" onClick={() => openChat()}>
                <MessageSquare className="w-4 h-4 mr-1" />
                Send a message
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chat Sheet */}
      <Sheet open={isChatOpen} onOpenChange={setIsChatOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
          <SheetHeader className="p-6 pb-4 border-b">
            <SheetTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                {client.avatar || '👤'}
              </div>
              Chat with {client.name}
            </SheetTitle>
          </SheetHeader>

          {/* Messages area */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {clientMessages.length > 0 ? (
                [...clientMessages].reverse().map((message) => {
                  const isCoach = message.senderId === currentUserId;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isCoach ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          isCoach
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
                  );
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No messages yet. Start a conversation!
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input area */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                className="h-11"
              />
              <Button onClick={handleSend} size="icon" className="h-11 w-11 shrink-0">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
