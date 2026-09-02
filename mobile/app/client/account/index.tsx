import { useState } from 'react';
import { Alert, Pressable, Switch, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { format } from 'date-fns';
import { useAuth } from '@/lib/auth';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { UserAvatar } from '@/components/UserAvatar';
import { Group, GroupedScreen, HeaderBack, Row } from '@/components/settings/GroupedList';
import { FeedbackSheet } from '@/components/account/FeedbackSheet';
import { DeleteAccountSheet } from '@/components/account/DeleteAccountSheet';

/**
 * The Account screen — the web's settings, in the shape iOS users expect:
 * the profile card up top, then inset groups for the facts, security,
 * notifications and support, and the two account-ending actions at the
 * bottom where nobody hits them by accident.
 */
export default function AccountScreen() {
  const router = useRouter();
  const { session, signOut } = useAuth();
  const { user } = useCurrentUser();
  const push = usePushNotifications();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const name = user?.name ?? session?.user.name ?? '';
  const email = user?.email ?? session?.user.email ?? '';
  const version = Constants.expoConfig?.version;

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/client');
  };

  const confirmSignOut = () => {
    Alert.alert('Sign out?', 'You’ll need your email and password to sign back in.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  const togglePush = async (next: boolean) => {
    try {
      if (next) await push.enable();
      else await push.disable();
    } catch (e) {
      Alert.alert('Couldn’t update notifications', e instanceof Error ? e.message : undefined);
    }
  };

  const pushBlocked = push.isBlocked && !push.isSubscribed;
  const pushFooter = push.isLoading
    ? 'Checking this device…'
    : !push.available
      ? 'Alerts arrive once the app is installed from TestFlight or the App Store.'
      : pushBlocked
        ? 'Notifications are off for Logbook in iOS Settings. Turn them on there to get alerts.'
        : 'A push notification on this device when your coach messages you. Alerts are per device, so turn them on wherever you train from.';

  return (
    <>
      <Stack.Screen options={{ headerLeft: () => <HeaderBack onPress={goBack} /> }} />
      <GroupedScreen>
        {/* Profile card — identity, and the way into editing it */}
        <View className="px-4">
          <Pressable
            onPress={() => router.push('/client/account/profile')}
            accessibilityRole="button"
            accessibilityLabel="Edit profile"
            className="flex-row items-center gap-4 rounded-[10px] bg-card px-4 py-3.5 active:bg-muted"
          >
            <UserAvatar name={name || email} avatarUrl={user?.avatarUrl} size={60} textSize={22} />
            <View className="flex-1">
              <Text className="font-sans-semibold text-[20px] leading-6 text-foreground" numberOfLines={1}>
                {name || 'Your account'}
              </Text>
              <Text className="mt-0.5 font-sans text-[15px] text-muted-foreground" numberOfLines={1}>
                {email}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color="#c7c7cc" />
          </Pressable>
        </View>

        <Group
          header="Account"
          footer="Your timezone is detected from this phone — your check-in schedule follows it, even when you travel."
        >
          <Row label="Email" value={email || '—'} />
          <Row label="Timezone" value={user?.timezone ?? 'UTC'} />
          <Row label="Member since" value={user?.createdAt ? format(new Date(user.createdAt), 'MMMM yyyy') : '—'} />
        </Group>

        <Group header="Security">
          <Row label="Change password" chevron onPress={() => router.push('/client/account/password')} />
        </Group>

        <Group header="Notifications" footer={pushFooter}>
          <Row
            label="Message alerts"
            disabled={!push.available || pushBlocked}
            accessory={
              <Switch
                value={push.isSubscribed}
                onValueChange={(v) => void togglePush(v)}
                disabled={push.isLoading || push.isBusy || !push.available || pushBlocked}
                trackColor={{ true: '#c3f910', false: '#e5e5e5' }}
                thumbColor="#ffffff"
                accessibilityLabel="Message alerts"
              />
            }
          />
        </Group>

        <Group header="Support">
          <Row label="Send feedback" detail="Report a bug or suggest an idea" chevron onPress={() => setFeedbackOpen(true)} />
        </Group>

        <Group>
          <Row label="Sign Out" tone="destructive" centered onPress={confirmSignOut} />
        </Group>

        <Group footer="Deleting your account removes your name and email everywhere. Your coach keeps their history under “Deleted account”. This can’t be undone.">
          <Row label="Delete Account" tone="destructive" centered onPress={() => setDeleteOpen(true)} />
        </Group>

        {version ? (
          <Text className="text-center font-mono text-[12px] text-muted-foreground">Logbook {version}</Text>
        ) : null}
      </GroupedScreen>

      <FeedbackSheet visible={feedbackOpen} onClose={() => setFeedbackOpen(false)} pageUrl="app://account" />
      <DeleteAccountSheet
        visible={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        role={user?.role ?? 'CLIENT'}
        onDeleted={async () => {
          setDeleteOpen(false);
          await signOut();
        }}
      />
    </>
  );
}
