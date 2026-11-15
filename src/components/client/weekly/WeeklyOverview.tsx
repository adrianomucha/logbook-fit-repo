import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WorkoutPlan, WorkoutCompletion, Client } from '@/types';
import {
  getWeekDays,
  unfinishedInEarlierWeeks,
  WeekDayInfo,
  weekStep,
  WEEK_STEP_COPY,
} from '@logbook/shared/workout-week-helpers';
import { WeekHeader } from './WeekHeader';
import { DayCardGrid } from './DayCardGrid';
import { WEEK_NOT_BUILT_COPY } from '@logbook/shared/client-empty-states';
import { StateView } from '@/components/states/StateView';
import { Button } from '@/components/ui/button';

interface WeeklyOverviewProps {
  client: Client;
  plan: WorkoutPlan;
  /** Server-computed current week number (from week-overview) — the single
   *  source of truth. Recomputing it client-side can disagree across timezones. */
  currentWeekNumber: number;
  completions: WorkoutCompletion[];
  /**
   * False until the client's full history has loaded. Earlier weeks stay
   * closed until then: without it every past workout would look undone.
   */
  historyReady?: boolean;
  /** Named in the "not set up yet" state, as on Today */
  coachName?: string | null;
  /** The way out of a week that isn't built: ask the coach */
  onMessageCoach?: () => void;
}

export function WeeklyOverview({
  client,
  plan,
  currentWeekNumber,
  completions,
  historyReady = true,
  coachName,
  onMessageCoach,
}: WeeklyOverviewProps) {
  const router = useRouter();

  // The week on screen. Starts on the current one; the client can step back
  // to finish a workout an earlier week left open.
  const [viewedWeek, setViewedWeek] = useState(currentWeekNumber);
  useEffect(() => setViewedWeek(currentWeekNumber), [currentWeekNumber]);
  const step = weekStep(viewedWeek, currentWeekNumber, historyReady);

  // Get the viewed week's data. No fallback to week 1: showing a different
  // week than the header claims is worse than an honest empty state.
  const currentWeek = useMemo(
    () => plan.weeks.find((w) => w.weekNumber === step.viewed) ?? null,
    [plan.weeks, step.viewed]
  );

  // Work left behind, pointed at from the current week
  const leftBehind = useMemo(
    () => (historyReady ? unfinishedInEarlierWeeks(plan.weeks, completions, client.id, currentWeekNumber) : null),
    [plan.weeks, completions, client.id, currentWeekNumber, historyReady]
  );

  // Get this week's workouts as an ordered checklist
  const weekDays = useMemo(() => {
    if (!currentWeek) {
      return [];
    }
    return getWeekDays(currentWeek, completions, client.id);
  }, [currentWeek, completions, client.id]);

  // Handle day card click
  const handleDayClick = (day: WeekDayInfo) => {
    if (day.isInteractive && day.workoutDay && currentWeek) {
      router.push(`/client/workout/${currentWeek.id}/${day.workoutDay.id}`);
    }
  };

  // Empty state: the plan has no week built for the current week number
  if (!currentWeek && !step.isEarlier) {
    return (
      <StateView
        fill
        as="h3"
        art={WEEK_NOT_BUILT_COPY.art}
        title={WEEK_NOT_BUILT_COPY.title}
        tail={WEEK_NOT_BUILT_COPY.tail(coachName)}
      >
        {onMessageCoach && (
          <Button onClick={onMessageCoach}>
            {WEEK_NOT_BUILT_COPY.message(coachName)}
          </Button>
        )}
      </StateView>
    );
  }

  return (
    <div className="space-y-5">
      <WeekHeader plan={plan} step={step} onStep={setViewedWeek} />

      {/* No progress bar here: the checklist shows what's done, and the
          Progress tab's stepper is the one place the week is counted */}
      <DayCardGrid days={weekDays} onDayClick={handleDayClick} />

      {step.isEarlier ? (
        <button
          type="button"
          onClick={() => setViewedWeek(currentWeekNumber)}
          className="text-sm font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors tap-target"
        >
          {WEEK_STEP_COPY.backToCurrent}
        </button>
      ) : leftBehind ? (
        <button
          type="button"
          onClick={() => setViewedWeek(leftBehind.weekNumber)}
          className="text-sm font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors tap-target"
        >
          {WEEK_STEP_COPY.unfinished(leftBehind.count)}
        </button>
      ) : null}
    </div>
  );
}
