import { WorkoutDay } from '@/types';
import { ExercisePreviewList } from './ExercisePreviewList';
import { Play, RotateCcw } from 'lucide-react';

interface WorkoutOverviewProps {
  workoutDay: WorkoutDay;
  coachName?: string;
  /** Whether the session hasn't started yet or is mid-flight */
  actionState: 'scheduled' | 'in-progress';
  /** 0–100, only meaningful when in progress */
  completionPct?: number;
  /** Start / resume the workout */
  onAction: () => void;
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
  actionState,
  completionPct = 0,
  onAction,
}: WorkoutOverviewProps) {
  const exercises = workoutDay.exercises;
  const duration = estimateDuration(exercises);
  const totalSets = exercises.reduce((sum, e) => sum + e.sets, 0);
  const categories = getUniqueCategories(exercises);
  const inProgress = actionState === 'in-progress';

  return (
    <div className="space-y-6">
      {/* Hero session card — single focal point: what, how big, go */}
      <div className="rounded-2xl bg-card border border-border/70 shadow-sm p-5 sm:p-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          Today&rsquo;s session{coachName ? ` · Coach ${coachName.split(' ')[0]}` : ''}
        </p>

        <h2 className="text-2xl sm:text-[28px] font-bold tracking-tight leading-tight mt-2">
          {workoutDay.name || 'Today’s Workout'}
        </h2>

        {categories.length > 0 && (
          <p className="text-sm text-muted-foreground mt-1">
            {categories.join(' · ')}
          </p>
        )}

        {/* Stat line — mono is the data voice */}
        <p className="font-mono text-xs tracking-wide text-muted-foreground tabular-nums mt-4">
          {duration} min&ensp;·&ensp;{exercises.length} exercises&ensp;·&ensp;{totalSets} sets
        </p>

        {workoutDay.description && (
          <p className="text-sm leading-relaxed text-foreground/75 mt-3">
            {workoutDay.description}
          </p>
        )}

        {/* Progress — only when there's actual progress to show */}
        {inProgress && completionPct > 0 && (
          <div className="mt-5">
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="font-mono text-xs font-bold tabular-nums">
                {completionPct}%
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                complete
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-brand transition-all duration-500"
                style={{ width: `${completionPct}%` }}
              />
            </div>
          </div>
        )}

        <button
          onClick={onAction}
          className="mt-5 w-full h-14 rounded-xl bg-brand text-brand-foreground text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-brand/90 active:scale-[0.98] transition-[background-color,transform] duration-150 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {inProgress ? (
            <>
              <RotateCcw className="w-4 h-4" strokeWidth={2.5} />
              Continue workout
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              Start workout
            </>
          )}
        </button>
      </div>

      {/* Exercise list — open list, no boxed-in card */}
      {exercises.length > 0 && (
        <section aria-label="Exercises">
          <div className="flex items-baseline justify-between mb-2 px-1">
            <h3 className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-medium">
              The work
            </h3>
            <span className="font-mono text-[11px] tabular-nums text-muted-foreground/60">
              {exercises.length}
            </span>
          </div>
          <ExercisePreviewList exercises={exercises} />
        </section>
      )}
    </div>
  );
}
