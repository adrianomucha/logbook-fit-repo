import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Plus,
  Library,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkoutPlan, WorkoutDay, Exercise, AppState } from '@/types';
import { ExerciseRow } from '../workout-builder/ExerciseRow';
import { ExerciseSelector } from '../ExerciseSelector';

interface PlanEditorDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: WorkoutPlan;
  onUpdatePlan: (plan: WorkoutPlan) => void;
  /** Initial week to show (0-indexed) */
  initialWeekIndex?: number;
  /** Initial day to show (0-indexed) */
  initialDayIndex?: number;
  appState?: AppState;
}

export function PlanEditorDrawer({
  open,
  onOpenChange,
  plan,
  onUpdatePlan,
  initialWeekIndex = 0,
  initialDayIndex = 0,
  appState,
}: PlanEditorDrawerProps) {
  const [selectedWeek, setSelectedWeek] = useState(initialWeekIndex);
  const [selectedDay, setSelectedDay] = useState(initialDayIndex);
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const [newlyAddedExerciseId, setNewlyAddedExerciseId] = useState<string | null>(null);

  const currentWeek = plan.weeks[selectedWeek];
  const currentDay = currentWeek?.days[selectedDay];

  // Navigate weeks
  const goToPrevWeek = () => {
    if (selectedWeek > 0) {
      setSelectedWeek(selectedWeek - 1);
      setSelectedDay(0);
    }
  };

  const goToNextWeek = () => {
    if (selectedWeek < plan.weeks.length - 1) {
      setSelectedWeek(selectedWeek + 1);
      setSelectedDay(0);
    }
  };

  // Exercise handlers
  const handleAddExerciseFromLibrary = (exercise: Exercise) => {
    if (!currentDay) return;

    const updatedPlan = { ...plan };
    updatedPlan.weeks[selectedWeek].days[selectedDay].exercises.unshift(exercise);
    updatedPlan.updatedAt = new Date().toISOString();
    onUpdatePlan(updatedPlan);
  };

  const addBlankExercise = () => {
    if (!currentDay) return;

    const newExerciseId = `ex-${Date.now()}`;
    const newExercise: Exercise = {
      id: newExerciseId,
      name: '',
      sets: 3,
      reps: '10',
    };

    const updatedPlan = { ...plan };
    updatedPlan.weeks[selectedWeek].days[selectedDay].exercises.unshift(newExercise);
    updatedPlan.updatedAt = new Date().toISOString();
    onUpdatePlan(updatedPlan);

    setNewlyAddedExerciseId(newExerciseId);
    setTimeout(() => setNewlyAddedExerciseId(null), 100);
  };

  const updateExercise = (exerciseIndex: number, field: keyof Exercise, value: any) => {
    const updatedPlan = { ...plan };
    const exercise = updatedPlan.weeks[selectedWeek].days[selectedDay].exercises[exerciseIndex];
    (exercise as any)[field] = value;
    updatedPlan.updatedAt = new Date().toISOString();
    onUpdatePlan(updatedPlan);
  };

  const deleteExercise = (exerciseIndex: number) => {
    const updatedPlan = { ...plan };
    updatedPlan.weeks[selectedWeek].days[selectedDay].exercises.splice(exerciseIndex, 1);
    updatedPlan.updatedAt = new Date().toISOString();
    onUpdatePlan(updatedPlan);
  };

  const duplicateExercise = (exerciseIndex: number) => {
    if (!currentDay) return;
    const exerciseToCopy = currentDay.exercises[exerciseIndex];
    const newExercise: Exercise = {
      ...exerciseToCopy,
      id: `ex-${Date.now()}-${Math.random()}`,
    };

    const updatedPlan = { ...plan };
    updatedPlan.weeks[selectedWeek].days[selectedDay].exercises.splice(
      exerciseIndex + 1,
      0,
      newExercise
    );
    updatedPlan.updatedAt = new Date().toISOString();
    onUpdatePlan(updatedPlan);
  };

  const moveExerciseUp = (exerciseIndex: number) => {
    if (exerciseIndex === 0) return;

    const updatedPlan = { ...plan };
    const exercises = updatedPlan.weeks[selectedWeek].days[selectedDay].exercises;
    [exercises[exerciseIndex], exercises[exerciseIndex - 1]] = [
      exercises[exerciseIndex - 1],
      exercises[exerciseIndex],
    ];
    updatedPlan.updatedAt = new Date().toISOString();
    onUpdatePlan(updatedPlan);
  };

  const moveExerciseDown = (exerciseIndex: number) => {
    if (!currentDay) return;
    const exercises = currentDay.exercises;
    if (exerciseIndex === exercises.length - 1) return;

    const updatedPlan = { ...plan };
    const exercisesRef = updatedPlan.weeks[selectedWeek].days[selectedDay].exercises;
    [exercisesRef[exerciseIndex], exercisesRef[exerciseIndex + 1]] = [
      exercisesRef[exerciseIndex + 1],
      exercisesRef[exerciseIndex],
    ];
    updatedPlan.updatedAt = new Date().toISOString();
    onUpdatePlan(updatedPlan);
  };

  const updateDayName = (name: string) => {
    const updatedPlan = { ...plan };
    updatedPlan.weeks[selectedWeek].days[selectedDay].name = name;
    updatedPlan.updatedAt = new Date().toISOString();
    onUpdatePlan(updatedPlan);
  };

  if (!currentWeek || !currentDay) {
    return null;
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-[700px] p-0 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b space-y-3">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <span className="text-xl">{plan.emoji || '💪'}</span>
                <span className="truncate">{plan.name}</span>
              </SheetTitle>
              <SheetDescription>
                Edit workout plan details and exercises
              </SheetDescription>
            </SheetHeader>

            {/* Week Navigation */}
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={goToPrevWeek}
                disabled={selectedWeek === 0}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Prev
              </Button>
              <span className="text-sm font-medium">
                Week {selectedWeek + 1} of {plan.weeks.length}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={goToNextWeek}
                disabled={selectedWeek === plan.weeks.length - 1}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>

            {/* Day Tabs */}
            <div className="flex gap-1 overflow-x-auto pb-1">
              {currentWeek.days.map((day, idx) => {
                const exerciseCount = day.exercises?.length || 0;
                return (
                  <Button
                    key={day.id}
                    variant={selectedDay === idx ? 'default' : 'outline'}
                    size="sm"
                    className={cn(
                      'shrink-0 text-xs',
                      day.isRestDay && 'opacity-60'
                    )}
                    onClick={() => setSelectedDay(idx)}
                  >
                    {day.name || `Day ${idx + 1}`}
                    {day.isRestDay ? ' 💤' : ` (${exerciseCount})`}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Day Name Edit */}
            <div className="p-4 border-b">
              <label className="text-xs text-muted-foreground mb-1 block">
                Workout Name
              </label>
              <Input
                value={currentDay.name}
                onChange={(e) => updateDayName(e.target.value)}
                placeholder="e.g., Push Day, Upper Body"
                className="font-medium"
              />
            </div>

            {/* Add Exercise Buttons */}
            {!currentDay.isRestDay && (
              <div className="p-4 border-b flex gap-2">
                <Button variant="outline" size="sm" onClick={addBlankExercise}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Blank
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowExerciseSelector(true)}
                >
                  <Library className="w-4 h-4 mr-2" />
                  From Library
                </Button>
              </div>
            )}

            {/* Exercise List or Rest Day */}
            {currentDay.isRestDay ? (
              <div className="p-12 text-center space-y-3">
                <p className="text-3xl">😴</p>
                <p className="text-muted-foreground">This is a rest day</p>
              </div>
            ) : (
              <div className="divide-y">
                {currentDay.exercises.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">
                    <Dumbbell className="w-8 h-8 mx-auto mb-3 opacity-50" />
                    <p>No exercises yet</p>
                    <p className="text-sm">Add your first exercise to get started</p>
                  </div>
                ) : (
                  currentDay.exercises.map((exercise, idx) => (
                    <ExerciseRow
                      key={exercise.id}
                      exercise={exercise}
                      exerciseIndex={idx}
                      isFirst={idx === 0}
                      isLast={idx === currentDay.exercises.length - 1}
                      initialExpanded={exercise.id === newlyAddedExerciseId}
                      onUpdate={(field, value) => updateExercise(idx, field, value)}
                      onDuplicate={() => duplicateExercise(idx)}
                      onCopyToWorkouts={() => {}}
                      onMoveUp={() => moveExerciseUp(idx)}
                      onMoveDown={() => moveExerciseDown(idx)}
                      onDelete={() => deleteExercise(idx)}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Exercise Selector Modal */}
      {showExerciseSelector && (
        <ExerciseSelector
          onSelect={handleAddExerciseFromLibrary}
          onClose={() => setShowExerciseSelector(false)}
        />
      )}
    </>
  );
}
