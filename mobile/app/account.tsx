import { useState } from 'react';
import { Alert, Pressable, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Eyebrow } from '@/components/ui';
import { FeedbackSheet } from '@/components/account/FeedbackSheet';
import { DeleteAccountSheet } from '@/components/account/DeleteAccountSheet';

function initials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || '';
  if (!source) return '';
  const words = source.split(/\s+/).filter(Boolean);
  if (words.length > 1) return (words[0][0] + words[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function Row({ icon, label, detail, onPress, destructive, right }: { icon: keyof typeof Feather.glyphMap; label: string; detail?: string; onPress?: () => void; destructive?: boolean; right?: React.ReactNode }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} className="min-h-[52px] flex-row items-center gap-3 px-4 py-3 active:bg-muted/40">
      <Feather name={icon} size={16} color={destructive ? '#c52020' : '#737373'} />
      <View className="flex-1">
        <Text className={`font-sans-medium text-[15px] ${destructive ? 'text-destructive' : 'text-foreground'}`}>{label}</Text>
        {detail ? <Text className="mt-0.5 font-sans text-xs text-muted-foreground">{detail}</Text> : null}
      </View>
      {right ?? (onPress ? <Feather name="chevron-right" size={16} color="#a3a3a3" /> : null)}
    </Pressable>
  );
}

/**
 * The account menu, as a screen — everything the web's AccountMenu holds
 * (identity, feedback, sign out, delete account) plus the per-device
 * notification opt-in the web keeps in the chat header.
 */
export default function AccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, signOut } = useAuth();
  const push = usePushNotifications();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const user = session?.user;

  const togglePush = async (next: boolean) => {
    try {
      if (next) await push.enable();
      else await push.disable();
    } catch (e) {
      Alert.alert("Couldn't update notifications", e instanceof Error ? e.message : undefined);
    }
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
        <View className="h-12 w-12 items-center justify-center rounded-full border border-border bg-muted/40">
          <Text className="font-mono-semibold text-sm uppercase text-foreground">{initials(user?.name, user?.email)}</Text>
        </View>
        <View className="flex-1">
          <Text className="font-sans-bold text-lg tracking-tight text-foreground" numberOfLines={1}>{user?.name || 'Account'}</Text>
          {user?.email ? <Text className="font-sans text-sm text-muted-foreground" numberOfLines={1}>{user.email}</Text> : null}
        </View>
      </View>

      <View className="mx-5 overflow-hidden rounded-2xl border border-border/70 bg-card">
        <Row
          icon="bell"
          label="Notifications"
          detail={
            !push.available
              ? 'Available in the App Store build'
              : push.isBlocked && !push.isSubscribed
                ? 'Off for Logbook in iOS Settings'
                : 'Messages, check-ins and plan updates'
          }
          right={
            push.available && !push.isLoading ? (
              <Switch
                value={push.isSubscribed}
                onValueChange={(v) => void togglePush(v)}
                disabled={push.isBusy || (push.isBlocked && !push.isSubscribed)}
                trackColor={{ true: '#c3f910', false: '#e5e5e5' }}
                thumbColor="#ffffff"
              />
            ) : null
          }
        />
        <View className="h-px bg-border/50" />
        <Row icon="message-square" label="Send feedback" detail="Report a bug or suggest an idea" onPress={() => setFeedbackOpen(true)} />
        <View className="h-px bg-border/50" />
        <Row icon="log-out" label="Sign out" onPress={() => void signOut()} />
      </View>

      <View className="mx-5 mt-4 overflow-hidden rounded-2xl border border-border/70 bg-card">
        <Row icon="trash-2" label="Delete account" destructive onPress={() => setDeleteOpen(true)} />
      </View>

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
    </View>
  );
}
