import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ClientDetail } from '@/types/api';
import { getWorkoutDeviations, formatDeviation } from '@/lib/workout-deviations';
import { differenceInHours, format, formatDistanceToNow } from 'date-fns';

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

  // Completed workouts plus started-but-never-finished ones — abandonment is
  // a fade signal, not something to hide. Guard the timestamps so a row
  // without one can't crash formatting.
  const rows = completions.filter(
    (c) => c.completedAt || (c.status === 'IN_PROGRESS' && c.startedAt)
  );

  if (rows.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center py-8 space-y-1.5">
        <div className="text-3xl select-none mb-2">🏋️</div>
        <p className="text-sm font-medium antialiased">No workouts yet</p>
        <p className="text-xs text-muted-foreground antialiased">
          Workouts {firstName} completes will show up here.
        </p>
      </div>
    );
  }

  const displayed = showAll ? rows : rows.slice(0, initialCount);
  const hasMore = rows.length > initialCount;

  return (
    <div className="h-full flex flex-col">
      <div className="space-y-1.5 flex-1 overflow-y-auto">
        {displayed.map((completion) => {
          const isUnfinished = completion.status === 'IN_PROGRESS';
          const timestamp = new Date(
            (completion.completedAt ?? completion.startedAt) as string
          );
          // A session started in the last few hours may still be live;
          // older ones were walked away from
          const abandoned =
            isUnfinished && differenceInHours(new Date(), timestamp) >= 6;
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
          const deviations = getWorkoutDeviations(completion.sets ?? []);

          return (
            <div
              key={completion.id}
              className="p-2.5 rounded-lg hover:bg-muted/40 transition-colors duration-150"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium truncate min-w-0">{dayName}</span>
                {isUnfinished ? (
                  <span className={cn('text-xs font-semibold shrink-0', abandoned ? 'text-warning' : 'text-info')}>
                    {abandoned ? 'Not finished' : 'In progress'}
                  </span>
                ) : effort ? (
                  <span className={cn('text-xs font-semibold shrink-0', effort.text)}>
                    {effort.label}
                  </span>
                ) : null}
              </div>
              <div className="flex items-center justify-between gap-2 mt-0.5">
                <span className="text-xs text-muted-foreground truncate min-w-0">
                  {isUnfinished ? 'Started ' : ''}
                  {format(timestamp, 'MMM d, yyyy')}
                  {' · '}
                  {formatDistanceToNow(timestamp, { addSuffix: true })}
                </span>
                <span className="font-mono text-[11px] tabular-nums text-muted-foreground shrink-0">
                  {!isUnfinished && completion.exercisesTotal ? (
                    <span className={cn(partial && 'text-warning')}>
                      {completion.exercisesDone ?? 0}/{completion.exercisesTotal} exercises
                    </span>
                  ) : null}
                  {!isUnfinished && completion.exercisesTotal && duration ? ' · ' : null}
                  {!isUnfinished ? duration : null}
                </span>
              </div>
              {deviations.length > 0 && (
                <p
                  className="text-[11px] text-warning/90 mt-1 truncate antialiased"
                  title={deviations.map(formatDeviation).join(' · ')}
                >
                  Adjusted: {deviations.slice(0, 2).map(formatDeviation).join(' · ')}
                  {deviations.length > 2 ? ` +${deviations.length - 2} more` : ''}
                </p>
              )}
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
                <ChevronUp className="w-4 h-4 me-1" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 me-1" />
                Show all ({rows.length - initialCount} more)
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
