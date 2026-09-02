import { Redirect, Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth';
import { LoadingScreen } from '@/components/ui';

/** The client app: three tabs, same as the web's bottom bar. */
export default function ClientLayout() {
  const { status, session } = useAuth();
  if (status === 'loading') return <LoadingScreen />;
  if (status === 'signed-out') return <Redirect href="/login" />;
  if (session?.user.role !== 'CLIENT') return <Redirect href="/coach" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0a0a0a',
        tabBarInactiveTintColor: '#737373',
        tabBarStyle: { borderTopColor: '#e5e5e5' },
        tabBarLabelStyle: { fontFamily: 'IBMPlexMono_500Medium', fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Today', tabBarIcon: ({ color, size }) => <Feather name="calendar" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="chat"
        options={{ title: 'Chat', tabBarIcon: ({ color, size }) => <Feather name="message-circle" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="progress"
        options={{ title: 'Progress', tabBarIcon: ({ color, size }) => <Feather name="trending-up" size={size} color={color} /> }}
      />
      {/* Pushed from Today; not a tab of its own */}
      <Tabs.Screen name="workout/[dayId]" options={{ href: null }} />
    </Tabs>
  );
}
