import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppState, Exercise, Message, EffortRating } from '@/types';
import { WorkoutHeader } from '@/components/client/execution/WorkoutHeader';
import { ExerciseCard } from '@/components/client/execution/ExerciseCard';
import { FinishWorkoutButton } from '@/components/client/execution/FinishWorkoutButton';
import { FlagMessageSheet } from '@/components/client/execution/FlagMessageSheet';
import {
  startWorkout,
  toggleSet,
  calculateCompletionStats,
  getNextIncompleteExercise,
  finishWorkout,
  isExerciseComplete,
  toggleExerciseFlag,
  isExerciseFlagged,
  getExerciseFlag,
  updateFlagNote,
  getCompletedSetsCount,
} from '@/lib/workout-execution-helpers';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Dumbbell, Clock } from 'lucide-react';
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
  const [messageSheetExercise, setMessageSheetExercise] = useState<Exercise | null>(null);
  const [completedWorkoutData, setCompletedWorkoutData] = useState<{
    exercisesDone: number;
    exercisesTotal: number;
    durationMin: number;
    workoutCompletionId: string;
  } | null>(null);
  const celebrationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Get exercise flags for this workout
  const workoutExerciseFlags = useMemo(() => {
    if (!workoutCompletion) return [];
    return appState.exerciseFlags.filter(
      (ef) => ef.workoutCompletionId === workoutCompletion.id
    );
  }, [appState.exerciseFlags, workoutCompletion]);

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

  // Cleanup celebration timeout on unmount
  useEffect(() => {
    return () => {
      if (celebrationTimeoutRef.current) {
        clearTimeout(celebrationTimeoutRef.current);
      }
    };
  }, []);

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

  // Handle flag toggle
  const handleToggleFlag = useCallback(
    (exerciseId: string) => {
      if (!workoutCompletion || isReadOnly) return;

      onUpdateState((state) => ({
        ...state,
        exerciseFlags: toggleExerciseFlag(
          state.exerciseFlags,
          workoutCompletion.id,
          exerciseId
        ),
      }));
    },
    [workoutCompletion, isReadOnly, onUpdateState]
  );

  // Handle flag note update
  const handleUpdateFlagNote = useCallback(
    (exerciseId: string, note: string) => {
      if (!workoutCompletion || isReadOnly) return;

      const flag = getExerciseFlag(exerciseId, appState.exerciseFlags, workoutCompletion.id);
      if (!flag) return;

      onUpdateState((state) => ({
        ...state,
        exerciseFlags: updateFlagNote(state.exerciseFlags, flag.id, note),
      }));
    },
    [workoutCompletion, isReadOnly, appState.exerciseFlags, onUpdateState]
  );

  // Handle message coach (open sheet)
  const handleMessageCoach = useCallback(
    (exerciseId: string) => {
      const exercise = exercises.find((e) => e.id === exerciseId);
      if (exercise) {
        setMessageSheetExercise(exercise);
      }
    },
    [exercises]
  );

  // Build prescription text for an exercise
  const getExercisePrescription = (exercise: Exercise) => {
    const parts: string[] = [`${exercise.sets}x`];
    if (exercise.reps) parts.push(exercise.reps);
    if (exercise.time) parts.push(exercise.time);
    if (exercise.weight) parts.push(`@ ${exercise.weight}`);
    return parts.join(' ');
  };

  // Handle send message from sheet
  const handleSendMessage = useCallback(
    (content: string) => {
      if (!messageSheetExercise || !currentClient || !workoutCompletion) return;

      const flag = getExerciseFlag(messageSheetExercise.id, appState.exerciseFlags, workoutCompletion.id);
      const setsCompleted = getCompletedSetsCount(
        messageSheetExercise.id,
        workoutSetCompletions,
        workoutCompletion.id
      );

      const newMessage: Message = {
        id: `msg-${Date.now()}`,
        senderId: appState.currentUserId,
        senderName: currentClient.name,
        content: content || `I have a question about ${messageSheetExercise.name}`,
        timestamp: new Date().toISOString(),
        read: false,
        exerciseContext: {
          exerciseId: messageSheetExercise.id,
          exerciseName: messageSheetExercise.name,
          prescription: getExercisePrescription(messageSheetExercise),
          setsCompleted,
          totalSets: messageSheetExercise.sets,
          flagNote: flag?.note,
        },
      };

      onUpdateState((state) => ({
        ...state,
        messages: [...state.messages, newMessage],
      }));

      setMessageSheetExercise(null);
    },
    [messageSheetExercise, currentClient, workoutCompletion, appState.exerciseFlags, appState.currentUserId, workoutSetCompletions, onUpdateState]
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

    // Calculate duration in minutes
    const startTime = workoutCompletion.startedAt ? new Date(workoutCompletion.startedAt).getTime() : Date.now();
    const endTime = Date.now();
    const durationMin = Math.round((endTime - startTime) / 60000);

    onUpdateState((state) => ({
      ...state,
      workoutCompletions: state.workoutCompletions.map((wc) =>
        wc.id === workoutCompletion.id ? finishedCompletion : wc
      ),
    }));

    // Store completed workout data for celebration screen
    setCompletedWorkoutData({
      exercisesDone: stats.exercisesDone,
      exercisesTotal: stats.exercisesTotal,
      durationMin,
      workoutCompletionId: workoutCompletion.id,
    });

    setShowPartialConfirm(false);
    setShowCelebration(true);

    // Auto-dismiss celebration after 6 seconds (longer to allow effort rating tap)
    celebrationTimeoutRef.current = setTimeout(() => {
      navigate('/client');
    }, 6000);
  };

  // Handle back navigation
  const handleBack = () => {
    navigate('/client');
  };

  // Handle celebration dismiss (tap outside effort buttons)
  const handleCelebrationDismiss = () => {
    if (celebrationTimeoutRef.current) {
      clearTimeout(celebrationTimeoutRef.current);
    }
    navigate('/client');
  };

  // Handle effort rating selection
  const handleEffortRating = (rating: EffortRating) => {
    if (celebrationTimeoutRef.current) {
      clearTimeout(celebrationTimeoutRef.current);
    }

    // Save the effort rating to the workout completion
    if (completedWorkoutData) {
      onUpdateState((state) => ({
        ...state,
        workoutCompletions: state.workoutCompletions.map((wc) =>
          wc.id === completedWorkoutData.workoutCompletionId
            ? { ...wc, effortRating: rating }
            : wc
        ),
      }));
    }

    navigate('/client');
  };

  // Get message sheet completion state
  const getMessageSheetCompletionState = () => {
    if (!messageSheetExercise || !workoutCompletion) {
      return { setsCompleted: 0, totalSets: 0 };
    }
    const setsCompleted = getCompletedSetsCount(
      messageSheetExercise.id,
      workoutSetCompletions,
      workoutCompletion.id
    );
    return { setsCompleted, totalSets: messageSheetExercise.sets };
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

  // Celebration overlay with effort rating
  if (showCelebration && completedWorkoutData) {
    return (
      <div
        className="fixed inset-0 z-50 bg-green-50 dark:bg-green-950 flex flex-col items-center justify-center p-6"
        onClick={handleCelebrationDismiss}
      >
        {/* Celebration Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500 flex items-center justify-center animate-in zoom-in duration-300">
            <CheckCircle2 className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-green-800 dark:text-green-200">
            {day.name}
          </h1>
        </div>

        {/* Workout Summary */}
        <div className="flex items-center justify-center gap-8 mb-10">
          <div className="text-center">
            <p className="text-3xl font-bold text-green-800 dark:text-green-200">
              {completedWorkoutData.exercisesDone}/{completedWorkoutData.exercisesTotal}
            </p>
            <p className="text-sm text-green-600 dark:text-green-400">exercises</p>
          </div>
          <div className="w-px h-12 bg-green-300 dark:bg-green-700" />
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <Clock className="w-5 h-5 text-green-600 dark:text-green-400" />
              <p className="text-3xl font-bold text-green-800 dark:text-green-200">
                {completedWorkoutData.durationMin}
              </p>
            </div>
            <p className="text-sm text-green-600 dark:text-green-400">min</p>
          </div>
        </div>

        {/* Effort Rating */}
        <div
          className="text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-green-700 dark:text-green-300 mb-4 font-medium">
            How did that feel?
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => handleEffortRating('EASY')}
              className="px-6 py-3 rounded-full bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 font-medium hover:bg-green-300 dark:hover:bg-green-700 transition-colors touch-manipulation"
            >
              Easy
            </button>
            <button
              onClick={() => handleEffortRating('MEDIUM')}
              className="px-6 py-3 rounded-full bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 font-medium hover:bg-green-300 dark:hover:bg-green-700 transition-colors touch-manipulation"
            >
              Medium
            </button>
            <button
              onClick={() => handleEffortRating('HARD')}
              className="px-6 py-3 rounded-full bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 font-medium hover:bg-green-300 dark:hover:bg-green-700 transition-colors touch-manipulation"
            >
              Hard
            </button>
          </div>
        </div>

        <p className="text-xs text-green-500 dark:text-green-600 mt-8">
          Tap anywhere to skip
        </p>
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
            isFlagged={
              workoutCompletion
                ? isExerciseFlagged(exercise.id, workoutExerciseFlags, workoutCompletion.id)
                : false
            }
            flagNote={
              workoutCompletion
                ? getExerciseFlag(exercise.id, workoutExerciseFlags, workoutCompletion.id)?.note
                : undefined
            }
            onToggleFlag={() => handleToggleFlag(exercise.id)}
            onUpdateFlagNote={(note) => handleUpdateFlagNote(exercise.id, note)}
            onMessageCoach={() => handleMessageCoach(exercise.id)}
            isReadOnly={isReadOnly}
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

      {/* Message coach bottom sheet */}
      <FlagMessageSheet
        isOpen={!!messageSheetExercise}
        onClose={() => setMessageSheetExercise(null)}
        exercise={messageSheetExercise}
        flagNote={
          messageSheetExercise && workoutCompletion
            ? getExerciseFlag(messageSheetExercise.id, workoutExerciseFlags, workoutCompletion.id)?.note
            : undefined
        }
        completionState={getMessageSheetCompletionState()}
        onSend={handleSendMessage}
      />
    </div>
  );
}
