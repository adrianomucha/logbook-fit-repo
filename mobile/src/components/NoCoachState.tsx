import { useRouter } from 'expo-router';
import { NO_COACH_COPY } from '@logbook/shared/client-empty-states';
import { useAuth } from '@/lib/auth';
import { Button, EmptyState } from '@/components/ui';

/**
 * Not connected to a coach: say so, and give the ways out the web's
 * no-coach screen gives (settings, sign out). Used on Today and Chat.
 */
export function NoCoachState({ fill = false }: { fill?: boolean }) {
  const router = useRouter();
  const { signOut } = useAuth();
  return (
    <EmptyState fill={fill} art={NO_COACH_COPY.art} title={NO_COACH_COPY.title} tail={NO_COACH_COPY.tail} body={NO_COACH_COPY.body}>
      <Button variant="primary" className="h-11 w-full" onPress={() => router.push('/client/settings')}>
        {NO_COACH_COPY.settings}
      </Button>
      <Button variant="ghost" className="h-11 w-full" onPress={() => void signOut()}>
        {NO_COACH_COPY.signOut}
      </Button>
    </EmptyState>
  );
}
