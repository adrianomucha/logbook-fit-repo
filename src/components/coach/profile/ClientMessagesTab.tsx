import { Client, Message } from '@/types';
import { ChatView } from '@/components/coach/ChatView';

interface ClientMessagesTabProps {
  client: Client;
  messages: Message[];
  currentUserId: string;
  currentUserName: string;
  onSendMessage: (content: string) => void;
}

export function ClientMessagesTab({
  client,
  messages,
  currentUserId,
  currentUserName,
  onSendMessage
}: ClientMessagesTabProps) {
  return (
    <ChatView
      client={client}
      messages={messages}
      currentUserId={currentUserId}
      currentUserName={currentUserName}
      onSendMessage={onSendMessage}
    />
  );
}
