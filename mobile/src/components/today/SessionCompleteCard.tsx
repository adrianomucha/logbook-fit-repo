import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { WorkoutCompletion } from '@logbook/shared/types';
import { parseSessionName } from '@logbook/shared/parse-session-name';
import { Button, Card, Eyebrow } from '@/components/ui';

import type { EffortRating } from '@logbook/shared/client-copy';
import { EffortPicker } from '@/components/EffortPicker';

interface SessionCompleteCardProps {
  workoutName?: string;
  completion: WorkoutCompletion;
  coachName?: string | null;
  feedbackSubmitted?: boolean;
  isSubmittingFeedback?: boolean;
  onSubmitFeedback: (rating: EffortRating, notes?: string) => void;
}

/**
 * Hero card for a finished session — the web's SessionCompleteCard. Same
 * anatomy as the scheduled hero (eyebrow, big title, stat band), plus the
 * one thing left to do after training: tell the coach how it felt.
 */
export function SessionCompleteCard({
  workoutName,
  completion,
  coachName,
  feedbackSubmitted,
  isSubmittingFeedback = false,
  onSubmitFeedback,
}: SessionCompleteCardProps) {
  const [selected, setSelected] = useState<EffortRating | null>(null);
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);

  const { day, title, subtitle } = parseSessionName(workoutName || 'Today’s workout');
  const coachFirst = coachName?.split(' ')[0];
  const durationMin = completion.durationSec ? Math.max(1, Math.round(completion.durationSec / 60)) : null;

  const stats: [string | number, string][] = [];
  if (durationMin) stats.push([durationMin, 'min']);
  stats.push([
    completion.exercisesDone < completion.exercisesTotal ? `${completion.exercisesDone}/${completion.exercisesTotal}` : completion.exercisesTotal,
    completion.exercisesTotal === 1 ? 'exercise' : 'exercises',
  ]);
  stats.push([`${completion.completionPct}%`, 'done']);

  return (
    <Card>
      <View className="flex-row items-start justify-between gap-4">
        <View className="flex-1">
          <Eyebrow>{day ? `Workout complete · Day ${day}` : 'Workout complete'}</Eyebrow>
          <Text className="mt-2.5 font-sans-bold text-[26px] leading-[30px] tracking-tight text-foreground">{title}</Text>
          {subtitle ? <Text className="mt-1.5 font-sans text-[15px] text-muted-foreground">{subtitle}</Text> : null}
        </View>
        <View className="h-11 w-11 items-center justify-center rounded-full bg-brand">
          <Feather name="check" size={20} color="#1e2702" />
        </View>
      </View>

      <View className="mt-4 flex-row items-baseline border-t border-border/50 pt-4">
        {stats.map(([value, unit], i) => (
          <Text key={unit} className="font-mono text-[13px]">
            {i > 0 ? <Text className="text-muted-foreground/40">{'  ·  '}</Text> : null}
            <Text className="font-mono-semibold text-foreground">{value}</Text>
            <Text className="text-muted-foreground"> {unit}</Text>
          </Text>
        ))}
      </View>

      <View className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <View className="h-full rounded-full bg-brand" style={{ width: `${completion.completionPct}%` }} />
      </View>

      {feedbackSubmitted ? (
        <View className="mt-5 flex-row items-center gap-2 border-t border-border/50 pt-4">
          <Feather name="check" size={14} color="#157f3c" />
          <Text className="font-mono text-[11px] uppercase tracking-[1.5px] text-muted-foreground">
            Feedback sent{coachFirst ? ` to ${coachFirst}` : ''}
          </Text>
        </View>
      ) : (
        <View className="mt-5 border-t border-border/50 pt-5">
          <Text className="mb-3 font-mono text-[11px] uppercase tracking-[1.8px] text-muted-foreground">How did that feel?</Text>
          <EffortPicker value={selected} onPick={setSelected} />

          {selected && !showNotes ? (
            <Pressable onPress={() => setShowNotes(true)} className="mt-1 min-h-[44px] justify-center self-start">
              <Eyebrow>Add a note (optional)</Eyebrow>
            </Pressable>
          ) : null}

          {showNotes ? (
            <TextInput
              className="mt-3 min-h-[60px] rounded-md border border-input bg-background px-3 py-2 font-sans text-base text-foreground"
              placeholder="Felt strong on the last set"
              placeholderTextColor="#737373"
              value={notes}
              onChangeText={setNotes}
              multiline
              textAlignVertical="top"
              accessibilityLabel="Note for your coach"
            />
          ) : null}

          {selected ? (
            <Button
              variant="primary"
              className="mt-3 h-11"
              onPress={() => onSubmitFeedback(selected, notes.trim() || undefined)}
              loading={isSubmittingFeedback}
            >
              {`Send to ${coachFirst ?? 'coach'}`}
            </Button>
          ) : null}
        </View>
      )}
    </Card>
  );
}
