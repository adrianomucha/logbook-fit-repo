import { useMemo } from 'react';
import { Text, View } from 'react-native';
import type { WorkoutPlan } from '@logbook/shared/types';
import { apiCheckInToCheckIn, apiPlanToWorkoutPlan, apiProgressToWorkoutCompletions } from '@logbook/shared/adapters/api';
import { DEFAULT_WORKOUTS_PER_WEEK } from '@logbook/shared/workout-helpers';
import { buildProgressStory, describeThisWeek, nextWorkoutName } from '@logbook/shared/progress';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useClientPlan, useClientWeekOverview } from '@/hooks/useClientWeek';
import { useClientCheckIns, useClientProgress } from '@/hooks/useCheckIns';
import { Screen } from '@/components/Screen';
import { Eyebrow, LoadingScreen } from '@/components/ui';
import { ProgressStory, WeekCircles } from '@/components/progress/ProgressStory';

/**
 * The Progress tab, the web's ProgressHistory. This week as circles and a
 * sentence that ends on the next workout, then the story: only the moments
 * worth noticing. Leaving a coach lives in Settings → Account.
 */
export default function ProgressScreen() {
  const { weightUnit, coach, clientProfileId, isLoading: loadingUser } = useCurrentUser();
  const { plan: planDetail, isLoading: loadingPlan, refresh: refreshPlan } = useClientPlan();
  const { weekOverview, refresh: refreshWeek } = useClientWeekOverview();
  const { progress, isLoading: loadingProgress, refresh: refreshProgress } = useClientProgress();
  const { checkIns: apiCheckIns, refresh: refreshCheckIns } = useClientCheckIns();

  const plan: WorkoutPlan | null = useMemo(() => (planDetail ? apiPlanToWorkoutPlan(planDetail) : null), [planDetail]);
  const completions = useMemo(() => (progress ? apiProgressToWorkoutCompletions(progress.allCompletions) : []), [progress]);
  const checkIns = useMemo(
    () => apiCheckIns.map((ci) => apiCheckInToCheckIn(ci, clientProfileId ?? '', coach?.user.id ?? '')),
    [apiCheckIns, clientProfileId, coach]
  );

  // Same shared helpers as the web's ProgressHistory, so both tell the same story
  const target = plan?.workoutsPerWeek || DEFAULT_WORKOUTS_PER_WEEK;
  const week = useMemo(
    () => describeThisWeek(completions, target, nextWorkoutName(plan, weekOverview?.weekNumber ?? null, completions)),
    [completions, target, plan, weekOverview]
  );
  const moments = useMemo(
    () =>
      buildProgressStory({
        completions,
        plans: plan ? [plan] : [],
        personalBests: progress?.personalBests,
        checkIns,
        coachName: coach?.user.name,
        weightUnit,
      }),
    [completions, plan, progress, checkIns, coach, weightUnit]
  );

  if (loadingUser || (!progress && loadingProgress) || (!planDetail && loadingPlan)) return <LoadingScreen />;

  return (
    <Screen
      withHeader
      onRefresh={() => {
        void refreshProgress();
        void refreshPlan();
        void refreshWeek();
        void refreshCheckIns();
      }}
      refreshing={false}
    >
      <View className="py-4">
        <Eyebrow className="mb-1">Progress</Eyebrow>
        <Text className="font-sans-bold text-2xl tracking-tight text-foreground">This week</Text>
      </View>

      <WeekCircles week={week} />
      <Text className="mt-4 font-sans-bold text-[22px] leading-7 tracking-tight text-foreground">
        {week.lead} <Text className="font-sans-medium text-muted-foreground">{week.rest}</Text>
      </Text>

      <View className="mt-8">
        <ProgressStory moments={moments} />
      </View>
    </Screen>
  );
}
