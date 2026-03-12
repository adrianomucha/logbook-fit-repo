import { Exercise } from '@/types';

interface ExercisePreviewListProps {
  exercises: Exercise[];
}

function formatPrescription(exercise: Exercise): string {
  if (exercise.reps) {
    return `${exercise.sets}×${exercise.reps}`;
  }
  return `${exercise.sets}s`;
}

export function ExercisePreviewList({ exercises }: ExercisePreviewListProps) {
  if (exercises.length === 0) return null;

  return (
    <div className="divide-y divide-border/40">
      {exercises.map((exercise, index) => (
        <div key={exercise.id} className="py-3 first:pt-0 last:pb-0 flex items-center gap-3">
          <span className="text-[11px] font-bold text-muted-foreground/50 tabular-nums w-5 text-right shrink-0 uppercase">
            {String(index + 1).padStart(2, '0')}
          </span>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-semibold text-foreground truncate block">
              {exercise.name}
            </span>
            {exercise.notes && (
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-1">
                {exercise.notes}
              </p>
            )}
          </div>
          <span className="text-xs tabular-nums shrink-0 text-foreground/60 font-bold tracking-tight">
            {formatPrescription(exercise)}
          </span>
        </div>
      ))}
    </div>
  );
}
