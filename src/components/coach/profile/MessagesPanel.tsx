import { Client, Message } from '@/types';
import { ChatView } from '@/components/coach/ChatView';

interface MessagesPanelProps {
  client: Client;
  messages: Message[];
  currentUserId: string;
  currentUserName: string;
  onSendMessage: (content: string) => void;
}

export function MessagesPanel({
  client,
  messages,
  currentUserId,
  currentUserName,
  onSendMessage
}: MessagesPanelProps) {
  return (
    <div className="md:sticky md:top-4">
      <ChatView
        client={client}
        messages={messages}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        onSendMessage={onSendMessage}
      />
    </div>
  );
}
