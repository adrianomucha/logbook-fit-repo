import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { WorkoutPlan } from '@logbook/shared/types';
import { apiPlanToWorkoutPlan, apiProgressToWorkoutCompletions } from '@logbook/shared/adapters/api';
import { DEFAULT_WORKOUTS_PER_WEEK } from '@logbook/shared/workout-helpers';
import { formatStreakLine, getWeekVerdict, weeksTrainedStreak } from '@logbook/shared/progress';
import { formatBestValue, summarizePersonalBests } from '@logbook/shared/personal-bests';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useClientPlan } from '@/hooks/useClientWeek';
import { useClientProgress } from '@/hooks/useCheckIns';
import { Screen } from '@/components/Screen';
import { Eyebrow, LoadingScreen } from '@/components/ui';
import { WorkoutHistory } from '@/components/progress/WorkoutHistory';

const TONE_TEXT = { success: 'text-success-text', warning: 'text-warning-text', neutral: 'text-muted-foreground' } as const;

/** The Progress tab — the web's ProgressHistory. Leaving a coach lives in Settings → Account. */
export default function ProgressScreen() {
  const { weightUnit, isLoading: loadingUser } = useCurrentUser();
  const { plan: planDetail, isLoading: loadingPlan, refresh: refreshPlan } = useClientPlan();
  const { progress, isLoading: loadingProgress, refresh: refreshProgress } = useClientProgress();

  const plan: WorkoutPlan | null = useMemo(() => (planDetail ? apiPlanToWorkoutPlan(planDetail) : null), [planDetail]);
  const completions = useMemo(() => (progress ? apiProgressToWorkoutCompletions(progress.allCompletions) : []), [progress]);
  const target = plan?.workoutsPerWeek || DEFAULT_WORKOUTS_PER_WEEK;
  const verdict = useMemo(() => getWeekVerdict(completions, target), [completions, target]);
  // Same shared helpers as the web's ProgressHistory, so both say the same thing
  const bests = useMemo(() => summarizePersonalBests(progress?.personalBests ?? [], plan?.id ?? null), [progress, plan]);
  // Weeks in a row with a session — see weeksTrainedStreak for why not "weeks on target"
  const streakLine = useMemo(() => formatStreakLine(weeksTrainedStreak(completions)), [completions]);

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

      {/* Kept quiet on purpose: a short list of bests, one number for the week, then the log */}
      <View className="-mt-2 gap-4">
        {/* Personal bests — the lift and what was lifted, nothing else */}
        <View className="rounded-2xl border border-border/70 bg-card" accessibilityLabel="Personal bests">
          <View className="flex-row items-center gap-1.5 px-4 pb-3 pt-3.5">
            <Feather name="award" size={12} color={bests.count > 0 ? '#157f3c' : '#737373'} />
            <Eyebrow>Personal bests this block</Eyebrow>
          </View>
          {bests.count === 0 ? (
            <Text className="-mt-1 px-4 pb-4 font-sans text-sm leading-5 text-muted-foreground">
              None yet. Beat your last weight or reps on a lift and it shows up here.
            </Text>
          ) : (
            <View className="border-t border-border/60" accessibilityLabel="Latest bests">
              {bests.latest.map((b, i) => (
                <View
                  key={`${b.completionId}-${b.exerciseId}`}
                  className={`flex-row items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-border/40' : ''}`}
                >
                  <Text className="flex-1 font-sans-semibold text-[15px] tracking-tight text-foreground" numberOfLines={2}>{b.exerciseName}</Text>
                  <Text className="font-mono-semibold text-[13px] text-foreground">{formatBestValue(b, weightUnit)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View className="rounded-2xl bg-muted/40 p-4">
          <Eyebrow className="mb-2">This week</Eyebrow>
          <View className="flex-row items-baseline gap-1.5">
            <Text className="font-mono-bold text-3xl leading-9 text-foreground">{verdict.completed}</Text>
            <Text className="font-sans text-base text-muted-foreground">of {verdict.target} sessions</Text>
          </View>
          <Text className={`mb-3 mt-1 font-sans-medium text-sm ${TONE_TEXT[verdict.tone]}`}>{verdict.text}</Text>
          <View className="flex-row gap-1.5" accessibilityRole="image" accessibilityLabel={`${verdict.completed} of ${verdict.target} sessions completed this week`}>
            {Array.from({ length: verdict.target }).map((_, i) => (
              <View key={i} className={`h-2 flex-1 rounded-full ${i < verdict.completed ? 'bg-brand' : 'bg-muted-foreground/15'}`} />
            ))}
          </View>
          {streakLine ? <Text className="mt-3 font-sans text-[13px] text-muted-foreground">{streakLine}</Text> : null}
        </View>

        <WorkoutHistory completions={completions} plans={plan ? [plan] : []} personalBests={progress?.personalBests} />
      </View>
    </Screen>
  );
}
