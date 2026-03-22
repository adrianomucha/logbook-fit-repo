import { useState, useMemo, useEffect } from 'react';
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
  /** Open the plan editor drawer */
  onEditPlan?: () => void;
  /** Render as compact single-row strip (~60-72px height) */
  compact?: boolean;
  /** Skip Card wrapper — for embedding inside another container */
  variant?: 'card' | 'flat';
}

export function InteractiveWeeklyStrip({
  client,
  plan,
  planStartDate,
  workoutCompletions,
  onScrollToPlanEditor,
  onEditPlan,
  compact = false,
  variant = 'card',
}: InteractiveWeeklyStripProps) {
  const [expandedDayNumber, setExpandedDayNumber] = useState<number | null>(null);

  // Animate compact pills growing in on mount
  const [pillsMounted, setPillsMounted] = useState(false);
  useEffect(() => {
    if (!compact) return;
    const id = requestAnimationFrame(() => setPillsMounted(true));
    return () => cancelAnimationFrame(id);
  }, [compact]);

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

  const isFlat = variant === 'flat';

  if (!plan || weekDays.length === 0) {
    if (compact) {
      return (
        <div className="flex items-center justify-between py-3 px-4 bg-card border rounded-xl text-muted-foreground">
          <span className="text-sm antialiased">This Week</span>
          <span className="text-xs antialiased">No plan assigned</span>
        </div>
      );
    }
    if (isFlat) {
      return (
        <div className="text-center py-6">
          <div className="text-3xl select-none mb-2">📅</div>
          <p className="text-sm text-muted-foreground antialiased">No plan to show yet</p>
        </div>
      );
    }
    return (
      <Card>
        <CardContent>
          <div className="text-center py-6">
            <div className="text-3xl select-none mb-2">📅</div>
            <p className="text-sm text-muted-foreground antialiased">No plan assigned</p>
          </div>
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
    const allDone = progress.completed === progress.total;
    const paceMessage =
      allDone
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
          <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground font-medium antialiased">
            This Week
          </p>
          <p className={cn(
            "text-[11px] uppercase tracking-[0.12em] font-medium antialiased transition-colors duration-300",
            allDone ? 'text-success' : 'text-muted-foreground'
          )}>
            {paceMessage}
          </p>
        </div>

        {/* Pill progress bar — staggered grow-in */}
        <div className="flex gap-1.5">
          {workoutDays.map((day, i) => (
            <div
              key={day.dayNumber}
              className={cn(
                'flex-1 h-4 rounded-full transition-all duration-500 ease-out',
                day.status === 'COMPLETED'
                  ? 'bg-success'
                  : 'bg-success/15'
              )}
              style={{
                transform: pillsMounted ? 'scaleX(1)' : 'scaleX(0)',
                transformOrigin: 'left',
                transitionDelay: `${i * 80}ms`,
              }}
            />
          ))}
        </div>

        {/* Session count */}
        <p className="text-sm antialiased">
          <span className="text-3xl sm:text-4xl font-black tabular-nums tracking-tight">
            {progress.completed}
          </span>
          <span className="text-muted-foreground/40 mx-0.5">/</span>
          <span className="text-lg font-bold tabular-nums text-muted-foreground/60">
            {progress.total}
          </span>
          <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium ml-2">
            {allDone ? 'Complete' : 'Sessions'}
          </span>
        </p>
      </div>
    );
  }

  const Wrapper = isFlat ? 'div' : Card;
  const editHandler = onEditPlan || (onScrollToPlanEditor ? () => onScrollToPlanEditor('') : undefined);

  const content = (
    <div className="space-y-4">
      {/* Week label */}
      {!isFlat && (
        <div>
          <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-medium antialiased">
            Week {currentWeekNum} of {plan.weeks.length}
          </p>
        </div>
      )}

      {/* 7-day interactive list — exercises expand inline under each day */}
      <div className="divide-y divide-border/40">
        {weekDays.map((day) => {
          const isExpanded = expandedDayNumber === day.dayNumber;
          const dayWorkout = isExpanded ? day.workoutDay : null;
          const dayCompletion = isExpanded ? day.completion : null;

          return (
            <div key={day.dayNumber}>
              <InteractiveDayRow
                day={day}
                isExpanded={isExpanded}
                onClick={() => {
                  if (day.workoutDay && day.status !== 'REST') {
                    setExpandedDayNumber(isExpanded ? null : day.dayNumber);
                  }
                }}
              />

              {/* Inline expanded exercises */}
              {isExpanded && dayWorkout && (
                <div className="pl-[60px] pr-3 pb-4 pt-1 animate-fade-in-up">
                  {/* Exercise list */}
                  {dayWorkout.exercises && dayWorkout.exercises.length > 0 ? (
                    <div className="space-y-0">
                      {dayWorkout.exercises.map((exercise, idx) => (
                        <div
                          key={exercise.id}
                          className="flex items-center text-[13px] py-1.5"
                        >
                          <span className="flex-1 truncate antialiased">{exercise.name}</span>
                          <span className="text-xs text-muted-foreground shrink-0 tabular-nums antialiased ml-3">
                            {exercise.sets}×{exercise.reps || '—'}
                            {exercise.weight && ` · ${exercise.weight}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground antialiased py-1">No exercises yet</p>
                  )}

                  {/* Footer: completion details + edit */}
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/30">
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground antialiased">
                      {dayCompletion?.effortRating && (
                        <span>
                          <span
                            className={cn(
                              'font-semibold',
                              dayCompletion.effortRating === 'EASY' && 'text-emerald-500',
                              dayCompletion.effortRating === 'MEDIUM' && 'text-amber-500',
                              dayCompletion.effortRating === 'HARD' && 'text-red-400'
                            )}
                          >
                            {dayCompletion.effortRating.toLowerCase()}
                          </span>
                        </span>
                      )}
                      {dayCompletion?.durationSec && (
                        <span className="tabular-nums">
                          {Math.round(dayCompletion.durationSec / 60)} min
                        </span>
                      )}
                    </div>
                    {editHandler && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-muted-foreground hover:text-foreground active:scale-[0.96] transition-all duration-150"
                        onClick={editHandler}
                      >
                        <Edit2 className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  if (isFlat) return content;

  return (
    <Card>
      <CardHeader className="pb-3">
        <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-medium antialiased">
          Week {currentWeekNum} of {plan.weeks.length}
        </p>
        <CardTitle className="text-base antialiased">This Week</CardTitle>
      </CardHeader>
      <CardContent>
        {content}
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

  // Rest days: single compact line
  if (isRest) {
    return (
      <div className="flex items-center gap-3 px-3 py-1.5 min-h-[32px]">
        <span className="w-3 shrink-0" />
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground/30 w-9 shrink-0 antialiased">
          {day.dayOfWeek.slice(0, 3)}
        </span>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground/25 font-medium antialiased">
          Rest
        </span>
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={!isClickable}
      className={cn(
        'flex items-center gap-3 px-3 py-3 w-full text-left transition-all duration-150 min-h-[52px]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        isToday && 'bg-foreground/[0.03]',
        isUpcoming && 'opacity-50',
        isMissed && 'opacity-40',
        isClickable && 'hover:bg-muted/50 active:bg-muted/70 active:scale-[0.995] cursor-pointer',
        isExpanded && 'bg-muted/50',
      )}
    >
      {/* Expand chevron */}
      <svg
        className={cn(
          'w-3.5 h-3.5 text-muted-foreground/40 shrink-0 transition-transform duration-200',
          isExpanded && 'rotate-90 text-muted-foreground'
        )}
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>

      {/* Day abbreviation + date */}
      <div className="w-10 shrink-0">
        <p className={cn(
          'text-[11px] font-black uppercase tracking-wide antialiased',
          isToday ? 'text-foreground' : 'text-muted-foreground'
        )}>
          {day.dayOfWeek.slice(0, 3)}
        </p>
        <p className="text-[10px] tabular-nums text-muted-foreground/50 antialiased">
          {format(day.date, 'M/d')}
        </p>
      </div>

      {/* Workout info */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm font-bold truncate tracking-tight antialiased',
          isCompleted && 'text-foreground/80',
          isMissed && 'text-foreground/50'
        )}>
          {day.workoutDay?.name || 'Workout'}
        </p>
        <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/60 font-medium tabular-nums antialiased">
          {exerciseCount} exercise{exerciseCount !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Status indicator */}
      <div className="shrink-0 flex items-center">
        {isCompleted && (
          <svg className="w-5 h-5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {isToday && (
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-info opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-info" />
          </span>
        )}
        {isMissed && (
          <span className="text-[10px] uppercase tracking-wide text-destructive/50 font-bold antialiased">
            Missed
          </span>
        )}
      </div>
    </button>
  );
}

