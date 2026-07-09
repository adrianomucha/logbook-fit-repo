import { ArrowLeft, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * A static, faithful render of the client "Live Workout" screen inside an
 * iPhone-style frame — the app's most recognisable surface. It reuses the
 * product's real design language (the SET · LAST · WEIGHT · REPS grid, mono
 * tabular numerals, volt completion checks) but is intentionally
 * non-interactive: it's marketing art, not the live component. Rendered in
 * the app's default light theme so it reads as a product screenshot.
 */

const SET_GRID =
  'grid grid-cols-[1.5rem_1fr_3.75rem_3rem_1.5rem] gap-x-2 items-center';

type SetRow = {
  n: number;
  last: string;
  weight: string;
  reps: string;
  done: boolean;
};

const SETS: SetRow[] = [
  { n: 1, last: '60×8', weight: '60', reps: '8', done: true },
  { n: 2, last: '60×8', weight: '60', reps: '8', done: true },
  { n: 3, last: '62.5×7', weight: '62.5', reps: '7', done: true },
  { n: 4, last: '62.5×6', weight: '62.5', reps: '6', done: false },
];

function StatusBar() {
  return (
    <div className="flex items-center justify-between px-6 pt-3 pb-1 text-foreground">
      <span className="font-mono text-[11px] font-bold tabular-nums">9:41</span>
      <div className="flex items-center gap-1.5" aria-hidden="true">
        {/* signal */}
        <svg width="16" height="11" viewBox="0 0 16 11" fill="currentColor">
          <rect x="0" y="7" width="3" height="4" rx="1" />
          <rect x="4.5" y="5" width="3" height="6" rx="1" />
          <rect x="9" y="2.5" width="3" height="8.5" rx="1" />
          <rect x="13" y="0" width="3" height="11" rx="1" />
        </svg>
        {/* wifi */}
        <svg width="15" height="11" viewBox="0 0 15 11" fill="currentColor">
          <path d="M7.5 2C10 2 12.2 3 13.8 4.6l-1.2 1.2A8 8 0 0 0 7.5 3.7 8 8 0 0 0 2.4 5.8L1.2 4.6C2.8 3 5 2 7.5 2Z" />
          <path d="M7.5 5.4c1.4 0 2.7.5 3.7 1.4l-1.3 1.3a3.3 3.3 0 0 0-4.8 0L3.8 6.8c1-.9 2.3-1.4 3.7-1.4Z" />
          <circle cx="7.5" cy="9.4" r="1.4" />
        </svg>
        {/* battery */}
        <svg width="25" height="12" viewBox="0 0 25 12" fill="none">
          <rect x="0.5" y="0.5" width="21" height="11" rx="3" stroke="currentColor" opacity="0.4" />
          <rect x="2" y="2" width="16" height="8" rx="1.5" fill="currentColor" />
          <rect x="23" y="4" width="1.5" height="4" rx="0.75" fill="currentColor" opacity="0.4" />
        </svg>
      </div>
    </div>
  );
}

export function PhoneMockup({ className }: { className?: string }) {
  const doneCount = SETS.filter((s) => s.done).length;

  return (
    <div
      className={cn(
        // Device frame — dark bezel, deep rounding, floating shadow
        'relative w-[248px] shrink-0 rounded-[2.75rem] border-[3px] border-neutral-800 bg-neutral-900 p-1.5 shadow-2xl sm:w-[280px]',
        className
      )}
      aria-hidden="true"
    >
      {/* Screen — always the app's light theme */}
      <div className="light relative overflow-hidden rounded-[2.25rem] bg-background text-foreground">
        {/* Dynamic island */}
        <div className="absolute left-1/2 top-2 z-20 h-5 w-20 -translate-x-1/2 rounded-full bg-neutral-900" />

        <StatusBar />

        {/* Workout header */}
        <div className="border-b border-border px-4 pb-3 pt-2">
          <div className="flex h-9 items-center justify-between">
            <ArrowLeft className="h-4 w-4 text-foreground" />
            <span className="font-mono text-xs font-bold tabular-nums">
              {doneCount}
              <span className="text-muted-foreground/60">/6</span>
            </span>
          </div>
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
            Day 2 · Push
          </p>
          <h3 className="mt-0.5 text-lg font-bold tracking-tight">
            Chest + Shoulders
          </h3>
          <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-brand" style={{ width: '50%' }} />
          </div>
        </div>

        {/* Exercise card — expanded */}
        <div className="px-4 py-3">
          <div className="rounded-xl border border-border p-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-muted-foreground/70">
                    01
                  </span>
                  <span className="text-sm font-semibold">Barbell Bench Press</span>
                </div>
                <p className="mt-0.5 pl-6 font-mono text-[10px] text-muted-foreground">
                  4×8 · 62.5 kg
                </p>
              </div>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand">
                <Check className="h-3 w-3 text-brand-foreground" strokeWidth={3} />
              </span>
            </div>

            {/* Set table header */}
            <div
              className={cn(
                SET_GRID,
                'mt-3 px-1 font-mono text-[8px] uppercase tracking-[0.12em] text-muted-foreground/70'
              )}
            >
              <span>Set</span>
              <span>Last</span>
              <span className="text-center">Kg</span>
              <span className="text-center">Reps</span>
              <span />
            </div>

            {/* Set rows */}
            <div className="mt-1 space-y-0.5">
              {SETS.map((s) => (
                <div
                  key={s.n}
                  className={cn(
                    SET_GRID,
                    'rounded-lg px-1 py-1.5',
                    s.done ? 'bg-brand/10' : 'bg-secondary/60'
                  )}
                >
                  <span className="font-mono text-[11px] font-bold tabular-nums text-muted-foreground">
                    {s.n}
                  </span>
                  <span className="font-mono text-[10px] tabular-nums text-muted-foreground/70">
                    {s.last}
                  </span>
                  <span className="text-center font-mono text-[12px] font-bold tabular-nums">
                    {s.weight}
                  </span>
                  <span className="text-center font-mono text-[12px] font-bold tabular-nums">
                    {s.reps}
                  </span>
                  <span className="flex justify-center">
                    <span
                      className={cn(
                        'flex h-4 w-4 items-center justify-center rounded-md',
                        s.done
                          ? 'bg-brand'
                          : 'border border-muted-foreground/30'
                      )}
                    >
                      {s.done && (
                        <Check
                          className="h-2.5 w-2.5 text-brand-foreground"
                          strokeWidth={3.5}
                        />
                      )}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Collapsed next exercise */}
          <div className="mt-2 flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-muted-foreground/70">
                02
              </span>
              <span className="text-sm font-medium">Incline Dumbbell Press</span>
            </div>
            <span className="font-mono text-[10px] text-muted-foreground">3×10</span>
          </div>
        </div>

        {/* Finish CTA */}
        <div className="px-4 pb-6 pt-1">
          <div className="flex h-10 items-center justify-center rounded-xl bg-foreground text-background">
            <span className="text-xs font-bold uppercase tracking-wider">
              Finish workout
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
