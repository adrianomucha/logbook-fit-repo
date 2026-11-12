import { ArrowDown, ArrowRight, FileSpreadsheet, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Diagram for the import story: a coach's own column-per-week sheet on the
 * left, the first week of the plan it becomes on the right. It's drawn, not a
 * screenshot, so it never claims to be the product UI. The right side borrows
 * the review step's real wording and shape (week pills, one card per day) so
 * the first thing a coach sees after uploading is familiar.
 *
 * The sheet is a real <table> so the example reads to a crawler or screen
 * reader as data, not as a picture of data.
 */

const WEEKS = ['Week 1', 'Week 2', 'Week 3'];

const SHEET_ROWS = [
  { exercise: 'Back squat, RPE 7', cells: ['3×5 100kg', '3×5 105kg', '3×5 110kg'] },
  { exercise: 'Romanian deadlift', cells: ['3×8 80kg', '3×8 85kg', '3×8 90kg'] },
  { exercise: 'Split squat (per side)', cells: ['3×10', '3×10', '3×12'] },
];

const SHEET_TABS = ['Lower A', 'Upper A', 'Lower B'];

/** Week 1 of "Lower A" as the importer reads it: prescriptions split out, the rest kept as notes. */
const PLAN_DAY = [
  { name: 'Back squat', prescription: '3 × 5 · 100 kg', note: 'RPE 7' },
  { name: 'Romanian deadlift', prescription: '3 × 8 · 80 kg' },
  { name: 'Split squat', prescription: '3 × 10', note: 'Per side' },
];

// Both panels are built from the same three bands (a header, four rows, a
// footer) at the same heights, so row N of the sheet sits level with row N of
// the plan and the eye reads straight across the arrow. Type is the page's
// own body scale, and the panels are flat hairline boxes like every other
// surface on the landing page: no shadows, no card inside a card.
const HEADER = 'flex h-12 items-center gap-2.5 border-b border-border px-4 sm:px-5';
// On a <tr> a height is a minimum, so a wrapped cell can still grow the row
// on a phone; from lg up nothing wraps and both panels stay level.
const ROW = 'h-[3.25rem] border-b border-border';
const FOOTER = 'flex h-12 items-center gap-1.5 bg-muted/50 px-3 sm:px-4';
const COLUMN_LABEL = 'text-xs font-medium text-muted-foreground';
const PILL = 'rounded-md px-2.5 py-1 text-xs font-medium tabular-nums antialiased';

export function SheetToPlan({ className }: { className?: string }) {
  return (
    <figure className={cn('w-full', className)}>
      <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-5">
        {/* Before: the coach's spreadsheet */}
        <div className="overflow-hidden rounded-xl border border-border bg-card text-left">
          <div className={HEADER}>
            <FileSpreadsheet className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="truncate text-sm font-medium antialiased">strength-block.xlsx</span>
          </div>
          <table className="w-full table-fixed border-collapse text-sm antialiased">
            <caption className="sr-only">
              Example spreadsheet: one row per exercise, one column per week, one tab per training day
            </caption>
            <thead>
              <tr className={cn(ROW, 'bg-muted/50 text-left')}>
                <th scope="col" className={cn(COLUMN_LABEL, 'w-[40%] border-r border-border px-4 sm:px-5')}>
                  Exercise
                </th>
                {WEEKS.map((week) => (
                  <th key={week} scope="col" className={cn(COLUMN_LABEL, 'border-r border-border px-2.5 last:border-r-0')}>
                    {week.replace('Week ', 'Wk ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SHEET_ROWS.map((row) => (
                <tr key={row.exercise} className={ROW}>
                  <th scope="row" className="border-r border-border px-4 py-2 text-left font-medium text-foreground sm:px-5">
                    {row.exercise}
                  </th>
                  {row.cells.map((cell, i) => (
                    <td key={i} className="border-r border-border px-2.5 py-2 font-mono text-[13px] tabular-nums text-muted-foreground last:border-r-0 lg:whitespace-nowrap">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className={FOOTER} aria-label="Sheet tabs">
            {SHEET_TABS.map((tab, i) => (
              <span
                key={tab}
                className={cn(PILL, i === 0 ? 'bg-card text-foreground ring-1 ring-border' : 'text-muted-foreground')}
              >
                {tab}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center text-muted-foreground" aria-hidden="true">
          <ArrowDown className="h-5 w-5 lg:hidden" />
          <ArrowRight className="hidden h-5 w-5 lg:block" />
        </div>

        {/* After: the plan, as the review step shows it */}
        <div className="overflow-hidden rounded-xl border border-border bg-card text-left">
          <div className={HEADER}>
            <Sparkles className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="truncate text-sm font-medium antialiased">3 weeks · 3 workouts a week</span>
          </div>
          <div className={cn(ROW, 'flex items-center justify-between gap-3 bg-muted/50 px-4 sm:px-5')}>
            <span className={COLUMN_LABEL}>Lower A</span>
            <span className={COLUMN_LABEL}>Sets × reps · load</span>
          </div>
          <ul>
            {PLAN_DAY.map((exercise) => (
              <li key={exercise.name} className={cn(ROW, 'flex items-center justify-between gap-3 px-4 sm:px-5')}>
                <span className="min-w-0 text-sm antialiased">
                  <span className="font-medium">{exercise.name}</span>
                  {exercise.note && <span className="text-muted-foreground"> · {exercise.note}</span>}
                </span>
                <span className="shrink-0 font-mono text-[13px] tabular-nums text-muted-foreground antialiased">
                  {exercise.prescription}
                </span>
              </li>
            ))}
          </ul>
          <div className={FOOTER} aria-hidden="true">
            {WEEKS.map((week, i) => (
              <span
                key={week}
                className={cn(PILL, i === 0 ? 'bg-foreground text-background' : 'text-muted-foreground')}
              >
                {week}
              </span>
            ))}
          </div>
        </div>
      </div>
      <figcaption className="mx-auto mt-6 max-w-xl text-center text-pretty text-sm text-muted-foreground antialiased sm:text-base">
        Sets, reps and load are split out. Everything else is kept as a note,
        and you check every week against your sheet before the plan is created.
      </figcaption>
    </figure>
  );
}
