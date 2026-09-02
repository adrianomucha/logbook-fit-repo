import { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';
import type { Message } from '@logbook/shared/types';
import { UserAvatar } from '@/components/UserAvatar';

/** Server-side cap on message content (sendMessageSchema) */
const MAX_MESSAGE_LENGTH = 5000;
const NEAR_BOTTOM_THRESHOLD = 100;
const FULL = 20;
const FLAT = 4;

interface ChatViewProps {
  messages: Message[];
  currentUserId: string;
  peerName: string;
  /** The peer's photo, shown wherever their monogram would be */
  peerAvatarUrl?: string | null;
  onSendMessage: (content: string) => Promise<void>;
  hasEarlier?: boolean;
  onLoadEarlier?: () => Promise<void>;
  isLoadingEarlier?: boolean;
  conversationStarters?: string[];
}

type Row = {
  message: Message;
  showDateSep: boolean;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  isNewest: boolean;
  msgDate: Date;
};

/**
 * Messenger-style bubble corners, same rule as the web: the tail side is the
 * trailing edge for outgoing, leading for incoming; first-in-group gets a
 * full top and last-in-group a full bottom on that side.
 */
function bubbleRadius(isCurrentUser: boolean, first: boolean, last: boolean) {
  return isCurrentUser
    ? { borderTopLeftRadius: FULL, borderBottomLeftRadius: FULL, borderTopRightRadius: first ? FULL : FLAT, borderBottomRightRadius: last ? FULL : FLAT }
    : { borderTopRightRadius: FULL, borderBottomRightRadius: FULL, borderTopLeftRadius: first ? FULL : FLAT, borderBottomLeftRadius: last ? FULL : FLAT };
}

/**
 * The client's chat with their coach — the web's ChatView in its 'brand'
 * voice: blue outgoing bubbles, the coach's avatar beside incoming groups,
 * date separators, a Seen receipt, the "N new" pill, and the volt send.
 * The list is inverted (newest at the bottom, pinned) so the keyboard and
 * new messages behave the way a native chat does.
 */
export function ChatView({
  messages,
  currentUserId,
  peerName,
  peerAvatarUrl,
  onSendMessage,
  hasEarlier,
  onLoadEarlier,
  isLoadingEarlier,
  conversationStarters,
}: ChatViewProps) {
  const [draft, setDraft] = useState('');
  const [unseenCount, setUnseenCount] = useState(0);
  const [sendError, setSendError] = useState<string | null>(null);
  const listRef = useRef<FlatList<Row>>(null);
  const inputRef = useRef<TextInput>(null);
  const nearBottomRef = useRef(true);
  const prevCountRef = useRef(messages.length);
  const justSentRef = useRef(false);
  // Older pages arriving above must not count as new messages
  const suppressRef = useRef(false);
  const peerFirst = peerName.split(' ')[0];

  // Group info is computed oldest-first (as the web does), then rendered
  // newest-first by the inverted list.
  const rows = useMemo<Row[]>(() => {
    const oldestFirst = [...messages].reverse();
    const out = oldestFirst.map((msg, idx) => {
      const prev = idx > 0 ? oldestFirst[idx - 1] : null;
      const next = idx < oldestFirst.length - 1 ? oldestFirst[idx + 1] : null;
      const msgDate = new Date(msg.timestamp);
      const prevDate = prev ? new Date(prev.timestamp) : null;
      const nextDate = next ? new Date(next.timestamp) : null;
      const showDateSep = !prevDate || msgDate.toDateString() !== prevDate.toDateString();
      const nextIsNewDay = !nextDate || msgDate.toDateString() !== nextDate.toDateString();
      const sameSenderAsPrev = prev?.senderId === msg.senderId && !showDateSep;
      const sameSenderAsNext = next?.senderId === msg.senderId && !nextIsNewDay;
      return {
        message: msg,
        showDateSep,
        isFirstInGroup: !sameSenderAsPrev,
        isLastInGroup: !sameSenderAsNext,
        isNewest: idx === oldestFirst.length - 1,
        msgDate,
      };
    });
    return out.reverse();
  }, [messages]);

  // New messages while scrolled up → count them for the pill instead of yanking the view.
  const count = messages.length;
  if (count !== prevCountRef.current) {
    const added = count - prevCountRef.current;
    prevCountRef.current = count;
    if (added > 0 && suppressRef.current) {
      suppressRef.current = false;
    } else if (added > 0) {
      if (justSentRef.current || nearBottomRef.current) {
        justSentRef.current = false;
        setTimeout(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }), 50);
      } else {
        setTimeout(() => setUnseenCount((n) => n + added), 0);
      }
    }
  }

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    // Inverted list: offset 0 is the bottom of the conversation
    const wasNear = nearBottomRef.current;
    nearBottomRef.current = e.nativeEvent.contentOffset.y <= NEAR_BOTTOM_THRESHOLD;
    if (!wasNear && nearBottomRef.current) setUnseenCount(0);
  }, []);

  const scrollToBottom = () => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
    setUnseenCount(0);
    nearBottomRef.current = true;
  };

  const send = async () => {
    const content = draft.trim();
    if (!content) return;
    justSentRef.current = true;
    setDraft('');
    setSendError(null);
    try {
      await onSendMessage(content);
    } catch {
      // Restore the draft so a failed send never eats the message
      setDraft(content);
      setSendError('Message failed to send. Please try again.');
    }
  };

  const hasInput = draft.trim().length > 0;

  const renderRow = ({ item }: { item: Row }) => {
    const { message, showDateSep, isFirstInGroup, isLastInGroup, isNewest, msgDate } = item;
    const mine = message.senderId === currentUserId;
    const ctx = message.exerciseContext;
    return (
      <View>
        {showDateSep ? (
          <View className="items-center py-4">
            <Text className="font-mono-medium text-[11px] uppercase tracking-[1.76px] text-muted-foreground">{format(msgDate, 'EEEE, MMM d')}</Text>
          </View>
        ) : null}
        <View className={`flex-row items-end gap-2 ${mine ? 'justify-end' : 'justify-start'} ${isFirstInGroup ? 'mt-4' : 'mt-[5px]'}`}>
          {!mine ? (
            <View className="w-7">
              {isLastInGroup ? (
                <UserAvatar name={peerName} avatarUrl={peerAvatarUrl} size={28} textSize={10} />
              ) : null}
            </View>
          ) : null}
          <View
            className={`max-w-[80%] px-4 py-2.5 ${mine ? 'bg-chat-accent' : 'bg-muted/50'}`}
            style={bubbleRadius(mine, isFirstInGroup, isLastInGroup)}
          >
            {ctx ? (
              <View className={`-mx-0.5 mb-2 rounded-lg px-3 py-2.5 ${mine ? 'border-l-2 border-white/30 bg-white/10' : 'border-l-2 border-brand bg-background/60'}`}>
                <Text className={`mb-0.5 font-sans-medium text-[11px] uppercase tracking-[1.32px] ${mine ? 'text-white/80' : 'text-foreground/70'}`}>Exercise</Text>
                <Text className={`font-sans-bold text-sm tracking-tight ${mine ? 'text-white' : 'text-foreground'}`} numberOfLines={1}>{ctx.exerciseName}</Text>
                <Text className={`mt-0.5 font-sans-medium text-[11px] uppercase tracking-[1.32px] ${mine ? 'text-white/80' : 'text-foreground/70'}`}>
                  {ctx.prescription} · {ctx.setsCompleted}/{ctx.totalSets} sets
                </Text>
                {ctx.flagNote ? (
                  <Text className={`mt-1.5 border-l-2 pl-2 font-sans text-[13px] italic ${mine ? 'border-white/20 text-white/80' : 'border-foreground/20 text-foreground/70'}`}>“{ctx.flagNote}”</Text>
                ) : null}
              </View>
            ) : null}
            <Text className={`font-sans text-[15px] leading-[23px] ${mine ? 'text-chat-accent-foreground' : 'text-foreground'}`}>{message.content}</Text>
          </View>
        </View>
        {isLastInGroup ? (
          <Text className={`mt-1.5 font-mono text-[11px] text-muted-foreground ${mine ? 'pr-0.5 text-right' : 'pl-9 text-left'}`}>
            {format(msgDate, 'h:mm a')}
            {mine && isNewest && message.read ? ' · Seen' : ''}
          </Text>
        ) : null}
      </View>
    );
  };

  return (
    <View className="flex-1">
      {messages.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6 py-8">
          <View className="relative mb-3">
            <UserAvatar name={peerName} avatarUrl={peerAvatarUrl} size={56} textSize={18} />
            <View className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-brand" />
          </View>
          <Text className="mb-2 font-mono text-[11px] uppercase tracking-[1.76px] text-muted-foreground">Direct line</Text>
          <Text className="font-sans-bold text-lg tracking-tight text-foreground">Talk to {peerFirst}</Text>
          <Text className="mt-2 max-w-[280px] text-center font-sans text-sm leading-5 text-muted-foreground">
            Questions, wins, sore spots — it all helps {peerFirst} coach you better.
          </Text>
          {conversationStarters?.length ? (
            <View className="mt-4 flex-row flex-wrap justify-center gap-2 pt-2">
              {conversationStarters.map((starter) => (
                <Pressable
                  key={starter}
                  onPress={() => {
                    setDraft(starter);
                    inputRef.current?.focus();
                  }}
                  className="min-h-[44px] justify-center rounded-full bg-muted/60 px-3.5 py-2 active:bg-brand"
                >
                  <Text className="font-sans-bold text-[11px] uppercase tracking-[0.5px] text-foreground">{starter}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={rows}
          inverted
          keyExtractor={(row) => row.message.id}
          renderItem={renderRow}
          onScroll={onScroll}
          scrollEventThrottle={64}
          contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 16 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          // Inverted: the footer renders at the top of the conversation
          ListFooterComponent={
            hasEarlier && onLoadEarlier ? (
              <View className="items-center pb-2 pt-2">
                <Pressable
                  onPress={() => {
                    suppressRef.current = true;
                    void onLoadEarlier();
                  }}
                  disabled={isLoadingEarlier} className="rounded-full bg-muted/60 px-3.5 py-2 active:opacity-70">
                  <Text className="font-mono-bold text-[11px] uppercase tracking-[1.5px] text-muted-foreground">
                    {isLoadingEarlier ? 'Loading…' : 'Load earlier messages'}
                  </Text>
                </Pressable>
              </View>
            ) : null
          }
        />
      )}

      {unseenCount > 0 ? (
        <View className="absolute inset-x-0 bottom-[68px] items-center">
          <Pressable onPress={scrollToBottom} className="min-h-[44px] flex-row items-center gap-1.5 rounded-full bg-brand px-3.5 py-1.5 active:opacity-80">
            <Feather name="chevron-down" size={12} color="#1e2702" />
            <Text className="font-sans-bold text-[11px] uppercase tracking-[1.5px] text-brand-foreground">{unseenCount === 1 ? '1 new' : `${unseenCount} new`}</Text>
          </Pressable>
        </View>
      ) : null}

      <View className="border-t border-border/50 px-3 py-2.5">
        {sendError ? <Text className="mb-1.5 font-sans text-xs text-destructive">{sendError}</Text> : null}
        <View className="flex-row items-center gap-2">
          <View className="min-h-[44px] flex-1 justify-center rounded-full bg-muted/40 px-4">
            <TextInput
              ref={inputRef}
              className="py-2.5 font-sans text-base text-foreground"
              placeholder={`Message ${peerFirst}...`}
              placeholderTextColor="#737373"
              value={draft}
              onChangeText={setDraft}
              maxLength={MAX_MESSAGE_LENGTH}
              returnKeyType="send"
              onSubmitEditing={send}
              blurOnSubmit={false}
              accessibilityLabel={`Message to ${peerName}`}
            />
          </View>
          <Pressable
            onPress={send}
            disabled={!hasInput}
            accessibilityRole="button"
            accessibilityLabel="Send message"
            className={`h-10 w-10 items-center justify-center rounded-full ${hasInput ? 'bg-brand active:opacity-80' : 'bg-muted/40'}`}
            style={{ transform: [{ scale: hasInput ? 1 : 0.9 }] }}
          >
            <Feather name="send" size={16} color={hasInput ? '#1e2702' : '#c4c4c4'} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
