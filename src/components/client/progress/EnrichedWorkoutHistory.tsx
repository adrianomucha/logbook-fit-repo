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
  weekNumber: number;
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
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3.5 min-h-[44px] text-left hover:bg-muted/50 transition-colors touch-manipulation"
        aria-expanded={isExpanded}
      >
        {/* Row 1: Name + chevron */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <h4 className="text-sm font-bold tracking-tight truncate">{dayName}</h4>
            {completion.status === 'COMPLETED' && (
              <span className="w-2 h-2 rounded-full bg-success shrink-0" />
            )}
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
          )}
        </div>

        {/* Row 2: Date · Week · Effort */}
        <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-medium mt-0.5">
          {completion.completedAt
            ? format(parseISO(completion.completedAt), 'MMM d, yyyy')
            : 'In Progress'}
          {' · '}Week {weekNumber}
          {effortInfo && (
            <span className={cn('ml-1.5 font-bold', effortInfo.color)}>
              {effortInfo.label}
            </span>
          )}
        </p>

        {/* Row 3: Quick stats */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/50 text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70 font-medium">
          <span className="tabular-nums">{completion.exercisesDone}/{completion.exercisesTotal} exercises</span>
          <span className="tabular-nums">{formatDuration(completion.durationSec)}</span>
          <span className="tabular-nums">~{estimatedSets} sets</span>
        </div>
      </button>

      {/* Expanded details — same label ↔ value rows as Body Stats */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-3 border-t space-y-2.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Completion</span>
            <span className="font-medium tabular-nums">{Math.round(completion.completionPct)}%</span>
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
        weekNumber: week?.weekNumber || 1,
        planName: plan?.name || 'Training',
      };
    });
  }, [completions, plans]);

  const displayedCompletions = showAll
    ? enrichedCompletions
    : enrichedCompletions.slice(0, initialCount);

  const hasMore = enrichedCompletions.length > initialCount;

  if (enrichedCompletions.length === 0) {
    return (
      <div className="border rounded-lg">
        <div className="p-3">
          <span className="text-[11px] uppercase tracking-wide font-bold">Workout History</span>
        </div>
        <div className="text-center py-8 space-y-3 border-t">
          <div className="w-14 h-14 mx-auto rounded-full bg-muted flex items-center justify-center">
            <Dumbbell className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight">No workouts logged yet</p>
            <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-medium mt-1">Your completed sessions will appear here</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Section header */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] uppercase tracking-wide font-bold">Workout History</span>
        <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-medium tabular-nums">
          {enrichedCompletions.length} {enrichedCompletions.length === 1 ? 'workout' : 'workouts'}
        </span>
      </div>

      {/* Workout items */}
      <div className="space-y-2">
        {displayedCompletions.map((item) => (
          <WorkoutHistoryItem
            key={item.completion.id}
            completion={item.completion}
            dayName={item.dayName}
            weekNumber={item.weekNumber}
            planName={item.planName}
          />
        ))}

        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll(!showAll)}
            className="w-full text-muted-foreground"
          >
            {showAll ? (
              <>
                <ChevronUp className="w-4 h-4 mr-1" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-1" />
                Show All ({enrichedCompletions.length - initialCount} more)
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
