import { useEffect, useRef, useState } from 'react';
import { Check, Play, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatClock, parseDurationInput, type TrackingType } from '@/lib/reps';

/**
 * Shared grid template for the set table: SET · LAST · WEIGHT · REPS · ✓.
 * The header row in ExerciseCard uses the same template so columns align.
 */
export const SET_GRID = 'grid grid-cols-[1.75rem_1fr_4.25rem_3.5rem_2rem] gap-x-2 items-center';

/**
 * TIME exercises get one more column — SET · LAST · WEIGHT · SEC · ▶ · ✓ —
 * so the timer button lines up across rows and with the header.
 */
export const SET_GRID_TIME =
  'grid grid-cols-[1.75rem_1fr_4.25rem_3.5rem_2rem_2rem] gap-x-2 items-center';

interface SetRowProps {
  setNumber: number;
  /** REPS (default) logs a rep count; TIME logs seconds held/worked. */
  trackingType?: TrackingType;
  /** Coach-prescribed reps ("6-8") — or a duration ("60s", "30-60s") when TIME. */
  repsTarget?: string | number;
  /** Coach-prescribed weight. Usually a number, but tolerate a string like "50 lbs". */
  weightTarget?: string | number;
  /** Logged reps for this set (null if not logged yet) */
  actualReps?: number | null;
  /** Logged weight for this set (null if not logged yet) */
  actualWeight?: number | null;
  /** Last session's result, compact ("52.5×8") — rendered as the LAST column */
  previous?: string;
  completed: boolean;
  onToggle: () => void;
  onChangeReps?: (reps: number) => void;
  onChangeWeight?: (weight: number) => void;
  isReadOnly?: boolean;
  /** If true, render a top border to separate from the previous row */
  showDivider?: boolean;
}

/** Highest number in the target ("6-8" → 8, 10 → 10) — the top of the prescribed range. */
export function parseTargetReps(target?: string | number): number | undefined {
  if (target == null) return undefined;
  const nums = String(target).match(/\d+/g);
  if (!nums || nums.length === 0) return undefined;
  return Math.max(...nums.map(Number));
}

/** Top of a prescribed duration range in seconds ("30-60s" → 60, "1m 30s" → 90). */
export function parseTargetSeconds(target?: string | number): number | undefined {
  if (target == null) return undefined;
  const { reps, repsMax } = parseDurationInput(target);
  return repsMax ?? reps ?? undefined;
}

/** First number in the target weight ("50 lbs" → 50, 50 → 50). */
export function parseTargetWeight(target?: string | number): number | undefined {
  if (target == null) return undefined;
  const m = String(target).match(/[\d.]+/);
  return m ? Number(m[0]) : undefined;
}

/**
 * Two rising beeps when a hold finishes. The AudioContext must be created in
 * the start-tap handler (a user gesture) or mobile browsers keep it suspended.
 */
function playTimerChime(ctx: AudioContext) {
  const t0 = ctx.currentTime;
  [880, 1320].forEach((freq, i) => {
    const at = t0 + i * 0.18;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.25, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
    osc.start(at);
    osc.stop(at + 0.18);
  });
}

