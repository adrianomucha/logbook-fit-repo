'use client';

import { Pause, Play, RotateCcw, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatClock } from '@/lib/set-timer';
import { formatDuration } from '@/lib/reps';
import { useSetTimer } from '@/hooks/useSetTimer';

interface SetTimerProps {
  setNumber: number;
  /** Prescribed seconds to count down from; undefined → count-up stopwatch. */
  targetSeconds?: number;
  /** Countdown hit zero: log the prescribed seconds and complete the set. */
  onFinish: (seconds: number) => void;
  /** Stopped early: log the seconds actually held, leave the set unticked. */
  onStop: (seconds: number) => void;
}

/** Short buzz at the buzzer where the device supports it (Android, mostly). */
function vibrate() {
  try {
    navigator.vibrate?.([200, 100, 200]);
  } catch {
    // Some browsers throw when vibrate is called without a user gesture.
  }
}

const controlClass =
  'inline-flex h-11 items-center justify-center gap-1.5 rounded-lg px-4 text-sm font-semibold transition-colors touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.97]';

/**
 * Countdown for a single TIME set. Idle it is one slim "Start" line so a
 * 3-set plank doesn't turn into three stopwatches; once started it grows into
 * a large clock with pause/stop so it can be read from plank height.
 */
export function SetTimer({ setNumber, targetSeconds, onFinish, onStop }: SetTimerProps) {
  const timer = useSetTimer({
    targetSeconds,
    onFinish: (seconds) => {
      vibrate();
      onFinish(seconds);
    },
  });

  const label = `Set ${setNumber} timer`;

  if (timer.status === 'idle') {
    return (
      <button
        type="button"
        onClick={timer.start}
        aria-label={
          timer.isCountdown
            ? `Start ${formatDuration(targetSeconds!)} countdown for set ${setNumber}`
            : `Start stopwatch for set ${setNumber}`
        }
        className={cn(
          controlClass,
          'mb-2 h-10 w-full border border-dashed border-foreground/20 bg-transparent text-foreground hover:border-foreground/40 hover:bg-muted/40'
        )}
      >
        <Play className="h-4 w-4" aria-hidden="true" />
        {timer.isCountdown ? `Start ${formatDuration(targetSeconds!)} timer` : 'Start stopwatch'}
      </button>
    );
  }

  const running = timer.status === 'running';
  const done = timer.status === 'done';
  // Last 5 seconds of a countdown: draw the eye so the athlete braces for the buzzer.
  const finalStretch = timer.isCountdown && running && timer.displaySeconds <= 5;

  return (
    <div role="group" aria-label={label} className="mb-2 rounded-xl bg-muted/50 px-4 py-3">
      {/* Clock on its own line: at phone width a 4xl "19:49" plus two labelled
          buttons don't fit side by side, and the clock must never shrink. */}
      <div className="flex items-baseline justify-between gap-3">
        <div
          role="timer"
          aria-live={running ? 'off' : 'polite'}
          aria-atomic="true"
          className={cn(
            'shrink-0 font-mono text-4xl font-bold tabular-nums leading-none transition-colors',
            done ? 'text-success-text' : finalStretch ? 'text-primary' : 'text-foreground'
          )}
        >
          {formatClock(timer.displaySeconds)}
        </div>
        <div className="min-w-0 text-right font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {done
            ? 'Done'
            : timer.isCountdown
              ? `${formatDuration(targetSeconds!)} · ${running ? 'holding' : 'paused'}`
              : running
                ? 'stopwatch'
                : 'paused'}
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        {done ? (
          <button
            type="button"
            onClick={timer.reset}
            aria-label={`Reset set ${setNumber} timer`}
            className={cn(controlClass, 'flex-1 bg-background text-foreground hover:bg-accent')}
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Reset
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={running ? timer.pause : timer.start}
              aria-label={running ? `Pause set ${setNumber} timer` : `Resume set ${setNumber} timer`}
              className={cn(controlClass, 'flex-1 bg-primary text-primary-foreground hover:bg-primary/90')}
            >
              {running ? (
                <Pause className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Play className="h-4 w-4" aria-hidden="true" />
              )}
              {running ? 'Pause' : 'Resume'}
            </button>
            <button
              type="button"
              onClick={() => {
                timer.pause();
                onStop(timer.elapsedSeconds);
                timer.reset();
              }}
              aria-label={`Stop set ${setNumber} timer and log ${timer.elapsedSeconds} seconds`}
              className={cn(controlClass, 'flex-1 bg-background text-foreground hover:bg-accent')}
            >
              <Square className="h-4 w-4" aria-hidden="true" />
              Stop
            </button>
          </>
        )}
      </div>
    </div>
  );
}
