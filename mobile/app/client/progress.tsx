import { useMemo } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSWRConfig } from 'swr';
import type { WorkoutPlan } from '@logbook/shared/types';
import { apiPlanToWorkoutPlan, apiProgressToWorkoutCompletions } from '@logbook/shared/adapters/api';
import { DEFAULT_WORKOUTS_PER_WEEK } from '@logbook/shared/workout-helpers';
import { getWeekVerdict, weeksOnTargetStreak } from '@logbook/shared/progress';
import { formatBestDelta, formatBestValue, formatBestWhen, summarizePersonalBests } from '@logbook/shared/personal-bests';
import { formatTrainingTime } from '@logbook/shared/plan-summary';
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
  const target = plan?.workoutsPerWeek || DEFAULT_WORKOUTS_PER_WEEK;
  const verdict = useMemo(() => getWeekVerdict(completions, target), [completions, target]);
  // Same shared helpers as the web's ProgressHistory, so both say the same thing
  const bests = useMemo(() => summarizePersonalBests(progress?.personalBests ?? [], plan?.id ?? null), [progress, plan]);
  const weeksOnTarget = useMemo(() => weeksOnTargetStreak(completions, target), [completions, target]);
  // All-time from the server, like the Workouts tile beside it; the history sum is the older-server fallback
  const trainedSec =
    progress?.stats.totalDurationSec ?? completions.reduce((sum, c) => sum + (c.status === 'COMPLETED' ? c.durationSec ?? 0 : 0), 0);
  const [trainedValue, trainedUnit] = formatTrainingTime(trainedSec);
  const tiles: [string, string][] = [
    [String(progress?.stats.totalWorkouts ?? 0), 'Workouts'],
    [trainedSec >= 60 ? `${trainedValue}${trainedUnit === 'h' ? 'h' : 'm'}` : '—', 'Trained'],
    [`${weeksOnTarget} ${weeksOnTarget === 1 ? 'wk' : 'wks'}`, 'On target'],
  ];

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
        {/* Personal bests — the count up top, then one line per latest best */}
        <View className="rounded-2xl border border-border/70 bg-card" accessibilityLabel="Personal bests">
          <View className="flex-row items-center justify-between gap-4 px-4 pb-3.5 pt-4">
            <View className="flex-1">
              <Eyebrow>Personal bests this block</Eyebrow>
              {bests.count > 0 ? (
                <View className="mt-1.5 flex-row items-baseline gap-2">
                  <Text className="font-sans-bold text-[32px] leading-[36px] tracking-tight text-foreground">{bests.count}</Text>
                  <Text className="flex-1 font-sans text-sm text-muted-foreground">
                    across {bests.exercises} {bests.exercises === 1 ? 'lift' : 'lifts'}
                    {bests.thisWeek > 0 ? ` · ${bests.thisWeek} this week` : ''}
                  </Text>
                </View>
              ) : (
                <Text className="mt-1.5 font-sans text-sm leading-5 text-muted-foreground">
                  None yet. Beat your last weight or reps on a lift and it shows up here.
                </Text>
              )}
            </View>
            <View className={`h-9 w-9 items-center justify-center rounded-full ${bests.count > 0 ? 'bg-brand' : 'bg-muted'}`}>
              <Feather name="award" size={16} color={bests.count > 0 ? '#1e2702' : '#737373'} />
            </View>
          </View>
          {bests.latest.length > 0 ? (
            <View className="border-t border-border/60" accessibilityLabel="Latest bests">
              {bests.latest.map((b, i) => (
                <View
                  key={`${b.completionId}-${b.exerciseId}`}
                  className={`flex-row items-baseline gap-3 px-4 py-2.5 ${i > 0 ? 'border-t border-border/40' : ''}`}
                >
                  <Text className="flex-1 font-sans-semibold text-sm tracking-tight text-foreground" numberOfLines={1}>{b.exerciseName}</Text>
                  <Text className="font-mono text-[11px] text-muted-foreground">{formatBestWhen(b.completedAt)}</Text>
                  <Text className="font-mono-semibold text-[13px] text-foreground">{formatBestValue(b)}</Text>
                  <Text className="w-12 text-right font-mono text-xs text-success-text">{formatBestDelta(b)}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

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

        <View className="flex-row gap-2">
          {tiles.map(([value, label]) => (
            <View key={label} className="flex-1 items-center rounded-xl bg-muted/40 px-3 py-4">
              <Text className="font-mono-bold text-xl leading-6 text-foreground">{value}</Text>
              <Eyebrow className="mt-2">{label}</Eyebrow>
            </View>
          ))}
        </View>

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
