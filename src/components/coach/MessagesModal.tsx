import { Message } from '@/types';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { Modal } from '@/components/ui/Modal';

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
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Messages with ${clientName}`}
      maxWidth="lg"
    >
      {unreadCount > 0 && (
        <Badge variant="destructive" className="-mt-2 mb-4">
          {unreadCount} Unread
        </Badge>
      )}
      <div className="space-y-3">
        {sortedMessages.length > 0 ? (
          sortedMessages.map((message) => (
            <div
              key={message.id}
              className={`p-3 sm:p-4 rounded-lg ${
                message.read ? 'bg-muted/50' : 'bg-muted border-2 border-primary/20'
              }`}
            >
              <div className="flex items-start justify-between mb-2 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium text-sm truncate">{message.senderName}</span>
                  {!message.read && (
                    <Badge variant="destructive" className="text-xs shrink-0">New</Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
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
    </Modal>
  );
}
