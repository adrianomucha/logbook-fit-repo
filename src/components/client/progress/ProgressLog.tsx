import { useState } from 'react';
import { Check, ChevronDown, ChevronUp, Flag, RotateCcw, Trophy, Zap } from 'lucide-react';
import { LOG_EMPTY_TEXT, LOG_PAGE_WEEKS, type LogBadge, type LogEntry, type LogWeek, type LogWin, type ThisWeek } from '@logbook/shared/progress';
import { AUTO_FINISHED_COPY } from '@logbook/shared/auto-finish';
import { cn } from '@/lib/utils';
import { WorkoutMarkIcon } from '@/components/WorkoutMarkIcon';

/**
 * This week as a stepper: a mark per workout (see WorkoutMarkIcon), the
 * done ones joined by a lime track.
 */
export function WeekCircles({ week }: { week: ThisWeek }) {
  const { slots } = week;
  const done = slots.filter((s) => s.state === 'done').length;
  // Smaller circles once a week holds more workouts than fit comfortably
  const size = slots.length > 5 ? 40 : 52;
  // The lit part of the track runs from the first circle to the last one done
  const lit = slots.length > 1 && done > 1 ? (Math.min(done, slots.length) - 1) / (slots.length - 1) : 0;
  return (
    <div role="img" aria-label={`${week.completed} of ${week.target} workouts done this week`} className="relative">
      <div className="absolute h-1 rounded-full bg-muted" style={{ left: size / 2, right: size / 2, top: size / 2 - 2 }}>
        <div className="h-full rounded-full bg-foreground transition-[width] duration-500" style={{ width: `${lit * 100}%` }} />
      </div>
      <div className="relative flex justify-between">
        {slots.map((slot, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <WorkoutMarkIcon mark={slot.state} size={size} />
            <span
              className={cn(
                'h-4 text-[11px] leading-4',
                slot.state === 'next' || slot.state === 'started' ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground'
              )}
            >
              {slot.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const WIN_ICON = { best: Trophy, milestone: Flag, comeback: RotateCcw } as const;

/** A best, a milestone or a comeback, under the workout it came from */
function Win({ win }: { win: LogWin }) {
  const Icon = WIN_ICON[win.kind];
  return (
    <li className="flex items-start gap-2 text-sm leading-5">
      <span
        aria-hidden="true"
        className={cn(
          'mt-px h-[18px] w-[18px] shrink-0 rounded-full flex items-center justify-center',
          win.kind === 'best' ? 'bg-foreground text-background' : 'bg-muted text-foreground'
        )}
      >
        <Icon className="w-3 h-3" strokeWidth={2.5} />
      </span>
      <span className="min-w-0">
        {win.kind === 'best' && <span className="sr-only">New best: </span>}
        <span className="font-semibold text-foreground">{win.label}</span>
        {win.detail && <span className="text-muted-foreground"> {win.detail}</span>}
      </span>
    </li>
  );
}

function Badge({ badge }: { badge: LogBadge }) {
  const Icon = badge.kind === 'week' ? Check : Zap;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 h-6 rounded-full px-2.5 text-xs font-semibold',
        badge.kind === 'week' ? 'bg-foreground text-background' : 'bg-muted text-foreground'
      )}
    >
      <Icon className="w-3 h-3" strokeWidth={3} aria-hidden="true" />
      {badge.text}
    </span>
  );
}

/** A workout, or a note from the coach: the day on the left, what happened on the right */
function Entry({ entry, first }: { entry: LogEntry; first: boolean }) {
  return (
    // Entries on the same day share a block: no rule between them
    <li className={cn('flex gap-3 py-3', !first && entry.firstOfDay && 'border-t border-border/60', !entry.firstOfDay && 'pt-0')}>
      {/* A second entry on the same day leaves the day off */}
      <div className="w-9 shrink-0 text-center" aria-hidden={!entry.firstOfDay}>
        {entry.firstOfDay && (
          <>
            <p className="text-[11px] font-medium uppercase leading-4 tracking-wide text-muted-foreground">{entry.weekday}</p>
            <p className="text-lg font-bold leading-6 tabular-nums">{entry.date}</p>
          </>
        )}
      </div>
      {entry.kind === 'coach' ? (
        <div className="min-w-0 flex-1 rounded-xl bg-muted px-3.5 py-3">
          <p className="text-xs font-semibold text-muted-foreground">{entry.title}</p>
          <p className="mt-1 text-sm leading-5 text-foreground whitespace-pre-line">{entry.note}</p>
        </div>
      ) : (
        <div className="min-w-0 flex-1 pt-[7px]">
          <p className="text-[15px] font-semibold leading-5">{entry.title}</p>
          {entry.autoFinished && (
            <p className="mt-0.5 text-xs leading-4 text-muted-foreground">{AUTO_FINISHED_COPY.label}</p>
          )}
          {entry.wins.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {entry.wins.map((w, i) => (
                <Win key={i} win={w} />
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}

/**
 * The client's training, a week to a section, newest first: every workout
 * with its wins under it, and the coach's notes in the week they came. The
 * app's ProgressLog.
 */
export function ProgressLog({ weeks }: { weeks: LogWeek[] }) {
  const [showAll, setShowAll] = useState(false);
  if (weeks.length === 0) {
    return <p className="text-[15px] leading-relaxed text-muted-foreground">{LOG_EMPTY_TEXT}</p>;
  }
  const shown = showAll ? weeks : weeks.slice(0, LOG_PAGE_WEEKS);
  return (
    <div className="space-y-7">
      {shown.map((week) => (
        <section key={week.key} aria-label={week.title}>
          <div className="flex items-baseline justify-between gap-3 border-b border-border pb-2">
            <h2 className="text-[15px] font-bold tracking-tight">{week.title}</h2>
            {week.summary && <span className="text-[13px] text-muted-foreground">{week.summary}</span>}
          </div>
          {week.badges.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {week.badges.map((b, i) => (
                <Badge key={i} badge={b} />
              ))}
            </div>
          )}
          <ul>
            {week.entries.map((e, i) => (
              <Entry key={e.key} entry={e} first={i === 0} />
            ))}
          </ul>
        </section>
      ))}
      {weeks.length > LOG_PAGE_WEEKS && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full h-11 flex items-center justify-center gap-1 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground transition-colors"
        >
          {showAll ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {showAll ? 'Show less' : 'Show earlier weeks'}
        </button>
      )}
    </div>
  );
}
