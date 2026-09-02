import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { AppHeader } from '@/components/nav/AppHeader';
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
 * The account page — the web's AccountMenu dropdown as a screen of its own,
 * in the same chrome as Settings: identity, then Settings, Send feedback,
 * Sign out. Everything editable (photo, name, password, alerts, deleting
 * the account) lives in Settings, as on the web.
 */
export default function AccountScreen() {
  const router = useRouter();
  const { session, signOut } = useAuth();
  const { user } = useCurrentUser();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const name = user?.name ?? session?.user.name ?? '';
  const email = user?.email ?? session?.user.email ?? '';

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/client');
  };

  return (
    <View className="flex-1 bg-background">
      <AppHeader />
      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 }}>
        <View className="gap-4">
          <View>
            <Pressable
              onPress={goBack}
              hitSlop={8}
              accessibilityRole="button"
              className="-ml-1 mb-1 min-h-[36px] flex-row items-center gap-0.5 self-start active:opacity-70"
            >
              <Feather name="chevron-left" size={14} color="#737373" />
              <Text className="font-mono-medium text-[11px] uppercase tracking-[1.3px] text-muted-foreground">Back</Text>
            </Pressable>
            <Text className="font-sans-bold text-2xl leading-[30px] text-foreground" style={{ letterSpacing: -0.6 }}>
              Account
            </Text>
          </View>

          <View className="flex-row items-center gap-3 py-2">
            <UserAvatar name={name || email} avatarUrl={user?.avatarUrl} size={48} textSize={16} />
            <View className="flex-1">
              <Text className="font-sans-bold text-lg tracking-tight text-foreground" numberOfLines={1}>{name || 'Account'}</Text>
              {email ? <Text className="font-sans text-sm text-muted-foreground" numberOfLines={1}>{email}</Text> : null}
            </View>
          </View>

          <View className="overflow-hidden rounded-2xl border border-border/70 bg-card">
            <Row icon="settings" label="Settings" detail="Photo, name, password and alerts" onPress={() => router.push('/client/settings')} />
            <View className="h-px bg-border/50" />
            <Row icon="message-square" label="Send feedback" detail="Report a bug or suggest an idea" onPress={() => setFeedbackOpen(true)} />
            <View className="h-px bg-border/50" />
            <Row icon="log-out" label="Sign out" onPress={() => void signOut()} />
          </View>
        </View>
      </ScrollView>

      <FeedbackSheet visible={feedbackOpen} onClose={() => setFeedbackOpen(false)} pageUrl="app://account" />
    </View>
  );
}
