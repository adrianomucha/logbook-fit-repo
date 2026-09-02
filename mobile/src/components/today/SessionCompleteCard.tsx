import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import type { WorkoutCompletion } from '@logbook/shared/types';
import { parseSessionName } from '@logbook/shared/parse-session-name';
import { BoldCheck, Button, Card, Eyebrow } from '@/components/ui';

type EffortRating = 'EASY' | 'MEDIUM' | 'HARD';

// Selected states reuse the app's effort colour semantics (check-in form,
// workout history): easy = success, medium = neutral, hard = warning.
const EFFORT_OPTIONS: { value: EffortRating; label: string; shell: string; text: string }[] = [
  { value: 'EASY', label: 'Easy', shell: 'border-success/40 bg-success/10', text: 'text-success-text' },
  { value: 'MEDIUM', label: 'Medium', shell: 'border-foreground/25 bg-muted', text: 'text-foreground' },
  { value: 'HARD', label: 'Hard', shell: 'border-warning/40 bg-warning/10', text: 'text-warning-text' },
];

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
          <Eyebrow>{day ? `Session complete · Day ${day}` : 'Session complete'}</Eyebrow>
          <Text className="mt-2.5 font-sans-bold text-[26px] leading-[30px] text-foreground" style={{ letterSpacing: -0.65 }}>{title}</Text>
          {subtitle ? <Text className="mt-1.5 font-sans text-[15px] text-muted-foreground">{subtitle}</Text> : null}
        </View>
        <View className="h-11 w-11 items-center justify-center rounded-full bg-brand">
          <BoldCheck size={20} color="#1e2702" />
        </View>
      </View>

      <View className="mt-4 flex-row items-baseline border-t border-border/50 pt-4">
        {stats.map(([value, unit], i) => (
          <Text key={unit} className="font-mono text-[13px]">
            {i > 0 ? <Text className="text-muted-foreground/40">{'\u2002·\u2002'}</Text> : null}
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
          <BoldCheck size={14} color="#157f3c" strokeWidth={3} />
          <Text className="font-mono text-[11px] uppercase tracking-[1.5px] text-muted-foreground">
            Feedback sent{coachFirst ? ` to ${coachFirst}` : ''}
          </Text>
        </View>
      ) : (
        <View className="mt-5 border-t border-border/50 pt-5">
          <Text className="mb-3 font-mono text-[11px] uppercase tracking-[1.8px] text-muted-foreground">How did that feel?</Text>
          <View accessibilityRole="radiogroup" accessibilityLabel="How did that feel?" className="flex-row gap-2.5">
            {EFFORT_OPTIONS.map((option) => {
              const isSelected = selected === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isSelected }}
                  onPress={() => setSelected(option.value)}
                  className={`min-h-[52px] flex-1 items-center justify-center rounded-lg border-2 px-2 py-3.5 active:opacity-80 ${
                    isSelected ? option.shell : 'border-transparent bg-muted/50'
                  }`}
                >
                  <Text className={`font-sans-bold text-sm uppercase tracking-[0.35px] ${isSelected ? option.text : 'text-muted-foreground'}`}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {selected && !showNotes ? (
            <Pressable onPress={() => setShowNotes(true)} className="mt-1 min-h-[44px] justify-center self-start">
              <Text className="font-sans text-xs text-muted-foreground underline">Add a note (optional)</Text>
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
              className="mt-3 h-10"
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
