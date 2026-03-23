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
        'w-full text-left px-4 py-3.5 transition-all group',
        'hover:bg-muted/60',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        'active:bg-muted/80 active:scale-[0.99]'
      )}
    >
      <div className="flex items-center gap-3">
        {/* Exercise number — bold counter */}
        <span className="text-[11px] font-black text-muted-foreground/40 w-5 shrink-0 tabular-nums select-none">
          {String(exerciseIndex + 1).padStart(2, '0')}
        </span>

        {/* Exercise details */}
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm leading-snug truncate group-hover:translate-x-0.5 transition-transform duration-150">
            {exercise.name || 'Untitled Exercise'}
          </div>
        </div>

        {/* Stats badges */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] tabular-nums font-bold bg-muted/80 text-muted-foreground px-1.5 py-0.5 rounded-md">
            {exercise.sets} × {exercise.reps || '—'}
          </span>
          {weightDisplay && (
            <span className="text-[11px] tabular-nums font-bold bg-foreground text-background px-1.5 py-0.5 rounded-md">
              {weightDisplay}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
