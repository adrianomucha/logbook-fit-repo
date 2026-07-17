import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { WorkoutPlan, WorkoutCompletion, Client } from '@/types';
import {
  getWeekDays,
  getWeekProgress,
  WeekDayInfo,
} from '@/lib/workout-week-helpers';
import { WeekHeader } from './WeekHeader';
import { WeekProgressStrip } from './WeekProgressStrip';
import { DayCardGrid } from './DayCardGrid';

interface WeeklyOverviewProps {
  client: Client;
  plan: WorkoutPlan;
  /** Server-computed current week number (from week-overview) — the single
   *  source of truth. Recomputing it client-side can disagree across timezones. */
  currentWeekNumber: number;
  completions: WorkoutCompletion[];
}

export function WeeklyOverview({
  client,
  plan,
  currentWeekNumber,
  completions,
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

  // Calculate progress
  const progress = useMemo(() => {
    const base = getWeekProgress(weekDays);
    const remaining = weekDays.filter((d) => d.status !== 'COMPLETED').length;
    return { ...base, remaining };
  }, [weekDays]);

  // Handle day card click
  const handleDayClick = (day: WeekDayInfo) => {
    if (day.isInteractive && day.workoutDay && currentWeek) {
      router.push(`/client/workout/${currentWeek.id}/${day.workoutDay.id}`);
    }
  };

  // Empty state — the plan has no week built for the current week number
  if (!currentWeek) {
    return (
      <div className="text-center py-12">
        <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground font-medium mb-2">
          Week {currentWeekNumber}
        </p>
        <h3 className="font-bold text-lg tracking-tight mb-1">
          This week isn&apos;t set up yet
        </h3>
        <p className="text-sm text-muted-foreground">
          Your coach hasn&apos;t built this week of your plan yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <WeekHeader plan={plan} currentWeek={currentWeekNumber} />

      <WeekProgressStrip
        completed={progress.completed}
        total={progress.total}
        remaining={progress.remaining}
      />

      <DayCardGrid days={weekDays} onDayClick={handleDayClick} />
    </div>
  );
}
