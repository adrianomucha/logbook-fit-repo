'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, FileSpreadsheet, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Diagram for the import story: a coach's own column-per-week sheet on the
 * left, the plan it becomes on the right. It's drawn, not a screenshot, so it
 * never claims to be the product UI. The right side borrows the review step's
 * real wording and shape (week pills, one card per day) so the first thing a
 * coach sees after uploading is familiar.
 *
 * It's live: the week pills, the sheet's week headers and its tabs are all
 * buttons, and both sides follow the same selection, so a coach can see which
 * column and tab each plan row was read from. Once it scrolls into view it
 * steps through the block on its own (every week of every day), reading each
 * cell down the column as it goes. Hovering, focusing or touching it pauses
 * that; picking anything stops it for good. With reduced motion nothing moves
 * on its own and selections change in place.
 *
 * The sheet is a real <table> so the example reads to a crawler or screen
 * reader as data, not as a picture of data. Everything is rendered on the
 * server as Week 1 of the first tab, so nothing is hidden before it mounts.
 */

const WEEKS = ['Week 1', 'Week 2', 'Week 3'];

type Prescription = { sets: number; reps: number; kg?: number };

type SheetRow = {
  /** The exercise cell as a coach types it: name, plus whatever else they keep there. */
  cell: string;
  /** What the importer splits out of that cell. */
  name: string;
  note?: string;
  weeks: Prescription[];
};

const DAYS: { tab: string; rows: SheetRow[] }[] = [
  {
    tab: 'Lower A',
    rows: [
      {
        cell: 'Back squat, RPE 7',
        name: 'Back squat',
        note: 'RPE 7',
        weeks: [
          { sets: 3, reps: 5, kg: 100 },
          { sets: 3, reps: 5, kg: 105 },
          { sets: 3, reps: 5, kg: 110 },
        ],
      },
      {
        cell: 'Romanian deadlift',
        name: 'Romanian deadlift',
        weeks: [
          { sets: 3, reps: 8, kg: 80 },
          { sets: 3, reps: 8, kg: 85 },
          { sets: 3, reps: 8, kg: 90 },
        ],
      },
      {
        cell: 'Split squat (per side)',
        name: 'Split squat',
        note: 'Per side',
        weeks: [
          { sets: 3, reps: 10 },
          { sets: 3, reps: 10 },
          { sets: 3, reps: 12 },
        ],
      },
    ],
  },
  {
    tab: 'Upper A',
    rows: [
      {
        cell: 'Bench press, RPE 8',
        name: 'Bench press',
        note: 'RPE 8',
        weeks: [
          { sets: 4, reps: 6, kg: 80 },
          { sets: 4, reps: 6, kg: 82.5 },
          { sets: 4, reps: 6, kg: 85 },
        ],
      },
      {
        cell: 'Pull-up (bodyweight)',
        name: 'Pull-up',
        note: 'Bodyweight',
        weeks: [
          { sets: 3, reps: 6 },
          { sets: 3, reps: 7 },
          { sets: 3, reps: 8 },
        ],
      },
      {
        cell: 'DB shoulder press',
        name: 'DB shoulder press',
        weeks: [
          { sets: 3, reps: 10, kg: 20 },
          { sets: 3, reps: 10, kg: 22 },
          { sets: 3, reps: 12, kg: 22 },
        ],
      },
    ],
  },
  {
    tab: 'Lower B',
    rows: [
      {
        cell: 'Deadlift, RPE 7',
        name: 'Deadlift',
        note: 'RPE 7',
        weeks: [
          { sets: 3, reps: 4, kg: 140 },
          { sets: 3, reps: 4, kg: 145 },
          { sets: 3, reps: 4, kg: 150 },
        ],
      },
      {
        cell: 'Front squat',
        name: 'Front squat',
        weeks: [
          { sets: 3, reps: 6, kg: 70 },
          { sets: 3, reps: 6, kg: 72.5 },
          { sets: 3, reps: 6, kg: 75 },
        ],
      },
      {
        cell: 'Walking lunge (per side)',
        name: 'Walking lunge',
        note: 'Per side',
        weeks: [
          { sets: 3, reps: 12 },
          { sets: 3, reps: 12 },
          { sets: 3, reps: 14 },
        ],
      },
    ],
  },
];

/** How a coach writes it in a cell: "3×5 100kg". */
const sheetCell = ({ sets, reps, kg }: Prescription) =>
  `${sets}×${reps}${kg === undefined ? '' : ` ${kg}kg`}`;

/** How the plan shows it once it's split out: "3 × 5 · 100 kg". */
const planPrescription = ({ sets, reps, kg }: Prescription) =>
  `${sets} × ${reps}${kg === undefined ? '' : ` · ${kg} kg`}`;

