import { useMemo } from 'react';
import { Text, View } from 'react-native';
import type { WorkoutPlan } from '@logbook/shared/types';
import { apiCheckInToCheckIn, apiPlanToWorkoutPlan, apiProgressToWorkoutCompletions } from '@logbook/shared/adapters/api';
import { DEFAULT_WORKOUTS_PER_WEEK } from '@logbook/shared/workout-helpers';
import { buildProgressStory, describeThisWeek } from '@logbook/shared/progress';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useClientPlan, useClientWeekOverview } from '@/hooks/useClientWeek';
import { useClientCheckIns, useClientProgress } from '@/hooks/useCheckIns';
import { Screen } from '@/components/Screen';
import { EmptyState, Eyebrow, LoadingScreen } from '@/components/ui';
import { PROGRESS_BEFORE_PLAN_COPY } from '@logbook/shared/client-empty-states';
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
  // Once the plan has ended the week overview stays on its final week; that isn't this week
  const weekNumber = weekOverview && !weekOverview.planEnded ? weekOverview.weekNumber : null;
  // A workout started but not finished (the progress history only holds finished ones)
  const startedDayId = weekNumber != null ? weekOverview?.days.find((d) => d.status === 'IN_PROGRESS')?.dayId ?? null : null;
  const week = useMemo(
    () => describeThisWeek({ plan, weekNumber, completions, target, startedDayId }),
    [completions, target, plan, weekNumber, startedDayId]
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
        totalWorkouts: progress?.stats.totalWorkouts,
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
        <Eyebrow className="mb-1">Your training</Eyebrow>
        <Text className="font-sans-bold text-2xl tracking-tight text-foreground">Progress</Text>
      </View>

      {!planDetail ? (
        // Nothing to show before the first plan; the web says the same
        <EmptyState title={PROGRESS_BEFORE_PLAN_COPY.title} body={PROGRESS_BEFORE_PLAN_COPY.body} />
      ) : (
        <>
          <WeekCircles week={week} />
          <Text className="mt-4 font-sans-bold text-[22px] leading-7 tracking-tight text-foreground">
            {week.lead} <Text className="font-sans-medium text-muted-foreground">{week.rest}</Text>
          </Text>

          <View className="mt-8">
            <ProgressStory moments={moments} />
          </View>
        </>
      )}
    </Screen>
  );
}
