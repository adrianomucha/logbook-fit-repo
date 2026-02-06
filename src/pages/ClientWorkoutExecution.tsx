import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppState, WorkoutCompletion, SetCompletion } from '@/types';
import { WorkoutHeader } from '@/components/client/execution/WorkoutHeader';
import { ExerciseCard } from '@/components/client/execution/ExerciseCard';
import { FinishWorkoutButton } from '@/components/client/execution/FinishWorkoutButton';
import {
  startWorkout,
  toggleSet,
  calculateCompletionStats,
  getNextIncompleteExercise,
  finishWorkout,
  isExerciseComplete,
} from '@/lib/workout-execution-helpers';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Dumbbell } from 'lucide-react';
import { format } from 'date-fns';

interface ClientWorkoutExecutionProps {
  appState: AppState;
  onUpdateState: (updater: (state: AppState) => AppState) => void;
}

export function ClientWorkoutExecution({
  appState,
  onUpdateState,
}: ClientWorkoutExecutionProps) {
  const navigate = useNavigate();
  const { weekId, dayId } = useParams<{ weekId: string; dayId: string }>();

  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(null);
  const [showPartialConfirm, setShowPartialConfirm] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // Find current client
  const currentClient = appState.clients.find((c) => c.id === appState.currentUserId);

  // Find the plan
  const currentPlan = currentClient
    ? appState.plans.find((p) => p.id === currentClient.currentPlanId)
    : undefined;

  // Find the week and day
  const week = currentPlan?.weeks.find((w) => w.id === weekId);
  const day = week?.days.find((d) => d.id === dayId);
  const exercises = day?.exercises || [];

  // Find or create workout completion
  const workoutCompletion = useMemo(() => {
    return appState.workoutCompletions.find(
      (wc) =>
        wc.clientId === appState.currentUserId &&
        wc.weekId === weekId &&
        wc.dayId === dayId
    );
  }, [appState.workoutCompletions, appState.currentUserId, weekId, dayId]);

  // Get set completions for this workout
  const workoutSetCompletions = useMemo(() => {
    if (!workoutCompletion) return [];
    return appState.setCompletions.filter(
      (sc) => sc.workoutCompletionId === workoutCompletion.id
    );
  }, [appState.setCompletions, workoutCompletion]);

  // Calculate completion stats
  const stats = useMemo(() => {
    if (!workoutCompletion) {
      return { completionPct: 0, exercisesDone: 0, exercisesTotal: exercises.length };
    }
    return calculateCompletionStats(exercises, workoutSetCompletions, workoutCompletion.id);
  }, [exercises, workoutSetCompletions, workoutCompletion]);

  // Is this a read-only view (completed workout)?
  const isReadOnly = workoutCompletion?.status === 'COMPLETED';

  // Start workout if not already started
  useEffect(() => {
    if (!workoutCompletion && currentClient && currentPlan && day && !isReadOnly) {
      const newCompletion = startWorkout(
        currentClient.id,
        currentPlan.id,
        weekId!,
        dayId!,
        exercises.length
      );

      onUpdateState((state) => ({
        ...state,
        workoutCompletions: [...state.workoutCompletions, newCompletion],
      }));
    }
  }, [workoutCompletion, currentClient, currentPlan, weekId, dayId, exercises.length, onUpdateState, day, isReadOnly]);

  // Auto-expand first incomplete exercise on load
  useEffect(() => {
    if (workoutCompletion && !isReadOnly && exercises.length > 0 && !expandedExerciseId) {
      const nextIncomplete = getNextIncompleteExercise(
        exercises,
        workoutSetCompletions,
        workoutCompletion.id
      );
      setExpandedExerciseId(nextIncomplete || exercises[0].id);
    }
  }, [workoutCompletion, exercises, workoutSetCompletions, expandedExerciseId, isReadOnly]);

  // Handle set toggle
  const handleToggleSet = useCallback(
    (exerciseId: string, setNumber: number) => {
      if (!workoutCompletion || isReadOnly) return;

      const exercise = exercises.find((e) => e.id === exerciseId);
      const updatedSetCompletions = toggleSet(
        appState.setCompletions,
        workoutCompletion.id,
        exerciseId,
        setNumber,
        exercise?.weight,
        exercise?.reps
      );

      onUpdateState((state) => ({
        ...state,
        setCompletions: updatedSetCompletions,
      }));

      // Check if this exercise is now complete and auto-expand next
      setTimeout(() => {
        const updatedWorkoutSetCompletions = updatedSetCompletions.filter(
          (sc) => sc.workoutCompletionId === workoutCompletion.id
        );

        if (exercise && isExerciseComplete(exercise, updatedWorkoutSetCompletions, workoutCompletion.id)) {
          const nextIncomplete = getNextIncompleteExercise(
            exercises,
            updatedWorkoutSetCompletions,
            workoutCompletion.id
          );
          if (nextIncomplete) {
            setExpandedExerciseId(nextIncomplete);
          }
        }
      }, 100);
    },
    [workoutCompletion, isReadOnly, exercises, appState.setCompletions, onUpdateState]
  );

  // Handle exercise expand toggle
  const handleToggleExpand = (exerciseId: string) => {
    setExpandedExerciseId((prev) => (prev === exerciseId ? null : exerciseId));
  };

  // Handle finish workout
  const handleFinishClick = () => {
    if (stats.exercisesDone === stats.exercisesTotal) {
      // All done - go straight to celebration
      completeWorkout();
    } else {
      // Partial - show confirmation
      setShowPartialConfirm(true);
    }
  };

  // Complete the workout
  const completeWorkout = () => {
    if (!workoutCompletion) return;

    const finishedCompletion = finishWorkout(
      workoutCompletion,
      exercises,
      workoutSetCompletions
    );

    onUpdateState((state) => ({
      ...state,
      workoutCompletions: state.workoutCompletions.map((wc) =>
        wc.id === workoutCompletion.id ? finishedCompletion : wc
      ),
    }));

    setShowPartialConfirm(false);
    setShowCelebration(true);

    // Auto-dismiss celebration after 4 seconds
    setTimeout(() => {
      navigate('/client');
    }, 4000);
  };

  // Handle back navigation
  const handleBack = () => {
    navigate('/client');
  };

  // Handle celebration click (dismiss early)
  const handleCelebrationClick = () => {
    navigate('/client');
  };

  // Error states
  if (!currentClient || !currentPlan) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No workout plan found.</p>
            <Button onClick={handleBack} className="mt-4">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!day) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Card>
          <CardContent className="py-8 text-center">
            <Dumbbell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="font-semibold mb-2">Workout not found</p>
            <p className="text-sm text-muted-foreground mb-4">
              This workout doesn't exist in your plan.
            </p>
            <Button onClick={handleBack}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Celebration overlay
  if (showCelebration) {
    return (
      <div
        className="fixed inset-0 z-50 bg-green-50 dark:bg-green-950 flex items-center justify-center p-4"
        onClick={handleCelebrationClick}
      >
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500 flex items-center justify-center">
            <CheckCircle2 className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-green-800 dark:text-green-200 mb-2">
            Workout Complete!
          </h1>
          <p className="text-xl text-green-700 dark:text-green-300 mb-2">
            {day.name}
          </p>
          <p className="text-green-600 dark:text-green-400">
            {stats.exercisesDone}/{stats.exercisesTotal} exercises
          </p>
          <p className="text-sm text-green-500 dark:text-green-500 mt-6">
            Tap anywhere to continue
          </p>
        </div>
      </div>
    );
  }

  // Partial completion confirmation
  if (showPartialConfirm) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-6">
            <h2 className="text-xl font-semibold text-center mb-2">
              Finish this workout?
            </h2>
            <p className="text-center text-muted-foreground mb-6">
              You completed {stats.exercisesDone} of {stats.exercisesTotal}{' '}
              exercises
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowPartialConfirm(false)}
              >
                Keep Going
              </Button>
              <Button className="flex-1" onClick={completeWorkout}>
                Finish Workout
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Sticky header */}
      <WorkoutHeader
        workoutName={day.name}
        exercisesDone={stats.exercisesDone}
        exercisesTotal={stats.exercisesTotal}
        onBack={handleBack}
        isReadOnly={isReadOnly}
        completedDate={
          isReadOnly && workoutCompletion?.completedAt
            ? format(new Date(workoutCompletion.completedAt), 'MMM d')
            : undefined
        }
      />

      {/* Exercise list */}
      <div className="flex-1 p-4 space-y-3">
        {exercises.map((exercise, index) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            exerciseNumber={index + 1}
            isExpanded={expandedExerciseId === exercise.id}
            onToggleExpand={() => handleToggleExpand(exercise.id)}
            workoutCompletionId={workoutCompletion?.id || ''}
            setCompletions={workoutSetCompletions}
            onToggleSet={handleToggleSet}
          />
        ))}
      </div>

      {/* Sticky finish button (only for active workouts) */}
      {!isReadOnly && (
        <FinishWorkoutButton
          exercisesDone={stats.exercisesDone}
          exercisesTotal={stats.exercisesTotal}
          onFinish={handleFinishClick}
        />
      )}
    </div>
  );
}
