import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WorkoutCompletion, WorkoutPlan, WorkoutDay, EffortRating } from '@/types';
import { format, parseISO, getDay } from 'date-fns';
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Clock,
  Flame,
  CheckCircle2,
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

const EFFORT_LABELS: Record<EffortRating, { label: string; emoji: string; color: string }> = {
  EASY: { label: 'Easy', emoji: '😊', color: 'text-green-600' },
  MEDIUM: { label: 'Medium', emoji: '💪', color: 'text-yellow-600' },
  HARD: { label: 'Hard', emoji: '🔥', color: 'text-red-600' },
};

function formatDuration(seconds?: number): string {
  if (!seconds) return '—';
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hours}h ${remainingMins}m`;
}

function WorkoutHistoryItem({ completion, dayName, weekNumber, planName }: WorkoutHistoryItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const effortInfo = completion.effortRating ? EFFORT_LABELS[completion.effortRating] : null;

  // Calculate estimated volume (simplified)
  const estimatedSets = completion.exercisesDone * 3; // Assume ~3 sets per exercise

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-medium truncate">{dayName}</h4>
              {completion.status === 'COMPLETED' && (
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {completion.completedAt
                ? format(parseISO(completion.completedAt), 'MMM d, yyyy')
                : 'In Progress'}
              {' • '}Week {weekNumber}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {effortInfo && (
              <span className={cn('text-sm', effortInfo.color)}>
                {effortInfo.emoji}
              </span>
            )}
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Quick stats row */}
        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Dumbbell className="w-3 h-3" />
            {completion.exercisesDone}/{completion.exercisesTotal} exercises
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDuration(completion.durationSec)}
          </span>
          <span className="flex items-center gap-1">
            <Flame className="w-3 h-3" />
            ~{estimatedSets} sets
          </span>
        </div>
      </button>

      {/* Expanded details */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-1 border-t bg-muted/20">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Completion</p>
              <p className="font-medium">{completion.completionPct}%</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Duration</p>
              <p className="font-medium">{formatDuration(completion.durationSec)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Exercises</p>
              <p className="font-medium">
                {completion.exercisesDone} of {completion.exercisesTotal}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Effort</p>
              <p className={cn('font-medium', effortInfo?.color)}>
                {effortInfo ? `${effortInfo.emoji} ${effortInfo.label}` : '—'}
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Part of: {planName}
          </p>
        </div>
      )}
    </div>
  );
}

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
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Workout History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Dumbbell className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No completed workouts yet.</p>
            <p className="text-sm">Get started today!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Workout History
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {enrichedCompletions.length} {enrichedCompletions.length === 1 ? 'workout' : 'workouts'}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
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
      </CardContent>
    </Card>
  );
}
