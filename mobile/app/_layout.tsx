import '../global.css';

import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { IBMPlexSans_400Regular } from '@expo-google-fonts/ibm-plex-sans/400Regular';
import { IBMPlexSans_500Medium } from '@expo-google-fonts/ibm-plex-sans/500Medium';
import { IBMPlexSans_600SemiBold } from '@expo-google-fonts/ibm-plex-sans/600SemiBold';
import { IBMPlexSans_700Bold } from '@expo-google-fonts/ibm-plex-sans/700Bold';
import { IBMPlexMono_400Regular } from '@expo-google-fonts/ibm-plex-mono/400Regular';
import { IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono/500Medium';
import { IBMPlexMono_600SemiBold } from '@expo-google-fonts/ibm-plex-mono/600SemiBold';
import { IBMPlexMono_700Bold } from '@expo-google-fonts/ibm-plex-mono/700Bold';
import { AuthProvider } from '@/lib/auth';
import { resolveNotificationUrl } from '@/lib/push';

// Keep the splash up until the fonts are in — a flash of system font on the
// greeting is the first thing anyone would notice.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

/** Tapping a notification lands on the screen its `url` names (the web path, mapped). */
function useNotificationDeepLinks() {
  const router = useRouter();
  useEffect(() => {
    const open = (response: Notifications.NotificationResponse | null) => {
      const target = resolveNotificationUrl(response?.notification.request.content.data?.url);
      if (target) router.push(target as never);
    };
    // Cold start from a notification
    void Notifications.getLastNotificationResponseAsync().then(open);
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, [router]);
}

export default function RootLayout() {
  useNotificationDeepLinks();
  const [fontsLoaded, fontError] = useFonts({
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
    IBMPlexSans_700Bold,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
    IBMPlexMono_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync().catch(() => undefined);
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#ffffff' } }}>
        <Stack.Screen name="account" options={{ presentation: 'modal' }} />
      </Stack>
    </AuthProvider>
  );
}
