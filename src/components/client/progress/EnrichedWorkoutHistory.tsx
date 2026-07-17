import { memo, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { WorkoutCompletion, WorkoutPlan, WorkoutDay, EffortRating } from '@/types';
import { format, parseISO, getDay } from 'date-fns';
import {
  ChevronDown,
  ChevronUp,
  Dumbbell,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Get a user-friendly workout name with fallback chain
 * 1. day.name (e.g., "Upper Body Pull")
 * 2. Day index label (e.g., "Day 1")
 * 3. Date-based label (e.g., "Monday Workout" or "Workout · Feb 16")
 */
function getWorkoutDisplayName(
  day: WorkoutDay | undefined,
  dayIndex: number,
  completedAt: string | undefined
): string {
  // Prefer the day name if it exists
  if (day?.name) {
    return day.name;
  }

  // Fall back to day index
  if (dayIndex >= 0) {
    return `Day ${dayIndex + 1}`;
  }

  // Fall back to date-based label
  if (completedAt) {
    const date = parseISO(completedAt);
    const dayOfWeek = getDay(date);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return `${dayNames[dayOfWeek]} Workout`;
  }

  // Last resort - but this should rarely happen
  return 'Workout';
}

interface EnrichedWorkoutHistoryProps {
  completions: WorkoutCompletion[];
  plans: WorkoutPlan[];
  initialCount?: number;
}

interface WorkoutHistoryItemProps {
  completion: WorkoutCompletion;
  dayName: string;
  /** Null when the completion belongs to a plan we no longer have the tree
   *  for (e.g. a previous plan) — claiming "Week 1" would be wrong. */
  weekNumber: number | null;
  planName: string;
}

const EFFORT_LABELS: Record<EffortRating, { label: string; color: string }> = {
  EASY: { label: 'Easy', color: 'text-success' },
  MEDIUM: { label: 'Medium', color: 'text-foreground' },
  HARD: { label: 'Hard', color: 'text-warning' },
};

function formatDuration(seconds?: number): string {
  if (!seconds) return '—';
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hours}h ${remainingMins}m`;
}

const WorkoutHistoryItem = memo(function WorkoutHistoryItem({ completion, dayName, weekNumber, planName }: WorkoutHistoryItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const effortInfo = completion.effortRating ? EFFORT_LABELS[completion.effortRating] : null;

  // Calculate estimated volume (simplified)
  const estimatedSets = completion.exercisesDone * 3; // Assume ~3 sets per exercise

  return (
    <div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full py-3.5 min-h-[44px] text-left hover:bg-muted/30 transition-colors touch-manipulation"
        aria-expanded={isExpanded}
      >
        {/* Row 1: Name + chevron */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <h4 className="text-[15px] font-semibold tracking-tight leading-snug truncate">{dayName}</h4>
            {completion.status === 'COMPLETED' && (
              <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
            )}
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground/60 shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground/60 shrink-0" />
          )}
        </div>

        {/* Row 2: Date · Week · Effort — mono data voice */}
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] tabular-nums text-muted-foreground mt-1">
          {completion.completedAt
            ? format(parseISO(completion.completedAt), 'MMM d, yyyy')
            : 'In Progress'}
          {weekNumber != null && <>{' · '}Week {weekNumber}</>}
          {effortInfo && (
            <span className={cn('ml-1.5 font-bold', effortInfo.color)}>
              {effortInfo.label}
            </span>
          )}
        </p>

        {/* Row 3: Quick stats */}
        <p className="font-mono text-xs tabular-nums text-muted-foreground/70 mt-1.5">
          {completion.exercisesDone}/{completion.exercisesTotal} exercises
          &ensp;·&ensp;{formatDuration(completion.durationSec)}
          &ensp;·&ensp;~{estimatedSets} sets
        </p>
      </button>

      {/* Expanded details — same label ↔ value rows as Body Stats */}
      {isExpanded && (
        <div className="pb-4 pt-1 space-y-2.5 animate-fade-in-up">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Completion</span>
            <span className="font-mono font-medium tabular-nums">{Math.round(completion.completionPct)}%</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Effort</span>
            <span className={cn('font-medium', effortInfo?.color)}>
              {effortInfo ? effortInfo.label : '—'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Plan</span>
            <span className="font-medium truncate ml-4">{planName}</span>
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
  initialCount = 5,
}: EnrichedWorkoutHistoryProps) {
  const [showAll, setShowAll] = useState(false);

  const enrichedCompletions = useMemo(() => {
    // Sort by completion date (newest first), then filter completed only
    const sorted = [...completions]
      .filter((c) => c.status === 'COMPLETED' && c.completedAt)
      .sort((a, b) => {
        const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return dateB - dateA;
      });

    return sorted.map((completion) => {
      const plan = plans.find((p) => p.id === completion.planId);
      const week = plan?.weeks.find((w) => w.id === completion.weekId);
      const day = week?.days.find((d) => d.id === completion.dayId);
      const dayIndex = week?.days.findIndex((d) => d.id === completion.dayId) ?? -1;

      return {
        completion,
        dayName: getWorkoutDisplayName(day, dayIndex, completion.completedAt),
        // History spans plans, but only the active plan's tree is loaded —
        // don't mislabel older work as "Week 1" of a plan it wasn't part of
        weekNumber: week?.weekNumber ?? null,
        planName: plan?.name || 'Earlier plan',
      };
    });
  }, [completions, plans]);

  const displayedCompletions = showAll
    ? enrichedCompletions
    : enrichedCompletions.slice(0, initialCount);

  const hasMore = enrichedCompletions.length > initialCount;

  if (enrichedCompletions.length === 0) {
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
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground/60">
          {enrichedCompletions.length}
        </span>
      </div>

      {/* Workout items — hairline dividers inside the card */}
      <div className="divide-y divide-border/50 px-4">
        {displayedCompletions.map((item) => (
          <WorkoutHistoryItem
            key={item.completion.id}
            completion={item.completion}
            dayName={item.dayName}
            weekNumber={item.weekNumber}
            planName={item.planName}
          />
        ))}
      </div>

      {hasMore && (
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
                Show all ({enrichedCompletions.length - initialCount} more)
              </>
            )}
          </Button>
        </div>
      )}
    </section>
  );
}
