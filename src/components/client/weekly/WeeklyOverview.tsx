import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { WorkoutPlan, WorkoutCompletion, Client } from '@/types';
import { getWeekDays, WeekDayInfo } from '@/lib/workout-week-helpers';
import { WeekHeader } from './WeekHeader';
import { DayCardGrid } from './DayCardGrid';
import { WEEK_NOT_BUILT_COPY } from '@logbook/shared/client-empty-states';
import { StateView } from '@/components/states/StateView';

interface WeeklyOverviewProps {
  client: Client;
  plan: WorkoutPlan;
  /** Server-computed current week number (from week-overview) — the single
   *  source of truth. Recomputing it client-side can disagree across timezones. */
  currentWeekNumber: number;
  completions: WorkoutCompletion[];
  /** Named in the "not set up yet" state, as on Today */
  coachName?: string | null;
}

export function WeeklyOverview({
  client,
  plan,
  currentWeekNumber,
  completions,
  coachName,
}: WeeklyOverviewProps) {
  const router = useRouter();

  // Get the current week data. No fallback to week 1 — showing a different
  // week than the header claims is worse than an honest empty state.
  const currentWeek = useMemo(
    () => plan.weeks.find((w) => w.weekNumber === currentWeekNumber) ?? null,
    [plan.weeks, currentWeekNumber]
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

  // Empty state — the plan has no week built for the current week number
  if (!currentWeek) {
    return (
      <StateView
        fill
        as="h3"
        art={WEEK_NOT_BUILT_COPY.art}
        title={WEEK_NOT_BUILT_COPY.title}
        tail={WEEK_NOT_BUILT_COPY.tail(coachName)}
      />
    );
  }

  return (
    <div className="space-y-5">
      <WeekHeader plan={plan} currentWeek={currentWeekNumber} />

      {/* No progress bar here: the checklist shows what's done, and the
          Progress tab's stepper is the one place the week is counted */}
      <DayCardGrid days={weekDays} onDayClick={handleDayClick} />
    </div>
  );
}
