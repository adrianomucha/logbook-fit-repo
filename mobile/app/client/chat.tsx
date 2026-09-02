import { useCallback, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { apiMessagesToMessages } from '@logbook/shared/adapters/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useMessages } from '@/hooks/useMessages';
import { useClientPlan } from '@/hooks/useClientWeek';
import { AppHeader } from '@/components/nav/AppHeader';
import { ChatView } from '@/components/chat/ChatView';
import { UserAvatar } from '@/components/UserAvatar';
import { EmptyState, LoadingScreen } from '@/components/ui';
import { NotificationToggle } from '@/components/notifications/NotificationToggle';

/** The Chat tab — the web's ClientChatHeader plus ChatView in the brand voice. */
export default function ChatScreen() {
  const { user, coach, clientProfileId, isLoading } = useCurrentUser();
  const { plan } = useClientPlan();
  const coachUserId = coach?.user.id ?? null;
  const coachName = coach?.user.name ?? 'Coach';

  // Only the open chat polls at conversation speed and marks the thread read
  const [focused, setFocused] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, [])
  );

  const { messages: apiMessages, sendMessage, hasMore, loadOlder, isLoadingOlder } = useMessages(coachUserId, {
    markRead: focused,
    active: focused,
  });
  const messages = useMemo(() => apiMessagesToMessages(apiMessages, clientProfileId ?? ''), [apiMessages, clientProfileId]);

  if (isLoading) return <LoadingScreen />;

  return (
    <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AppHeader />
      {!coach || !coachUserId ? (
        <View className="flex-1 px-5">
          <EmptyState
            title="You're not connected to a coach"
            body="Your workout history is saved on your account. Ask a coach for a new invite link when you're ready to train again."
          />
        </View>
      ) : (
        <View className="flex-1 px-4 pt-4">
          <View className="flex-row items-center gap-3 pb-4">
            <View className="relative">
              <UserAvatar name={coachName} avatarUrl={coach.user.avatarUrl} size={40} textSize={14} />
              {/* Volt dot — the same brand accent the coach-side avatars carry */}
              <View className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-brand" />
            </View>
            <View className="flex-1">
              <Text className="mb-0.5 font-mono text-[10px] uppercase tracking-[1.6px] text-muted-foreground">Your coach</Text>
              <Text className="font-sans-bold text-xl leading-6 tracking-tight text-foreground" numberOfLines={1}>{coachName}</Text>
            </View>
            <NotificationToggle />
          </View>
          <View className="mb-3 flex-1 overflow-hidden rounded-2xl border border-border/70 bg-card">
            <ChatView
              messages={messages}
              currentUserId={user?.id ?? ''}
              peerName={coachName}
              peerAvatarUrl={coach.user.avatarUrl}
              onSendMessage={async (content) => {
                await sendMessage(content);
              }}
              hasEarlier={hasMore}
              onLoadEarlier={loadOlder}
              isLoadingEarlier={isLoadingOlder}
              conversationStarters={
                plan
                  ? ['How should I warm up?', 'Feeling sore today', 'Can we adjust my plan?']
                  : ['Hi! Just signed up 👋', 'Here’s what I want to work on…', 'Anything you need from me?']
              }
            />
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
