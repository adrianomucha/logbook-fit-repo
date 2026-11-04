import { useMemo } from 'react';
import { WorkoutPlan, WorkoutCompletion, CheckIn } from '@/types';
import { DEFAULT_WORKOUTS_PER_WEEK } from '@/lib/workout-helpers';
import { ProgressLog, WeekCircles } from './progress/ProgressLog';
import { buildProgressLog, describeThisWeek } from '@logbook/shared/progress';
import type { PersonalBest } from '@logbook/shared/personal-bests';
import { useCurrentUser } from '@/hooks/useCurrentUser';

interface ProgressHistoryProps {
  plans: WorkoutPlan[];
  /** Null when no plan is assigned (yet, or any more): the history still shows */
  plan: WorkoutPlan | null;
  workoutCompletions: WorkoutCompletion[];
  /** Every personal best in the history, newest first (from the progress API) */
  personalBests?: PersonalBest[];
  /** The coach's replies show in the week they came */
  checkIns: CheckIn[];
  coachName?: string | null;
  /** All-time finished workouts; the completions only reach back a year */
  totalWorkouts?: number;
  /** The plan week it is now (the week overview's); null once the plan has ended */
  weekNumber: number | null;
  /** A workout of this week started but not finished */
  startedDayId?: string | null;
}

/**
 * The Progress tab: this week as circles and a sentence that ends on the
 * next workout, then the log: week by week, every workout with its wins.
 * The shared helpers keep the wording identical to the app.
 */
export function ProgressHistory({
  plans,
  plan,
  workoutCompletions,
  personalBests,
  checkIns,
  coachName,
  totalWorkouts,
  weekNumber,
  startedDayId,
}: ProgressHistoryProps) {
  const target = plan?.workoutsPerWeek || DEFAULT_WORKOUTS_PER_WEEK;
  const { weightUnit } = useCurrentUser();
  const week = useMemo(
    () => describeThisWeek({ plan, weekNumber, completions: workoutCompletions, target, startedDayId }),
    [workoutCompletions, target, plan, weekNumber, startedDayId]
  );
  const weeks = useMemo(
    () =>
      buildProgressLog({ completions: workoutCompletions, plans, personalBests, checkIns, coachName, weightUnit, totalWorkouts }),
    [workoutCompletions, plans, personalBests, checkIns, coachName, weightUnit, totalWorkouts]
  );

  return (
    <div className="animate-fade-in-up">
      <WeekCircles week={week} />
      <p className="mt-4 text-[22px] leading-7 font-bold tracking-tight">
        {week.lead} <span className="font-medium text-muted-foreground">{week.rest}</span>
      </p>
      <div className="mt-10">
        <ProgressLog weeks={weeks} />
      </div>
    </div>
  );
}
