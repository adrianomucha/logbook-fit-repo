import { WorkoutDay } from '@/types';
import { ExercisePreviewList } from './ExercisePreviewList';
import { parseSessionName } from '@/lib/parse-session-name';
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
  // "Other" is a catch-all bucket, not information — never lead with it
  return Array.from(cats).filter((c) => c.toLowerCase() !== 'other');
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

  const { day, title, subtitle } = parseSessionName(workoutDay.name || 'Today’s Workout');
  const eyebrowParts = [
    day ? `Today · Day ${day}` : 'Today’s session',
    coachName ? `Coach ${coachName.split(' ')[0]}` : null,
  ].filter(Boolean);

  const stats: [number, string][] = [
    [duration, 'min'],
    [exercises.length, exercises.length === 1 ? 'exercise' : 'exercises'],
    [totalSets, 'sets'],
  ];

  return (
    <div className="space-y-6">
      {/* Hero session card — single focal point: what, how big, go */}
      <div className="rounded-2xl bg-card border border-border/70 p-5 sm:p-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          {eyebrowParts.join(' · ')}
        </p>

        <h2 className="text-[26px] sm:text-[28px] font-bold tracking-tight leading-[1.15] mt-2.5 text-balance">
          {title}
        </h2>

        {/* One supporting line: the parsed subtitle wins, muscle groups otherwise */}
        {(subtitle || categories.length > 0) && (
          <p className="text-[15px] text-muted-foreground mt-1.5">
            {subtitle ?? categories.join(' · ')}
          </p>
        )}

        {/* Stat band — numbers carry the weight, units stay quiet */}
        <p className="font-mono text-[13px] tabular-nums mt-4 pt-4 border-t border-border/50">
          {stats.map(([value, unit], i) => (
            <span key={unit}>
              {i > 0 && <span className="text-muted-foreground/40">&ensp;·&ensp;</span>}
              <span className="font-semibold text-foreground">{value}</span>
              <span className="text-muted-foreground"> {unit}</span>
            </span>
          ))}
        </p>

        {workoutDay.description && (
          <p className="text-sm leading-relaxed text-muted-foreground mt-3">
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
                className="h-full rounded-full bg-brand transition-[width] duration-500"
                style={{ width: `${completionPct}%` }}
              />
            </div>
          </div>
        )}

        <button
          onClick={onAction}
          className="mt-6 w-full h-14 rounded-xl bg-brand text-brand-foreground text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-brand/90 active:scale-[0.98] transition-[background-color,transform] duration-150 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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

      {/* Exercise list — contained module: mono header bar + hairline card,
          so the section reads as one unit against the rest of the page */}
      {exercises.length > 0 && (
        <section
          aria-label="Exercises"
          className="rounded-2xl bg-card border border-border/70 overflow-hidden"
        >
          <div className="flex items-baseline justify-between px-5 pt-4 pb-3 border-b border-border/50">
            <h3 className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-medium">
              Exercises
            </h3>
            <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
              {exercises.length}
            </span>
          </div>
          <div className="px-5 py-4">
            <ExercisePreviewList exercises={exercises} />
          </div>
        </section>
      )}
    </div>
  );
}
