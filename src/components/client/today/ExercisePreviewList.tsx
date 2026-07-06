import { Exercise } from '@/types';
import { Link2 } from 'lucide-react';
import { groupBySuperset, isSuperset } from '@/lib/superset';

interface ExercisePreviewListProps {
  exercises: Exercise[];
}

function formatPrescription(exercise: Exercise): string {
  if (exercise.reps) {
    return `${exercise.sets}×${exercise.reps}`;
  }
  return `${exercise.sets}s`;
}

function ExerciseRow({ exercise, label }: { exercise: Exercise; label: string }) {
  return (
    <div className="py-3.5 first:pt-0 last:pb-0 flex items-center gap-3.5">
      <span className="font-mono text-[11px] font-medium text-muted-foreground/50 tabular-nums w-7 text-right shrink-0">
        {label}
      </span>
      <div className="flex-1 min-w-0">
        <span className="text-[15px] font-semibold text-foreground truncate block leading-snug">
          {exercise.name}
        </span>
        {exercise.notes && (
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-1">
            {exercise.notes}
          </p>
        )}
      </div>
      <span className="font-mono text-xs tabular-nums shrink-0 text-muted-foreground font-medium">
        {formatPrescription(exercise)}
      </span>
    </div>
  );
}

export function ExercisePreviewList({ exercises }: ExercisePreviewListProps) {
  if (exercises.length === 0) return null;

  return (
    <div className="divide-y divide-border/50">
      {groupBySuperset(exercises).map((group, groupIndex) => {
        const number = String(groupIndex + 1).padStart(2, '0');

        if (!isSuperset(group)) {
          return <ExerciseRow key={group[0].id} exercise={group[0]} label={number} />;
        }

        // Superset: shared number + letter per member, bracketed by a left rail
        return (
          <div key={group[0].id} className="py-3.5 first:pt-0 last:pb-0">
            <div className="flex items-center gap-1.5 mb-2">
              <Link2 className="w-3 h-3 text-muted-foreground/60" />
              <span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/60">
                Superset
              </span>
            </div>
            <div className="border-l-2 border-brand/60 pl-3 divide-y divide-border/50">
              {group.map((exercise, memberIndex) => (
                <ExerciseRow
                  key={exercise.id}
                  exercise={exercise}
                  label={`${number}${String.fromCharCode(65 + memberIndex)}`}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
