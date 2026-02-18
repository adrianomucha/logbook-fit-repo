import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Check, ChevronDown, ChevronUp, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Exercise, SetCompletion } from '@/types';
import { SetRow } from './SetRow';
import {
  isExerciseComplete,
  getCompletedSetsCount,
  isSetCompleted,
} from '@/lib/workout-execution-helpers';

interface ExerciseCardProps {
  exercise: Exercise;
  exerciseNumber: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  workoutCompletionId: string;
  setCompletions: SetCompletion[];
  onToggleSet: (exerciseId: string, setNumber: number) => void;
  // Flagging props
  isFlagged?: boolean;
  flagNote?: string;
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
  workoutCompletionId,
  setCompletions,
  onToggleSet,
  isFlagged = false,
  flagNote,
  onToggleFlag,
  onUpdateFlagNote,
  onMessageCoach,
  isReadOnly = false,
}: ExerciseCardProps) {
  const isComplete = isExerciseComplete(exercise, setCompletions, workoutCompletionId);
  const completedSets = getCompletedSetsCount(exercise.id, setCompletions, workoutCompletionId);

  // Build summary text: "4 x 8-10 @ 135 lbs"
  const getSummary = () => {
    const parts: string[] = [`${exercise.sets}x`];
    if (exercise.reps) parts.push(exercise.reps);
    if (exercise.time) parts.push(exercise.time);
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
        'transition-all overflow-hidden',
        isComplete && 'border-green-200 dark:border-green-800',
        isFlagged && !isComplete && 'border-amber-200 dark:border-amber-800'
      )}
    >
      {/* Header - always visible, clickable */}
      <button
        type="button"
        onClick={onToggleExpand}
        className={cn(
          'w-full p-4 flex items-center gap-3 text-left transition-colors',
          'hover:bg-muted/50',
          isComplete && 'bg-green-50 dark:bg-green-950/30'
        )}
      >
        {/* Exercise number or checkmark */}
        <div
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-sm',
            isComplete
              ? 'bg-green-600 text-white'
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
                isComplete && 'text-green-700 dark:text-green-400'
              )}
            >
              {exercise.name}
            </p>
            {/* Flag indicator when collapsed */}
            {isFlagged && !isExpanded && (
              <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {getSummary()}
            {completedSets > 0 && !isComplete && (
              <span className="ml-2 text-green-600">
                ({completedSets}/{exercise.sets} done)
              </span>
            )}
          </p>
        </div>

        {/* Flag icon */}
        <button
          type="button"
          onClick={handleFlagClick}
          disabled={isReadOnly}
          className={cn(
            'p-2 rounded-full transition-colors flex-shrink-0',
            !isReadOnly && 'hover:bg-muted active:bg-muted/80',
            isReadOnly && 'opacity-50 cursor-default'
          )}
          aria-label={isFlagged ? 'Remove flag' : 'Flag exercise'}
        >
          <Flag
            className={cn(
              'w-4 h-4 transition-colors',
              isFlagged
                ? 'text-amber-500 fill-amber-500'
                : 'text-muted-foreground/50'
            )}
          />
        </button>

        {/* Chevron */}
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <CardContent className="p-4 pt-0">
          {/* Coach notes */}
          {exercise.notes && (
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <span className="font-medium">Coach tip:</span> {exercise.notes}
              </p>
            </div>
          )}

          {/* Flag note section - only visible when flagged */}
          {isFlagged && (
            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2 mb-2">
                <Flag className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
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
                      className="text-sm text-primary hover:underline min-h-[44px] flex items-center"
                    >
                      Message coach about this →
                    </button>
                  </div>
                </>
              ) : (
                flagNote && (
                  <p className="text-sm text-amber-800 dark:text-amber-200 italic">
                    "{flagNote}"
                  </p>
                )
              )}
            </div>
          )}

          {/* Set rows */}
          <div className="space-y-2">
            {setRows.map((setNumber) => (
              <SetRow
                key={setNumber}
                setNumber={setNumber}
                reps={exercise.reps}
                weight={exercise.weight}
                time={exercise.time}
                completed={isSetCompleted(
                  workoutCompletionId,
                  exercise.id,
                  setNumber,
                  setCompletions
                )}
                onToggle={() => onToggleSet(exercise.id, setNumber)}
              />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
