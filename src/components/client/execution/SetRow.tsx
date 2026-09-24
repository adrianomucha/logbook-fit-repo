import { useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TrackingType } from '@/lib/reps';
import { parseTargetReps, parseTargetSeconds, parseTargetWeight } from '@logbook/shared/workout-execution';
import { SetTimer } from './SetTimer';

/**
 * Shared grid template for the set table: SET · WEIGHT · REPS · ✓.
 * The header row in ExerciseCard uses the same template so columns align.
 * Weight and reps split the free width, so at phone width each input is
 * ~100px wide — a comfortable thumb target mid-set.
 */
export const SET_GRID = 'grid grid-cols-[2rem_1fr_1fr_3.5rem] gap-x-2.5 items-center';

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
  completed: boolean;
  /** The next set to do: its number gets a filled badge so it's easy to find */
  isCurrent?: boolean;
  onToggle: () => void;
  onChangeReps?: (reps: number) => void;
  onChangeWeight?: (weight: number) => void;
  isReadOnly?: boolean;
  /**
   * Show the countdown under this row. Only meaningful for TIME sets; the
   * exercise card turns it on for the next set still to be done.
   */
  showTimer?: boolean;
}

// Prescription → default value parsing lives in @logbook/shared (the app uses it too)
export { parseTargetReps, parseTargetSeconds, parseTargetWeight };

export function SetRow({
  setNumber,
  trackingType = 'REPS',
  repsTarget,
  weightTarget,
  actualReps,
  actualWeight,
  completed,
  isCurrent = false,
  onToggle,
  onChangeReps,
  onChangeWeight,
  isReadOnly = false,
  showTimer = false,
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

  // Countdown reached zero: the athlete held the full prescription, so log
  // exactly those seconds and tick the set in one go. Bypasses handleToggle
  // because that reads the `reps` state, which hasn't re-rendered yet.
  const completeWithSeconds = (seconds: number) => {
    if (isReadOnly || completed) return;
    setReps(String(seconds));
    onChangeReps?.(seconds);
    const w = parseFloat(weight);
    if (!Number.isNaN(w) && w >= 0) onChangeWeight?.(w);
    onToggle();
  };

  // Countdown from whatever is in the seconds cell — the athlete can retype
  // it to hold longer or shorter than prescribed — else the prescription.
  const typedSeconds = parseInt(reps, 10);
  const timerTarget =
    !Number.isNaN(typedSeconds) && typedSeconds > 0 ? typedSeconds : defaultReps;

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
      enterKeyHint="done"
      value={opts.value}
      placeholder={opts.placeholder ?? '—'}
      disabled={isReadOnly}
      aria-label={`Set ${setNumber} ${opts.label}`}
      onChange={(e) => opts.onChange(e.target.value)}
      // Select on focus: one tap then type the new number, no backspacing
      onFocus={(e) => e.currentTarget.select()}
      className={cn(
        // 18px on mobile: big enough to read at arm's length, and anything
        // under 16px would trigger iOS focus zoom
        'h-12 w-full min-w-0 rounded-xl text-center font-mono text-lg font-bold tabular-nums outline-none transition-colors',
        // Full-strength muted-foreground: any alpha below 100% drops this text
        // under 4.5:1 on the card, and these cells hold logged training data.
        'placeholder:font-semibold placeholder:text-muted-foreground disabled:opacity-100',
        completed
          ? 'bg-transparent text-muted-foreground'
          // ring-foreground/20 measured 1.6:1 against the card — too faint to
          // read as a focus indicator on the screen's main data-entry control.
          : 'bg-muted text-foreground focus:bg-background focus:ring-2 focus:ring-ring'
      )}
    />
  );

  const showCountdown = isTime && showTimer && !completed && !isReadOnly;

  const row = (
    <div
      className={cn(
        SET_GRID,
        'h-[68px] px-2 -mx-2 rounded-xl transition-colors',
        isCurrent && 'bg-muted/40'
      )}
    >
      {/* Set badge — filled for the set to do now, muted once logged */}
      <span
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center font-mono text-sm font-bold tabular-nums transition-colors',
          isCurrent
            ? 'bg-foreground text-background'
            : completed
              ? 'text-muted-foreground'
              : 'text-foreground'
        )}
      >
        {setNumber}
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

      {/* A wide, square-ish button rather than a small circle: this is the
          tap the athlete makes after every set, often with chalky hands. */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={isReadOnly}
        aria-label={completed ? `Mark set ${setNumber} incomplete` : `Mark set ${setNumber} complete`}
        aria-pressed={completed}
        className={cn(
          'h-12 w-full rounded-xl border-2 flex items-center justify-center transition-[background-color,border-color,color,transform] duration-200 touch-manipulation',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          !isReadOnly && 'active:scale-[0.94] cursor-pointer',
          completed
            ? 'bg-success border-success text-success-foreground'
            : isCurrent
              ? 'border-foreground/40 bg-background text-foreground/70 hover:border-foreground/60'
              : 'border-foreground/20 bg-transparent text-foreground/40 hover:border-foreground/40'
        )}
      >
        <Check
          className={cn('w-5 h-5', completed && 'animate-set-complete')}
          strokeWidth={completed ? 3 : 2.5}
        />
      </button>
    </div>
  );

  if (!showCountdown) return row;

  return (
    <div>
      {row}
      <SetTimer
        setNumber={setNumber}
        targetSeconds={timerTarget}
        onFinish={completeWithSeconds}
        onStop={(seconds) => commitReps(String(seconds))}
      />
    </div>
  );
}
