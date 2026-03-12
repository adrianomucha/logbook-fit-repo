import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { WorkoutPlan, WorkoutCompletion, Client } from '@/types';
import {
  getCurrentWeekNumber,
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
  completions: WorkoutCompletion[];
}

export function WeeklyOverview({
  client,
  plan,
  completions,
}: WeeklyOverviewProps) {
  const router = useRouter();

  // Calculate current week number
  const currentWeekNumber = useMemo(() => {
    if (!client.planStartDate) {
      return 1;
    }
    return getCurrentWeekNumber(
      client.planStartDate,
      plan.durationWeeks || plan.weeks.length
    );
  }, [client.planStartDate, plan.durationWeeks, plan.weeks.length]);

  // Get the current week data
  const currentWeek = useMemo(() => {
    return (
      plan.weeks.find((w) => w.weekNumber === currentWeekNumber) ||
      plan.weeks[0]
    );
  }, [plan.weeks, currentWeekNumber]);

  // Get the 7 days for this week
  const weekDays = useMemo(() => {
    if (!currentWeek || !client.planStartDate) {
      return [];
    }
    return getWeekDays(
      client.planStartDate,
      currentWeek,
      completions,
      client.id
    );
  }, [currentWeek, client.planStartDate, completions, client.id]);

  // Calculate progress
  const progress = useMemo(() => {
    const base = getWeekProgress(weekDays);
    const remaining = weekDays.filter(
      (d) => d.status === 'TODAY' || d.status === 'UPCOMING'
    ).length;
    return { ...base, remaining };
  }, [weekDays]);

  // Handle day card click
  const handleDayClick = (day: WeekDayInfo) => {
    if (day.isInteractive && day.workoutDay) {
      router.push(`/client/workout/${currentWeek.id}/${day.workoutDay.id}`);
    }
  };

  // Empty state
  if (!currentWeek || !client.planStartDate) {
    return (
      <div className="text-center py-12">
        <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground font-medium mb-2">
          No Plan
        </p>
        <h3 className="font-bold text-lg tracking-tight mb-1">
          No workouts scheduled
        </h3>
        <p className="text-sm text-muted-foreground">
          Your coach will assign workouts soon.
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
        percentage={progress.percentage}
      />

      <DayCardGrid days={weekDays} onDayClick={handleDayClick} />
    </div>
  );
}
