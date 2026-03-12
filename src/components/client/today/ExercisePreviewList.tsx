import { Exercise } from '@/types';

interface ExercisePreviewListProps {
  exercises: Exercise[];
}

function formatPrescription(exercise: Exercise): string {
  if (exercise.reps) {
    return `${exercise.sets} × ${exercise.reps}`;
  }
  return `${exercise.sets} sets`;
}

export function ExercisePreviewList({ exercises }: ExercisePreviewListProps) {
  if (exercises.length === 0) return null;

  return (
    <div className="divide-y divide-border/60">
      {exercises.map((exercise, index) => (
        <div key={exercise.id} className="py-3.5 first:pt-0 last:pb-0 flex items-start gap-3">
          <span className="text-xs font-medium text-muted-foreground tabular-nums mt-0.5 w-4 text-right shrink-0">
            {index + 1}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-semibold text-foreground truncate">
                {exercise.name}
              </span>
              <span className="text-xs tabular-nums shrink-0 text-muted-foreground font-medium">
                {formatPrescription(exercise)}
              </span>
            </div>
            {exercise.notes && (
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                {exercise.notes}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
