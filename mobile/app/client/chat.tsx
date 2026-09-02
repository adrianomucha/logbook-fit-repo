import { Screen } from '@/components/Screen';
import { EmptyState } from '@/components/ui';

/** Chat with the coach — next build (IOS_APP_PLAN.md §3.3, screen 5). */
export default function ChatScreen() {
  return (
    <Screen withHeader>
      <EmptyState eyebrow="Chat" title="Coming in the next build" body="Messaging your coach lands here. Until then, it's on logbook.fit." />
    </Screen>
  );
}
