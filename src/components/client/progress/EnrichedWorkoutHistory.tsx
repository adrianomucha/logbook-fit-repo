import { memo, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { WorkoutCompletion, WorkoutPlan } from '@/types';
import { ChevronDown, ChevronUp, Dumbbell, Trophy } from 'lucide-react';
import { buildWorkoutHistory, type HistoryEntry } from '@logbook/shared/progress';
import { cn } from '@/lib/utils';

interface EnrichedWorkoutHistoryProps {
  completions: WorkoutCompletion[];
  plans: WorkoutPlan[];
  /** Bests mark the sessions they were set in */
  personalBests?: { completionId: string }[];
  /** Weeks shown before "Show all" */
  initialWeeks?: number;
}

/** The session's name and its day — a trophy for a best, a note only when it was left unfinished */
const WorkoutHistoryItem = memo(function WorkoutHistoryItem({ entry }: { entry: HistoryEntry }) {
  return (
    <div className="py-3 min-h-[44px]">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className="text-[15px] font-semibold tracking-tight leading-snug truncate">{entry.name}</span>
          {entry.bests > 0 && (
            <Trophy
              className="w-3.5 h-3.5 shrink-0 text-success-text"
              aria-label={entry.bests === 1 ? 'Personal best' : `${entry.bests} personal bests`}
            />
          )}
        </span>
        <span className="shrink-0 text-[13px] text-muted-foreground">{entry.date}</span>
      </div>
      {entry.partialLabel && <p className="mt-0.5 text-xs text-warning-text">{entry.partialLabel}</p>}
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

  // Grouping and naming live in @logbook/shared/progress so the app's log
  // reads the same
  const weeks = useMemo(
    () => buildWorkoutHistory(completions, plans, personalBests),
    [completions, plans, personalBests]
  );

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
      <div className="px-4 pt-4 pb-3 border-b border-border/50">
        <h3 className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-medium">
          Workout history
        </h3>
      </div>

      {/* One block per week: its name, then its sessions */}
      {displayedWeeks.map((week, i) => (
        <div key={week.key} className={cn(i > 0 && 'border-t border-border/50')}>
          <div className="px-4 py-2 bg-muted/30">
            <h4 className="font-mono text-[10px] uppercase tracking-[0.14em] font-semibold text-foreground">
              {week.label}
            </h4>
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
