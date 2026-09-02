import { useId } from 'react';
import { Input } from '@/components/ui/input';
import { Check, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WorkoutExercise } from '@/types/api';
import { formatLastCompact } from '@logbook/shared/workout-execution';
import {
  SetRow,
  SET_GRID,
  parseTargetReps,
  parseTargetSeconds,
  parseTargetWeight,
} from './SetRow';
import {
  isExerciseComplete,
  getCompletedSetsCount,
  isSetCompleted,
} from '@/hooks/api/useWorkoutExecution';

interface ExerciseCardProps {
  exercise: WorkoutExercise;
  /** Display label: "4" for a standalone exercise, "4A"/"4B" inside a superset */
  exerciseLabel: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleSet: (workoutExerciseId: string, setNumber: number) => void;
  onUpdateSet?: (
    workoutExerciseId: string,
    setNumber: number,
    patch: { actualReps?: number; actualWeight?: number }
  ) => void;
  onToggleFlag?: () => void;
  onUpdateFlagNote?: (note: string) => void;
  onMessageCoach?: () => void;
  isReadOnly?: boolean;
  /** DOM id on the root, used to scroll this exercise into view on auto-advance */
  id?: string;
}

export function ExerciseCard({
  exercise,
  exerciseLabel,
  isExpanded,
  onToggleExpand,
  onToggleSet,
  onUpdateSet,
  onToggleFlag,
  onUpdateFlagNote,
  onMessageCoach,
  isReadOnly = false,
  id,
}: ExerciseCardProps) {
  const isComplete = isExerciseComplete(exercise);
  const completedSets = getCompletedSetsCount(exercise);
  const isFlagged = !!exercise.flag;
  const flagNote = exercise.flag?.note;
  const flagNoteId = useId();

  // Zero-pad the numeric part so labels line up with the dashboard's
  // exercise preview list: "4" → "04", "4B" → "04B".
  const displayLabel = exerciseLabel.replace(/^\d+/, (n) => n.padStart(2, '0'));

  // Build prescription subtitle: "3×10-12 · 50 lbs"
  const getPrescription = () => {
    let text = exercise.reps ? `${exercise.sets}×${exercise.reps}` : `${exercise.sets} sets`;
    if (exercise.weight) text += ` · ${exercise.weight}`;
    return text;
  };

  const setRows = Array.from({ length: exercise.sets }, (_, i) => i + 1);

  // The countdown lives under the next set still to be done. One timer per
  // exercise keeps a 3-set plank from stacking three stopwatches, and the
  // timer moves down on its own as each set completes.
  const nextSetNumber =
    exercise.trackingType === 'TIME'
      ? setRows.find((n) => !isSetCompleted(exercise.setCompletions, n))
      : undefined;

  const handleFlagClick = () => {
    if (!isReadOnly && onToggleFlag) onToggleFlag();
  };

  const handleToggleAllSets = () => {
    if (isReadOnly) return;
    // Toggle all sets — if all complete, uncomplete them; otherwise complete remaining
    const setNumbers = Array.from({ length: exercise.sets }, (_, i) => i + 1);
    const targetSets = isComplete
      ? setNumbers.filter((n) => isSetCompleted(exercise.setCompletions, n))
      : setNumbers.filter((n) => !isSetCompleted(exercise.setCompletions, n));
    const isTime = exercise.trackingType === 'TIME';
    for (const setNumber of targetSets) {
      if (!isComplete) {
        // Persist actuals for each set, exactly like a per-set tap does —
        // otherwise bulk-completed exercises log nothing, leaving next
        // session's LAST column blank and coach deviation review blind.
        const sc = exercise.setCompletions.find((s) => s.setNumber === setNumber);
        const reps =
          sc?.actualReps ??
          (isTime
            ? parseTargetSeconds(exercise.reps ?? undefined)
            : parseTargetReps(exercise.reps ?? undefined));
        const weight = sc?.actualWeight ?? parseTargetWeight(exercise.weight ?? undefined);
        const patch: { actualReps?: number; actualWeight?: number } = {};
        if (reps != null) patch.actualReps = reps;
        if (weight != null) patch.actualWeight = weight;
        if (Object.keys(patch).length > 0) {
          onUpdateSet?.(exercise.workoutExerciseId, setNumber, patch);
        }
      }
      onToggleSet(exercise.workoutExerciseId, setNumber);
    }
  };

  return (
    <div id={id}>
      {/* ── Exercise row ──
          Expand and mark-all are siblings, never nested: a <button> may not
          contain another interactive element, and nesting them hid the
          mark-all control behind the outer button's accessible name. */}
      <div className="flex items-center gap-3.5 min-h-[56px]">
        <button
          type="button"
          onClick={onToggleExpand}
          className="flex-1 min-w-0 flex items-center gap-3.5 text-left py-2.5 rounded-lg transition-colors hover:bg-muted/30 active:scale-[0.99] touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          aria-expanded={isExpanded}
          aria-label={`${exercise.exercise.name}, ${getPrescription()}`}
        >
          {/* Left — mono index, same voice as the dashboard preview list */}
          <span
            className={cn(
              'font-mono text-[11px] font-medium tabular-nums w-7 text-right flex-shrink-0 transition-colors',
              isComplete ? 'text-success' : 'text-muted-foreground'
            )}
          >
            {displayLabel}
          </span>

          {/* Middle — name + prescription */}
          <div className="flex-1 min-w-0 flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <p
                className={cn(
                  'text-[15px] font-semibold tracking-tight leading-snug truncate transition-colors',
                  isComplete ? 'text-muted-foreground' : 'text-foreground'
                )}
              >
                {exercise.exercise.name}
              </p>
              {isFlagged && (
                <div className="w-1.5 h-1.5 rounded-full bg-warning flex-shrink-0" />
              )}
            </div>
            <p className="font-mono text-xs tabular-nums text-muted-foreground">
              {getPrescription()}
              {completedSets > 0 && !isComplete && (
                <span className="ml-1.5 text-success font-bold">
                  {completedSets}/{exercise.sets}
                </span>
              )}
            </p>
          </div>
        </button>

        {/* Right — circle checkbox (toggles every set in one go) */}
        {!isReadOnly ? (
          <button
            type="button"
            onClick={handleToggleAllSets}
            aria-pressed={isComplete}
            className={cn(
              'w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-[background-color,border-color] duration-200 cursor-pointer touch-manipulation',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              isComplete
                ? 'bg-success border-success'
                : 'border-foreground/15 bg-transparent hover:border-foreground/30'
            )}
            aria-label={isComplete ? 'Mark all sets incomplete' : 'Mark all sets complete'}
          >
            {isComplete && (
              <Check className="w-4 h-4 text-success-foreground animate-set-complete" />
            )}
          </button>
        ) : (
          <div
            className={cn(
              'w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-[background-color,border-color] duration-200',
              isComplete
                ? 'bg-success border-success'
                : 'border-foreground/15 bg-transparent'
            )}
          >
            {isComplete && (
              <Check className="w-4 h-4 text-success-foreground" />
            )}
          </div>
        )}
      </div>

      {/* ── Expanded: coach tip + set table + flag ── */}
      {isExpanded && (
        <div className="pl-[42px] pr-1 pb-4 pt-1.5 space-y-3.5 animate-fade-in-up">
          {/* Coach note — the volt rail alone marks the voice; no label line */}
          {exercise.coachNotes && (
            <p className="pl-3 border-l-2 border-brand text-sm leading-relaxed text-foreground/75">
              {exercise.coachNotes}
            </p>
          )}

          {/* Flag section */}
          {isFlagged && (
            <div className="p-3 bg-warning/5 rounded-lg border border-warning/20">
              <div className="flex items-center gap-2 mb-2">
                <Flag className="w-4 h-4 text-warning" />
                <span className="text-sm font-medium text-foreground">
                  Flagged for coach
                </span>
              </div>
              {!isReadOnly ? (
                <>
                  {/* A placeholder is never the label — it disappears on input */}
                  <label htmlFor={flagNoteId} className="sr-only">
                    Note for your coach about {exercise.exercise.name}
                  </label>
                  <Input
                    id={flagNoteId}
                    placeholder="Sore left shoulder on the last set"
                    value={flagNote || ''}
                    onChange={(e) => onUpdateFlagNote?.(e.target.value)}
                    maxLength={200}
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">
                      {(flagNote?.length || 0)}/200
                    </span>
                    <div className="flex items-center gap-4">
                      {onToggleFlag && (
                        <button
                          type="button"
                          onClick={handleFlagClick}
                          className="text-sm text-muted-foreground hover:text-destructive transition-colors min-h-[44px] flex items-center touch-manipulation rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          Remove flag
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={onMessageCoach}
                        className="text-sm text-primary hover:underline min-h-[44px] flex items-center touch-manipulation rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        Message coach
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                flagNote && (
                  <p className="text-sm text-foreground italic">
                    &ldquo;{flagNote}&rdquo;
                  </p>
                )
              )}
            </div>
          )}

          {/* Set table — SET · LAST · WEIGHT · REPS · ✓. Labels live in this
              header once, so the rows below are pure numbers. */}
          <div>
            <div className={cn(SET_GRID, 'pb-1')}>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Set
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Last
              </span>
              {/* Unit-neutral: no weightUnit column exists yet, so claiming
                  "LBS" for a kg-programming coach would be plain wrong */}
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground text-center">
                Weight
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground text-center">
                {exercise.trackingType === 'TIME' ? 'Sec' : 'Reps'}
              </span>
              <span aria-hidden="true" />
            </div>
            {setRows.map((setNumber, idx) => {
              const sc = exercise.setCompletions.find(
                (s) => s.setNumber === setNumber
              );
              return (
                <SetRow
                  key={setNumber}
                  setNumber={setNumber}
                  trackingType={exercise.trackingType}
                  repsTarget={exercise.reps ?? undefined}
                  weightTarget={exercise.weight ?? undefined}
                  actualReps={sc?.actualReps ?? null}
                  actualWeight={sc?.actualWeight ?? null}
                  previous={
                    exercise.lastPerformance
                      ? formatLastCompact(
                          exercise.lastPerformance,
                          exercise.trackingType === 'TIME'
                        )
                      : undefined
                  }
                  completed={!!sc?.completed}
                  onToggle={() =>
                    onToggleSet(exercise.workoutExerciseId, setNumber)
                  }
                  onChangeReps={(reps) =>
                    onUpdateSet?.(exercise.workoutExerciseId, setNumber, {
                      actualReps: reps,
                    })
                  }
                  onChangeWeight={(weight) =>
                    onUpdateSet?.(exercise.workoutExerciseId, setNumber, {
                      actualWeight: weight,
                    })
                  }
                  isReadOnly={isReadOnly}
                  showDivider={idx > 0}
                  showTimer={setNumber === nextSetNumber}
                />
              );
            })}
          </div>

          {/* Flag — quiet action at the end of the exercise */}
          {!isFlagged && !isReadOnly && (
            <button
              type="button"
              onClick={handleFlagClick}
              className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground transition-colors touch-manipulation py-2 -my-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Flag className="w-3.5 h-3.5" />
              Flag for coach
            </button>
          )}
        </div>
      )}
    </div>
  );
}
