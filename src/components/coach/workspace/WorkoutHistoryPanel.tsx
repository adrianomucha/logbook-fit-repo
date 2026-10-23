import { useState } from 'react';

import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ClientDetail } from '@/types/api';
import { getWorkoutDeviations, formatDeviation } from '@/lib/workout-deviations';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { differenceInHours, format, formatDistanceToNow } from 'date-fns';
import { plausibleSessionSec } from '@logbook/shared/session-duration';
import { workoutTitle } from '@logbook/shared/progress';
import { WORKOUT_MARK_LABEL } from '@logbook/shared/workout-week-helpers';
import { WorkoutMarkIcon } from '@/components/WorkoutMarkIcon';

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

function formatDuration(stored: number | null): string | null {
  // A session left open for days isn't a duration worth showing
  const seconds = plausibleSessionSec(stored);
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
  const { weightUnit } = useCurrentUser();

  const firstName = clientName?.split(' ')[0] || clientName || 'Client';

  // Completed workouts plus started-but-never-finished ones — abandonment is
  // a fade signal, not something to hide. Guard the timestamps so a row
  // without one can't crash formatting.
  const rows = completions.filter(
    (c) => c.completedAt || (c.status === 'IN_PROGRESS' && c.startedAt)
  );

  // Same shape as the Check-ins tab's empty state so the tabs read as one
  // family
  if (rows.length === 0) {
    return (
      <div className="h-full lg:flex-1 lg:min-h-0 flex flex-col items-center justify-center text-center py-8">
        <p className="font-semibold antialiased">No workouts yet</p>
        <p className="text-sm text-muted-foreground antialiased">
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
          // A workout started in the last few hours may still be live;
          // older ones were walked away from
          const abandoned =
            isUnfinished && differenceInHours(new Date(), timestamp) >= 6;
          // The name the client sees ("Lower B", not "Day 4: Lower B"); an
          // unnamed day is its place in the week (orderIndex starts at 1)
          const dayName = completion.day?.name
            ? workoutTitle(completion.day.name)
            : completion.day
              ? `Day ${completion.day.orderIndex}`
              : 'Workout';
          const effort = completion.effortRating
            ? EFFORT_DISPLAY[completion.effortRating]
            : null;
          const duration = formatDuration(completion.durationSec);
          const partial =
            completion.exercisesTotal != null &&
            completion.exercisesTotal > 0 &&
            (completion.exercisesDone ?? 0) < completion.exercisesTotal;
          const deviations = getWorkoutDeviations(completion.sets ?? [], weightUnit);

          return (
            <div
              key={completion.id}
              className="p-2.5 rounded-lg hover:bg-muted/40 transition-colors duration-150"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium truncate min-w-0">{dayName}</span>
                {isUnfinished ? (
                  abandoned ? (
                    <span className="text-xs font-semibold shrink-0 text-warning-text">Not finished</span>
                  ) : (
                    // The client's own "Started" mark
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold shrink-0 text-foreground">
                      <WorkoutMarkIcon mark="started" size={16} />
                      {WORKOUT_MARK_LABEL.started}
                    </span>
                  )
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
                  title={deviations.map((d) => formatDeviation(d, weightUnit)).join(' · ')}
                >
                  Adjusted: {deviations.slice(0, 2).map((d) => formatDeviation(d, weightUnit)).join(' · ')}
                  {deviations.length > 2 ? ` +${deviations.length - 2} more` : ''}
                </p>
              )}
            </div>
          );
        })}

        {hasMore && (
          // The quiet text action the client's Progress feed uses
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="w-full h-11 flex items-center justify-center gap-1 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground transition-colors"
          >
            {showAll ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {showAll ? 'Show less' : 'Show earlier'}
          </button>
        )}
      </div>
    </div>
  );
}
