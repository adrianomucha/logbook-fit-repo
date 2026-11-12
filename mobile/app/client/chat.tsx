import { useCallback, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { apiMessagesToMessages } from '@logbook/shared/adapters/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useMessages } from '@/hooks/useMessages';
import { useClientPlan } from '@/hooks/useClientWeek';
import { AppHeader } from '@/components/nav/AppHeader';
import { ChatView } from '@/components/chat/ChatView';
import { NoCoachState } from '@/components/NoCoachState';
import { UserAvatar } from '@/components/UserAvatar';
import { LoadingScreen } from '@/components/ui';
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
        <View className="flex-1 justify-center px-5">
          <NoCoachState />
        </View>
      ) : (
        // No card around the thread: it runs edge to edge on the page, with
        // one hairline under the coach and one over the composer
        <View className="flex-1">
          <View className="flex-row items-center gap-3 border-b border-border/50 px-4 py-3">
            <View className="relative">
              <UserAvatar name={coachName} avatarUrl={coach.user.avatarUrl} size={40} textSize={14} />
            </View>
            <View className="flex-1">
              <Text className="mb-0.5 font-mono text-[10px] uppercase tracking-[1.6px] text-muted-foreground">Your coach</Text>
              <Text className="font-sans-bold text-xl leading-6 tracking-tight text-foreground" numberOfLines={1}>{coachName}</Text>
            </View>
            <NotificationToggle />
          </View>
          <View className="flex-1">
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
