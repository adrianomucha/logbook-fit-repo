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
}

export function InteractiveWeeklyStrip({
  client,
  plan,
  planStartDate,
  workoutCompletions,
  onScrollToPlanEditor,
}: InteractiveWeeklyStripProps) {
  const [expandedDayNumber, setExpandedDayNumber] = useState<number | null>(null);

  // Calculate current week data
  const currentWeekNum = useMemo(() => {
    if (!planStartDate || !plan?.weeks?.length) return 1;
    return getCurrentWeekNumber(planStartDate, plan.weeks.length);
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
