'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, FileSpreadsheet, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Working model of the import story: a coach's own column-per-week sheet on
 * the left, the plan it becomes on the right, and under both, how the selected
 * cell was split. The two sides are one selection (tab, week, row), so picking
 * a sheet tab opens that workout, picking a week column switches the week
 * pill, and pointing at a row lights up the exercise it became.
 *
 * It's drawn, not a screenshot, so it never claims to be the product UI. The
 * right side borrows the review step's real wording and shape (week pills, one
 * card per day) so the first thing a coach sees after uploading is familiar.
 *
 * Both sides render from SHEET below, so the sheet and the plan can't drift
 * apart. The sheet is a real <table> so the example reads to a crawler or
 * screen reader as data, not as a picture of data.
 */

type Prescription = { sets: number; reps: number; kg?: number };

type SheetRow = {
  /** The first column exactly as the coach typed it */
  cell: string;
  /** What the reader keeps as the exercise name */
  name: string;
  /** What's left of the cell once the name is taken out */
  note?: string;
  weeks: Prescription[];
};

type SheetTab = { name: string; rows: SheetRow[] };

const p = (sets: number, reps: number, kg?: number): Prescription => ({ sets, reps, kg });

const WEEKS = ['Week 1', 'Week 2', 'Week 3'];

const SHEET: SheetTab[] = [
  {
    name: 'Lower A',
    rows: [
      { cell: 'Back squat, RPE 7', name: 'Back squat', note: 'RPE 7', weeks: [p(3, 5, 100), p(3, 5, 105), p(3, 5, 110)] },
      { cell: 'Romanian deadlift', name: 'Romanian deadlift', weeks: [p(3, 8, 80), p(3, 8, 85), p(3, 8, 90)] },
      { cell: 'Split squat (per side)', name: 'Split squat', note: 'Per side', weeks: [p(3, 10), p(3, 10), p(3, 12)] },
    ],
  },
  {
    name: 'Upper A',
    rows: [
      { cell: 'Bench press', name: 'Bench press', weeks: [p(4, 6, 70), p(4, 6, 75), p(4, 6, 80)] },
      { cell: 'Barbell row, pause at top', name: 'Barbell row', note: 'Pause at top', weeks: [p(3, 8, 60), p(3, 8, 65), p(3, 8, 70)] },
      { cell: 'Pull-up (bodyweight)', name: 'Pull-up', note: 'Bodyweight', weeks: [p(3, 6), p(3, 7), p(3, 8)] },
    ],
  },
  {
    name: 'Lower B',
    rows: [
      { cell: 'Deadlift, RPE 8', name: 'Deadlift', note: 'RPE 8', weeks: [p(3, 3, 140), p(3, 3, 145), p(3, 3, 150)] },
      { cell: 'Front squat', name: 'Front squat', weeks: [p(3, 6, 70), p(3, 6, 75), p(3, 6, 80)] },
      { cell: 'Calf raise (slow lower)', name: 'Calf raise', note: 'Slow lower', weeks: [p(3, 12), p(3, 15), p(3, 15)] },
    ],
  },
];

/** A week cell the way a coach types it: "3×5 100kg" */
const cellText = ({ sets, reps, kg }: Prescription) => `${sets}×${reps}${kg ? ` ${kg}kg` : ''}`;

/** The same cell as the plan shows it: "3 × 5 · 100 kg" */
const planText = ({ sets, reps, kg }: Prescription) => `${sets} × ${reps}${kg ? ` · ${kg} kg` : ''}`;

type Selection = { tab: number; week: number; row: number };

/**
 * Played once when the sheet scrolls into view, so the diagram shows it's
 * live before anyone touches it: down the rows, across the weeks, over to the
 * next tab, then back to where it started. Any input from the visitor ends it.
 */
const TOUR: Partial<Selection>[] = [
  { row: 1 },
  { row: 2 },
  { row: 0, week: 1 },
  { week: 2 },
  { tab: 1, week: 0 },
  { tab: 0 },
];
const TOUR_START_MS = 900;
const TOUR_STEP_MS = 1500;

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring';

/** One labelled value in the "how this row was read" strip. */
function Part({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 rounded-md border border-border bg-background px-2 py-1">
      <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground">{label}</span>
      <span className="text-[12px] font-medium tabular-nums">{value}</span>
    </span>
  );
}

