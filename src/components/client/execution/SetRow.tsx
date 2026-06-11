import { useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SetRowProps {
  setNumber: number;
  /** Coach-prescribed reps. Usually a number, but tolerate a range string like "6-8". */
  repsTarget?: string | number;
  /** Coach-prescribed weight. Usually a number, but tolerate a string like "50 lbs". */
  weightTarget?: string | number;
  /** Logged reps for this set (null if not logged yet) */
  actualReps?: number | null;
  /** Logged weight for this set (null if not logged yet) */
  actualWeight?: number | null;
  completed: boolean;
  onToggle: () => void;
  onChangeReps?: (reps: number) => void;
  onChangeWeight?: (weight: number) => void;
  isReadOnly?: boolean;
  /** If true, render a top border to separate from the previous row */
  showDivider?: boolean;
}

/** Highest number in the target ("6-8" → 8, 10 → 10) — the top of the prescribed range. */
function parseTargetReps(target?: string | number): number | undefined {
  if (target == null) return undefined;
  const nums = String(target).match(/\d+/g);
  if (!nums || nums.length === 0) return undefined;
  return Math.max(...nums.map(Number));
}

/** First number in the target weight ("50 lbs" → 50, 50 → 50). */
function parseTargetWeight(target?: string | number): number | undefined {
  if (target == null) return undefined;
  const m = String(target).match(/[\d.]+/);
  return m ? Number(m[0]) : undefined;
}

function weightUnit(target?: string | number): string {
  return target != null && /kg/i.test(String(target)) ? 'kg' : 'lbs';
}

function toStr(v?: string | number): string | undefined {
  return v == null ? undefined : String(v);
}

export function SetRow({
  setNumber,
  repsTarget,
  weightTarget,
  actualReps,
  actualWeight,
  completed,
  onToggle,
  onChangeReps,
  onChangeWeight,
  isReadOnly = false,
  showDivider = false,
}: SetRowProps) {
  const defaultReps = parseTargetReps(repsTarget);
  const defaultWeight = parseTargetWeight(weightTarget);
  const unit = weightUnit(weightTarget);

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

  return (
    <div
      className={cn(
        'flex items-center gap-2.5 py-2.5',
        showDivider && 'border-t border-border/40'
      )}
    >
      <span
        className={cn(
          'font-bold text-sm tabular-nums w-11 flex-shrink-0 transition-colors',
          completed ? 'text-foreground/30' : 'text-foreground'
        )}
      >
        Set {setNumber}
      </span>

      <div className="flex-1 flex items-center gap-2">
        <Field
          label="reps"
          value={reps}
          placeholder={toStr(repsTarget) ?? '—'}
          onChange={commitReps}
          disabled={isReadOnly}
          completed={completed}
          inputMode="numeric"
        />
        <Field
          label={unit}
          value={weight}
          placeholder={defaultWeight != null ? String(defaultWeight) : toStr(weightTarget) ?? '—'}
          onChange={commitWeight}
          disabled={isReadOnly}
          completed={completed}
          inputMode="decimal"
        />
      </div>

      <button
        type="button"
        onClick={handleToggle}
        disabled={isReadOnly}
        aria-label={completed ? `Mark set ${setNumber} incomplete` : `Mark set ${setNumber} complete`}
        aria-pressed={completed}
        className={cn(
          'w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 touch-manipulation',
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

function Field({
  label,
  value,
  placeholder,
  onChange,
  disabled,
  completed,
  inputMode,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  completed?: boolean;
  inputMode?: 'numeric' | 'decimal';
}) {
  return (
    <label
      className={cn(
        'flex items-center gap-1 rounded-md border bg-background px-2 py-1.5 transition-colors',
        disabled && 'pointer-events-none',
        completed
          ? 'border-border/40 opacity-60'
          : 'border-border focus-within:border-foreground/40'
      )}
    >
      <input
        type="text"
        inputMode={inputMode}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-9 bg-transparent text-sm font-semibold tabular-nums text-foreground outline-none placeholder:text-muted-foreground/40 disabled:opacity-100"
      />
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
        {label}
      </span>
    </label>
  );
}
