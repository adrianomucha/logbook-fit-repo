'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useWorkoutExecution, getNextIncompleteExerciseId, getCompletedSetsCount } from '@/hooks/api/useWorkoutExecution';
import { apiFetch } from '@/lib/api-client';
import { WorkoutHeader } from '@/components/client/execution/WorkoutHeader';
import { ExerciseCard } from '@/components/client/execution/ExerciseCard';
import { FinishWorkoutButton } from '@/components/client/execution/FinishWorkoutButton';
import { FlagMessageSheet } from '@/components/client/execution/FlagMessageSheet';
import type { WorkoutExercise } from '@/types/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Dumbbell, Clock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export function ClientWorkoutExecution() {
  const router = useRouter();
  const params = useParams<{ weekId: string; dayId: string }>();
  const dayId = params?.dayId ?? null;

  const {
    day,
    exercises,
    completion,
    completionId,
    isReadOnly,
    stats,
    error,
    isLoading,
    startWorkout,
    toggleSet,
    toggleFlag,
    updateFlagNote,
    finishWorkout,
  } = useWorkoutExecution(dayId);

  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(null);
  const [showPartialConfirm, setShowPartialConfirm] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [messageSheetExercise, setMessageSheetExercise] = useState<WorkoutExercise | null>(null);
  const [completedWorkoutData, setCompletedWorkoutData] = useState<{
    exercisesDone: number;
    exercisesTotal: number;
    durationMin: number;
  } | null>(null);
  const celebrationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedRef = useRef(false);

  // Start workout if not already started
  useEffect(() => {
    if (day && !completion && !isReadOnly && !startedRef.current) {
      startedRef.current = true;
      startWorkout();
    }
  }, [day, completion, isReadOnly, startWorkout]);

  // Auto-expand first incomplete exercise on load
  useEffect(() => {
    if (completion && !isReadOnly && exercises.length > 0 && !expandedExerciseId) {
      const nextIncomplete = getNextIncompleteExerciseId(exercises);
      setExpandedExerciseId(nextIncomplete || exercises[0].workoutExerciseId);
    }
  }, [completion, exercises, expandedExerciseId, isReadOnly]);

  // Cleanup celebration timeout on unmount
  useEffect(() => {
    return () => {
      if (celebrationTimeoutRef.current) {
        clearTimeout(celebrationTimeoutRef.current);
      }
    };
  }, []);

  // Handle set toggle with auto-advance
  const handleToggleSet = useCallback(
    (workoutExerciseId: string, setNumber: number) => {
      toggleSet(workoutExerciseId, setNumber);

      // Auto-advance to next incomplete exercise after a brief delay
      setTimeout(() => {
        // We can't read the updated data directly due to closure,
        // but the optimistic update will trigger a re-render
      }, 100);
    },
    [toggleSet]
  );

  // Handle message coach (open sheet)
  const handleMessageCoach = useCallback(
    (workoutExerciseId: string) => {
      const exercise = exercises.find(
        (e) => e.workoutExerciseId === workoutExerciseId
      );
      if (exercise) {
        setMessageSheetExercise(exercise);
      }
    },
    [exercises]
  );

  // Handle send message from sheet
  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!messageSheetExercise) return;

      const setsCompleted = getCompletedSetsCount(messageSheetExercise);

      // Build prescription text
      const parts: string[] = [`${messageSheetExercise.sets}x`];
      if (messageSheetExercise.reps) parts.push(messageSheetExercise.reps);
      if (messageSheetExercise.weight) parts.push(`@ ${messageSheetExercise.weight}`);
      const prescription = parts.join(' ');

      const messageContent =
        content ||
        `I have a question about ${messageSheetExercise.exercise.name}`;

      // Send via messages API
      try {
        await apiFetch('/api/messages', {
          method: 'POST',
          body: JSON.stringify({
            content: messageContent,
            exerciseContext: {
              exerciseName: messageSheetExercise.exercise.name,
              prescription,
              setsCompleted,
              totalSets: messageSheetExercise.sets,
              flagNote: messageSheetExercise.flag?.note,
            },
          }),
        });
      } catch {
        // Silently fail — message will be lost but workout continues
      }

      setMessageSheetExercise(null);
    },
    [messageSheetExercise]
  );

  // Handle exercise expand toggle
  const handleToggleExpand = (workoutExerciseId: string) => {
    setExpandedExerciseId((prev) =>
      prev === workoutExerciseId ? null : workoutExerciseId
    );
  };

  // Handle finish workout
  const handleFinishClick = () => {
    if (stats.exercisesDone === stats.exercisesTotal) {
      completeWorkout();
    } else {
      setShowPartialConfirm(true);
    }
  };

  // Complete the workout
  const completeWorkout = async () => {
    if (!completionId || !completion) return;

    const startTime = completion.startedAt
      ? new Date(completion.startedAt).getTime()
      : Date.now();
    const durationMin = Math.round((Date.now() - startTime) / 60000);

    // Store celebration data before the API call
    setCompletedWorkoutData({
      exercisesDone: stats.exercisesDone,
      exercisesTotal: stats.exercisesTotal,
      durationMin,
    });

    setShowPartialConfirm(false);
    setShowCelebration(true);

    // Fire the finish API (no effort rating yet — that comes from celebration screen)
    await finishWorkout();

    // Auto-dismiss celebration after 6 seconds
    celebrationTimeoutRef.current = setTimeout(() => {
      router.push('/client');
    }, 6000);
  };

  // Handle back navigation
  const handleBack = () => {
    router.push('/client');
  };

  // Handle celebration dismiss
  const handleCelebrationDismiss = () => {
    if (celebrationTimeoutRef.current) {
      clearTimeout(celebrationTimeoutRef.current);
    }
    router.push('/client');
  };

  // Handle effort rating selection
  const handleEffortRating = async (rating: string) => {
    if (celebrationTimeoutRef.current) {
      clearTimeout(celebrationTimeoutRef.current);
    }

    // Save effort rating via the finish endpoint (already completed, but server handles it)
    if (completionId) {
      try {
        await apiFetch(`/api/client/workout/${completionId}/finish`, {
          method: 'POST',
          body: JSON.stringify({ effortRating: rating }),
        });
      } catch {
        // Already completed — effort rating save failed, not critical
      }
    }

    router.push('/client');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background p-3 sm:p-4 flex items-center justify-center">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Failed to load workout.</p>
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
      <div className="min-h-screen bg-background p-3 sm:p-4 flex items-center justify-center">
        <Card>
          <CardContent className="py-8 text-center">
            <Dumbbell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="font-semibold mb-2">Workout not found</p>
            <p className="text-sm text-muted-foreground mb-4">
              This workout doesn&apos;t exist in your plan.
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
        className="fixed inset-0 z-50 bg-success/5 flex flex-col items-center justify-center p-6"
        onClick={handleCelebrationDismiss}
      >
        {/* Celebration Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-success flex items-center justify-center animate-in zoom-in duration-300">
            <CheckCircle2 className="w-12 h-12 text-success-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {day.name}
          </h1>
        </div>

        {/* Workout Summary */}
        <div className="flex items-center justify-center gap-6 sm:gap-8 mb-8 sm:mb-10">
          <div className="text-center">
            <p className="text-3xl font-bold text-foreground">
              {completedWorkoutData.exercisesDone}/{completedWorkoutData.exercisesTotal}
            </p>
            <p className="text-sm text-success">exercises</p>
          </div>
          <div className="w-px h-12 bg-success/20" />
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <Clock className="w-5 h-5 text-success" />
              <p className="text-3xl font-bold text-foreground">
                {completedWorkoutData.durationMin}
              </p>
            </div>
            <p className="text-sm text-success">min</p>
          </div>
        </div>

        {/* Effort Rating */}
        <div
          className="text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-foreground mb-4 font-medium">
            How did that feel?
          </p>
          <div className="flex gap-2 sm:gap-3">
            <button
              onClick={() => handleEffortRating('EASY')}
              className="px-5 sm:px-6 py-3.5 sm:py-3 rounded-full bg-success/10 text-foreground font-medium hover:bg-success/20 transition-colors touch-manipulation min-h-[44px]"
            >
              Easy
            </button>
            <button
              onClick={() => handleEffortRating('MEDIUM')}
              className="px-5 sm:px-6 py-3.5 sm:py-3 rounded-full bg-success/10 text-foreground font-medium hover:bg-success/20 transition-colors touch-manipulation min-h-[44px]"
            >
              Medium
            </button>
            <button
              onClick={() => handleEffortRating('HARD')}
              className="px-5 sm:px-6 py-3.5 sm:py-3 rounded-full bg-success/10 text-foreground font-medium hover:bg-success/20 transition-colors touch-manipulation min-h-[44px]"
            >
              Hard
            </button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-8">
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
        workoutName={day.name ?? 'Workout'}
        exercisesDone={stats.exercisesDone}
        exercisesTotal={stats.exercisesTotal}
        onBack={handleBack}
        isReadOnly={isReadOnly}
        completedDate={
          isReadOnly && completion?.completedAt
            ? format(new Date(completion.completedAt), 'MMM d')
            : undefined
        }
      />

      {/* Exercise list */}
      <div className="flex-1 p-3 sm:p-4 space-y-3 max-w-3xl mx-auto w-full">
        {exercises.map((exercise, index) => (
          <ExerciseCard
            key={exercise.workoutExerciseId}
            exercise={exercise}
            exerciseNumber={index + 1}
            isExpanded={expandedExerciseId === exercise.workoutExerciseId}
            onToggleExpand={() => handleToggleExpand(exercise.workoutExerciseId)}
            onToggleSet={handleToggleSet}
            onToggleFlag={() => toggleFlag(exercise.workoutExerciseId)}
            onUpdateFlagNote={(note) => updateFlagNote(exercise.workoutExerciseId, note)}
            onMessageCoach={() => handleMessageCoach(exercise.workoutExerciseId)}
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
        onSend={handleSendMessage}
      />
    </div>
  );
}
