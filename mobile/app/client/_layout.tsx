import { Redirect, router, Tabs, type ErrorBoundaryProps } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { LoadingScreen } from '@/components/ui';
import { TabBar } from '@/components/nav/TabBar';
import { CrashScreen } from '@/components/CrashScreen';

/**
 * A crash in any client screen. The root navigator stays mounted above this
 * boundary, so "Go home" can leave the client section, which unmounts it
 * and clears the error; the front door then sends the client back in fresh.
 * Retrying alone can fail the same way, so both are offered.
 */
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return <CrashScreen onRetry={() => void retry()} onHome={() => router.replace('/')} />;
}

/** The client app: the web's three tabs with the same bottom bar. */
export default function ClientLayout() {
  const { status, session } = useAuth();
  if (status === 'loading') return <LoadingScreen />;
  if (status === 'signed-out') return <Redirect href="/login" />;
  if (session?.user.role !== 'CLIENT') return <Redirect href="/coach" />;

  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Workout' }} />
      <Tabs.Screen name="chat" options={{ title: 'Chat' }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress' }} />
      {/* Pushed from Workout; not tabs of their own */}
      <Tabs.Screen name="workout/[dayId]" options={{ href: null }} />
      <Tabs.Screen name="checkin/[checkinId]" options={{ href: null }} />
      {/* From the account menu; the web's /client/settings */}
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}
