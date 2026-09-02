import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { ApiError, apiFetch } from '@/lib/api';
import { Button, Eyebrow } from '@/components/ui';

const MESSAGE_MAX_LENGTH = 2000;
const CATEGORIES = [
  { value: 'BUG', label: 'Something broke', icon: 'alert-circle' },
  { value: 'IDEA', label: 'An idea', icon: 'zap' },
  { value: 'OTHER', label: 'Something else', icon: 'message-circle' },
] as const;
type Category = (typeof CATEGORIES)[number]['value'];

/** "Send feedback" — the web's FeedbackDialog: category, message, done. */
export function FeedbackSheet({ visible, onClose, pageUrl }: { visible: boolean; onClose: () => void; pageUrl: string }) {
  const insets = useSafeAreaInsets();
  const [category, setCategory] = useState<Category>('IDEA');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setCategory('IDEA');
    setMessage('');
    setIsSending(false);
    setIsSent(false);
    setError(null);
  }, [visible]);

  const send = async () => {
    const trimmed = message.trim();
    if (!trimmed || isSending) return;
    setIsSending(true);
    setError(null);
    try {
      await apiFetch('/api/feedback', { method: 'POST', body: JSON.stringify({ category, message: trimmed, pageUrl }) });
      setIsSent(true);
    } catch (e) {
      setError(e instanceof ApiError && e.status === 429 ? e.message : 'Couldn’t send that. Try again.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="flex-1 px-5" style={{ paddingTop: 20, paddingBottom: insets.bottom + 16 }}>
          <View className="mb-1 flex-row items-center justify-between">
            <Text className="font-sans-bold text-lg tracking-tight text-foreground">Send feedback</Text>
            <Pressable onPress={onClose} hitSlop={12} disabled={isSending}>
              <Feather name="x" size={20} color="#737373" />
            </Pressable>
          </View>
          <Text className="mb-5 font-sans text-sm text-muted-foreground">Report a bug, suggest an idea, or say anything about Logbook.</Text>

          {isSent ? (
            <View className="flex-1 items-center justify-center gap-3">
              <Feather name="check-circle" size={32} color="#c3f910" />
              <Text className="font-sans-medium text-foreground">Thanks — got it.</Text>
              <Text className="text-center font-sans text-sm text-muted-foreground">Every note gets read. It genuinely shapes what gets built next.</Text>
              <Button variant="primary" className="mt-4 h-11 px-8" onPress={onClose}>Done</Button>
            </View>
          ) : (
            <View className="gap-4">
              <View>
                <Text className="mb-2 font-sans-medium text-sm text-foreground">What kind of feedback?</Text>
                <View className="flex-row flex-wrap gap-2" accessibilityRole="radiogroup">
                  {CATEGORIES.map(({ value, label, icon }) => {
                    const active = category === value;
                    return (
                      <Pressable
                        key={value}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: active }}
                        onPress={() => setCategory(value)}
                        className={`h-8 flex-row items-center gap-1.5 rounded-full border px-3 ${active ? 'border-foreground bg-foreground' : 'border-border bg-background'}`}
                      >
                        <Feather name={icon} size={14} color={active ? '#ffffff' : '#737373'} />
                        <Text className={`font-sans-medium text-xs ${active ? 'text-background' : 'text-muted-foreground'}`}>{label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              <View>
                <Text className="mb-2 font-sans-medium text-sm text-foreground">
                  {category === 'BUG' ? 'What happened?' : category === 'IDEA' ? 'What should Logbook do?' : 'What’s on your mind?'}
                </Text>
                <TextInput
                  className="min-h-[120px] rounded-md border border-input bg-background px-3 py-2 font-sans text-base text-foreground"
                  placeholder={category === 'BUG' ? 'What did you do, and what went wrong?' : 'The rough shape is plenty — no need to polish it.'}
                  placeholderTextColor="#737373"
                  value={message}
                  onChangeText={setMessage}
                  maxLength={MESSAGE_MAX_LENGTH}
                  multiline
                  textAlignVertical="top"
                  autoFocus
                />
                {message.length >= MESSAGE_MAX_LENGTH - 200 ? (
                  <Text className="mt-1 text-right font-mono text-[11px] text-muted-foreground">{message.length}/{MESSAGE_MAX_LENGTH}</Text>
                ) : null}
              </View>
              {error ? <Text className="font-sans text-sm text-destructive">{error}</Text> : null}
              <Button variant="primary" className="h-11" onPress={send} loading={isSending} disabled={!message.trim()}>Send</Button>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