export function SetRow({
  setNumber,
  trackingType = 'REPS',
  repsTarget,
  weightTarget,
  actualReps,
  actualWeight,
  previous,
  completed,
  onToggle,
  onChangeReps,
  onChangeWeight,
  isReadOnly = false,
  showDivider = false,
}: SetRowProps) {
  const isTime = trackingType === 'TIME';
  // For TIME the "reps" cell holds seconds ("1m 30s" target → 90).
  const defaultReps = isTime ? parseTargetSeconds(repsTarget) : parseTargetReps(repsTarget);
  const defaultWeight = parseTargetWeight(weightTarget);

  // Local input state seeded from the logged value, falling back to the
  // prescribed target. SetRows unmount when their exercise collapses, so this
  // re-seeds correctly on restart / re-expand without a sync effect.
  const [reps, setReps] = useState<string>(
    actualReps != null ? String(actualReps) : defaultReps != null ? String(defaultReps) : ''
  );
  const [weight, setWeight] = useState<string>(
    actualWeight != null ? String(actualWeight) : defaultWeight != null ? String(defaultWeight) : ''
  );

  // In-app hold timer for TIME sets (planks, carries) so the athlete never
  // has to leave for the phone's clock app. Wall-clock based (startedAt vs
  // now) so a throttled background tab still reads the right remaining time.
  // targetSec null = no prescribed duration → count up, stop when done.
  // Local to the row: collapsing the exercise unmounts it and drops the timer,
  // which matches "I walked away" better than a timer ticking off-screen.
  const [timer, setTimer] = useState<{ startedAt: number; targetSec: number | null } | null>(null);
  const [nowMs, setNowMs] = useState(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!timer) return;
    const id = setInterval(() => setNowMs(Date.now()), 250);
    return () => clearInterval(id);
  }, [timer]);

  const elapsedSec = timer ? Math.max(0, (nowMs - timer.startedAt) / 1000) : 0;
  const remainingSec = timer?.targetSec != null ? timer.targetSec - elapsedSec : null;

  /** Log the held seconds and mark the set done, exactly like a manual tap. */
  const finishTimer = (heldSec: number, cue: boolean) => {
    setTimer(null);
    const s = Math.max(1, Math.round(heldSec));
    setReps(String(s));
    onChangeReps?.(s);
    const w = parseFloat(weight);
    if (!Number.isNaN(w) && w >= 0) onChangeWeight?.(w);
    if (!completed) onToggle();
    if (cue) {
      navigator.vibrate?.([200, 100, 200]);
      const ctx = audioCtxRef.current;
      if (ctx) {
        // resume() because iOS re-suspends contexts while the screen is idle
        void ctx.resume().then(() => playTimerChime(ctx));
      }
    }
  };

  // Countdown reached zero → auto-complete with the full prescribed hold.
  // finishTimer clears `timer`, so this can only fire once per run.
  useEffect(() => {
    if (!timer || timer.targetSec == null) return;
    if ((nowMs - timer.startedAt) / 1000 >= timer.targetSec) {
      finishTimer(timer.targetSec, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nowMs, timer]);

  const startTimer = () => {
    if (isReadOnly || completed || timer) return;
    if (!audioCtxRef.current && typeof AudioContext !== 'undefined') {
      try {
        audioCtxRef.current = new AudioContext();
      } catch {
        // no audio — vibration and the visual finish still work
      }
    }
    const n = parseInt(reps, 10);
    const target = !Number.isNaN(n) && n > 0 ? n : defaultReps ?? null;
    setNowMs(Date.now());
    setTimer({ startedAt: Date.now(), targetSec: target });
  };

  const commitReps = (raw: string) => {
    const v = raw.replace(/[^\d]/g, '');
    setReps(v);
    const n = parseInt(v, 10);
    if (!Number.isNaN(n) && n >= 0) onChangeReps?.(n);
  };

  const commitWeight = (raw: string) => {
    const v = raw.replace(/[^\d.]/g, '');
    setWeight(v);
    const n = parseFloat(v);
    if (!Number.isNaN(n) && n >= 0) onChangeWeight?.(n);
  };

  const handleToggle = () => {
    if (isReadOnly) return;
    // A manual tap overrides a running timer — don't auto-complete later
    setTimer(null);
    // When marking complete, persist whatever is shown so the logged values match
    // what the athlete did — even if they kept the prescribed default untouched.
    if (!completed) {
      const r = parseInt(reps, 10);
      if (!Number.isNaN(r) && r >= 0) onChangeReps?.(r);
      const w = parseFloat(weight);
      if (!Number.isNaN(w) && w >= 0) onChangeWeight?.(w);
    }
    onToggle();
  };

  const cellInput = (opts: {
    value: string;
    placeholder?: string;
    onChange: (v: string) => void;
    inputMode: 'numeric' | 'decimal';
    label: string;
  }) => (
    <input
      type="text"
      inputMode={opts.inputMode}
      value={opts.value}
      placeholder={opts.placeholder ?? '—'}
      disabled={isReadOnly}
      aria-label={`Set ${setNumber} ${opts.label}`}
      onChange={(e) => opts.onChange(e.target.value)}
      className={cn(
        // text-base (16px) on mobile prevents iOS focus zoom; text-sm on larger screens
        'h-11 w-full rounded-lg text-center font-mono text-base sm:text-sm font-bold tabular-nums outline-none transition-colors',
        'placeholder:font-semibold placeholder:text-muted-foreground/40 disabled:opacity-100',
        completed
          ? 'bg-transparent text-muted-foreground/50'
          : 'bg-muted/50 text-foreground focus:bg-background focus:ring-1 focus:ring-foreground/20'
      )}
    />
  );

  return (
    <>
    <div
      className={cn(
        isTime ? SET_GRID_TIME : SET_GRID,
        'h-[56px]',
        showDivider && 'border-t border-border/30'
      )}
    >
      <span
        className={cn(
          'font-mono text-sm font-bold tabular-nums transition-colors',
          completed ? 'text-muted-foreground/40' : 'text-muted-foreground'
        )}
      >
        {setNumber}
      </span>

      <span className="font-mono text-xs tabular-nums text-muted-foreground/45 truncate">
        {previous || '—'}
      </span>

      {cellInput({
        value: weight,
        placeholder: defaultWeight != null ? String(defaultWeight) : undefined,
        onChange: commitWeight,
        inputMode: 'decimal',
        label: 'weight',
      })}

      {cellInput({
        value: reps,
        placeholder: defaultReps != null ? String(defaultReps) : undefined,
        onChange: commitReps,
        inputMode: 'numeric',
        label: isTime ? 'seconds' : 'reps',
      })}

      {isTime &&
        (completed || isReadOnly ? (
          // keep the grid aligned when there's nothing to time
          <span aria-hidden="true" />
        ) : (
          <button
            type="button"
            onClick={timer ? () => setTimer(null) : startTimer}
            aria-label={
              timer ? `Cancel set ${setNumber} timer` : `Start set ${setNumber} timer`
            }
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center justify-self-end transition-all duration-200 touch-manipulation active:scale-[0.92] cursor-pointer',
              timer
                ? 'text-muted-foreground hover:text-destructive'
                : 'text-muted-foreground/60 hover:text-foreground hover:bg-muted/60'
            )}
          >
            {timer ? <X className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
          </button>
        ))}

      <button
        type="button"
        onClick={handleToggle}
        disabled={isReadOnly}
        aria-label={completed ? `Mark set ${setNumber} incomplete` : `Mark set ${setNumber} complete`}
        aria-pressed={completed}
        className={cn(
          'w-8 h-8 rounded-full border-2 flex items-center justify-center justify-self-end transition-all duration-200 touch-manipulation',
          !isReadOnly && 'active:scale-[0.92] cursor-pointer',
          completed
            ? 'bg-success border-success'
            : 'border-foreground/15 bg-transparent hover:border-foreground/30'
        )}
      >
        {completed && <Check className="w-4 h-4 text-success-foreground animate-set-complete" />}
      </button>
    </div>

    {/* ── Running timer: countdown to the prescribed hold, or a stopwatch when
        no duration is prescribed. "Done" logs the actual seconds held. ── */}
    {timer && (
      <div className="mb-2 rounded-lg bg-muted/50 px-3 py-2.5 flex items-center gap-3 animate-fade-in-up">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span
              className="font-mono text-2xl font-bold tabular-nums text-foreground"
              role="timer"
              aria-label={`Set ${setNumber} timer`}
            >
              {formatClock(remainingSec ?? elapsedSec)}
            </span>
            {timer.targetSec != null && (
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                / {formatClock(timer.targetSec)}
              </span>
            )}
          </div>
          {timer.targetSec != null && (
            <div className="mt-1.5 h-1 rounded-full bg-foreground/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-success transition-[width] duration-300 ease-linear"
                style={{
                  width: `${Math.min(100, (elapsedSec / timer.targetSec) * 100)}%`,
                }}
              />
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => finishTimer(elapsedSec, false)}
          className="h-9 px-4 rounded-full bg-foreground text-background text-sm font-semibold touch-manipulation active:scale-[0.96] transition-transform"
        >
          Done
        </button>
      </div>
    )}
    </>
  );
}
