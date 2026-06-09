import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Check } from 'lucide-react';
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

    return getWeekDays(currentWeek, workoutCompletions, client.id);
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
        {/* Sequential workout list */}
        <div className="divide-y divide-border/40">
          {weekDays.map((day) => (
            <DayRow key={day.workoutDay.id} day={day} />
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

interface DayRowProps {
  day: WeekDayInfo;
}

function DayRow({ day }: DayRowProps) {
  const effortRating = day.completion?.effortRating;
  const isCompleted = day.status === 'COMPLETED';
  const isCurrent = day.status === 'CURRENT';
  const exerciseCount = day.workoutDay?.exercises?.length || 0;

  return (
    <div
      className={cn(
        'flex items-center gap-3 py-2.5',
        isCompleted && 'opacity-80'
      )}
    >
      {/* Position number */}
      <span className="w-6 shrink-0 text-sm font-bold tabular-nums text-muted-foreground">
        {day.orderIndex}
      </span>

      {/* Workout name */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {day.workoutDay?.name || 'Workout'}
        </p>
        <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-medium tabular-nums">
          {exerciseCount} exercise{exerciseCount !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Effort dot (completed with rating) */}
      {isCompleted && effortRating && (
        <span
          className={cn(
            'w-2 h-2 rounded-full shrink-0',
            effortRating === 'EASY' && 'bg-success',
            effortRating === 'MEDIUM' && 'bg-warning',
            effortRating === 'HARD' && 'bg-destructive'
          )}
          title={`Effort: ${effortRating.toLowerCase()}`}
        />
      )}

      {/* Status indicator */}
      <div className="shrink-0">
        {isCompleted ? (
          <div className="w-6 h-6 rounded-full bg-success flex items-center justify-center">
            <Check className="w-3.5 h-3.5 text-success-foreground" />
          </div>
        ) : isCurrent ? (
          <span className="text-[10px] uppercase tracking-wide text-info font-bold">
            Up next
          </span>
        ) : (
          <div className="w-6 h-6 rounded-full border border-muted-foreground/25" />
        )}
      </div>
    </div>
  );
}
