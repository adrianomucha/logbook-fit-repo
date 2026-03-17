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
        'w-full text-left px-4 py-3.5 transition-all',
        'hover:bg-muted/60',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        'active:bg-muted/80'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Exercise number */}
        <span className="text-[11px] font-bold text-muted-foreground/70 mt-1 w-5 shrink-0 tabular-nums">
          {String(exerciseIndex + 1).padStart(2, '0')}
        </span>

        {/* Exercise details */}
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm leading-snug truncate">
            {exercise.name || 'Untitled Exercise'}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 tabular-nums">
            {exercise.sets} × {exercise.reps || '—'}
            {weightDisplay && <span className="ml-1.5">{weightDisplay}</span>}
          </div>
        </div>
      </div>
    </button>
  );
}
