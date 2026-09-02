import { Screen } from '@/components/Screen';
import { EmptyState } from '@/components/ui';

/** Progress history — next build (IOS_APP_PLAN.md §3.3, screen 6). */
export default function ProgressScreen() {
  return (
    <Screen withHeader>
      <EmptyState eyebrow="Progress" title="Coming in the next build" body="Your workout history lands here." />
    </Screen>
  );
}
