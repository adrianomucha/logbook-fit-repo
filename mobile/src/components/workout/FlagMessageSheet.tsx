import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { WorkoutExercise } from '@logbook/shared/types/api';
import { formatExercisePrescription, getCompletedSetsCount } from '@logbook/shared/workout-execution';
import { Button, Eyebrow } from '@/components/ui';

interface FlagMessageSheetProps {
  exercise: WorkoutExercise | null;
  onClose: () => void;
  /** Resolves when sent; rejects to keep the draft in the sheet. */
  onSend: (message: string) => Promise<void>;
}

/** "Message coach" about a flagged exercise — the exercise context rides along automatically. */
export function FlagMessageSheet({ exercise, onClose, onSend }: FlagMessageSheetProps) {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (exercise) {
      setMessage('');
      setError(null);
      setSending(false);
    }
  }, [exercise]);

  const send = async () => {
    if (sending) return;
    setSending(true);
    setError(null);
    try {
      await onSend(message);
    } catch {
      setError('Message failed to send. Try again.');
      setSending(false);
    }
  };

  return (
    <Modal visible={!!exercise} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="flex-1 px-5" style={{ paddingTop: 20, paddingBottom: insets.bottom + 16 }}>
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="font-sans-bold text-sm uppercase tracking-tight text-foreground">Message coach</Text>
            <Pressable onPress={onClose} hitSlop={12} disabled={sending}>
              <Eyebrow>Close</Eyebrow>
            </Pressable>
          </View>

          {exercise ? (
            <View className="mb-4 rounded-lg bg-muted/40 p-3">
              <Eyebrow>Exercise</Eyebrow>
              <Text className="mt-1 font-sans-bold text-sm text-foreground" numberOfLines={1}>
                {exercise.exercise.name}
              </Text>
              <Text className="mt-1 font-mono text-[11px] uppercase tracking-[1.32px] text-muted-foreground">
                {formatExercisePrescription(exercise)} · {getCompletedSetsCount(exercise)}/{exercise.sets} sets done
              </Text>
              {exercise.flag?.note ? (
                <Text className="mt-2 font-sans text-sm italic text-foreground">“{exercise.flag.note}”</Text>
              ) : null}
            </View>
          ) : null}

          <TextInput
            className="min-h-[120px] rounded-lg border border-input bg-background px-3 py-3 font-sans text-base text-foreground"
            placeholder="Add more context for your coach..."
            placeholderTextColor="#737373"
            value={message}
            onChangeText={setMessage}
            multiline
            textAlignVertical="top"
            maxLength={2000}
            autoFocus
          />
          {error ? <Text className="mt-2 font-sans text-sm text-destructive">{error}</Text> : null}

          <Button variant="primary" className="mt-4" onPress={send} loading={sending}>
            Send to coach
          </Button>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
