import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dumbbell,
  MoreHorizontal,
  Pencil,
  ArrowRightLeft,
  Plus,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Client, WorkoutPlan, Exercise } from '@/types';
import { getCurrentWeekNumber } from '@/lib/workout-week-helpers';

interface InlinePlanEditorProps {
  client: Client;
  plan?: WorkoutPlan;
  planStartDate?: string;
  onUpdatePlan: (plan: WorkoutPlan) => void;
  onEditPlan: () => void;
  onChangePlan: () => void;
  onCreatePlan: () => void;
  onUnassignPlan: () => void;
  /** Whether exercises start collapsed (default: true) */
  exercisesCollapsed?: boolean;
  /** Visual weight: 'card' (default) with border, 'flat' borderless for secondary placement */
  variant?: 'card' | 'flat';
}

export function InlinePlanEditor({
  client,
  plan,
  planStartDate,
  onEditPlan,
  onChangePlan,
  onCreatePlan,
  onUnassignPlan,
  exercisesCollapsed = true,
  variant = 'card',
}: InlinePlanEditorProps) {
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [showExercises, setShowExercises] = useState(!exercisesCollapsed);

  // Get current week number - use durationWeeks for consistency with client view
  const currentWeekNum = useMemo(() => {
    if (!plan || !planStartDate) return 1;
    const durationWeeks = plan.durationWeeks || plan.weeks.length;
    return getCurrentWeekNumber(planStartDate, durationWeeks);
  }, [plan, planStartDate]);

  // Get current week's days
  const currentWeek = useMemo(() => {
    if (!plan) return null;
    return plan.weeks.find((w) => w.weekNumber === currentWeekNum) || plan.weeks[0];
  }, [plan, currentWeekNum]);

  // Get selected day
  const selectedDay = useMemo(() => {
    if (!currentWeek) return null;
    return currentWeek.days[selectedDayIndex] || currentWeek.days[0];
  }, [currentWeek, selectedDayIndex]);

  const firstName = client.name?.split(' ')[0] || client.name || 'this client';
  const isFlat = variant === 'flat';

  // Empty state - no plan assigned
  if (!plan) {
    const emptyContent = (
      <div className="text-center py-8">
        <div className="text-4xl select-none mb-4 animate-bounce-once">🏋️</div>
        <p className="font-semibold antialiased">{firstName} needs a plan</p>
        <p className="text-sm text-muted-foreground mb-5 antialiased">
          Assign a template or create one from scratch.
        </p>
        <div className="flex gap-2 justify-center">
          <Button variant="outline" size="sm" onClick={onChangePlan} className="active:scale-[0.96] transition-transform duration-150">
            <ArrowRightLeft className="w-4 h-4 mr-1" />
            Assign Existing
          </Button>
          <Button size="sm" onClick={onCreatePlan} className="active:scale-[0.96] transition-transform duration-150">
            <Plus className="w-4 h-4 mr-1" />
            Create New
          </Button>
        </div>
      </div>
    );

    if (isFlat) return emptyContent;
    return <Card><CardContent>{emptyContent}</CardContent></Card>;
  }

  const Wrapper = isFlat ? 'div' : Card;

  return (
    <Wrapper>
      <div className={cn(
        'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2',
        isFlat ? 'pb-2' : 'px-3 sm:px-6 pt-6 pb-2'
      )}>
        <div className="text-base font-semibold flex items-center gap-2 min-w-0 antialiased">
          <span className="text-lg shrink-0" aria-hidden="true">{plan.emoji || '💪'}</span>
          <span className="truncate">{plan.name}</span>
          <span className="text-xs text-muted-foreground font-normal shrink-0 tabular-nums">
            Week {currentWeekNum}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="outline" size="sm" onClick={onEditPlan} className="flex-1 sm:flex-none active:scale-[0.96] transition-transform duration-150">
            <Pencil className="w-3.5 h-3.5 mr-1.5" />
            Edit
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onChangePlan}>
                <ArrowRightLeft className="w-4 h-4 mr-2" />
                Switch Plan
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onCreatePlan}>
                <Plus className="w-4 h-4 mr-2" />
                Create New Plan
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onUnassignPlan}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Remove Plan
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className={cn("space-y-3", isFlat ? '' : 'px-3 sm:px-6 pb-6')}>
        {/* Day selector tabs */}
        {currentWeek && (
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1">
            {currentWeek.days.map((day, idx) => {
              const exerciseCount = day.exercises?.length || 0;
              const isSelected = selectedDayIndex === idx;

              return (
                <button
                  key={day.id}
                  onClick={() => {
                    setSelectedDayIndex(idx);
                    setShowExercises(true);
                  }}
                  className={cn(
                    'shrink-0 px-3 py-2 sm:py-1.5 rounded-lg text-xs font-medium min-h-[44px] sm:min-h-0 flex items-center antialiased',
                    'transition-all duration-150 active:scale-[0.95]',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    isSelected
                      ? 'bg-foreground text-background shadow-sm'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  {day.name || `Day ${idx + 1}`}
                  {exerciseCount > 0 && (
                    <span className="ml-1.5 tabular-nums opacity-60">{exerciseCount}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Exercise list */}
        {selectedDay && showExercises && (
          <>
            {selectedDay.exercises?.length === 0 ? (
              <div className="py-4 text-center">
                <p className="text-sm text-muted-foreground">No exercises</p>
                <Button
                  variant="link"
                  size="sm"
                  className="mt-1 h-auto p-0"
                  onClick={onEditPlan}
                >
                  Add exercises →
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {selectedDay.exercises?.map((exercise) => (
                  <ExerciseRow key={exercise.id} exercise={exercise} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </Wrapper>
  );
}

/**
 * Simple read-only exercise row
 */
function ExerciseRow({ exercise }: { exercise: Exercise }) {
  // Build params string: "3×10 · 135 lbs" or "3×10-12" or "Bodyweight"
  const parts: string[] = [];

  if (exercise.sets && exercise.reps) {
    parts.push(`${exercise.sets}×${exercise.reps}`);
  } else if (exercise.reps) {
    parts.push(`${exercise.reps} reps`);
  } else if (exercise.sets) {
    parts.push(`${exercise.sets} sets`);
  }

  if (exercise.weight) {
    const weight = exercise.weight;
    const unit = exercise.weightUnit || 'lbs';
    parts.push(/^\d+$/.test(weight) ? `${weight} ${unit}` : weight);
  }

  return (
    <div className="flex items-center justify-between py-2 px-0.5">
      <span className="text-sm truncate antialiased">{exercise.name}</span>
      {parts.length > 0 && (
        <span className="text-xs text-muted-foreground ml-3 shrink-0 tabular-nums antialiased">
          {parts.join(' · ')}
        </span>
      )}
    </div>
  );
}
