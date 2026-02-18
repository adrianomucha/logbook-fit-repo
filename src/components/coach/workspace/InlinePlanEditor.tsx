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

  // Empty state - no plan assigned
  if (!plan) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Dumbbell className="w-4 h-4" />
            Workout Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Dumbbell className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-4">
              No plan assigned to {client.name.split(' ')[0]}
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" size="sm" onClick={onChangePlan}>
                <ArrowRightLeft className="w-4 h-4 mr-1" />
                Assign Existing
              </Button>
              <Button size="sm" onClick={onCreatePlan}>
                <Plus className="w-4 h-4 mr-1" />
                Create New
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2 px-3 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2 min-w-0">
            <span className="text-lg shrink-0">{plan.emoji || '💪'}</span>
            <span className="truncate">{plan.name}</span>
            <span className="text-xs text-muted-foreground font-normal shrink-0">
              Week {currentWeekNum}
            </span>
          </CardTitle>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="outline" size="sm" onClick={onEditPlan} className="flex-1 sm:flex-none">
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
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove Plan
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 px-3 sm:px-6">
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
                    'shrink-0 px-3 py-2 sm:py-1.5 rounded-md text-xs font-medium transition-colors min-h-[44px] sm:min-h-0 flex items-center',
                    isSelected
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground',
                    day.isRestDay && 'opacity-60'
                  )}
                >
                  {day.name || `Day ${idx + 1}`}
                  {!day.isRestDay && (
                    <span className="ml-1 opacity-70">{exerciseCount}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Exercise list */}
        {selectedDay && showExercises && (
          <>
            {selectedDay.isRestDay ? (
              <div className="py-3 text-center text-sm text-muted-foreground">
                Rest Day
              </div>
            ) : selectedDay.exercises?.length === 0 ? (
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
              <div className="space-y-0.5">
                {selectedDay.exercises?.map((exercise) => (
                  <ExerciseRow key={exercise.id} exercise={exercise} />
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Simple read-only exercise row
 */
function ExerciseRow({ exercise }: { exercise: Exercise }) {
  // Build params string: "3×10 · 135 lbs"
  const parts: string[] = [];

  if (exercise.sets && exercise.reps) {
    parts.push(`${exercise.sets}×${exercise.reps}`);
  }

  if (exercise.weight) {
    const weight = exercise.weight;
    const unit = (exercise as any).weightUnit || 'lbs';
    // Add unit only if weight is just a number
    parts.push(/^\d+$/.test(weight) ? `${weight} ${unit}` : weight);
  }

  return (
    <div className="flex items-center justify-between py-1.5 px-0.5">
      <span className="text-sm truncate">{exercise.name}</span>
      {parts.length > 0 && (
        <span className="text-xs text-muted-foreground ml-3 shrink-0">
          {parts.join(' · ')}
        </span>
      )}
    </div>
  );
}
