import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Eyebrow } from '@/components/ui';
import { UserAvatar } from '@/components/UserAvatar';
import { FeedbackSheet } from '@/components/account/FeedbackSheet';

function Row({ icon, label, detail, onPress }: { icon: keyof typeof Feather.glyphMap; label: string; detail?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" className="min-h-[52px] flex-row items-center gap-3 px-4 py-3 active:bg-muted/40">
      <Feather name={icon} size={16} color="#737373" />
      <View className="flex-1">
        <Text className="font-sans-medium text-[15px] text-foreground">{label}</Text>
        {detail ? <Text className="mt-0.5 font-sans text-xs text-muted-foreground">{detail}</Text> : null}
      </View>
      <Feather name="chevron-right" size={16} color="#a3a3a3" />
    </Pressable>
  );
}

/**
 * The account menu, as a sheet — the web's AccountMenu dropdown: identity,
 * Settings, Send feedback, Sign out. Everything editable (photo, name,
 * password, alerts, deleting the account) lives in Settings, as on the web.
 */
export default function AccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, signOut } = useAuth();
  const { user } = useCurrentUser();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const name = user?.name ?? session?.user.name ?? '';
  const email = user?.email ?? session?.user.email ?? '';

  const openSettings = () => {
    // Close the sheet, then push Settings under the Workout tab
    router.back();
    router.push('/client/settings');
  };

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: 16, paddingBottom: insets.bottom }}>
      <View className="flex-row items-center justify-between px-5 pb-4">
        <Eyebrow>Account</Eyebrow>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
          <Feather name="x" size={20} color="#737373" />
        </Pressable>
      </View>

      <View className="flex-row items-center gap-3 px-5 pb-6">
        <UserAvatar name={name || email} avatarUrl={user?.avatarUrl} size={48} textSize={16} />
        <View className="flex-1">
          <Text className="font-sans-bold text-lg tracking-tight text-foreground" numberOfLines={1}>{name || 'Account'}</Text>
          {email ? <Text className="font-sans text-sm text-muted-foreground" numberOfLines={1}>{email}</Text> : null}
        </View>
      </View>

      <View className="mx-5 overflow-hidden rounded-2xl border border-border/70 bg-card">
        <Row icon="settings" label="Settings" detail="Photo, name, password and alerts" onPress={openSettings} />
        <View className="h-px bg-border/50" />
        <Row icon="message-square" label="Send feedback" detail="Report a bug or suggest an idea" onPress={() => setFeedbackOpen(true)} />
        <View className="h-px bg-border/50" />
        <Row icon="log-out" label="Sign out" onPress={() => void signOut()} />
      </View>

      <FeedbackSheet visible={feedbackOpen} onClose={() => setFeedbackOpen(false)} pageUrl="app://account" />
    </View>
  );
}