/** A piece of the sheet quoted in the strip, drawn like the cell it came from. */
function SourceCell({ children }: { children: string }) {
  return (
    <span className="rounded-sm bg-brand/25 px-1.5 py-1 font-mono text-[11px] tabular-nums ring-1 ring-inset ring-foreground/25">
      {children}
    </span>
  );
}

export function SheetToPlan({ className }: { className?: string }) {
  const [{ tab, week, row }, setSelection] = useState<Selection>({ tab: 0, week: 0, row: 0 });
  const sheetRef = useRef<HTMLDivElement>(null);
  // Set by the visitor's first input; the tour never moves the selection after it
  const touched = useRef(false);

  const pick = (patch: Partial<Selection>) => {
    touched.current = true;
    setSelection((current) => ({ ...current, ...patch }));
  };

  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let timer: ReturnType<typeof setTimeout>;
    let step = 0;
    const advance = () => {
      if (touched.current || step >= TOUR.length) return;
      const patch = TOUR[step++];
      setSelection((current) => ({ ...current, ...patch }));
      timer = setTimeout(advance, TOUR_STEP_MS);
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        timer = setTimeout(advance, TOUR_START_MS);
      },
      { threshold: 0.6 }
    );
    observer.observe(sheet);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, []);

  const day = SHEET[tab];
  const active = day.rows[row];
  const activeSet = active.weeks[week];

  return (
    <figure
      className={cn('w-full', className)}
      onPointerDown={() => (touched.current = true)}
      onKeyDown={() => (touched.current = true)}
    >
      <div className="grid items-center gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-4">
        {/* Before: the coach's spreadsheet */}
        <div ref={sheetRef} className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <span className="truncate font-mono text-[11px] text-muted-foreground antialiased">
              strength-block.xlsx
            </span>
          </div>
          <table className="w-full table-fixed border-collapse font-mono text-[10.5px] tabular-nums antialiased sm:text-[11px]">
            <caption className="sr-only">
              Example spreadsheet, {day.name} tab: one row per exercise, one column per week, one tab per training day
            </caption>
            <thead>
              <tr className="bg-muted/60 text-left text-muted-foreground">
                <th scope="col" className="w-[38%] border-b border-r border-border px-2.5 py-2 font-medium">
                  Exercise
                </th>
                {WEEKS.map((label, i) => (
                  <th
                    key={label}
                    scope="col"
                    className={cn(
                      'border-b border-r border-border p-0 font-medium transition-colors last:border-r-0',
                      i === week && 'bg-brand/30 text-foreground'
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => pick({ week: i })}
                      aria-pressed={i === week}
                      aria-label={label}
                      className={cn('w-full px-2 py-2 text-left hover:text-foreground', FOCUS_RING)}
                    >
                      {label.replace('Week ', 'Wk ')}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {day.rows.map((sheetRow, r) => (
                <tr key={sheetRow.cell} onMouseEnter={() => pick({ row: r })}>
                  <th
                    scope="row"
                    className={cn(
                      'border-b border-r border-border p-0 text-left font-normal text-foreground transition-colors',
                      r === row && 'bg-brand/25'
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => pick({ row: r })}
                      onFocus={() => pick({ row: r })}
                      aria-pressed={r === row}
                      className={cn('w-full px-2.5 py-2.5 text-left', FOCUS_RING)}
                    >
                      {sheetRow.cell}
                    </button>
                  </th>
                  {sheetRow.weeks.map((set, w) => (
                    <td
                      key={w}
                      onClick={() => pick({ row: r, week: w })}
                      className={cn(
                        'cursor-pointer border-b border-r border-border px-2 py-2.5 align-top text-muted-foreground transition-colors last:border-r-0',
                        w === week && 'bg-brand/10 text-foreground',
                        w === week && r === row && 'bg-brand/25 ring-1 ring-inset ring-foreground/40'
                      )}
                    >
                      {cellText(set)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex gap-1 bg-muted/40 px-2 py-1.5" role="group" aria-label="Sheet tabs">
            {SHEET.map((sheetTab, i) => (
              <button
                key={sheetTab.name}
                type="button"
                onClick={() => pick({ tab: i, row: 0 })}
                aria-pressed={i === tab}
                className={cn(
                  'rounded px-2 py-1 font-mono text-[10px] antialiased transition-colors',
                  FOCUS_RING,
                  i === tab ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {sheetTab.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-center text-brand-foreground" aria-hidden="true">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand">
            <ArrowDown className="h-4 w-4 md:hidden" />
            <ArrowRight className="hidden h-4 w-4 md:block" />
          </span>
        </div>

        {/* After: the plan, as the review step shows it */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="flex items-start gap-2 text-[12px] text-muted-foreground text-pretty antialiased">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground" aria-hidden="true" />
            <span>
              Read automatically from your layout. Check it against your spreadsheet before you
              create the plan.{' '}
              <span className="font-medium text-foreground">3 weeks · 3 workouts a week</span>
            </span>
          </p>
          <div className="mt-3 flex gap-1.5" role="group" aria-label="Week">
            {WEEKS.map((label, i) => (
              <button
                key={label}
                type="button"
                onClick={() => pick({ week: i })}
                aria-pressed={i === week}
                className={cn(
                  'rounded-full px-2.5 py-1 text-[11px] font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  i === week ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground'
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {/* One card per sheet tab. The open one is the tab showing on the left. */}
          <ul className="mt-3 space-y-1.5">
            {SHEET.map((planDay, d) =>
              d === tab ? (
                <li key={planDay.name} className="overflow-hidden rounded-lg border border-border">
                  <p className="border-b border-border px-3 py-2 text-[13px] font-semibold antialiased">
                    {planDay.name}
                  </p>
                  <ul className="divide-y divide-border">
                    {planDay.rows.map((exercise, r) => (
                      <li key={exercise.name}>
                        <button
                          type="button"
                          onClick={() => pick({ row: r })}
                          onMouseEnter={() => pick({ row: r })}
                          onFocus={() => pick({ row: r })}
                          aria-pressed={r === row}
                          className={cn(
                            'flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left transition-colors',
                            FOCUS_RING,
                            r === row && 'bg-brand/20'
                          )}
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-[13px] font-medium antialiased">{exercise.name}</span>
                            {exercise.note && (
                              <span className="block text-[11px] text-muted-foreground antialiased">{exercise.note}</span>
                            )}
                          </span>
                          <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground antialiased">
                            {planText(exercise.weeks[week])}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </li>
              ) : (
                <li key={planDay.name}>
                  <button
                    type="button"
                    onClick={() => pick({ tab: d, row: 0 })}
                    className={cn(
                      'flex w-full items-baseline justify-between gap-3 rounded-lg border border-border px-3 py-2 text-left transition-colors hover:bg-muted/60',
                      FOCUS_RING
                    )}
                  >
                    <span className="text-[13px] font-semibold antialiased">{planDay.name}</span>
                    <span className="text-[11px] text-muted-foreground antialiased">
                      {planDay.rows.length} exercises
                    </span>
                  </button>
                </li>
              )
            )}
          </ul>
        </div>
      </div>

      {/* The selected row, taken apart: what was typed, and where each piece went */}
      <div className="mt-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm antialiased md:mt-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            How this row was read
          </p>
          <p className="text-[11px] text-muted-foreground">Pick a tab, a week or an exercise to follow it across.</p>
        </div>
        <div className="mt-2.5 flex min-h-[30px] flex-col items-start gap-x-3 gap-y-2 sm:flex-row sm:flex-wrap sm:items-center">
          <span className="flex flex-wrap items-center gap-1.5">
            <SourceCell>{active.cell}</SourceCell>
            <SourceCell>{cellText(activeSet)}</SourceCell>
          </span>
          <ArrowRight className="h-3.5 w-3.5 shrink-0 rotate-90 text-muted-foreground sm:rotate-0" aria-hidden="true" />
          <span className="flex flex-wrap items-center gap-1.5">
            <Part label="Exercise" value={active.name} />
            <Part label="Sets" value={String(activeSet.sets)} />
            <Part label="Reps" value={String(activeSet.reps)} />
            {activeSet.kg != null && <Part label="Load" value={`${activeSet.kg} kg`} />}
            {active.note && <Part label="Note" value={active.note} />}
          </span>
        </div>
      </div>

      <figcaption className="mt-4 text-center font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground antialiased">
        Your layout in, a plan out. Sets, reps and load split out, the rest kept as notes.
      </figcaption>
    </figure>
  );
}
