import { useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseDurationInput, type TrackingType } from '@/lib/reps';

/**
 * Shared grid template for the set table: SET · LAST · WEIGHT · REPS · ✓.
 * The header row in ExerciseCard uses the same template so columns align.
 */
export const SET_GRID = 'grid grid-cols-[1.75rem_1fr_4.25rem_3.5rem_2rem] gap-x-2 items-center';

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
    <div
      className={cn(
        SET_GRID,
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
  );
}
