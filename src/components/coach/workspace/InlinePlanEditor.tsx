import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  Eye,
  ArrowRightLeft,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Copy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Client, WorkoutPlan, WorkoutDay, Exercise } from '@/types';
import { getCurrentWeekNumber } from '@/lib/workout-week-helpers';

interface InlinePlanEditorProps {
  client: Client;
  plan?: WorkoutPlan;
  planStartDate?: string;
  onUpdatePlan: (plan: WorkoutPlan) => void;
  onViewFullPlan: () => void;
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
  onUpdatePlan,
  onViewFullPlan,
  onChangePlan,
  onCreatePlan,
  onUnassignPlan,
  exercisesCollapsed = true,
}: InlinePlanEditorProps) {
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(null);
  const [exercisesExpanded, setExercisesExpanded] = useState(!exercisesCollapsed);

  // Get current week number
  const currentWeekNum = useMemo(() => {
    if (!plan || !planStartDate) return 1;
    return getCurrentWeekNumber(planStartDate, plan.weeks.length);
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

  // Handle exercise update
  const handleExerciseUpdate = (exerciseId: string, field: keyof Exercise, value: any) => {
    if (!plan || !currentWeek || !selectedDay) return;

    const updatedPlan: WorkoutPlan = {
      ...plan,
      weeks: plan.weeks.map((week) => {
        if (week.id !== currentWeek.id) return week;
        return {
          ...week,
          days: week.days.map((day) => {
            if (day.id !== selectedDay.id) return day;
            return {
              ...day,
              exercises: day.exercises.map((ex) => {
                if (ex.id !== exerciseId) return ex;
                return { ...ex, [field]: value };
              }),
            };
          }),
        };
      }),
      updatedAt: new Date().toISOString(),
    };

    onUpdatePlan(updatedPlan);
  };

  // Handle add exercise
  const handleAddExercise = () => {
    if (!plan || !currentWeek || !selectedDay) return;

    const newExercise: Exercise = {
      id: `ex-${Date.now()}`,
      name: 'New Exercise',
      sets: 3,
      reps: '10',
    };

    const updatedPlan: WorkoutPlan = {
      ...plan,
      weeks: plan.weeks.map((week) => {
        if (week.id !== currentWeek.id) return week;
        return {
          ...week,
          days: week.days.map((day) => {
            if (day.id !== selectedDay.id) return day;
            return {
              ...day,
              exercises: [...(day.exercises || []), newExercise],
            };
          }),
        };
      }),
      updatedAt: new Date().toISOString(),
    };

    onUpdatePlan(updatedPlan);
    setExpandedExerciseId(newExercise.id);
  };

  // Handle duplicate exercise
  const handleDuplicateExercise = (exercise: Exercise) => {
    if (!plan || !currentWeek || !selectedDay) return;

    const duplicatedExercise: Exercise = {
      ...exercise,
      id: `ex-${Date.now()}`,
    };

    const updatedPlan: WorkoutPlan = {
      ...plan,
      weeks: plan.weeks.map((week) => {
        if (week.id !== currentWeek.id) return week;
        return {
          ...week,
          days: week.days.map((day) => {
            if (day.id !== selectedDay.id) return day;
            const currentIndex = day.exercises.findIndex((e) => e.id === exercise.id);
            const newExercises = [...day.exercises];
            newExercises.splice(currentIndex + 1, 0, duplicatedExercise);
            return { ...day, exercises: newExercises };
          }),
        };
      }),
      updatedAt: new Date().toISOString(),
    };

    onUpdatePlan(updatedPlan);
  };

  // Handle delete exercise
  const handleDeleteExercise = (exerciseId: string) => {
    if (!plan || !currentWeek || !selectedDay) return;

    const updatedPlan: WorkoutPlan = {
      ...plan,
      weeks: plan.weeks.map((week) => {
        if (week.id !== currentWeek.id) return week;
        return {
          ...week,
          days: week.days.map((day) => {
            if (day.id !== selectedDay.id) return day;
            return {
              ...day,
              exercises: day.exercises.filter((ex) => ex.id !== exerciseId),
            };
          }),
        };
      }),
      updatedAt: new Date().toISOString(),
    };

    onUpdatePlan(updatedPlan);
    if (expandedExerciseId === exerciseId) {
      setExpandedExerciseId(null);
    }
  };

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
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="text-lg">{plan.emoji || '💪'}</span>
            <span className="truncate">{plan.name}</span>
            <span className="text-xs text-muted-foreground font-normal">
              Week {currentWeekNum} of {plan.weeks.length}
            </span>
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onViewFullPlan}>
                <Eye className="w-4 h-4 mr-2" />
                View Full Plan
              </DropdownMenuItem>
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
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Day tabs with exercise counts */}
        {currentWeek && (
          <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
            {currentWeek.days.map((day, idx) => {
              const exerciseCount = day.exercises?.length || 0;
              return (
                <Button
                  key={day.id}
                  variant={selectedDayIndex === idx ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    'shrink-0 text-xs',
                    day.isRestDay && 'opacity-60'
                  )}
                  onClick={() => {
                    setSelectedDayIndex(idx);
                    // Expand exercises when clicking a tab
                    if (!day.isRestDay) {
                      setExercisesExpanded(true);
                    }
                  }}
                >
                  {day.name || `Day ${idx + 1}`}
                  {day.isRestDay ? ' 💤' : ` (${exerciseCount})`}
                </Button>
              );
            })}
          </div>
        )}

        {/* Collapsed exercises row */}
        {selectedDay && !exercisesExpanded && !selectedDay.isRestDay && (
          <button
            onClick={() => setExercisesExpanded(true)}
            className={cn(
              'w-full flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors',
              'text-muted-foreground/70 hover:text-muted-foreground hover:bg-muted/30'
            )}
          >
            <Dumbbell className="w-4 h-4" />
            <span className="text-sm">
              {selectedDay.exercises?.length || 0} exercises
            </span>
            <ChevronDown className="w-4 h-4 ml-auto" />
          </button>
        )}

        {/* Selected day exercises - only shown when expanded */}
        {selectedDay && exercisesExpanded && (
          <>
            {/* Collapse button */}
            <button
              onClick={() => setExercisesExpanded(false)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronUp className="w-3 h-3" />
              Collapse
            </button>

            <div className="space-y-1 divide-y border rounded-lg overflow-hidden">
              {selectedDay.isRestDay ? (
                <div className="p-4 text-center text-muted-foreground">
                  <p className="text-sm">Rest Day</p>
                </div>
              ) : selectedDay.exercises?.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <p className="text-sm">No exercises yet</p>
                </div>
              ) : (
                selectedDay.exercises?.map((exercise, idx) => (
                  <InlineExerciseRow
                    key={exercise.id}
                    exercise={exercise}
                    index={idx}
                    isExpanded={expandedExerciseId === exercise.id}
                    onToggleExpand={() =>
                      setExpandedExerciseId(
                        expandedExerciseId === exercise.id ? null : exercise.id
                      )
                    }
                    onUpdate={(field, value) =>
                      handleExerciseUpdate(exercise.id, field, value)
                    }
                    onDuplicate={() => handleDuplicateExercise(exercise)}
                    onDelete={() => handleDeleteExercise(exercise.id)}
                  />
                ))
              )}
            </div>

            {/* Add exercise button */}
            {!selectedDay.isRestDay && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleAddExercise}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Exercise
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Simplified inline exercise row for the workspace
function InlineExerciseRow({
  exercise,
  index,
  isExpanded,
  onToggleExpand,
  onUpdate,
  onDuplicate,
  onDelete,
}: {
  exercise: Exercise;
  index: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (field: keyof Exercise, value: any) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={cn('group transition-colors', isExpanded && 'bg-muted/30')}>
      {/* Collapsed View */}
      <div
        className="p-3 cursor-pointer flex items-center justify-between gap-2"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-xs font-semibold text-muted-foreground w-5 shrink-0">
            {index + 1}.
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{exercise.name}</p>
            <p className="text-xs text-muted-foreground">
              {exercise.sets}x{exercise.reps || '—'}
              {exercise.weight && ` @ ${exercise.weight}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="w-4 h-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Expanded Edit View */}
      {isExpanded && (
        <div
          className="px-3 pb-3 space-y-3"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Exercise Name */}
          <div>
            <label className="text-xs text-muted-foreground">Name</label>
            <Input
              value={exercise.name}
              onChange={(e) => onUpdate('name', e.target.value)}
              className="mt-1 h-8 text-sm"
            />
          </div>

          {/* Parameters Grid */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">Sets</label>
              <Input
                type="number"
                value={exercise.sets}
                onChange={(e) => onUpdate('sets', parseInt(e.target.value) || 1)}
                min="1"
                className="mt-1 h-8 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Reps</label>
              <Input
                value={exercise.reps || ''}
                onChange={(e) => onUpdate('reps', e.target.value)}
                placeholder="8-10"
                className="mt-1 h-8 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Weight</label>
              <Input
                value={exercise.weight || ''}
                onChange={(e) => onUpdate('weight', e.target.value)}
                placeholder="135 lbs"
                className="mt-1 h-8 text-sm"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-muted-foreground">Notes</label>
            <Textarea
              value={exercise.notes || ''}
              onChange={(e) => onUpdate('notes', e.target.value)}
              placeholder="Coaching cues..."
              rows={2}
              className="mt-1 text-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
}
