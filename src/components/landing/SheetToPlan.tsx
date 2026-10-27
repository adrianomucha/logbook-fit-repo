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

export function SheetToPlan({ className }: { className?: string }) {
  return (
    <figure className={cn('w-full', className)}>
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
              Example spreadsheet: one row per exercise, one column per week, one tab per training day
            </caption>
            <thead>
              <tr className="bg-muted/60 text-left text-muted-foreground">
                <th scope="col" className="w-[38%] border-b border-r border-border px-2.5 py-2 font-medium">
                  Exercise
                </th>
                {WEEKS.map((week) => (
                  <th key={week} scope="col" className="border-b border-r border-border px-2 py-2 font-medium last:border-r-0">
                    {week.replace('Week ', 'Wk ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SHEET_ROWS.map((row) => (
                <tr key={row.exercise}>
                  <th scope="row" className="border-b border-r border-border px-2.5 py-2.5 text-left font-normal text-foreground">
                    {row.exercise}
                  </th>
                  {row.cells.map((cell, i) => (
                    <td key={i} className="border-b border-r border-border px-2 py-2.5 align-top text-muted-foreground last:border-r-0">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex gap-1 bg-muted/40 px-2 py-1.5" aria-label="Sheet tabs">
            {SHEET_TABS.map((tab, i) => (
              <span
                key={tab}
                className={cn(
                  'rounded px-2 py-1 font-mono text-[10px] antialiased',
                  i === 0 ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                )}
              >
                {tab}
              </span>
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
          <div className="mt-3 flex gap-1.5" aria-hidden="true">
            {WEEKS.map((week, i) => (
              <span
                key={week}
                className={cn(
                  'rounded-full px-2.5 py-1 text-[11px] font-semibold tabular-nums',
                  i === 0 ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'
                )}
              >
                {week}
              </span>
            ))}
          </div>
          <div className="mt-3 rounded-lg border border-border">
            <p className="border-b border-border px-3 py-2 text-[13px] font-semibold antialiased">
              Lower A
            </p>
            <ul className="divide-y divide-border">
              {PLAN_DAY.map((exercise) => (
                <li key={exercise.name} className="flex items-baseline justify-between gap-3 px-3 py-2">
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium antialiased">{exercise.name}</span>
                    {exercise.note && (
                      <span className="block text-[11px] text-muted-foreground antialiased">{exercise.note}</span>
                    )}
                  </span>
                  <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground antialiased">
                    {exercise.prescription}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <figcaption className="mt-4 text-center font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground antialiased">
        Your layout in, a plan out. Sets, reps and load split out, the rest kept as notes.
      </figcaption>
    </figure>
  );
}
