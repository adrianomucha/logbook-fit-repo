import { WorkoutDay } from '@/types';
import { ExercisePreviewList } from './ExercisePreviewList';
import { Card, CardContent } from '@/components/ui/card';
import { Timer, Dumbbell } from 'lucide-react';

interface WorkoutOverviewProps {
  workoutDay: WorkoutDay;
  coachName?: string;
}

function estimateDuration(exercises: WorkoutDay['exercises']): number {
  // Rough estimate: ~2 min per set (including rest)
  const totalSets = exercises.reduce((sum, e) => sum + e.sets, 0);
  return Math.max(10, Math.round(totalSets * 2));
}

function getUniqueCategories(exercises: WorkoutDay['exercises']): string[] {
  const cats = new Set<string>();
  for (const e of exercises) {
    if (e.category) {
      // Convert enum-style to readable: "UPPER_BODY" → "Upper Body"
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
  const categories = getUniqueCategories(exercises);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          {workoutDay.name || 'Today\u2019s Workout'}
        </h2>
        {coachName && (
          <p className="text-sm text-muted-foreground mt-0.5">
            By {coachName}
          </p>
        )}
      </div>

      {/* Metadata */}
      <div className="space-y-2">
        <div className="flex items-center gap-2.5 text-sm">
          <Timer className="w-4 h-4 text-muted-foreground shrink-0" />
          <span>
            ~{duration} min. &middot; {exercises.length} exercises
          </span>
        </div>
        {categories.length > 0 && (
          <div className="flex items-center gap-2.5 text-sm">
            <Dumbbell className="w-4 h-4 text-muted-foreground shrink-0" />
            <span>{categories.join(', ')}</span>
          </div>
        )}
      </div>

      {/* Coach Description */}
      {workoutDay.description && (
        <p className="text-sm leading-relaxed text-foreground">
          {workoutDay.description}
        </p>
      )}

      {/* Exercise List */}
      {exercises.length > 0 && (
        <Card>
          <CardContent className="p-4 sm:p-5">
            <ExercisePreviewList exercises={exercises} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
