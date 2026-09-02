import { Redirect, Tabs } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { LoadingScreen } from '@/components/ui';
import { TabBar } from '@/components/nav/TabBar';

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
      {/* Pushed from Workout; not a tab of its own */}
      <Tabs.Screen name="workout/[dayId]" options={{ href: null }} />
    </Tabs>
  );
}
