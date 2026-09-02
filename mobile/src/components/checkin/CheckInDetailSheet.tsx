import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { endOfDay, format, startOfDay, subDays } from 'date-fns';
import type { CheckIn, WorkoutCompletion, WorkoutPlan } from '@logbook/shared/types';
import { FEELING_DISPLAY } from '@logbook/shared/feeling-display';
import { DEFAULT_WORKOUTS_PER_WEEK } from '@logbook/shared/workout-helpers';
import { Eyebrow } from '@/components/ui';

interface CheckInDetailSheetProps {
  checkIn: CheckIn | null;
  visible: boolean;
  onClose: () => void;
  completedWorkouts: WorkoutCompletion[];
  plan?: WorkoutPlan | null;
}

const TONE_TEXT: Record<string, string> = {
  'text-success-text': 'text-success-text',
  'text-foreground': 'text-foreground',
  'text-warning-text': 'text-warning-text',
  'text-destructive': 'text-destructive',
};

function SectionTitle({ children }: { children: string }) {
  return <Text className="mb-3 font-sans-bold text-[11px] uppercase tracking-[1.3px] text-muted-foreground">{children}</Text>;
}

/** Full detail of one check-in — the web's CheckInDetailModal. */
export function CheckInDetailSheet({ checkIn, visible, onClose, completedWorkouts, plan }: CheckInDetailSheetProps) {
  const insets = useSafeAreaInsets();
  if (!checkIn) return null;

  const date = format(new Date(checkIn.completedAt || checkIn.date), 'MMMM d, yyyy');
  const workoutFeeling = checkIn.workoutFeeling ? FEELING_DISPLAY[checkIn.workoutFeeling] : null;
  const bodyFeeling = checkIn.bodyFeeling ? FEELING_DISPLAY[checkIn.bodyFeeling] : null;

  // Workouts completed in the 7 days ending on the check-in day
  const checkInDate = new Date(checkIn.date);
  const windowEnd = endOfDay(checkInDate);
  const windowStart = startOfDay(subDays(checkInDate, 6));
  const weekWorkouts = completedWorkouts
    .filter((w) => {
      if (w.clientId !== checkIn.clientId) return false;
      if (w.status !== 'COMPLETED' || !w.completedAt) return false;
      const d = new Date(w.completedAt);
      return d >= windowStart && d <= windowEnd;
    })
    .sort((a, b) => new Date(a.completedAt!).getTime() - new Date(b.completedAt!).getTime());

  const workoutName = (dayId: string): string => {
    for (const week of plan?.weeks ?? []) {
      const day = week.days.find((d) => d.id === dayId);
      if (day) return day.name;
    }
    return 'Workout';
  };
  const totalExpected = plan?.workoutsPerWeek || DEFAULT_WORKOUTS_PER_WEEK;
  const completed = new Set(weekWorkouts.map((w) => `${w.planId}-${w.weekId}-${w.dayId}`)).size;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View className="flex-1 bg-background">
        <View className="flex-row items-start justify-between border-b border-border px-5 pb-4 pt-5">
          <View>
            <Eyebrow className="mb-0.5">Check-in</Eyebrow>
            <Text className="font-sans-bold text-lg tracking-tight text-foreground">{date}</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
            <Feather name="x" size={20} color="#737373" />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24 }}>
          <View className="gap-6">
            <View>
              <SectionTitle>What you said</SectionTitle>
              <View className="gap-3">
                {workoutFeeling ? (
                  <View className="flex-row justify-between">
                    <Text className="font-sans text-sm text-muted-foreground">Workouts felt</Text>
                    <Text className={`font-sans-bold text-sm ${TONE_TEXT[workoutFeeling.text] ?? 'text-foreground'}`}>
                      {workoutFeeling.emoji} {workoutFeeling.label}
                    </Text>
                  </View>
                ) : null}
                {bodyFeeling ? (
                  <View className="flex-row justify-between">
                    <Text className="font-sans text-sm text-muted-foreground">Body feels</Text>
                    <Text className={`font-sans-bold text-sm ${TONE_TEXT[bodyFeeling.text] ?? 'text-foreground'}`}>
                      {bodyFeeling.emoji} {bodyFeeling.label}
                    </Text>
                  </View>
                ) : null}
                {checkIn.clientNotes ? (
                  <View className="rounded-lg bg-muted/50 p-3">
                    <Text className="font-sans text-sm italic text-foreground">“{checkIn.clientNotes}”</Text>
                  </View>
                ) : null}
              </View>
            </View>

            <View className="h-px bg-border" />

            <View>
              <SectionTitle>Your coach's feedback</SectionTitle>
              {checkIn.coachResponse ? (
                <View className="gap-3">
                  <View className="rounded-xl border-l-2 border-brand bg-muted/40 px-4 py-4">
                    <Text className="font-sans text-sm leading-5 text-foreground/80">{checkIn.coachResponse}</Text>
                  </View>
                  {checkIn.planAdjustment ? (
                    <View className="flex-row items-center gap-2">
                      <Feather name="check-square" size={16} color="#21c45d" />
                      <Text className="font-sans-medium text-sm text-success-text">Your coach is adjusting your plan based on this check-in</Text>
                    </View>
                  ) : null}
                </View>
              ) : (
                <Text className="font-sans text-sm text-muted-foreground">Your coach will respond soon!</Text>
              )}
            </View>

            <View className="h-px bg-border" />

            <View>
              <SectionTitle>That week's workouts</SectionTitle>
              {weekWorkouts.length > 0 ? (
                <View className="gap-2">
                  {weekWorkouts.map((w) => (
                    <View key={w.id} className="flex-row items-center gap-2">
                      <Feather name="check-circle" size={16} color="#21c45d" />
                      <Text className="font-sans text-sm text-foreground">{workoutName(w.dayId)}</Text>
                      <Text className="font-sans text-xs text-muted-foreground">({format(new Date(w.completedAt!), 'MMM d')})</Text>
                    </View>
                  ))}
                  <View className="mt-3 border-t border-border pt-3">
                    {completed >= totalExpected ? (
                      <Text className="font-sans-medium text-sm text-success-text">
                        Target hit — {completed} workout{completed === 1 ? '' : 's'} against a target of {totalExpected}
                      </Text>
                    ) : (
                      <Text className="font-sans-medium text-sm text-foreground">
                        You completed {completed} out of {totalExpected} workouts
                      </Text>
                    )}
                  </View>
                </View>
              ) : (
                <Text className="font-sans text-sm text-muted-foreground">No workouts logged that week.</Text>
              )}
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
