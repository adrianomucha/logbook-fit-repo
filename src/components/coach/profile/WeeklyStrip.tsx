import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Check, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Client, WorkoutPlan, WorkoutCompletion } from '@/types';
import {
  getWeekDays,
  getWeekProgress,
  getCurrentWeekNumber,
  WeekDayInfo,
} from '@/lib/workout-week-helpers';

interface WeeklyStripProps {
  client: Client;
  plan?: WorkoutPlan;
  planStartDate?: string;  // ISO date when plan was assigned to client
  workoutCompletions: WorkoutCompletion[];
}

export function WeeklyStrip({ client, plan, planStartDate, workoutCompletions }: WeeklyStripProps) {
  const weekDays = useMemo(() => {
    if (!planStartDate || !plan?.weeks?.length) {
      return [];
    }

    const currentWeekNum = getCurrentWeekNumber(planStartDate, plan.weeks.length);
    const currentWeek = plan.weeks.find((w) => w.weekNumber === currentWeekNum);

    if (!currentWeek) return [];

    return getWeekDays(planStartDate, currentWeek, workoutCompletions, client.id);
  }, [plan, planStartDate, workoutCompletions, client.id]);

  const progress = useMemo(() => getWeekProgress(weekDays), [weekDays]);

  if (!plan || weekDays.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">This Week</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No plan assigned
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">This Week</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 7-day strip */}
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day) => (
            <DayCell key={day.dayNumber} day={day} completions={workoutCompletions} />
          ))}
        </div>

        {/* Progress summary */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {progress.completed} of {progress.total} workouts completed
            </span>
            <span className="font-medium">{progress.percentage}%</span>
          </div>
          <Progress value={progress.percentage} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
}

interface DayCellProps {
  day: WeekDayInfo;
  completions: WorkoutCompletion[];
}

function DayCell({ day, completions }: DayCellProps) {
  // Get effort rating if completed
  const effortRating = day.completion?.effortRating;

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Day label */}
      <span className="text-xs text-muted-foreground">{day.dayOfWeek}</span>

      {/* Status indicator */}
      <div className="relative">
        {day.status === 'COMPLETED' && (
          <div className="w-8 h-8 rounded-full bg-success flex items-center justify-center">
            <Check className="w-4 h-4 text-success-foreground" />
          </div>
        )}

        {day.status === 'TODAY' && (
          <div
            className={cn(
              'w-8 h-8 rounded-full border-2 border-info flex items-center justify-center',
              'animate-pulse bg-info/10'
            )}
          >
            <div className="w-2 h-2 rounded-full bg-info" />
          </div>
        )}

        {day.status === 'MISSED' && (
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <Minus className="w-4 h-4 text-muted-foreground" />
          </div>
        )}

        {day.status === 'UPCOMING' && (
          <div className="w-8 h-8 rounded-full border border-muted-foreground/30 opacity-40" />
        )}

        {day.status === 'REST' && (
          <div className="w-8 h-8 flex items-center justify-center">
            <div className="w-6 border-b border-dashed border-muted-foreground/50" />
          </div>
        )}
      </div>

      {/* Effort dot (only for completed days with effort rating) */}
      {day.status === 'COMPLETED' && effortRating && (
        <div
          className={cn(
            'w-2 h-2 rounded-full',
            effortRating === 'EASY' && 'bg-success',
            effortRating === 'MEDIUM' && 'bg-warning',
            effortRating === 'HARD' && 'bg-destructive'
          )}
          title={`Effort: ${effortRating.toLowerCase()}`}
        />
      )}

      {/* Spacer for days without effort dot to maintain alignment */}
      {(day.status !== 'COMPLETED' || !effortRating) && <div className="h-2" />}
    </div>
  );
}
