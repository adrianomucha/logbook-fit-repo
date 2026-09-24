import { useId } from 'react';
import { Input } from '@/components/ui/input';
import { Check, Flag, MessageCircle } from 'lucide-react';
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

  // The set to do now: the first one not yet logged
  const currentSetNumber = isReadOnly
    ? undefined
    : setRows.find((n) => !isSetCompleted(exercise.setCompletions, n));

  const lastTime = exercise.lastPerformance
    ? formatLastCompact(exercise.lastPerformance, exercise.trackingType === 'TIME')
    : '';

  const markAllCircle = (
    <span
      className={cn(
        'w-8 h-8 rounded-full border-2 flex items-center justify-center transition-[background-color,border-color] duration-200',
        isComplete
          ? 'bg-success border-success'
          : 'border-foreground/20 bg-transparent group-hover:border-foreground/40'
      )}
    >
      {isComplete && (
        <Check
          className={cn('w-4 h-4 text-success-foreground', !isReadOnly && 'animate-set-complete')}
          strokeWidth={3}
        />
      )}
    </span>
  );

  return (
    <div
      id={id}
      className={cn(
        'rounded-2xl border transition-[background-color,border-color,box-shadow] duration-200',
        isExpanded
          ? 'bg-card border-foreground/15 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.12)]'
          : isComplete
            ? 'bg-muted/40 border-transparent'
            : 'bg-card border-border'
      )}
    >
      {/* ── Exercise row ──
          Expand and mark-all are siblings, never nested: a <button> may not
          contain another interactive element, and nesting them hid the
          mark-all control behind the outer button's accessible name. */}
      <div className="flex items-center min-h-[68px] pr-1.5">
        <button
          type="button"
          onClick={onToggleExpand}
          className="flex-1 min-w-0 self-stretch flex items-center gap-3 text-left pl-4 pr-2 py-3 rounded-2xl active:scale-[0.99] transition-transform touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          aria-expanded={isExpanded}
          aria-label={`${exercise.exercise.name}, ${getPrescription()}`}
        >
          {/* Left — mono index, same voice as the dashboard preview list */}
          <span
            className={cn(
              'font-mono text-xs font-medium tabular-nums w-7 flex-shrink-0 transition-colors',
              isComplete ? 'text-success-text' : 'text-muted-foreground'
            )}
          >
            {displayLabel}
          </span>

          {/* Middle — name + prescription */}
          <div className="flex-1 min-w-0 flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <p
                className={cn(
                  'font-semibold tracking-tight leading-snug transition-colors',
                  // The open exercise gets its full name; closed rows stay one line
                  isExpanded ? 'text-lg' : 'text-base truncate',
                  isComplete && !isExpanded ? 'text-muted-foreground' : 'text-foreground'
                )}
              >
                {exercise.exercise.name}
              </p>
              {isFlagged && (
                <Flag className="w-3.5 h-3.5 text-warning-text flex-shrink-0" aria-label="Flagged" />
              )}
            </div>
            <p className="font-mono text-xs tabular-nums text-muted-foreground">
              {getPrescription()}
              {completedSets > 0 && !isComplete && (
                <span className="ml-2 text-success-text font-bold">
                  {completedSets}/{exercise.sets} done
                </span>
              )}
            </p>
          </div>
        </button>

        {/* Right — circle checkbox (toggles every set in one go). The circle
            stays 32px but the button around it is a full 48px target. */}
        {!isReadOnly ? (
          <button
            type="button"
            onClick={handleToggleAllSets}
            aria-pressed={isComplete}
            className="group w-12 h-12 flex-shrink-0 rounded-full flex items-center justify-center cursor-pointer touch-manipulation active:scale-[0.92] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={isComplete ? 'Mark all sets incomplete' : 'Mark all sets complete'}
          >
            {markAllCircle}
          </button>
        ) : (
          <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center">
            {markAllCircle}
          </div>
        )}
      </div>

      {/* ── Expanded: coach tip + last time + set table + flag ── */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3 animate-fade-in-up">
          {(exercise.coachNotes || lastTime) && (
            <div className="px-1 space-y-2.5">
              {/* Coach note — the volt rail alone marks the voice; no label line */}
              {exercise.coachNotes && (
                <p className="pl-3 border-l-2 border-brand text-[15px] leading-relaxed text-foreground/80">
                  {exercise.coachNotes}
                </p>
              )}
              {/* Last session, once — it's the same for every set, so it no
                  longer takes a column of its own in each row */}
              {lastTime && (
                <p className="font-mono text-xs tabular-nums text-muted-foreground">
                  <span className="uppercase tracking-[0.14em] text-[10px] mr-2">Last time</span>
                  <span className="text-foreground font-bold">{lastTime}</span>
                </p>
              )}
            </div>
          )}

          {/* Flag section */}
          {isFlagged && (
            <div className="p-3 bg-warning/5 rounded-xl border border-warning/25">
              <div className="flex items-center gap-2 mb-2.5">
                <Flag className="w-4 h-4 text-warning-text" />
                <span className="text-sm font-semibold text-foreground">
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
                    className="h-12 text-base bg-background"
                  />
                  <p className="font-mono text-[11px] tabular-nums text-muted-foreground text-right mt-1.5">
                    {(flagNote?.length || 0)}/200
                  </p>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {onToggleFlag && (
                      <button
                        type="button"
                        onClick={handleFlagClick}
                        className="h-11 rounded-xl border border-border bg-background text-sm font-medium text-muted-foreground hover:text-destructive transition-colors touch-manipulation active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        Remove flag
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={onMessageCoach}
                      className={cn(
                        'h-11 rounded-xl bg-foreground text-background text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-foreground/90 transition-colors touch-manipulation active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                        !onToggleFlag && 'col-span-2'
                      )}
                    >
                      <MessageCircle className="w-4 h-4" />
                      Message coach
                    </button>
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

          {/* Set table — SET · WEIGHT · REPS · ✓. Labels live in this header
              once, so the rows below are pure numbers. */}
          <div>
            <div className={cn(SET_GRID, 'pb-0.5')}>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground text-center">
                Set
              </span>
              {/* Unit-neutral: no weightUnit column exists yet, so claiming
                  "LBS" for a kg-programming coach would be plain wrong */}
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground text-center">
                Weight
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground text-center">
                {exercise.trackingType === 'TIME' ? 'Seconds' : 'Reps'}
              </span>
              <span aria-hidden="true" />
            </div>
            {setRows.map((setNumber) => {
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
                  completed={!!sc?.completed}
                  isCurrent={setNumber === currentSetNumber}
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
                  showTimer={setNumber === nextSetNumber}
                />
              );
            })}
          </div>

          {/* Flag — a real button at the end of the exercise, not a caption */}
          {!isFlagged && !isReadOnly && (
            <button
              type="button"
              onClick={handleFlagClick}
              className="w-full h-11 rounded-xl border border-dashed border-foreground/20 inline-flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors touch-manipulation active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Flag className="w-4 h-4" />
              Flag for coach
            </button>
          )}
        </div>
      )}
    </div>
  );
}
