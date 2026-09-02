import { Screen } from '@/components/Screen';
import { Button, EmptyState } from '@/components/ui';
import { useAuth } from '@/lib/auth';

/** Progress history — next build (IOS_APP_PLAN.md §3.3, screen 6). */
export default function ProgressScreen() {
  const { signOut } = useAuth();
  return (
    <Screen>
      <EmptyState eyebrow="Progress" title="Coming in the next build" body="Your workout history lands here." />
      <Button variant="ghost" onPress={signOut}>Sign out</Button>
    </Screen>
  );
}
