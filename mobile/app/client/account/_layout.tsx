import { Stack } from 'expo-router';

const GROUPED_BG = '#f5f5f5';

/**
 * Account and its sub-screens are a native stack with real navigation
 * bars — large title on the root, back chevrons and swipe-back on the
 * pushed screens — the way Settings works in Apple's own apps.
 */
export default function AccountLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTintColor: '#0a0a0a',
        headerStyle: { backgroundColor: GROUPED_BG },
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: 'IBMPlexSans_600SemiBold', color: '#0a0a0a' },
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: GROUPED_BG },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Account',
          headerLargeTitle: true,
          headerLargeStyle: { backgroundColor: GROUPED_BG },
          headerLargeTitleStyle: { fontFamily: 'IBMPlexSans_700Bold', color: '#0a0a0a' },
        }}
      />
      <Stack.Screen name="profile" options={{ title: 'Edit Profile' }} />
      <Stack.Screen name="password" options={{ title: 'Change Password' }} />
    </Stack>
  );
}
