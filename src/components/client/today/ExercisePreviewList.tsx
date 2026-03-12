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
    <div className="divide-y divide-border">
      {exercises.map((exercise) => (
        <div key={exercise.id} className="py-4 first:pt-0 last:pb-0">
          <div className="flex items-baseline gap-3">
            <span className="text-sm font-semibold tabular-nums shrink-0 text-foreground">
              {formatPrescription(exercise)}
            </span>
            <span className="text-sm font-semibold text-foreground">
              {exercise.name}
            </span>
          </div>
          {exercise.notes && (
            <p className="text-sm text-muted-foreground mt-0.5 pl-0">
              {exercise.notes}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
