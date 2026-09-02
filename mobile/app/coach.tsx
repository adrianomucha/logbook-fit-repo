import { Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '@/lib/auth';
import { WEB_URL } from '@/lib/config';
import { Screen } from '@/components/Screen';
import { Button, Eyebrow, LoadingScreen } from '@/components/ui';

/**
 * v1 is the client app. A coach who signs in isn't wrong to be here — they
 * just get pointed at where their workspace lives instead of a dead end.
 */
export default function CoachScreen() {
  const { status, session, signOut } = useAuth();
  if (status === 'loading') return <LoadingScreen />;
  if (status === 'signed-out') return <Redirect href="/login" />;
  if (session?.user.role !== 'COACH') return <Redirect href="/client" />;

  return (
    <Screen>
      <View className="pt-6">
        <Eyebrow>Hi {session.user.name.split(' ')[0]}</Eyebrow>
        <Text className="mt-2 font-sans-bold text-3xl leading-9 text-foreground">Your workspace lives on the web</Text>
        <Text className="mt-3 font-sans text-[15px] leading-6 text-muted-foreground">
          The Logbook app is for your clients — their workouts, check-ins and chat. Plan building and the
          client dashboard are at logbook.fit, where there's room for them.
        </Text>
      </View>
      <Button variant="primary" onPress={() => WebBrowser.openBrowserAsync(`${WEB_URL}/coach`)}>
        Open logbook.fit
      </Button>
      <Button variant="ghost" onPress={signOut}>
        Sign out
      </Button>
    </Screen>
  );
}
