import { Input } from '@/components/ui/input';
import { Check, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDuration } from '@/lib/reps';
import type { LastPerformance, WorkoutExercise } from '@/types/api';
import { SetRow, SET_GRID } from './SetRow';
import {
  isExerciseComplete,
  getCompletedSetsCount,
  isSetCompleted,
} from '@/hooks/api/useWorkoutExecution';

/** Weight unit inferred from the coach's prescription string ("50 kg" → kg). */
function weightUnit(weightTarget?: string | null): string {
  return weightTarget && /kg/i.test(weightTarget) ? 'kg' : 'lbs';
}

/** Compact last-session cell for the set table: "52.5×8" / "12" / "60s" — empty if nothing logged. */
function formatLastCompact(p: LastPerformance, isTime: boolean): string {
  const repsPart = p.reps != null ? (isTime ? formatDuration(p.reps) : String(p.reps)) : null;
  if (p.weight != null) {
    return repsPart != null ? `${p.weight}×${repsPart}` : String(p.weight);
  }
  return repsPart ?? '';
}

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

  const handleFlagClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isReadOnly && onToggleFlag) onToggleFlag();
  };

  const handleToggleAllSets = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isReadOnly) return;
    // Toggle all sets — if all complete, uncomplete them; otherwise complete remaining
    const setNumbers = Array.from({ length: exercise.sets }, (_, i) => i + 1);
    const targetSets = isComplete
      ? setNumbers.filter((n) => isSetCompleted(exercise.setCompletions, n))
      : setNumbers.filter((n) => !isSetCompleted(exercise.setCompletions, n));
    for (const setNumber of targetSets) {
      onToggleSet(exercise.workoutExerciseId, setNumber);
    }
  };

  return (
    <div id={id}>
      {/* ── Exercise row ── */}
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full flex items-center gap-3.5 text-left py-2.5 transition-colors hover:bg-muted/30 active:scale-[0.99] touch-manipulation min-h-[56px]"
        aria-expanded={isExpanded}
        aria-label={`${exercise.exercise.name}, ${getPrescription()}`}
      >
        {/* Left — mono index, same voice as the dashboard preview list */}
        <span
          className={cn(
            'font-mono text-[11px] font-medium tabular-nums w-7 text-right flex-shrink-0 transition-colors',
            isComplete ? 'text-success' : 'text-muted-foreground/50'
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
                isComplete ? 'text-foreground/50' : 'text-foreground'
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

        {/* Right — circle checkbox (tappable: toggles all sets) */}
        {!isReadOnly ? (
          <div
            role="button"
            tabIndex={0}
            onClick={handleToggleAllSets}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleToggleAllSets(e as unknown as React.MouseEvent); } }}
            className={cn(
              'w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 cursor-pointer',
              isComplete
                ? 'bg-success border-success scale-100'
                : 'border-foreground/15 bg-transparent hover:border-foreground/30'
            )}
            aria-label={isComplete ? 'Mark all sets incomplete' : 'Mark all sets complete'}
          >
            {isComplete && (
              <Check className="w-4 h-4 text-success-foreground animate-set-complete" />
            )}
          </div>
        ) : (
          <div
            className={cn(
              'w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200',
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
      </button>

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
                  <Input
                    placeholder="Add a note (optional)..."
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
                          className="text-sm text-muted-foreground/60 hover:text-destructive transition-colors min-h-[44px] flex items-center touch-manipulation"
                        >
                          Remove flag
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={onMessageCoach}
                        className="text-sm text-primary hover:underline min-h-[44px] flex items-center touch-manipulation"
                      >
                        Message coach →
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
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/50">
                Set
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/50">
                Last
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/50 text-center">
                {weightUnit(exercise.weight)}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/50 text-center">
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
                />
              );
            })}
          </div>

          {/* Flag — quiet action at the end of the exercise */}
          {!isFlagged && !isReadOnly && (
            <button
              type="button"
              onClick={handleFlagClick}
              className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/50 hover:text-muted-foreground transition-colors touch-manipulation py-2 -my-2"
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
