'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useWorkoutExecution, getNextIncompleteExerciseId, getCompletedSetsCount } from '@/hooks/api/useWorkoutExecution';
import { RotateCcw } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { WorkoutHeader } from '@/components/client/execution/WorkoutHeader';
import { ExerciseCard } from '@/components/client/execution/ExerciseCard';
import { FinishWorkoutButton } from '@/components/client/execution/FinishWorkoutButton';
import { FlagMessageSheet } from '@/components/client/execution/FlagMessageSheet';
import type { WorkoutExercise } from '@/types/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
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
    restartWorkout,
    toggleSet,
    toggleFlag,
    updateFlagNote,
    finishWorkout,
  } = useWorkoutExecution(dayId);

  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const [showPartialConfirm, setShowPartialConfirm] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isSavingRating, setIsSavingRating] = useState(false);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
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
      startWorkout().catch(() => {
        toast.error('Failed to start workout. Please go back and try again.');
      });
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
        toast.error('Message failed to send. You can try again from the chat tab.');
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
    if (!completionId || !completion || isFinishing) return;
    setIsFinishing(true);

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

    try {
      await finishWorkout();
      setShowCelebration(true);

      // Auto-dismiss celebration after 6 seconds
      celebrationTimeoutRef.current = setTimeout(() => {
        router.push('/client');
      }, 6000);
    } catch {
      setCompletedWorkoutData(null);
      setIsFinishing(false);
      toast.error('Failed to finish workout. Please try again.');
    }
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

  // Handle restart workout
  const handleRestartClick = () => {
    setShowRestartConfirm(true);
  };

  const handleRestartConfirm = async () => {
    if (isRestarting) return;
    setIsRestarting(true);
    try {
      await restartWorkout();
      setShowRestartConfirm(false);
      setExpandedExerciseId(null);
      startedRef.current = false;
      toast.success('Workout restarted');
    } catch {
      toast.error('Failed to restart workout. Please try again.');
    } finally {
      setIsRestarting(false);
    }
  };

  // Handle effort rating selection
  const handleEffortRating = async (rating: string) => {
    if (isSavingRating) return;
    setIsSavingRating(true);

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
        // Non-critical — effort rating can be given from dashboard later
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
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {day.name}
          </h1>
        </div>

        {/* Workout Summary — stat blocks */}
        <div className="flex gap-3 mb-8 sm:mb-10">
          <div className="flex-1 bg-muted/60 rounded-lg px-3 py-2.5 text-center">
            <p className="text-2xl font-bold tabular-nums leading-none">
              {completedWorkoutData.exercisesDone}/{completedWorkoutData.exercisesTotal}
            </p>
            <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mt-1.5 font-medium">Exercises</p>
          </div>
          <div className="flex-1 bg-muted/60 rounded-lg px-3 py-2.5 text-center">
            <p className="text-2xl font-bold tabular-nums leading-none">
              {completedWorkoutData.durationMin}
            </p>
            <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mt-1.5 font-medium">Minutes</p>
          </div>
        </div>

        {/* Effort Rating */}
        <div
          className="text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground font-medium mb-4">
            How did that feel?
          </p>
          <div className="flex gap-2 sm:gap-3">
            {(['EASY', 'MEDIUM', 'HARD'] as const).map((level) => (
              <button
                key={level}
                onClick={() => handleEffortRating(level)}
                disabled={isSavingRating}
                className="px-5 sm:px-6 py-3.5 sm:py-3 rounded-full bg-foreground text-background font-bold uppercase tracking-wider text-sm hover:bg-foreground/90 transition-colors touch-manipulation min-h-[44px] disabled:opacity-50"
              >
                {level === 'EASY' ? 'Easy' : level === 'MEDIUM' ? 'Medium' : 'Hard'}
              </button>
            ))}
          </div>
        </div>

        <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-medium mt-8">
          Tap anywhere to skip
        </p>
      </div>
    );
  }

  // Restart confirmation
  if (showRestartConfirm) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-6">
            <div className="flex justify-center mb-4">
              <RotateCcw className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-bold tracking-tight text-center mb-1">
              Restart this workout?
            </h2>
            <p className="text-center text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-medium mb-6">
              All progress, flags, and notes will be cleared
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowRestartConfirm(false)}
                disabled={isRestarting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleRestartConfirm}
                disabled={isRestarting}
              >
                {isRestarting ? 'Restarting...' : 'Restart'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Partial completion confirmation
  if (showPartialConfirm) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-6">
            <h2 className="text-lg font-bold tracking-tight text-center mb-1">
              Finish this workout?
            </h2>
            <p className="text-center text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-medium mb-6">
              {stats.exercisesDone} of {stats.exercisesTotal} exercises completed
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowPartialConfirm(false)}
              >
                Keep Going
              </Button>
              <Button className="flex-1" onClick={completeWorkout} disabled={isFinishing}>
                {isFinishing ? 'Finishing...' : 'Finish Workout'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      {/* Sticky header */}
      <WorkoutHeader
        workoutName={day.name ?? 'Workout'}
        exercisesDone={stats.exercisesDone}
        exercisesTotal={stats.exercisesTotal}
        onBack={handleBack}
        onRestart={handleRestartClick}
        isReadOnly={isReadOnly}
        completedDate={
          isReadOnly && completion?.completedAt
            ? format(new Date(completion.completedAt), 'MMM d')
            : undefined
        }
      />

      {/* Exercise list — single card wrapping all exercises (Figma layout) */}
      <div className="flex-1 p-3 sm:p-4 max-w-3xl mx-auto w-full">
        <Card>
          {/* Card header — workout name + exercise count */}
          <div className="flex items-baseline justify-between px-4 py-4 sm:px-6 sm:py-5 border-b-2 border-foreground/10">
            <h2 className="font-heading text-xs font-bold tracking-[0.15em] uppercase text-muted-foreground">
              {day.name}
            </h2>
            <span className="font-heading text-xs font-bold tracking-[0.15em] uppercase text-muted-foreground">
              {stats.exercisesTotal} exercises
            </span>
          </div>

          {/* Card content — flat exercise rows */}
          <div className="px-4 py-4 sm:p-6 flex flex-col gap-6 sm:gap-8">
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
        </Card>
      </div>

      {/* Spacer so content can scroll above the fixed finish button */}
      {!isReadOnly && <div className="h-28 flex-shrink-0" />}

      {/* Sticky finish button (only for active workouts) */}
      {!isReadOnly && (
        <FinishWorkoutButton
          exercisesDone={stats.exercisesDone}
          exercisesTotal={stats.exercisesTotal}
          onFinish={handleFinishClick}
          disabled={isFinishing}
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
