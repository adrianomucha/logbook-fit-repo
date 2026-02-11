import { Exercise } from '@/types';
import { cn } from '@/lib/utils';

interface ExerciseCardProps {
  exercise: Exercise;
  exerciseIndex: number;
  onClick: () => void;
}

/**
 * Read-only exercise card that opens drawer on click.
 * No expand/collapse - just a clean, scannable row.
 */
export function ExerciseCard({
  exercise,
  exerciseIndex,
  onClick,
}: ExerciseCardProps) {
  // Format the weight display
  const weightDisplay = exercise.weight
    ? `@ ${exercise.weight}${!/[a-zA-Z]/.test(exercise.weight) ? ` ${(exercise as any).weightUnit || 'lbs'}` : ''}`
    : null;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-4 transition-all',
        'hover:bg-muted/50 hover:shadow-sm',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        'active:bg-muted/70'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Exercise number */}
        <span className="text-sm font-semibold text-muted-foreground mt-0.5 w-5 shrink-0">
          {exerciseIndex + 1}.
        </span>

        {/* Exercise details */}
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{exercise.name || 'Untitled Exercise'}</div>
          <div className="text-sm text-muted-foreground">
            {exercise.sets} sets × {exercise.reps || '—'} reps
            {weightDisplay && <span className="ml-1">{weightDisplay}</span>}
          </div>
        </div>
      </div>
    </button>
  );
}
