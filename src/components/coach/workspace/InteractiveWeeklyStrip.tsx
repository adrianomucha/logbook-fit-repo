import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dumbbell, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Client, WorkoutPlan, WorkoutCompletion } from '@/types';
import {
  getWeekDays,
  getWeekProgress,
  getCurrentWeekNumber,
  WeekDayInfo,
} from '@/lib/workout-week-helpers';

interface InteractiveWeeklyStripProps {
  client: Client;
  plan?: WorkoutPlan;
  planStartDate?: string;
  workoutCompletions: WorkoutCompletion[];
  onScrollToPlanEditor?: (dayId: string) => void;
  /** Render as compact single-row strip (~60-72px height) */
  compact?: boolean;
}

export function InteractiveWeeklyStrip({
  client,
  plan,
  planStartDate,
  workoutCompletions,
  onScrollToPlanEditor,
  compact = false,
}: InteractiveWeeklyStripProps) {
  const [expandedDayNumber, setExpandedDayNumber] = useState<number | null>(null);

  // Calculate current week data - use durationWeeks for consistency with client view
  const currentWeekNum = useMemo(() => {
    if (!planStartDate || !plan?.weeks?.length) return 1;
    const durationWeeks = plan.durationWeeks || plan.weeks.length;
    return getCurrentWeekNumber(planStartDate, durationWeeks);
  }, [planStartDate, plan]);

  const currentWeek = useMemo(() => {
    if (!plan) return null;
    return plan.weeks.find((w) => w.weekNumber === currentWeekNum) || plan.weeks[0];
  }, [plan, currentWeekNum]);

  const weekDays = useMemo(() => {
    if (!planStartDate || !plan?.weeks?.length || !currentWeek) {
      return [];
    }
    return getWeekDays(planStartDate, currentWeek, workoutCompletions, client.id);
  }, [plan, planStartDate, currentWeek, workoutCompletions, client.id]);

  const progress = useMemo(() => getWeekProgress(weekDays), [weekDays]);

  // Get expanded day's info
  const expandedDayInfo = useMemo(() => {
    if (expandedDayNumber === null) return null;
    return weekDays.find((d) => d.dayNumber === expandedDayNumber);
  }, [expandedDayNumber, weekDays]);

  // Get expanded workout from workoutDay
  const expandedWorkout = expandedDayInfo?.workoutDay;

  if (!plan || weekDays.length === 0) {
    if (compact) {
      return (
        <div className="flex items-center justify-between py-3 px-4 bg-card border rounded-xl text-muted-foreground">
          <span className="text-sm">This Week</span>
          <span className="text-xs">No plan assigned</span>
        </div>
      );
    }
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

  const remaining = weekDays.filter(
    (d) => d.status === 'TODAY' || d.status === 'UPCOMING'
  ).length;

  // Compact mode: pill progress bar
  if (compact) {
    const workoutDays = weekDays.filter((d) => d.status !== 'REST');
    const paceMessage =
      progress.completed === progress.total
        ? 'All done this week!'
        : remaining === 1
          ? `On pace \u2014 one more to go.`
          : remaining === 0 && progress.completed < progress.total
            ? `${progress.total - progress.completed} missed`
            : `${remaining} remaining`;

    return (
      <div className="space-y-3">
        {/* Header row */}
        <div className="flex items-baseline justify-between">
          <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground font-medium">
            This Week
          </p>
          <p className="text-[11px] uppercase tracking-[0.12em] text-success font-medium">
            {paceMessage}
          </p>
        </div>

        {/* Pill progress bar */}
        <div className="flex gap-1.5">
          {workoutDays.map((day, i) => (
            <div
              key={day.dayNumber}
              className={cn(
                'flex-1 h-3 rounded-full',
                day.status === 'COMPLETED'
                  ? 'bg-success'
                  : 'bg-success/15'
              )}
            />
          ))}
        </div>

        {/* Session count */}
        <p className="text-sm">
          <span className="text-2xl font-bold tabular-nums tracking-tight">
            {progress.completed}
          </span>
          <span className="text-muted-foreground mx-0.5">/</span>
          <span className="text-lg font-bold tabular-nums text-muted-foreground">
            {progress.total}
          </span>
          <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-medium ml-2">
            Sessions
          </span>
        </p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-medium">
          Week {currentWeekNum} of {plan.weeks.length}
        </p>
        <CardTitle className="text-base">This Week</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stat blocks */}
        <div className="flex gap-2">
          <div className="flex-1 bg-muted/50 rounded-lg px-3 py-4 text-center">
            <p className="text-xl font-bold tabular-nums leading-none">{progress.completed}</p>
            <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mt-1 font-medium">Done</p>
          </div>
          <div className="flex-1 bg-muted/50 rounded-lg px-3 py-4 text-center">
            <p className="text-xl font-bold tabular-nums leading-none">{remaining}</p>
            <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mt-1 font-medium">Left</p>
          </div>
          <div className="flex-1 bg-muted/50 rounded-lg px-3 py-4 text-center">
            <p className="text-xl font-bold tabular-nums leading-none">{progress.total}</p>
            <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mt-1 font-medium">Total</p>
          </div>
        </div>

        {/* 7-day interactive list */}
        <div className="border border-border/60 rounded-lg p-2">
          <div className="divide-y divide-border/40">
            {weekDays.map((day) => (
              <InteractiveDayRow
                key={day.dayNumber}
                day={day}
                isExpanded={expandedDayNumber === day.dayNumber}
                onClick={() => {
                  if (day.workoutDay && day.status !== 'REST') {
                    setExpandedDayNumber(
                      expandedDayNumber === day.dayNumber ? null : day.dayNumber
                    );
                  }
                }}
              />
            ))}
          </div>
        </div>

        {/* Expanded workout details */}
        {expandedWorkout && expandedDayInfo && (
          <div className="pt-3 border-t">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-medium text-sm">{expandedWorkout.name}</h4>
                <p className="text-xs text-muted-foreground">
                  {expandedDayInfo.status === 'COMPLETED' && 'Completed'}
                  {expandedDayInfo.status === 'TODAY' && 'Scheduled for today'}
                  {expandedDayInfo.status === 'UPCOMING' && 'Upcoming'}
                  {expandedDayInfo.status === 'MISSED' && 'Missed'}
                </p>
              </div>
              {onScrollToPlanEditor && expandedWorkout.id && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onScrollToPlanEditor(expandedWorkout.id)}
                >
                  <Edit2 className="w-3 h-3 mr-1" />
                  Edit
                </Button>
              )}
            </div>

            {/* Exercise list */}
            {expandedWorkout.exercises && expandedWorkout.exercises.length > 0 ? (
              <ul className="space-y-1.5">
                {expandedWorkout.exercises.map((exercise, idx) => (
                  <li
                    key={exercise.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <span className="text-xs text-muted-foreground w-4">
                      {idx + 1}.
                    </span>
                    <Dumbbell className="w-3 h-3 text-muted-foreground" />
                    <span className="flex-1 truncate">{exercise.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {exercise.sets}x{exercise.reps || '—'}
                      {exercise.weight && ` @ ${exercise.weight}`}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No exercises defined</p>
            )}

            {/* Completion details */}
            {expandedDayInfo.completion && (
              <div className="mt-3 pt-3 border-t flex items-center gap-4 text-xs text-muted-foreground">
                {expandedDayInfo.completion.effortRating && (
                  <span>
                    Effort:{' '}
                    <span
                      className={cn(
                        'font-medium',
                        expandedDayInfo.completion.effortRating === 'EASY' &&
                          'text-success',
                        expandedDayInfo.completion.effortRating === 'MEDIUM' &&
                          'text-muted-foreground',
                        expandedDayInfo.completion.effortRating === 'HARD' &&
                          'text-warning'
                      )}
                    >
                      {expandedDayInfo.completion.effortRating.toLowerCase()}
                    </span>
                  </span>
                )}
                {expandedDayInfo.completion.durationSec && (
                  <span>
                    Duration:{' '}
                    {Math.round(expandedDayInfo.completion.durationSec / 60)} min
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface InteractiveDayRowProps {
  day: WeekDayInfo;
  isExpanded: boolean;
  onClick: () => void;
}

function InteractiveDayRow({ day, isExpanded, onClick }: InteractiveDayRowProps) {
  const isClickable = day.workoutDay && day.status !== 'REST';
  const isRest = day.status === 'REST';
  const isCompleted = day.status === 'COMPLETED';
  const isToday = day.status === 'TODAY';
  const isUpcoming = day.status === 'UPCOMING';
  const isMissed = day.status === 'MISSED';
  const exerciseCount = day.workoutDay?.exercises?.length || 0;

  return (
    <button
      onClick={onClick}
      disabled={!isClickable}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-left transition-colors min-h-[44px]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        isToday && 'bg-muted/80',
        isCompleted && 'opacity-70',
        isUpcoming && 'opacity-35',
        isMissed && 'opacity-45',
        isRest && 'opacity-30',
        isClickable && 'hover:bg-muted/60 active:bg-muted cursor-pointer',
        isExpanded && 'bg-muted',
        !isClickable && 'cursor-default',
      )}
    >
      {/* Day abbreviation + date */}
      <div className="w-9 shrink-0">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          {day.dayOfWeek.slice(0, 3)}
        </p>
        <p className="text-[10px] tabular-nums text-muted-foreground/60">
          {format(day.date, 'M/d')}
        </p>
      </div>

      {/* Workout info */}
      <div className="flex-1 min-w-0">
        {isRest ? (
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
            Rest
          </p>
        ) : (
          <>
            <p className="text-sm font-bold truncate tracking-tight">
              {day.workoutDay?.name || 'Workout'}
            </p>
            <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-medium">
              {exerciseCount} exercise{exerciseCount !== 1 ? 's' : ''}
            </p>
          </>
        )}
      </div>

      {/* Status indicator */}
      <div className="shrink-0">
        {isCompleted && (
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
            Done
          </span>
        )}
        {isToday && (
          <span className="w-2 h-2 rounded-full bg-info block" />
        )}
        {isMissed && (
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
            Missed
          </span>
        )}
      </div>
    </button>
  );
}

