import { Message } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface MessagesModalProps {
  messages: Message[];
  clientName: string;
  onClose: () => void;
}

export function MessagesModal({ messages, clientName, onClose }: MessagesModalProps) {
  const sortedMessages = [...messages].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const unreadCount = messages.filter(m => !m.read).length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Messages with {clientName}</CardTitle>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="mt-2">
                  {unreadCount} Unread
                </Badge>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sortedMessages.length > 0 ? (
              sortedMessages.map((message) => (
                <div
                  key={message.id}
                  className={`p-4 rounded-lg ${
                    message.read ? 'bg-muted/50' : 'bg-muted border-2 border-primary/20'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{message.senderName}</span>
                      {!message.read && (
                        <Badge variant="destructive" className="text-xs">New</Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm">{message.content}</p>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No messages yet
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
