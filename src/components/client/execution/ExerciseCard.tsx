import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Check, ChevronDown, ChevronUp, Flag } from 'lucide-react';
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

  // Build summary text: "4x 8-10 @ 135 lbs"
  const getSummary = () => {
    const parts: string[] = [`${exercise.sets}x`];
    if (exercise.reps) parts.push(exercise.reps);
    if (exercise.weight) parts.push(`@ ${exercise.weight}`);
    return parts.join(' ');
  };

  // Generate set rows
  const setRows = Array.from({ length: exercise.sets }, (_, i) => i + 1);

  const handleFlagClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isReadOnly && onToggleFlag) {
      onToggleFlag();
    }
  };

  return (
    <Card
      className={cn(
        'transition-[border-color] overflow-hidden',
        isComplete && 'border-success/30 bg-success/[0.03]',
        isFlagged && !isComplete && 'border-warning/30 bg-warning/[0.02]'
      )}
    >
      {/* Header — always visible */}
      <div className="flex items-center">
        {/* Expand toggle — semantic button */}
        <button
          type="button"
          onClick={onToggleExpand}
          className={cn(
            'flex-1 min-w-0 p-4 flex items-center gap-3 text-left transition-colors cursor-pointer',
            'hover:bg-muted/40'
          )}
          aria-expanded={isExpanded}
          aria-label={`${exercise.exercise.name}, ${getSummary()}`}
        >
          {/* Exercise number or checkmark */}
          <div
            className={cn(
              'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-sm',
              isComplete
                ? 'bg-success text-success-foreground'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {isComplete ? <Check className="w-5 h-5" /> : exerciseNumber}
          </div>

          {/* Exercise info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p
                className={cn(
                  'font-semibold truncate',
                  isComplete && 'text-success'
                )}
              >
                {exercise.exercise.name}
              </p>
              {/* Flag dot when collapsed */}
              {isFlagged && !isExpanded && (
                <div className="w-2 h-2 rounded-full bg-warning flex-shrink-0" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {getSummary()}
              {completedSets > 0 && !isComplete && (
                <span className="ml-2 text-success font-medium">
                  ({completedSets}/{exercise.sets} done)
                </span>
              )}
            </p>
          </div>

          {/* Chevron */}
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          )}
        </button>

        {/* Flag icon — sibling button, not nested */}
        <button
          type="button"
          onClick={handleFlagClick}
          disabled={isReadOnly}
          className={cn(
            'p-2 mr-2 rounded-full transition-colors flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation',
            !isReadOnly && 'hover:bg-muted active:bg-muted/80',
            isReadOnly && 'opacity-50 cursor-default'
          )}
          aria-label={isFlagged ? 'Remove flag' : 'Flag exercise'}
        >
          <Flag
            className={cn(
              'w-4 h-4 transition-colors',
              isFlagged
                ? 'text-warning fill-warning'
                : 'text-muted-foreground/40'
            )}
          />
        </button>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <CardContent className="px-4 pb-4 pt-0">
          {/* Coach notes */}
          {exercise.coachNotes && (
            <div className="mb-4 p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-foreground">
                <span className="font-medium">Coach tip:</span>{' '}
                {exercise.coachNotes}
              </p>
            </div>
          )}

          {/* Flag note section — only visible when flagged */}
          {isFlagged && (
            <div className="mb-4 p-3 bg-warning/5 rounded-lg border border-warning/20">
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
                    <button
                      type="button"
                      onClick={onMessageCoach}
                      className="text-sm text-primary hover:underline min-h-[44px] flex items-center touch-manipulation"
                    >
                      Message coach about this →
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
        </CardContent>
      )}
    </Card>
  );
}
