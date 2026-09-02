import { Redirect } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { LoadingScreen } from '@/components/ui';

/** The front door: send each person to the one screen that is theirs. */
export default function Index() {
  const { status, session } = useAuth();
  if (status === 'loading') return <LoadingScreen />;
  if (status === 'signed-out') return <Redirect href="/login" />;
  return <Redirect href={session?.user.role === 'COACH' ? '/coach' : '/client'} />;
}
