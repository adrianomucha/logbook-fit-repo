import { Input } from '@/components/ui/input';
import { Check, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WorkoutExercise } from '@/types/api';
import { SetRow } from './SetRow';
import {
  isExerciseComplete,
  getCompletedSetsCount,
  isSetCompleted,
} from '@/hooks/api/useWorkoutExecution';

interface ExerciseCardProps {
  exercise: WorkoutExercise;
  exerciseNumber: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleSet: (workoutExerciseId: string, setNumber: number) => void;
  onToggleFlag?: () => void;
  onUpdateFlagNote?: (note: string) => void;
  onMessageCoach?: () => void;
  isReadOnly?: boolean;
}

export function ExerciseCard({
  exercise,
  exerciseNumber,
  isExpanded,
  onToggleExpand,
  onToggleSet,
  onToggleFlag,
  onUpdateFlagNote,
  onMessageCoach,
  isReadOnly = false,
}: ExerciseCardProps) {
  const isComplete = isExerciseComplete(exercise);
  const completedSets = getCompletedSetsCount(exercise);
  const isFlagged = !!exercise.flag;
  const flagNote = exercise.flag?.note;

  // Build prescription subtitle: "3x 10-12 @50 lbs"
  const getPrescription = () => {
    const parts: string[] = [`${exercise.sets}x`];
    if (exercise.reps) parts.push(exercise.reps);
    if (exercise.weight) parts.push(`@${exercise.weight}`);
    return parts.join(' ');
  };

  const setRows = Array.from({ length: exercise.sets }, (_, i) => i + 1);

  const handleFlagClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isReadOnly && onToggleFlag) onToggleFlag();
  };

  return (
    <div>
      {/* ── Exercise row ── */}
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full flex items-center gap-2 sm:gap-3 text-left py-2 transition-colors hover:bg-muted/30 active:scale-[0.99] touch-manipulation min-h-[52px]"
        aria-expanded={isExpanded}
        aria-label={`${exercise.exercise.name}, ${getPrescription()}`}
      >
        {/* Left — bold counter number */}
        <span
          className={cn(
            'w-8 sm:w-10 flex-shrink-0 text-2xl sm:text-3xl font-bold tabular-nums tracking-tight transition-colors',
            isComplete ? 'text-success' : 'text-foreground/20'
          )}
        >
          {exerciseNumber}
        </span>

        {/* Middle — name + prescription */}
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <p
              className={cn(
                'text-sm font-semibold tracking-tight truncate transition-colors',
                isComplete ? 'text-foreground/50' : 'text-foreground'
              )}
            >
              {exercise.exercise.name}
            </p>
            {isFlagged && (
              <div className="w-1.5 h-1.5 rounded-full bg-warning flex-shrink-0" />
            )}
          </div>
          <p className="text-xs text-muted-foreground tracking-wide uppercase">
            {getPrescription()}
            {completedSets > 0 && !isComplete && (
              <span className="ml-1.5 text-success font-bold normal-case">
                {completedSets}/{exercise.sets}
              </span>
            )}
          </p>
        </div>

        {/* Right — circle checkbox */}
        <div
          className={cn(
            'w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200',
            isComplete
              ? 'bg-success border-success scale-100'
              : 'border-foreground/15 bg-transparent'
          )}
        >
          {isComplete && (
            <Check className="w-4 h-4 text-success-foreground animate-set-complete" />
          )}
        </div>
      </button>

      {/* ── Expanded: set rows + coach tip + flag ── */}
      {isExpanded && (
        <div className="pl-10 sm:pl-[52px] pr-1 pb-4 pt-1 space-y-3 animate-fade-in-up">
          {/* Coach notes */}
          {exercise.coachNotes && (
            <div className="p-3 bg-muted/50 rounded-lg border-l-2 border-foreground/10">
              <p className="text-sm text-foreground">
                <span className="font-semibold uppercase text-xs tracking-wide text-muted-foreground">
                  Coach
                </span>
                <br />
                {exercise.coachNotes}
              </p>
            </div>
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
                    <span className="text-xs text-muted-foreground">
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

          {/* Flag toggle (when not yet flagged) */}
          {!isFlagged && !isReadOnly && (
            <button
              type="button"
              onClick={handleFlagClick}
              className="flex items-center gap-1.5 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors touch-manipulation uppercase tracking-wider"
            >
              <Flag className="w-3.5 h-3.5" />
              Flag for coach
            </button>
          )}

          {/* Set rows */}
          <div>
            {setRows.map((setNumber, idx) => (
              <SetRow
                key={setNumber}
                setNumber={setNumber}
                reps={exercise.reps ?? undefined}
                weight={exercise.weight ?? undefined}
                completed={isSetCompleted(
                  exercise.setCompletions,
                  setNumber
                )}
                onToggle={() =>
                  onToggleSet(exercise.workoutExerciseId, setNumber)
                }
                showDivider={idx > 0}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
