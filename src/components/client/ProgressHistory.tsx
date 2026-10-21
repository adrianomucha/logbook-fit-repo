import { useMemo } from 'react';
import { WorkoutPlan, WorkoutCompletion, CheckIn } from '@/types';
import { DEFAULT_WORKOUTS_PER_WEEK } from '@/lib/workout-helpers';
import { ProgressStory, WeekCircles } from './progress/ProgressStory';
import { buildProgressStory, describeThisWeek, nextWorkoutName } from '@logbook/shared/progress';
import type { PersonalBest } from '@logbook/shared/personal-bests';
import { useCurrentUser } from '@/hooks/useCurrentUser';

interface ProgressHistoryProps {
  plans: WorkoutPlan[];
  plan: WorkoutPlan;
  workoutCompletions: WorkoutCompletion[];
  /** Every personal best in the history, newest first (from the progress API) */
  personalBests?: PersonalBest[];
  /** The coach's replies become moments in the story */
  checkIns: CheckIn[];
  coachName?: string | null;
  /** The plan week it is now (the week overview's), for "next up" */
  weekNumber: number | null;
}

/**
 * The Progress tab: this week as circles and a sentence that ends on the
 * next workout, then the story — only the moments worth noticing. The
 * shared helpers keep the wording identical to the app.
 */
export function ProgressHistory({
  plans,
  plan,
  workoutCompletions,
  personalBests,
  checkIns,
  coachName,
  weekNumber,
}: ProgressHistoryProps) {
  const target = plan.workoutsPerWeek || DEFAULT_WORKOUTS_PER_WEEK;
  const { weightUnit } = useCurrentUser();
  const week = useMemo(
    () => describeThisWeek(workoutCompletions, target, nextWorkoutName(plan, weekNumber, workoutCompletions)),
    [workoutCompletions, target, plan, weekNumber]
  );
  const moments = useMemo(
    () => buildProgressStory({ completions: workoutCompletions, plans, personalBests, checkIns, coachName, weightUnit }),
    [workoutCompletions, plans, personalBests, checkIns, coachName, weightUnit]
  );

  return (
    <div className="animate-fade-in-up">
      <WeekCircles week={week} />
      <p className="mt-4 text-[22px] leading-7 font-bold tracking-tight">
        {week.lead} <span className="font-medium text-muted-foreground">{week.rest}</span>
      </p>
      <div className="mt-8">
        <ProgressStory moments={moments} />
      </div>
    </div>
  );
}
