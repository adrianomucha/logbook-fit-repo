import { useMemo } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSWRConfig } from 'swr';
import type { WorkoutPlan } from '@logbook/shared/types';
import { apiPlanToWorkoutPlan, apiProgressToWorkoutCompletions } from '@logbook/shared/adapters/api';
import { DEFAULT_WORKOUTS_PER_WEEK } from '@logbook/shared/workout-helpers';
import { getWeekVerdict } from '@logbook/shared/progress';
import { apiFetch } from '@/lib/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useClientPlan } from '@/hooks/useClientWeek';
import { useClientProgress } from '@/hooks/useCheckIns';
import { Screen } from '@/components/Screen';
import { Eyebrow, LoadingScreen } from '@/components/ui';
import { WorkoutHistory } from '@/components/progress/WorkoutHistory';

const TONE_TEXT = { success: 'text-success-text', warning: 'text-warning-text', neutral: 'text-muted-foreground' } as const;

/** The Progress tab — the web's ProgressHistory plus the coaching membership card. */
export default function ProgressScreen() {
  const { mutate } = useSWRConfig();
  const { coach, isLoading: loadingUser } = useCurrentUser();
  const { plan: planDetail, isLoading: loadingPlan, refresh: refreshPlan } = useClientPlan();
  const { progress, isLoading: loadingProgress, refresh: refreshProgress } = useClientProgress();

  const plan: WorkoutPlan | null = useMemo(() => (planDetail ? apiPlanToWorkoutPlan(planDetail) : null), [planDetail]);
  const completions = useMemo(() => (progress ? apiProgressToWorkoutCompletions(progress.allCompletions) : []), [progress]);
  const verdict = useMemo(() => getWeekVerdict(completions, plan?.workoutsPerWeek || DEFAULT_WORKOUTS_PER_WEEK), [completions, plan]);

  const leaveCoach = () => {
    Alert.alert('Leave your coach?', `You'll stop training with ${coach?.user.name ?? 'your coach'}. Your assigned plan is removed and messaging closes for both of you. Your workout history stays on your account.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave coach',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiFetch('/api/client/coach', { method: 'DELETE' });
            await mutate('/api/me');
          } catch {
            Alert.alert("Couldn't leave your coach", 'Please try again.');
          }
        },
      },
    ]);
  };

  if (loadingUser || (!progress && loadingProgress) || (!planDetail && loadingPlan)) return <LoadingScreen />;

  return (
    <Screen
      withHeader
      onRefresh={() => {
        void refreshProgress();
        void refreshPlan();
      }}
      refreshing={false}
    >
      <View className="py-4">
        <Eyebrow className="mb-1">History</Eyebrow>
        <Text className="font-sans-bold text-2xl tracking-tight text-foreground">Progress</Text>
      </View>

      <View className="-mt-2 gap-4">
        <View className="rounded-xl bg-muted/40 p-4">
          <View className="mb-3 flex-row items-center justify-between gap-3">
            <Eyebrow>This week</Eyebrow>
            <Text className={`shrink text-right font-sans-semibold text-[11px] ${TONE_TEXT[verdict.tone]}`}>{verdict.text}</Text>
          </View>
          <View className="mb-3 flex-row items-baseline gap-1.5">
            <Text className="font-mono-bold text-2xl leading-7 text-foreground">{verdict.completed}</Text>
            <Text className="font-mono-bold text-sm text-muted-foreground">/ {verdict.target}</Text>
            <Eyebrow className="ml-1">sessions</Eyebrow>
          </View>
          <View className="flex-row gap-1.5" accessibilityRole="image" accessibilityLabel={`${verdict.completed} of ${verdict.target} sessions completed this week`}>
            {Array.from({ length: verdict.target }).map((_, i) => (
              <View key={i} className={`h-2.5 flex-1 rounded-full ${i < verdict.completed ? 'bg-brand' : 'bg-muted-foreground/15'}`} />
            ))}
          </View>
        </View>

        {progress ? (
          <View className="flex-row gap-2">
            {[
              [progress.stats.totalWorkouts, 'Total'],
              [progress.stats.currentStreak, 'Streak'],
              [`${Math.round(progress.stats.avgCompletionPct)}%`, 'Avg'],
            ].map(([value, label]) => (
              <View key={String(label)} className="flex-1 items-center rounded-xl bg-muted/40 px-3 py-4">
                <Text className="font-mono-bold text-2xl leading-7 text-foreground">{value}</Text>
                <Eyebrow className="mt-2">{String(label)}</Eyebrow>
              </View>
            ))}
          </View>
        ) : null}

        <WorkoutHistory completions={completions} plans={plan ? [plan] : []} initialCount={10} />

        {coach ? (
          <View className="flex-row items-center justify-between rounded-xl border border-border/70 bg-card px-4 py-3">
            <View className="flex-1">
              <Eyebrow className="mb-0.5">Coaching</Eyebrow>
              <Text className="font-sans-medium text-sm text-foreground" numberOfLines={1}>Coached by {coach.user.name ?? 'your coach'}</Text>
            </View>
            <Pressable onPress={leaveCoach} className="min-h-[36px] flex-row items-center gap-1.5 px-2 active:opacity-70">
              <Feather name="user-minus" size={14} color="#737373" />
              <Text className="font-sans-medium text-sm text-muted-foreground">Leave coach</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
