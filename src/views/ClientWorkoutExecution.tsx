'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useWorkoutExecution, getNextIncompleteExerciseId, getCompletedSetsCount, isExerciseComplete } from '@/hooks/api/useWorkoutExecution';
import { apiFetch } from '@/lib/api-client';
import { WorkoutHeader } from '@/components/client/execution/WorkoutHeader';
import { ExerciseCard } from '@/components/client/execution/ExerciseCard';
import { FinishWorkoutButton } from '@/components/client/execution/FinishWorkoutButton';
import { FlagMessageSheet } from '@/components/client/execution/FlagMessageSheet';
import { WorkoutCelebration } from '@/components/client/execution/WorkoutCelebration';
import type { WorkoutExercise } from '@/types/api';
import { groupBySuperset, isSuperset, exerciseLabel } from '@/lib/superset';
import { Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ConfirmationModal } from '@/components/coach/ConfirmationModal';
import { Button } from '@/components/ui/button';
import { Dumbbell, Flag, Loader2, RotateCcw } from 'lucide-react';
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
    restartWorkout,
    toggleSet,
    updateSet,
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

  // Auto-expand first incomplete exercise on load — once. Re-running whenever
  // expandedExerciseId goes null would make collapsing a card impossible (it
  // snaps back open) and pop the first card open after the last one completes.
  // Viewing the page does NOT start the workout — the completion is created
  // on the first interaction.
  const didAutoExpandRef = useRef(false);
  useEffect(() => {
    if (didAutoExpandRef.current) return;
    if (day && !isReadOnly && exercises.length > 0) {
      didAutoExpandRef.current = true;
      const nextIncomplete = getNextIncompleteExerciseId(exercises);
      setExpandedExerciseId(nextIncomplete || exercises[0].workoutExerciseId);
    }
  }, [day, exercises, isReadOnly]);

  // Escape leaves the celebration screen, matching every other overlay in the app
  useEffect(() => {
    if (!showCelebration) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCelebrationDismiss();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
    // handleCelebrationDismiss only closes over stable refs and the router
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCelebration]);

  // Auto-advance: when the currently-expanded exercise becomes fully complete,
  // collapse it and jump to the next incomplete exercise (scrolling it into view).
  const completeIdsRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (isReadOnly || exercises.length === 0) return;

    const nowComplete = new Set(
      exercises.filter(isExerciseComplete).map((e) => e.workoutExerciseId)
    );

    // Seed on first run so pre-completed exercises don't trigger a jump on load.
    if (completeIdsRef.current === null) {
      completeIdsRef.current = nowComplete;
      return;
    }

    const prev = completeIdsRef.current;
    completeIdsRef.current = nowComplete;

    // Only react when the exercise the user is looking at just got completed.
    if (
      expandedExerciseId &&
      nowComplete.has(expandedExerciseId) &&
      !prev.has(expandedExerciseId)
    ) {
      const next = exercises.find((e) => !isExerciseComplete(e));
      if (next) {
        setExpandedExerciseId(next.workoutExerciseId);
        // Scroll the next exercise to just below the sticky header. Measure the
        // header height (it varies with the title) so the row never hides under it.
        // Two frames: let the collapse/expand reflow settle before measuring.
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            const el = document.getElementById(`exercise-${next.workoutExerciseId}`);
            if (!el) return;
            const headerH =
              document.querySelector('header')?.getBoundingClientRect().height ?? 0;
            const top = el.getBoundingClientRect().top + window.scrollY - headerH - 12;
            window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
          })
        );
      } else {
        setExpandedExerciseId(null);
      }
    }
  }, [exercises, expandedExerciseId, isReadOnly]);

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

      // Exercise context travels inside the message text so the coach sees it
      // in any chat surface; the reference ids link it to the workout data
      const contextLine = `🚩 ${messageSheetExercise.exercise.name} · ${prescription} · ${setsCompleted}/${messageSheetExercise.sets} sets done`;
      const flagNote = messageSheetExercise.flag?.note ? `\n“${messageSheetExercise.flag.note}”` : '';
      const question =
        content.trim() || `I have a question about ${messageSheetExercise.exercise.name}`;
      const messageContent = `${contextLine}${flagNote}\n\n${question}`;

      // Send via messages API — recipient (the coach) is resolved server-side
      try {
        await apiFetch('/api/messages', {
          method: 'POST',
          body: JSON.stringify({
            content: messageContent,
            exerciseReferenceId: messageSheetExercise.workoutExerciseId,
            ...(completionId ? { workoutReferenceId: completionId } : {}),
          }),
        });
        setMessageSheetExercise(null);
        toast.success('Sent to your coach');
      } catch {
        toast.error('Message failed to send. Please try again.');
        throw new Error('send-failed'); // keeps the draft in the sheet
      }
    },
    [messageSheetExercise, completionId]
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

  // Complete the workout (starts it first if the user hasn't logged anything).
  // Ref guard: isFinishing state is stale within the same tick, so a fast
  // double-tap would finish twice — the second call 400s after the first
  // succeeds and used to toast an error over a successful finish.
  const finishingRef = useRef(false);
  const completeWorkout = async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    setIsFinishing(true);

    const startTime = completion?.startedAt
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
      // No auto-dismiss timer: the effort-rating buttons are a live decision,
      // and a 6s redirect used to take them off screen mid-thought (WCAG 2.2.1).
    } catch (err) {
      finishingRef.current = false;
      setCompletedWorkoutData(null);
      setIsFinishing(false);
      toast.error(
        err instanceof Error && err.message
          ? err.message
          : 'Failed to finish workout. Please try again.'
      );
    }
  };

  // Handle back navigation
  const handleBack = () => {
    router.push('/client');
  };

  // Handle celebration dismiss
  const handleCelebrationDismiss = () => {
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
      <div className="min-h-dvh bg-background flex items-center justify-center animate-enter">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-dvh bg-background p-3 sm:p-4 flex items-center justify-center">
        <div className="bg-card rounded-xl overflow-hidden border border-border/70 animate-enter">
          <div className="py-8 px-6 text-center">
            <p className="text-muted-foreground antialiased">Failed to load workout.</p>
            <Button onClick={handleBack} className="mt-4 active:scale-[0.96] transition-transform duration-150">
              Go back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!day) {
    return (
      <div className="min-h-dvh bg-background p-3 sm:p-4 flex items-center justify-center">
        <div className="bg-card rounded-xl overflow-hidden border border-border/70 animate-enter">
          <div className="py-8 px-6 text-center">
            <Dumbbell className="w-10 h-10 mx-auto text-muted-foreground/60 mb-4" />
            <p className="font-semibold mb-1.5 tracking-tight antialiased">Workout not found</p>
            <p className="text-sm text-muted-foreground mb-5 antialiased">
              This workout doesn&apos;t exist in your plan.
            </p>
            <Button onClick={handleBack} className="active:scale-[0.96] transition-transform duration-150">Go back</Button>
          </div>
        </div>
      </div>
    );
  }

  // Celebration overlay with effort rating
  if (showCelebration && completedWorkoutData) {
    return (
      <WorkoutCelebration
        workoutName={day.name ?? 'Workout'}
        exercisesDone={completedWorkoutData.exercisesDone}
        exercisesTotal={completedWorkoutData.exercisesTotal}
        durationMin={completedWorkoutData.durationMin}
        isSavingRating={isSavingRating}
        onEffortRating={handleEffortRating}
        onDismiss={handleCelebrationDismiss}
      />
    );
  }

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      {/* Sticky header */}
      <WorkoutHeader
        workoutName={day.name ?? 'Workout'}
        dayLabel={day.orderIndex ? `Day ${day.orderIndex}` : undefined}
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

      {/* Exercise list — open and full-width: bigger tap targets mid-workout */}
      <div
        className={cn(
          'px-4 pt-4 max-w-2xl mx-auto w-full flex-1',
          // The finish bar sits in normal flow below, so only modest clearance is needed
          isReadOnly ? 'pb-8' : 'pb-6'
        )}
      >
        <section aria-label="Exercises">
          <div className="flex items-baseline justify-between mb-1 px-1">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-medium">
              Exercises
            </h2>
            <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
              {stats.exercisesDone}/{exercises.length}
            </span>
          </div>
          <div className="divide-y divide-border/50">
            {groupBySuperset(exercises).map((group, groupIndex) => {
            const renderCard = (exercise: WorkoutExercise, memberIndex: number) => (
              <ExerciseCard
                key={exercise.workoutExerciseId}
                id={`exercise-${exercise.workoutExerciseId}`}
                exercise={exercise}
                exerciseLabel={exerciseLabel(groupIndex + 1, memberIndex, group.length)}
                isExpanded={expandedExerciseId === exercise.workoutExerciseId}
                onToggleExpand={() => handleToggleExpand(exercise.workoutExerciseId)}
                onToggleSet={toggleSet}
                onUpdateSet={updateSet}
                onToggleFlag={() => toggleFlag(exercise.workoutExerciseId)}
                onUpdateFlagNote={(note) => updateFlagNote(exercise.workoutExerciseId, note)}
                onMessageCoach={() => handleMessageCoach(exercise.workoutExerciseId)}
                isReadOnly={isReadOnly}
              />
            );

            if (!isSuperset(group)) {
              return (
                <div key={group[0].workoutExerciseId} className="py-1.5">
                  {renderCard(group[0], 0)}
                </div>
              );
            }

            // Superset: members share a volt left rail so they read as one station
            return (
              <div key={group[0].workoutExerciseId} className="py-3.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <Link2 className="w-3 h-3 text-muted-foreground/60" />
                  <span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Superset
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    · Alternate sets
                  </span>
                </div>
                <div className="border-l-2 border-brand/60 pl-3 divide-y divide-border/40">
                  {group.map((exercise, memberIndex) => renderCard(exercise, memberIndex))}
                </div>
              </div>
            );
          })}
          </div>
        </section>
      </div>

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

      {/* Both confirmations go through the shared Modal, which owns the focus
          trap, Escape, scroll lock and focus restore the hand-rolled overlays
          skipped. They also no longer unmount the workout behind them. */}
      <ConfirmationModal
        isOpen={showRestartConfirm}
        onClose={() => setShowRestartConfirm(false)}
        onConfirm={handleRestartConfirm}
        title="Restart this workout?"
        message="You'll start again from the first set."
        warningMessage="All progress, flags, and notes from this session are cleared."
        confirmLabel="Restart workout"
        confirmVariant="destructive"
        icon={RotateCcw}
      />

      <ConfirmationModal
        isOpen={showPartialConfirm}
        onClose={() => setShowPartialConfirm(false)}
        onConfirm={completeWorkout}
        title="Finish this workout?"
        message={`You've completed ${stats.exercisesDone} of ${stats.exercisesTotal} exercises. The rest will be logged as skipped.`}
        confirmLabel="Finish workout"
        cancelLabel="Keep going"
        icon={Flag}
      />
    </div>
  );
}
