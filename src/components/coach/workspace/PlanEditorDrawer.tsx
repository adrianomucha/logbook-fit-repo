import { useState, useEffect, useRef } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkoutPlan, Exercise } from '@/types';
import { ExerciseCard } from './ExerciseCard';
import { ExerciseEditorDrawer } from './ExerciseEditorDrawer';

interface PlanEditorDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: WorkoutPlan;
  onUpdatePlan: (plan: WorkoutPlan) => void;
  /** Initial week to show (0-indexed) */
  initialWeekIndex?: number;
  /** Initial day to show (0-indexed) */
  initialDayIndex?: number;
}

export function PlanEditorDrawer({
  open,
  onOpenChange,
  plan,
  onUpdatePlan,
  initialWeekIndex = 0,
  initialDayIndex = 0,
}: PlanEditorDrawerProps) {
  const [selectedWeek, setSelectedWeek] = useState(initialWeekIndex);
  const [selectedDay, setSelectedDay] = useState(initialDayIndex);

  // Exercise editor drawer state
  const [exerciseDrawerOpen, setExerciseDrawerOpen] = useState(false);
  const [editingExerciseIndex, setEditingExerciseIndex] = useState<number | null>(null);

  const currentWeek = plan.weeks[selectedWeek];
  const currentDay = currentWeek?.days[selectedDay];

  // Local state for day name input to prevent keyboard dismissal on each keystroke.
  // The parent's onUpdatePlan triggers an API refresh which would otherwise
  // overwrite the input value and cause focus loss on mobile.
  const [localDayName, setLocalDayName] = useState(currentDay?.name || '');
  const dayNameInputRef = useRef<HTMLInputElement>(null);

  // Sync local day name when navigating to a different day/week or when plan changes externally
  useEffect(() => {
    setLocalDayName(currentDay?.name || '');
  }, [selectedWeek, selectedDay, currentDay?.name]);

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

  // Open exercise drawer for new exercise
  const handleAddExercise = () => {
    setEditingExerciseIndex(null);
    setExerciseDrawerOpen(true);
  };

  // Open exercise drawer for editing
  const handleEditExercise = (index: number) => {
    setEditingExerciseIndex(index);
    setExerciseDrawerOpen(true);
  };

  // Save exercise (new or update)
  const handleSaveExercise = (exercise: Exercise) => {
    const updatedPlan = { ...plan };

    if (editingExerciseIndex !== null) {
      // Update existing
      updatedPlan.weeks[selectedWeek].days[selectedDay].exercises[editingExerciseIndex] = exercise;
    } else {
      // Add new at top
      updatedPlan.weeks[selectedWeek].days[selectedDay].exercises.unshift(exercise);
    }

    updatedPlan.updatedAt = new Date().toISOString();
    onUpdatePlan(updatedPlan);
  };

  // Delete exercise
  const handleDeleteExercise = () => {
    if (editingExerciseIndex === null) return;

    const updatedPlan = { ...plan };
    updatedPlan.weeks[selectedWeek].days[selectedDay].exercises.splice(editingExerciseIndex, 1);
    updatedPlan.updatedAt = new Date().toISOString();
    onUpdatePlan(updatedPlan);
  };

  // Commit the day name to the parent only on blur (not on every keystroke)
  const commitDayName = () => {
    if (localDayName !== currentDay?.name) {
      const updatedPlan = { ...plan };
      updatedPlan.weeks[selectedWeek].days[selectedDay].name = localDayName;
      updatedPlan.updatedAt = new Date().toISOString();
      onUpdatePlan(updatedPlan);
    }
  };

  // Get the exercise being edited (if any)
  const editingExercise = editingExerciseIndex !== null
    ? currentDay?.exercises[editingExerciseIndex]
    : null;

  if (!currentWeek || !currentDay) {
    return null;
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-[500px] p-0 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b space-y-3">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <span className="text-xl">{plan.emoji || '💪'}</span>
                <span className="truncate">{plan.name}</span>
              </SheetTitle>
              <SheetDescription>
                Tap an exercise to edit
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
                ref={dayNameInputRef}
                value={localDayName}
                onChange={(e) => setLocalDayName(e.target.value)}
                onBlur={commitDayName}
                placeholder="e.g., Push Day, Upper Body"
                className="font-medium"
              />
            </div>

            {/* Add Exercise Button */}
            {!currentDay.isRestDay && (
              <div className="p-4 border-b">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleAddExercise}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Exercise
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
                    <ExerciseCard
                      key={exercise.id}
                      exercise={exercise}
                      exerciseIndex={idx}
                      onClick={() => handleEditExercise(idx)}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Exercise Editor Drawer - nested */}
      <ExerciseEditorDrawer
        open={exerciseDrawerOpen}
        onOpenChange={setExerciseDrawerOpen}
        exercise={editingExercise || null}
        onSave={handleSaveExercise}
        onDelete={editingExerciseIndex !== null ? handleDeleteExercise : undefined}
        exerciseNumber={editingExerciseIndex !== null ? editingExerciseIndex + 1 : undefined}
      />
    </>
  );
}
