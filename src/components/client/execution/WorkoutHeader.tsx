'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatClock } from '@/lib/set-timer';
import { stripDayPrefix } from '@logbook/shared/workout-execution';

interface WorkoutHeaderProps {
  workoutName: string;
  /** Small eyebrow above the title, e.g. "Day 2" (rendered uppercase) */
  dayLabel?: string;
  exercisesTotal: number;
  /** Progress is measured in sets: every logged set moves the bar */
  setsDone: number;
  setsTotal: number;
  /** When the session clock started; drives the elapsed timer */
  startedAt?: string | null;
  onBack: () => void;
  onRestart?: () => void;
  isReadOnly?: boolean;
  completedDate?: string;
}

/** Elapsed session time, ticking once a second. */
function ElapsedClock({ startedAt }: { startedAt: string }) {
  const start = new Date(startedAt).getTime();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const seconds = Math.max(0, (now - start) / 1000);
  return (
    <span
      className="font-mono text-sm font-bold tabular-nums"
      // Announcing every tick would drown out everything else
      aria-label={`Session time ${Math.floor(seconds / 60)} minutes`}
      role="timer"
      aria-live="off"
    >
      {formatClock(seconds)}
    </span>
  );
}

/**
 * Two layers: a slim sticky bar (back, clock, progress) that stays put while
 * logging, and a large title that scrolls away with the page. Once the title
 * has scrolled under the bar, the bar picks up a compact copy of it so the
 * athlete always knows which session they're in.
 */
export function WorkoutHeader({
  workoutName,
  dayLabel,
  exercisesTotal,
  setsDone,
  setsTotal,
  startedAt,
  onBack,
  onRestart,
  isReadOnly,
  completedDate,
}: WorkoutHeaderProps) {
  const title = stripDayPrefix(workoutName);
  const pct = setsTotal > 0 ? Math.round((setsDone / setsTotal) * 100) : 0;
  const eyebrow = [dayLabel, isReadOnly ? completedDate : null]
    .filter(Boolean)
    .join(' · ');

  const titleRef = useRef<HTMLHeadingElement>(null);
  const [heroHidden, setHeroHidden] = useState(false);

  useEffect(() => {
    const el = titleRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    // The bar is ~59px tall; the title counts as gone once it slides under it
    const observer = new IntersectionObserver(
      ([entry]) => setHeroHidden(!entry.isIntersecting),
      { rootMargin: '-64px 0px 0px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <header className="sticky top-0 z-20 bg-background pt-[env(safe-area-inset-top)]">
        <div className="relative max-w-2xl mx-auto h-14 px-2 flex items-center gap-1">
          <button
            type="button"
            onClick={onBack}
            className="h-11 w-11 flex-shrink-0 rounded-full flex items-center justify-center text-foreground hover:bg-muted active:scale-[0.92] transition-[background-color,transform] duration-150 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Compact title — only once the big one has scrolled away */}
          <p
            aria-hidden={!heroHidden}
            className={cn(
              'flex-1 min-w-0 truncate text-[15px] font-semibold tracking-tight transition-[opacity,transform] duration-200',
              heroHidden ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1 pointer-events-none'
            )}
          >
            {title}
          </p>

          <div className="flex items-center gap-1 pr-2 flex-shrink-0">
            {isReadOnly && onRestart ? (
              <button
                type="button"
                onClick={onRestart}
                aria-label="Restart workout"
                className="h-11 w-11 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted active:scale-[0.92] transition-[color,background-color,transform] duration-150 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <RotateCcw className="w-[18px] h-[18px]" />
              </button>
            ) : startedAt ? (
              <div className="flex items-center gap-2 h-8 px-3 rounded-full bg-muted">
                <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" aria-hidden="true" />
                <ElapsedClock startedAt={startedAt} />
              </div>
            ) : null}
          </div>
        </div>

        {/* Progress — a volt hairline along the bar's bottom edge */}
        <div
          role="progressbar"
          aria-label="Sets logged"
          aria-valuemin={0}
          aria-valuemax={setsTotal}
          aria-valuenow={setsDone}
          className="h-[3px] w-full bg-border"
        >
          <div
            className="h-full bg-brand transition-[width] duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </header>

      {/* Large title — scrolls with the page */}
      <div className="max-w-2xl mx-auto w-full px-5 pt-7 pb-1">
        {eyebrow && (
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            {eyebrow}
          </p>
        )}
        <h1 ref={titleRef} className="font-bold text-[28px] sm:text-3xl tracking-tight leading-[1.1] antialiased mt-1">
          {title}
        </h1>
        <p className="font-mono text-xs tabular-nums text-muted-foreground mt-2.5">
          {exercisesTotal} {exercisesTotal === 1 ? 'exercise' : 'exercises'}
          <span className="mx-1.5 opacity-50">·</span>
          <span className={cn(setsDone > 0 && 'text-foreground font-bold')}>{setsDone}</span>/{setsTotal} sets
        </p>
      </div>
    </>
  );
}
