import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ClientDetail } from '@/types/api';
import { format, formatDistanceToNow } from 'date-fns';

interface WorkoutHistoryPanelProps {
  completions: ClientDetail['completions'];
  clientName: string;
  /** Number of workouts to show initially (default: 5) */
  initialCount?: number;
}

// Workout-effort voice ("Hard", not the check-in's "Too Hard") — same
// vocabulary and colors as the client's own workout history.
const EFFORT_DISPLAY: Record<string, { label: string; text: string }> = {
  EASY: { label: 'Easy', text: 'text-success' },
  MEDIUM: { label: 'Medium', text: 'text-foreground' },
  HARD: { label: 'Hard', text: 'text-warning' },
};

function formatDuration(seconds: number | null): string | null {
  if (!seconds) return null;
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export function WorkoutHistoryPanel({
  completions,
  clientName,
  initialCount = 5,
}: WorkoutHistoryPanelProps) {
  const [showAll, setShowAll] = useState(false);

  const firstName = clientName?.split(' ')[0] || clientName || 'Client';

  // The API already filters to COMPLETED and sorts newest-first; guard the
  // date anyway so a row without a timestamp can't crash formatting.
  const completed = completions.filter((c) => c.completedAt);

  if (completed.length === 0) {
    return (
      <div className="text-center py-8 space-y-1.5">
        <div className="text-3xl select-none mb-2">🏋️</div>
        <p className="text-sm font-medium antialiased">No workouts yet</p>
        <p className="text-xs text-muted-foreground antialiased">
          Workouts {firstName} completes will show up here.
        </p>
      </div>
    );
  }

  const displayed = showAll ? completed : completed.slice(0, initialCount);
  const hasMore = completed.length > initialCount;

  return (
    <div className="h-full flex flex-col">
      <div className="space-y-1.5 flex-1 overflow-y-auto">
        {displayed.map((completion) => {
          const completedAt = new Date(completion.completedAt as string);
          const dayName =
            completion.day?.name ||
            (completion.day ? `Day ${completion.day.orderIndex + 1}` : 'Workout');
          const effort = completion.effortRating
            ? EFFORT_DISPLAY[completion.effortRating]
            : null;
          const duration = formatDuration(completion.durationSec);
          const partial =
            completion.exercisesTotal != null &&
            completion.exercisesTotal > 0 &&
            (completion.exercisesDone ?? 0) < completion.exercisesTotal;

          return (
            <div
              key={completion.id}
              className="p-2.5 rounded-lg hover:bg-muted/40 transition-colors duration-150"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium truncate min-w-0">{dayName}</span>
                {effort && (
                  <span className={cn('text-xs font-semibold shrink-0', effort.text)}>
                    {effort.label}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 mt-0.5">
                <span className="text-xs text-muted-foreground truncate min-w-0">
                  {format(completedAt, 'MMM d, yyyy')}
                  {' · '}
                  {formatDistanceToNow(completedAt, { addSuffix: true })}
                </span>
                <span className="font-mono text-[11px] tabular-nums text-muted-foreground shrink-0">
                  {completion.exercisesTotal ? (
                    <span className={cn(partial && 'text-warning')}>
                      {completion.exercisesDone ?? 0}/{completion.exercisesTotal} exercises
                    </span>
                  ) : null}
                  {completion.exercisesTotal && duration ? ' · ' : null}
                  {duration}
                </span>
              </div>
            </div>
          );
        })}

        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? (
              <>
                <ChevronUp className="w-4 h-4 mr-1" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-1" />
                Show all ({completed.length - initialCount} more)
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
