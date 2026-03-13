import { WorkoutDay } from '@/types';
import { ExercisePreviewList } from './ExercisePreviewList';
import { Card, CardContent } from '@/components/ui/card';

interface WorkoutOverviewProps {
  workoutDay: WorkoutDay;
  coachName?: string;
}

function estimateDuration(exercises: WorkoutDay['exercises']): number {
  const totalSets = exercises.reduce((sum, e) => sum + e.sets, 0);
  return Math.max(10, Math.round(totalSets * 2));
}

function getUniqueCategories(exercises: WorkoutDay['exercises']): string[] {
  const cats = new Set<string>();
  for (const e of exercises) {
    if (e.category) {
      const readable = e.category
        .split('_')
        .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
        .join(' ');
      cats.add(readable);
    }
  }
  return Array.from(cats);
}

export function WorkoutOverview({
  workoutDay,
  coachName,
}: WorkoutOverviewProps) {
  const exercises = workoutDay.exercises;
  const duration = estimateDuration(exercises);
  const totalSets = exercises.reduce((sum, e) => sum + e.sets, 0);
  const categories = getUniqueCategories(exercises);

  return (
    <div className="space-y-5">
      {/* Workout Name */}
      <div>
        <h2 className="text-xl font-bold tracking-tight">
          {workoutDay.name || 'Today\u2019s Workout'}
        </h2>
        {coachName && (
          <p className="text-xs text-muted-foreground mt-0.5 uppercase tracking-wide">
            By {coachName}
          </p>
        )}
      </div>

      {/* Stat Blocks — gym-counter style */}
      <div className="flex gap-2 sm:gap-3">
        <div className="flex-1 bg-muted/60 rounded-lg px-2 sm:px-3 py-5 sm:py-6 text-center">
          <p className="text-2xl font-bold tabular-nums leading-none">{duration}</p>
          <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mt-1.5 font-medium">Minutes</p>
        </div>
        <div className="flex-1 bg-muted/60 rounded-lg px-2 sm:px-3 py-5 sm:py-6 text-center">
          <p className="text-2xl font-bold tabular-nums leading-none">{exercises.length}</p>
          <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mt-1.5 font-medium">Exercises</p>
        </div>
        <div className="flex-1 bg-muted/60 rounded-lg px-2 sm:px-3 py-5 sm:py-6 text-center">
          <p className="text-2xl font-bold tabular-nums leading-none">{totalSets}</p>
          <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mt-1.5 font-medium">Total Sets</p>
        </div>
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <span
              key={cat}
              className="text-[11px] uppercase tracking-wide font-medium text-muted-foreground bg-muted/80 px-2 py-1 rounded"
            >
              {cat}
            </span>
          ))}
        </div>
      )}

      {/* Coach Description */}
      {workoutDay.description && (
        <p className="text-sm leading-relaxed text-foreground/80">
          {workoutDay.description}
        </p>
      )}

      {/* Exercise List */}
      {exercises.length > 0 && (
        <Card className="border-border/60">
          <CardContent className="p-4 sm:p-5">
            <ExercisePreviewList exercises={exercises} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