/** Time on each week while it plays by itself. Long enough to read a row. */
const STEP_MS = 3200;
/** Gap between one row's cell being read and the next. */
const READ_STAGGER_MS = 170;

export function SheetToPlan({ className }: { className?: string }) {
  const figureRef = useRef<HTMLElement>(null);
  const [day, setDay] = useState(0);
  const [week, setWeek] = useState(0);
  /** Row under the pointer, on either side: the other side lights up to match. */
  const [hoverRow, setHoverRow] = useState<number | null>(null);
  /** The cell being read right now, while a column is scanned. */
  const [readingRow, setReadingRow] = useState<number | null>(null);
  /** Bumped on every change of day or week, so the plan's values re-enter. */
  const [readCount, setReadCount] = useState(0);
  const [motionOk, setMotionOk] = useState(false);
  const [inView, setInView] = useState(false);
  const [held, setHeld] = useState(false);
  /** Off once the visitor picks something: from then on it's theirs. */
  const [autoplay, setAutoplay] = useState(true);

  const playing = motionOk && inView && autoplay && !held;
  const rows = DAYS[day].rows;

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setMotionOk(!query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const el = figureRef.current;
    if (!el || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      rootMargin: '0px 0px -15% 0px',
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Read the selected column top to bottom: each cell lights in turn while
  // the plan row it becomes fills in.
  useEffect(() => {
    if (!motionOk || !inView) return;
    const timers = rows.map((_, i) => window.setTimeout(() => setReadingRow(i), i * READ_STAGGER_MS));
    timers.push(window.setTimeout(() => setReadingRow(null), rows.length * READ_STAGGER_MS + 260));
    return () => {
      timers.forEach(window.clearTimeout);
      setReadingRow(null);
    };
    // A new read starts on each selection, and once on first coming into view.
  }, [readCount, motionOk, inView, rows]);

  const select = useCallback((nextDay: number, nextWeek: number) => {
    setDay(nextDay);
    setWeek(nextWeek);
    setReadCount((n) => n + 1);
  }, []);

  // Play through the block: weeks within a day, then on to the next tab.
  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => {
      const wrap = week === WEEKS.length - 1;
      select(wrap ? (day + 1) % DAYS.length : day, wrap ? 0 : week + 1);
    }, STEP_MS);
    return () => window.clearTimeout(timer);
  }, [playing, day, week, select]);

  const choose = (nextDay: number, nextWeek: number) => {
    setAutoplay(false);
    if (nextDay !== day || nextWeek !== week) select(nextDay, nextWeek);
  };

  // Values only animate after a change, never on first paint.
  const enter = motionOk && readCount > 0;
  const enterStyle = (i: number) => (enter ? { animationDelay: `${i * READ_STAGGER_MS}ms` } : undefined);

  return (
    <figure
      ref={figureRef}
      className={cn('w-full', className)}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setHeld(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHeld(false);
      }}
    >
      <div className="grid items-center gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-4">
        {/* Before: the coach's spreadsheet */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <span className="truncate font-mono text-[11px] text-muted-foreground antialiased">
              strength-block.xlsx
            </span>
          </div>
          <table className="w-full table-fixed border-collapse font-mono text-[10.5px] tabular-nums antialiased sm:text-[11px]">
            <caption className="sr-only">
              Example spreadsheet, {DAYS[day].tab} tab: one row per exercise, one column per week, one
              tab per training day
            </caption>
            <thead>
              <tr className="bg-muted/60 text-left text-muted-foreground">
                <th scope="col" className="w-[38%] border-b border-r border-border px-2.5 py-2 font-medium">
                  Exercise
                </th>
                {WEEKS.map((label, w) => (
                  <th
                    key={label}
                    scope="col"
                    className={cn(
                      'border-b border-r border-border p-0 font-medium transition-colors duration-200 last:border-r-0',
                      w === week && 'bg-brand/25 text-foreground'
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => choose(day, w)}
                      aria-pressed={w === week}
                      aria-label={`Show ${label}`}
                      className="block w-full px-2 py-2 text-left transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    >
                      {label.replace('Week ', 'Wk ')}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody onPointerLeave={() => setHoverRow(null)}>
              {rows.map((row, r) => (
                <tr
                  key={`${day}-${r}`}
                  onPointerEnter={() => setHoverRow(r)}
                  className={cn('transition-colors duration-150', hoverRow === r && 'bg-muted/70')}
                >
                  <th
                    scope="row"
                    className="border-b border-r border-border px-2.5 py-2.5 text-left font-normal text-foreground"
                  >
                    <span key={day} className={cn('block', enter && 'animate-fade-in-up')}>
                      {row.cell}
                    </span>
                  </th>
                  {row.weeks.map((cell, w) => {
                    const active = w === week;
                    const reading = active && readingRow === r;
                    return (
                      <td
                        key={w}
                        className={cn(
                          'relative border-b border-r border-border px-2 py-2.5 align-top transition-colors duration-200 last:border-r-0',
                          active ? 'bg-brand/15 text-foreground' : 'text-muted-foreground'
                        )}
                      >
                        {/* The reading cursor: a cell outline that steps down the column. */}
                        <span
                          aria-hidden="true"
                          className={cn(
                            'pointer-events-none absolute inset-0 border-2 border-brand transition-opacity duration-150',
                            reading ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        <span key={day} className={cn('relative block', enter && 'animate-fade-in-up')}>
                          {sheetCell(cell)}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex gap-1 bg-muted/40 px-2 py-1.5" role="group" aria-label="Sheet tabs">
            {DAYS.map((d, i) => (
              <button
                key={d.tab}
                type="button"
                onClick={() => choose(i, week)}
                aria-pressed={i === day}
                className={cn(
                  'rounded px-2 py-1 font-mono text-[10px] antialiased transition-[background-color,color,box-shadow,transform] duration-150 ease-out-strong active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  i === day ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:bg-card/60 hover:text-foreground'
                )}
              >
                {d.tab}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-center text-brand-foreground" aria-hidden="true">
          <span
            className={cn(
              'relative flex h-9 w-9 items-center justify-center rounded-full bg-brand transition-transform duration-300 ease-pop',
              readingRow !== null && 'scale-110'
            )}
          >
            {readingRow !== null && (
              <span className="absolute inset-0 rounded-full bg-brand opacity-60 motion-safe:animate-ping" />
            )}
            <ArrowDown
              className={cn(
                'relative h-4 w-4 transition-transform duration-300 ease-out-strong md:hidden',
                readingRow !== null && 'translate-y-0.5'
              )}
            />
            <ArrowRight
              className={cn(
                'relative hidden h-4 w-4 transition-transform duration-300 ease-out-strong md:block',
                readingRow !== null && 'translate-x-0.5'
              )}
            />
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
          <div className="mt-3 flex gap-1.5" role="group" aria-label="Plan weeks">
            {WEEKS.map((label, w) => (
              <button
                key={label}
                type="button"
                onClick={() => choose(day, w)}
                aria-pressed={w === week}
                className={cn(
                  'relative overflow-hidden rounded-full px-2.5 py-1 text-[11px] font-semibold tabular-nums transition-[background-color,color,transform] duration-200 ease-out-strong active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
                  w === week
                    ? 'bg-foreground text-background'
                    : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                {label}
                {/* While it plays by itself, the live pill fills up to the next step. */}
                {w === week && playing && (
                  <span
                    key={readCount}
                    aria-hidden="true"
                    className="sheet-autoplay-progress absolute inset-x-0 bottom-0 h-0.5 origin-left bg-brand"
                    style={{ animationDuration: `${STEP_MS}ms` }}
                  />
                )}
              </button>
            ))}
          </div>
          {/* Announced only once the visitor is choosing, not on every autoplay step. */}
          <div className="mt-3 rounded-lg border border-border" aria-live={autoplay ? 'off' : 'polite'}>
            <p className="border-b border-border px-3 py-2 text-[13px] font-semibold antialiased">
              <span key={day} className={cn('inline-block', enter && 'animate-fade-in-up')}>
                {DAYS[day].tab}
              </span>
              <span className="sr-only">, {WEEKS[week]}</span>
            </p>
            <ul className="divide-y divide-border" onPointerLeave={() => setHoverRow(null)}>
              {rows.map((row, r) => (
                <li
                  key={r}
                  onPointerEnter={() => setHoverRow(r)}
                  className={cn(
                    'flex items-baseline justify-between gap-3 px-3 py-2 transition-colors duration-200',
                    readingRow === r ? 'bg-brand/15' : hoverRow === r && 'bg-muted/70'
                  )}
                >
                  <span key={`n-${day}`} className={cn('min-w-0', enter && 'animate-fade-in-up')} style={enterStyle(r)}>
                    <span className="block truncate text-[13px] font-medium antialiased">{row.name}</span>
                    {row.note && (
                      <span className="block text-[11px] text-muted-foreground antialiased">{row.note}</span>
                    )}
                  </span>
                  <span
                    key={`p-${day}-${week}`}
                    className={cn(
                      'shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground antialiased',
                      enter && 'animate-fade-in-up'
                    )}
                    style={enterStyle(r)}
                  >
                    {planPrescription(row.weeks[week])}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <figcaption className="mt-4 text-center font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground antialiased">
        Your layout in, a plan out. Sets, reps and load split out, the rest kept as notes.
        <span className="mt-1.5 block normal-case tracking-normal text-muted-foreground/80">
          Pick a week or a sheet tab to see where each line comes from.
        </span>
      </figcaption>
    </figure>
  );
}
