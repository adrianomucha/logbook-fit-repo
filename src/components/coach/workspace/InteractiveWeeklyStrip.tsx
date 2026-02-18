import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Check, Minus, Dumbbell, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';
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
        <div className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded-lg text-muted-foreground">
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

  // Compact mode: single row ~60-72px height
  if (compact) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 py-2 px-3 bg-muted/20 rounded-lg">
        {/* Top row on mobile: Week indicator + Progress */}
        <div className="flex items-center justify-between sm:hidden">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            Week {currentWeekNum}/{plan.weeks.length}
          </span>
          <div className="flex items-center gap-2 text-xs text-muted-foreground whitespace-nowrap">
            <span>
              {progress.completed}/{progress.total}
            </span>
            <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Desktop: Week indicator */}
        <span className="hidden sm:block text-xs text-muted-foreground whitespace-nowrap">
          Week {currentWeekNum}/{plan.weeks.length}
        </span>

        {/* 7-day compact strip */}
        <div className="flex gap-1 sm:gap-0.5 flex-1 justify-center sm:justify-center">
          {weekDays.map((day) => (
            <CompactDayCell key={day.dayNumber} day={day} />
          ))}
        </div>

        {/* Desktop: Progress summary */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground whitespace-nowrap">
          <span>
            {progress.completed}/{progress.total}
          </span>
          <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            This Week
            <span className="text-xs text-muted-foreground font-normal ml-2">
              Week {currentWeekNum} of {plan.weeks.length}
            </span>
          </CardTitle>
          <span className="text-sm font-medium">{progress.percentage}%</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 7-day interactive strip */}
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day) => (
            <InteractiveDayCell
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

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {progress.completed} of {progress.total} workouts
            </span>
          </div>
          <Progress value={progress.percentage} className="h-1.5" />
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
                          'text-green-600',
                        expandedDayInfo.completion.effortRating === 'MEDIUM' &&
                          'text-yellow-600',
                        expandedDayInfo.completion.effortRating === 'HARD' &&
                          'text-red-600'
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

interface InteractiveDayCellProps {
  day: WeekDayInfo;
  isExpanded: boolean;
  onClick: () => void;
}

function InteractiveDayCell({ day, isExpanded, onClick }: InteractiveDayCellProps) {
  const effortRating = day.completion?.effortRating;
  const isClickable = day.workoutDay && day.status !== 'REST';

  return (
    <button
      onClick={onClick}
      disabled={!isClickable}
      className={cn(
        'flex flex-col items-center gap-1 py-1 rounded transition-colors',
        isClickable && 'hover:bg-muted/50 cursor-pointer',
        isExpanded && 'bg-muted',
        !isClickable && 'cursor-default'
      )}
    >
      {/* Day label */}
      <span className="text-xs text-muted-foreground">{day.dayOfWeek}</span>

      {/* Status indicator */}
      <div className="relative">
        {day.status === 'COMPLETED' && (
          <div
            className={cn(
              'w-8 h-8 rounded-full bg-green-600 flex items-center justify-center',
              isExpanded && 'ring-2 ring-offset-2 ring-green-600'
            )}
          >
            <Check className="w-4 h-4 text-white" />
          </div>
        )}

        {day.status === 'TODAY' && (
          <div
            className={cn(
              'w-8 h-8 rounded-full border-2 border-teal-500 flex items-center justify-center',
              'bg-teal-50 dark:bg-teal-950/30',
              isExpanded && 'ring-2 ring-offset-2 ring-teal-500'
            )}
          >
            <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
          </div>
        )}

        {day.status === 'MISSED' && (
          <div
            className={cn(
              'w-8 h-8 rounded-full bg-muted flex items-center justify-center',
              isExpanded && 'ring-2 ring-offset-2 ring-muted-foreground'
            )}
          >
            <Minus className="w-4 h-4 text-muted-foreground" />
          </div>
        )}

        {day.status === 'UPCOMING' && (
          <div
            className={cn(
              'w-8 h-8 rounded-full border border-muted-foreground/30',
              isExpanded && 'ring-2 ring-offset-2 ring-muted-foreground'
            )}
          />
        )}

        {day.status === 'REST' && (
          <div className="w-8 h-8 flex items-center justify-center">
            <div className="w-6 border-b border-dashed border-muted-foreground/50" />
          </div>
        )}
      </div>

      {/* Effort dot */}
      {day.status === 'COMPLETED' && effortRating && (
        <div
          className={cn(
            'w-2 h-2 rounded-full',
            effortRating === 'EASY' && 'bg-green-500',
            effortRating === 'MEDIUM' && 'bg-yellow-500',
            effortRating === 'HARD' && 'bg-red-500'
          )}
          title={`Effort: ${effortRating.toLowerCase()}`}
        />
      )}

      {/* Spacer */}
      {(day.status !== 'COMPLETED' || !effortRating) && <div className="h-2" />}
    </button>
  );
}

// Compact day cell for the condensed strip
function CompactDayCell({ day }: { day: WeekDayInfo }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[10px] text-muted-foreground leading-none">
        {day.dayOfWeek}
      </span>
      <div
        className={cn(
          'w-6 h-6 rounded-full flex items-center justify-center',
          day.status === 'COMPLETED' && 'bg-green-600',
          day.status === 'TODAY' && 'border-2 border-teal-500 bg-teal-50 dark:bg-teal-950/30',
          day.status === 'MISSED' && 'bg-muted',
          day.status === 'UPCOMING' && 'border border-muted-foreground/30',
          day.status === 'REST' && 'opacity-50'
        )}
      >
        {day.status === 'COMPLETED' && <Check className="w-3 h-3 text-white" />}
        {day.status === 'TODAY' && (
          <div className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
        )}
        {day.status === 'MISSED' && <Minus className="w-3 h-3 text-muted-foreground" />}
        {day.status === 'REST' && (
          <div className="w-4 border-b border-dashed border-muted-foreground/50" />
        )}
      </div>
    </div>
  );
}
