import { useState } from 'react';
import { WorkoutPlan, WorkoutWeek, WorkoutDay, Exercise, AppState } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WorkoutSidebar } from './workout-builder/WorkoutSidebar';
import { ExerciseRow } from './workout-builder/ExerciseRow';
import { ExerciseEditorDrawer } from './workspace/ExerciseEditorDrawer';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface PlanBuilderProps {
  plan: WorkoutPlan;
  onUpdatePlan: (plan: WorkoutPlan) => void;
  appState?: AppState;
}

export function PlanBuilder({ plan, onUpdatePlan, appState }: PlanBuilderProps) {
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [selectedDay, setSelectedDay] = useState(0);

  // Exercise editor drawer state
  const [exerciseDrawerOpen, setExerciseDrawerOpen] = useState(false);
  const [editingExerciseIndex, setEditingExerciseIndex] = useState<number | null>(null);

  const currentWeek = plan.weeks[selectedWeek];
  const currentDay = currentWeek?.days[selectedDay];

  // Open drawer for new exercise
  const handleAddExercise = () => {
    setEditingExerciseIndex(null);
    setExerciseDrawerOpen(true);
  };

  // Open drawer for editing existing exercise
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
  const handleDeleteExerciseFromDrawer = () => {
    if (editingExerciseIndex === null) return;

    const updatedPlan = { ...plan };
    updatedPlan.weeks[selectedWeek].days[selectedDay].exercises.splice(editingExerciseIndex, 1);
    updatedPlan.updatedAt = new Date().toISOString();
    onUpdatePlan(updatedPlan);
  };

  // Get the exercise being edited (if any)
  const editingExercise = editingExerciseIndex !== null
    ? currentDay?.exercises[editingExerciseIndex]
    : null;

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
    const exerciseToCopy = currentDay.exercises[exerciseIndex];
    const newExercise: Exercise = {
      ...exerciseToCopy,
      id: `ex-${Date.now()}-${Math.random()}`
    };

    const updatedPlan = { ...plan };
    // Insert duplicate right after the original
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
      exercises[exerciseIndex]
    ];
    updatedPlan.updatedAt = new Date().toISOString();
    onUpdatePlan(updatedPlan);
  };

  const moveExerciseDown = (exerciseIndex: number) => {
    const exercises = currentDay.exercises;
    if (exerciseIndex === exercises.length - 1) return;

    const updatedPlan = { ...plan };
    const exercisesRef = updatedPlan.weeks[selectedWeek].days[selectedDay].exercises;
    [exercisesRef[exerciseIndex], exercisesRef[exerciseIndex + 1]] = [
      exercisesRef[exerciseIndex + 1],
      exercisesRef[exerciseIndex]
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
    return <div>No workout plan available</div>;
  }

  return (
    <>
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        {/* Sidebar - stacks on top on mobile, fixed 300px on desktop */}
        <div className="w-full lg:w-[300px] lg:flex-shrink-0">
          <WorkoutSidebar
            plan={plan}
            currentWeekIndex={selectedWeek}
            currentDayIndex={selectedDay}
            onSelectWorkout={(weekIdx, dayIdx) => {
              setSelectedWeek(weekIdx);
              setSelectedDay(dayIdx);
            }}
            onUpdatePlan={onUpdatePlan}
          />
        </div>

        {/* Main Content - Exercise Editing */}
        <div className="flex-1 min-w-0">
          <div className="bg-card rounded-lg border">
            {/* Header Section */}
            <div className="border-b p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <h2 className="text-lg sm:text-xl font-semibold truncate">
                    {plan.emoji} {plan.name} • Week {selectedWeek + 1}
                  </h2>
                  <Badge variant={plan.isTemplate ? 'outline' : 'secondary'} className="shrink-0">
                    {plan.isTemplate ? 'Template' : 'Client Plan'}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <Input
                  value={currentDay.name}
                  onChange={(e) => updateDayName(e.target.value)}
                  className="sm:max-w-md font-medium"
                  placeholder="Workout name"
                />
                <span className="text-sm text-muted-foreground shrink-0">
                  {currentDay.exercises.length} {currentDay.exercises.length === 1 ? 'exercise' : 'exercises'}
                </span>
              </div>
            </div>

            {/* Add Exercise Button */}
            {!currentDay.isRestDay && (
              <div className="p-4 sm:p-6 border-b">
                <Button variant="outline" className="w-full sm:w-auto" onClick={handleAddExercise}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Exercise
                </Button>
              </div>
            )}

            {/* Exercise List or Rest Day Message */}
            {currentDay.isRestDay ? (
              <div className="p-12 text-center space-y-3">
                <p className="text-3xl">😴</p>
                <p className="text-muted-foreground">This is a rest day</p>
              </div>
            ) : (
              <div className="divide-y">
                {currentDay.exercises.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">
                    <p>No exercises yet. Add your first exercise to get started.</p>
                  </div>
                ) : (
                  currentDay.exercises.map((exercise, idx) => (
                    <ExerciseRow
                      key={exercise.id}
                      exercise={exercise}
                      exerciseIndex={idx}
                      isFirst={idx === 0}
                      isLast={idx === currentDay.exercises.length - 1}
                      onUpdate={(field, value) => updateExercise(idx, field, value)}
                      onEdit={() => handleEditExercise(idx)}
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
        </div>
      </div>

      {/* Exercise Editor Drawer */}
      <ExerciseEditorDrawer
        open={exerciseDrawerOpen}
        onOpenChange={setExerciseDrawerOpen}
        exercise={editingExercise || null}
        onSave={handleSaveExercise}
        onDelete={editingExerciseIndex !== null ? handleDeleteExerciseFromDrawer : undefined}
        exerciseNumber={editingExerciseIndex !== null ? editingExerciseIndex + 1 : undefined}
      />
    </>
  );
}
