import { useMemo } from 'react';
import { Text, View } from 'react-native';
import type { WorkoutPlan } from '@logbook/shared/types';
import { apiCheckInToCheckIn, apiPlanToWorkoutPlan, apiProgressToWorkoutCompletions } from '@logbook/shared/adapters/api';
import { DEFAULT_WORKOUTS_PER_WEEK } from '@logbook/shared/workout-helpers';
import { buildProgressLog, describeThisWeek } from '@logbook/shared/progress';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useClientPlan, useClientWeekOverview } from '@/hooks/useClientWeek';
import { useClientCheckIns, useClientProgress } from '@/hooks/useCheckIns';
import { Screen } from '@/components/Screen';
import { EmptyState, Eyebrow, LoadingScreen } from '@/components/ui';
import { PROGRESS_BEFORE_PLAN_COPY } from '@logbook/shared/client-empty-states';
import { ProgressLog, WeekCircles } from '@/components/progress/ProgressLog';

/**
 * The Progress tab, the web's ProgressHistory. This week as circles and a
 * sentence that ends on the next workout, then the log: week by week, every
 * workout with its wins. Leaving a coach lives in Settings → Account.
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

  // Same shared helpers as the web's ProgressHistory, so both say the same thing
  const target = plan?.workoutsPerWeek || DEFAULT_WORKOUTS_PER_WEEK;
  // Once the plan has ended the week overview stays on its final week; that isn't this week
  const weekNumber = weekOverview && !weekOverview.planEnded ? weekOverview.weekNumber : null;
  // A workout started but not finished (the progress history only holds finished ones)
  const startedDayId = weekNumber != null ? weekOverview?.days.find((d) => d.status === 'IN_PROGRESS')?.dayId ?? null : null;
  const week = useMemo(
    () => describeThisWeek({ plan, weekNumber, completions, target, startedDayId }),
    [completions, target, plan, weekNumber, startedDayId]
  );
  const weeks = useMemo(
    () =>
      buildProgressLog({
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

      {!planDetail && !completions.some((c) => c.status === 'COMPLETED') ? (
        // Nothing to show before the first workout; a client whose plan was
        // unassigned still sees their history. The web does the same.
        <EmptyState
          fill
          art={PROGRESS_BEFORE_PLAN_COPY.art}
          title={PROGRESS_BEFORE_PLAN_COPY.title}
          tail={PROGRESS_BEFORE_PLAN_COPY.tail}
        />
      ) : (
        <>
          <WeekCircles week={week} />
          <Text className="mt-4 font-sans-bold text-[22px] leading-7 tracking-tight text-foreground">
            {week.lead} <Text className="font-sans-medium text-muted-foreground">{week.rest}</Text>
          </Text>

          <View className="mt-10">
            <ProgressLog weeks={weeks} />
          </View>
        </>
      )}
    </Screen>
  );
}
