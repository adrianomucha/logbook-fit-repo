import { memo, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { WorkoutCompletion, WorkoutPlan, EffortRating } from '@/types';
import { ChevronDown, ChevronUp, Dumbbell, Trophy } from 'lucide-react';
import {
  buildWorkoutHistory,
  EFFORT_LABELS,
  formatHistoryDuration,
  type HistoryEntry,
} from '@logbook/shared/progress';
import { cn } from '@/lib/utils';

interface EnrichedWorkoutHistoryProps {
  completions: WorkoutCompletion[];
  plans: WorkoutPlan[];
  /** Bests mark the sessions they were set in */
  personalBests?: { completionId: string }[];
  /** Weeks shown before "Show all" */
  initialWeeks?: number;
}

const EFFORT_COLOR: Record<EffortRating, string> = {
  EASY: 'text-success',
  MEDIUM: 'text-foreground',
  HARD: 'text-warning',
};

const WorkoutHistoryItem = memo(function WorkoutHistoryItem({ entry }: { entry: HistoryEntry }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { completion } = entry;
  const effort = completion.effortRating;

  return (
    <div>
      {/* One line: what it was and anything unusual about it on the left,
          when / how long / how much on the right */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 py-3 min-h-[44px] text-left hover:bg-muted/30 transition-colors touch-manipulation"
        aria-expanded={isExpanded}
      >
        <span className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-[15px] font-semibold tracking-tight leading-snug truncate">{entry.name}</span>
          {entry.bests > 0 && (
            <span
              className="inline-flex items-center gap-0.5 shrink-0 font-mono text-[10px] font-bold tabular-nums text-success-text"
              title={`${entry.bests} personal ${entry.bests === 1 ? 'best' : 'bests'}`}
            >
              <Trophy className="w-3 h-3" aria-hidden="true" />
              {entry.bests > 1 && entry.bests}
              <span className="sr-only">{entry.bests === 1 ? 'Personal best' : `${entry.bests} personal bests`}</span>
            </span>
          )}
          {entry.partial && (
            <span className="shrink-0 font-mono text-[10px] font-bold uppercase tracking-[0.1em] tabular-nums text-warning">
              {completion.exercisesDone}/{completion.exercisesTotal}
              <span className="sr-only"> exercises</span>
            </span>
          )}
          {entry.effortCallout && (
            <span
              className={cn(
                'shrink-0 font-mono text-[10px] font-bold uppercase tracking-[0.1em]',
                EFFORT_COLOR[entry.effortCallout]
              )}
            >
              {EFFORT_LABELS[entry.effortCallout]}
            </span>
          )}
        </span>
        <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">{entry.meta}</span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground/60 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground/60 shrink-0" />
        )}
      </button>

      {/* Expanded details — same label ↔ value rows as Body Stats */}
      {isExpanded && (
        <div className="pb-4 pt-1 space-y-2.5 animate-fade-in-up">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Exercises</span>
            <span className="font-mono font-medium tabular-nums">
              {completion.exercisesDone}/{completion.exercisesTotal}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Duration</span>
            <span className="font-mono font-medium tabular-nums">{formatHistoryDuration(completion.durationSec)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Effort</span>
            <span className={cn('font-medium', effort && EFFORT_COLOR[effort])}>
              {effort ? EFFORT_LABELS[effort] : '—'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Plan</span>
            <span className="font-medium truncate ml-4">
              {entry.planName}
              {entry.weekNumber != null && ` · Week ${entry.weekNumber}`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
});

WorkoutHistoryItem.displayName = 'WorkoutHistoryItem';

export function EnrichedWorkoutHistory({
  completions,
  plans,
  personalBests,
  initialWeeks = 4,
}: EnrichedWorkoutHistoryProps) {
  const [showAll, setShowAll] = useState(false);

  // Grouping, naming and the week summaries live in @logbook/shared/progress
  // so the app's log reads the same
  const weeks = useMemo(
    () => buildWorkoutHistory(completions, plans, personalBests),
    [completions, plans, personalBests]
  );
  const sessionCount = weeks.reduce((sum, w) => sum + w.entries.length, 0);

  const displayedWeeks = showAll ? weeks : weeks.slice(0, initialWeeks);
  const hiddenWeeks = weeks.length - initialWeeks;

  if (weeks.length === 0) {
    return (
      <section
        aria-label="Workout history"
        className="rounded-2xl bg-card border border-border/70 overflow-hidden"
      >
        <div className="flex items-baseline justify-between px-4 pt-4 pb-3 border-b border-border/50">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-medium">
            Workout history
          </h3>
        </div>
        <div className="text-center py-10 px-6 space-y-3">
          <div className="w-14 h-14 mx-auto rounded-full bg-muted flex items-center justify-center">
            <Dumbbell className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-[15px] font-semibold tracking-tight">No workouts logged yet</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground mt-1.5">
              Your completed sessions will appear here
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Workout history"
      className="rounded-2xl bg-card border border-border/70 overflow-hidden"
    >
      {/* Header bar — mono voice, hairline separator */}
      <div className="flex items-baseline justify-between px-4 pt-4 pb-3 border-b border-border/50">
        <h3 className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-medium">
          Workout history
        </h3>
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{sessionCount}</span>
      </div>

      {/* One block per week: the week's line, then its sessions */}
      {displayedWeeks.map((week, i) => (
        <div key={week.key} className={cn(i > 0 && 'border-t border-border/50')}>
          <div className="flex items-baseline justify-between gap-3 px-4 py-2 bg-muted/30">
            <h4 className="font-mono text-[10px] uppercase tracking-[0.14em] font-semibold text-foreground">
              {week.label}
            </h4>
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] tabular-nums text-muted-foreground text-right">
              {week.summary}
            </p>
          </div>
          <div className="divide-y divide-border/40 px-4">
            {week.entries.map((entry) => (
              <WorkoutHistoryItem key={entry.completion.id} entry={entry} />
            ))}
          </div>
        </div>
      ))}

      {hiddenWeeks > 0 && (
        <div className="border-t border-border/50">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll(!showAll)}
            className="w-full h-11 rounded-none font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground"
          >
            {showAll ? (
              <>
                <ChevronUp className="w-4 h-4 mr-1" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-1" />
                Show all ({hiddenWeeks} more {hiddenWeeks === 1 ? 'week' : 'weeks'})
              </>
            )}
          </Button>
        </div>
      )}
    </section>
  );
}
