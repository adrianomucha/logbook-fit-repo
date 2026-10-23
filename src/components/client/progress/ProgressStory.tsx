import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { STORY_EMPTY_TEXT, STORY_PAGE_SIZE, type Moment, type MomentKind, type ThisWeek } from '@logbook/shared/progress';
import { cn } from '@/lib/utils';
import { WorkoutMarkIcon } from '../WorkoutMarkIcon';

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
        <div className="h-full rounded-full bg-brand transition-[width] duration-500" style={{ width: `${lit * 100}%` }} />
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

// Lime for a best, ink for the other wins, an outline for the coach and for plain workouts
const DOT: Record<MomentKind, string> = {
  best: 'border-brand bg-brand',
  streak: 'border-foreground bg-foreground',
  week: 'border-foreground bg-foreground',
  milestone: 'border-foreground bg-foreground',
  comeback: 'border-foreground bg-foreground',
  coach: 'border-brand bg-background',
  quiet: 'border-muted-foreground/40 bg-background',
};

/** "+ 2 workouts": opens to list them, so nothing logged is out of reach */
function QuietRow({ moment }: { moment: Moment }) {
  const [open, setOpen] = useState(false);
  const Chevron = open ? ChevronUp : ChevronDown;
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex items-center gap-1 min-h-[32px] text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        {moment.title}
        <Chevron className="w-3.5 h-3.5 opacity-60" />
      </button>
      {open && (
        <ul className="mt-1 space-y-1 animate-fade-in-up">
          {moment.sessions?.map((s, i) => (
            <li key={i} className="text-[13px] text-muted-foreground">{s}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** The story of the client's training: only the moments worth noticing, newest first. The app's ProgressStory. */
export function ProgressStory({ moments }: { moments: Moment[] }) {
  const [showAll, setShowAll] = useState(false);
  if (moments.length === 0) {
    return <p className="text-[15px] leading-relaxed text-muted-foreground">{STORY_EMPTY_TEXT}</p>;
  }
  const shown = showAll ? moments : moments.slice(0, STORY_PAGE_SIZE);
  return (
    <section aria-label="Your story">
      {/* The timeline's spine runs down the left */}
      <ol className="relative pl-7 before:absolute before:left-[6px] before:top-2 before:bottom-2 before:w-0.5 before:rounded-full before:bg-muted">
        {shown.map((m) => (
          <li key={m.key} className="relative mb-5">
            <span
              aria-hidden="true"
              className={cn('absolute -left-7 top-[3px] h-3.5 w-3.5 rounded-full border-2', DOT[m.kind])}
            />
            {m.kind === 'quiet' ? (
              <QuietRow moment={m} />
            ) : (
              <>
                <p className="text-xs text-muted-foreground">{m.when}</p>
                <p className="mt-0.5 text-base font-bold tracking-tight">{m.title}</p>
                {m.detail && (
                  <p
                    className={cn(
                      'mt-0.5 text-sm leading-5',
                      m.kind === 'coach' ? 'text-foreground line-clamp-3' : 'text-muted-foreground line-clamp-2'
                    )}
                  >
                    {m.kind === 'coach' ? `“${m.detail}”` : m.detail}
                  </p>
                )}
              </>
            )}
          </li>
        ))}
      </ol>
      {moments.length > STORY_PAGE_SIZE && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full h-11 flex items-center justify-center gap-1 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground transition-colors"
        >
          {showAll ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {showAll ? 'Show less' : 'Show earlier'}
        </button>
      )}
    </section>
  );
}
