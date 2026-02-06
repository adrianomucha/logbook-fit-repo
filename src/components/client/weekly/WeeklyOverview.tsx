import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Card, CardContent } from '@/components/ui/card';
import { Dumbbell } from 'lucide-react';

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
  const navigate = useNavigate();

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
    // Find the week matching current week number, or default to first week
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
    return getWeekProgress(weekDays);
  }, [weekDays]);

  // Handle day card click
  const handleDayClick = (day: WeekDayInfo) => {
    if (day.isInteractive && day.workoutDay) {
      navigate(`/client/workout/${currentWeek.id}/${day.workoutDay.id}`);
    }
  };

  // Handle case where plan has no weeks or no start date
  if (!currentWeek || !client.planStartDate) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <Dumbbell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No workouts scheduled</h3>
            <p className="text-sm text-muted-foreground">
              Your coach will assign workouts to your plan soon.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header: Plan name and week */}
      <WeekHeader plan={plan} currentWeek={currentWeekNumber} />

      {/* Progress strip */}
      <WeekProgressStrip
        completed={progress.completed}
        total={progress.total}
        percentage={progress.percentage}
      />

      {/* Day cards */}
      <DayCardGrid days={weekDays} onDayClick={handleDayClick} />
    </div>
  );
}
