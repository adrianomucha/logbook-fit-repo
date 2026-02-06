import { Card, CardContent } from '@/components/ui/card';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
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
}

export function ExerciseCard({
  exercise,
  exerciseNumber,
  isExpanded,
  onToggleExpand,
  workoutCompletionId,
  setCompletions,
  onToggleSet,
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

  return (
    <Card
      className={cn(
        'transition-all overflow-hidden',
        isComplete && 'border-green-200 dark:border-green-800'
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
          <p
            className={cn(
              'font-semibold truncate',
              isComplete && 'text-green-700 dark:text-green-400'
            )}
          >
            {exercise.name}
          </p>
          <p className="text-sm text-muted-foreground">
            {getSummary()}
            {completedSets > 0 && !isComplete && (
              <span className="ml-2 text-green-600">
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
