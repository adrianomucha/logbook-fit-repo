import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Check, Download, FileSpreadsheet, Loader2, Sparkles, X } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button, buttonVariants } from '../ui/button';
import { Input } from '../ui/input';
import { cn } from '@/lib/utils';
import { ApiError } from '@/lib/api-client';
import type { PlanSummary } from '@/types/api';
import { formatDuration, formatPrescription, formatReps, parseDurationInput } from '@/lib/reps';
import { formatWeight } from '@logbook/shared/weight-units';
import {
  applyImportChoices,
  defaultImportPick,
  IMPORT_CHOICE_PLACEHOLDER,
  looksLikeDuration,
  parseImportRows,
  type ImportChoice,
  type ImportRowError,
  type ParsedImportDay,
  type ParsedImportPlan,
  type PlanImportPreview,
} from '@/lib/plan-import';

interface ImportPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called with the created plan after a successful import. */
  onImported: (plan: PlanSummary) => void;
}


/**
 * One row of the import story: a numbered badge on a stepper rail, a short
 * title, at most one line of supporting copy, then the step's control. The
 * rail makes the round-trip (download → fill in → upload → name it) read as
 * a sequence instead of a pile of unrelated fields.
 */
function ImportStep({
  number,
  title,
  description,
  last = false,
  children,
}: {
  number: string;
  title: ReactNode;
  description?: string;
  last?: boolean;
  children?: ReactNode;
}) {
  return (
    <li className="flex gap-3.5">
      <div className="flex flex-col items-center" aria-hidden="true">
        <span className="w-6 h-6 shrink-0 rounded-full bg-muted flex items-center justify-center font-mono text-[11px] font-semibold text-muted-foreground tabular-nums">
          {number}
        </span>
        {!last && <span className="w-px flex-1 bg-border mt-1.5" />}
      </div>
      <div className={cn('flex-1 min-w-0', !last && 'pb-6')}>
        {/* leading-6 matches the 24px badge, so title and number share a center line */}
        <div className="text-sm font-semibold antialiased leading-6">{title}</div>
        {description && (
          <p className="text-[13px] text-muted-foreground text-pretty antialiased mt-0.5">
            {description}
          </p>
        )}
        {children}
      </div>
    </li>
  );
}

/** "hypertrophy_block-v2.xlsx" → "Hypertrophy block v2" */
function nameFromFilename(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
  if (!base) return '';
  return (base.charAt(0).toUpperCase() + base.slice(1)).slice(0, 50);
}

/** "Row 7" for the template, "Week 2, row 7" when the AI read a named sheet. */
function rowLabel(rowError: ImportRowError): string {
  return rowError.sheet ? `${rowError.sheet}, row ${rowError.row}` : `Row ${rowError.row}`;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

const CHOICE_FIELD_LABEL: Record<ImportChoice['field'], string> = {
  sets: 'sets',
  reps: 'reps',
  weight: 'weight',
  rest: 'rest',
};

const CHOICE_PLACEHOLDER: Record<ImportChoice['field'], string> = {
  sets: 'e.g. 3',
  reps: 'e.g. 8 or 6-8',
  weight: 'e.g. 60 kg',
  rest: 'Seconds, e.g. 150',
};

/** An option as the coach reads it: rest is stored in seconds but shown as "2 min". */
function choiceOptionLabel(field: ImportChoice['field'], value: string): string {
  if (field === 'rest' && /^\d+$/.test(value.trim())) return formatDuration(Number(value));
  return value;
}

/**
 * A typed-in value in the row's own format. Rest rows hold seconds, so a
 * coach writing "2:30" or "2.5 min" gets 150, not the 2 a bare number read
 * would take.
 */
function normalizePick(field: ImportChoice['field'], value: string): string | undefined {
  const text = value.trim();
  if (!text) return undefined;
  if (field === 'rest' && looksLikeDuration(text)) {
    const seconds = parseDurationInput(text).reps;
    return seconds == null ? text : String(seconds);
  }
  return text;
}

/** The coach's pick for one choice: a listed option, or their own value. */
type ChoicePick = { value: string; other: boolean };

/**
 * One ambiguous value, settled in place: what the sheet said, then the
 * options as pills (the reader's guess selected), plus "Other" for a value
 * of the coach's own.
 */
function ChoicePicker({
  choice,
  pick,
  error,
  required,
  onPick,
}: {
  choice: ImportChoice;
  pick: ChoicePick;
  error: string | null;
  /** The reader left this value out: the coach has to supply one */
  required: boolean;
  onPick: (pick: ChoicePick) => void;
}) {
  const field = CHOICE_FIELD_LABEL[choice.field];
  const pill = (selected: boolean) =>
    cn(
      'shrink-0 rounded-full px-3 py-1 text-xs font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      selected ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground'
    );

  return (
    <div className="mt-2">
      <p className="text-xs text-muted-foreground text-pretty antialiased">
        {choice.said ? `Sheet said “${choice.said}”.` : `No ${field} in the sheet.`}{' '}
        {required ? (
          <span className="font-medium text-foreground">
            {choice.options.length > 0 ? 'Pick' : 'Enter'} the {field} to create the plan:
          </span>
        ) : (
          `Pick the ${field}:`
        )}
      </p>
      {choice.options.length > 0 && (
      <div role="radiogroup" aria-label={`${choice.exercise} ${field}`} className="mt-1.5 flex flex-wrap gap-1.5">
        {choice.options.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={!pick.other && pick.value === option}
            onClick={() => onPick({ value: option, other: false })}
            className={pill(!pick.other && pick.value === option)}
          >
            {choiceOptionLabel(choice.field, option)}
          </button>
        ))}
        <button
          type="button"
          role="radio"
          aria-checked={pick.other}
          onClick={() => onPick({ value: pick.other ? pick.value : '', other: true })}
          className={pill(pick.other)}
        >
          Other
        </button>
      </div>
      )}
      {pick.other && (
        <Input
          autoFocus={choice.options.length > 0}
          value={pick.value}
          onChange={(e) => onPick({ value: e.target.value, other: true })}
          placeholder={CHOICE_PLACEHOLDER[choice.field]}
          aria-label={`${choice.exercise} ${field}`}
          aria-invalid={!!error}
          className="mt-2 h-9 max-w-[220px] rounded-xl text-base sm:text-sm"
        />
      )}
      {error && (
        <p role="alert" className="mt-1 text-xs text-destructive text-pretty antialiased">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * "4x 6-8 @ 60 kg · rest 2 min", with "?" for any value the coach still has
 * to supply (the row holds a placeholder there until they do).
 */
function prescriptionText(
  exercise: ParsedImportDay['exercises'][number],
  unit: PlanImportPreview['weightUnit'],
  pending: Set<ImportChoice['field']>
): string {
  if (pending.size === 0) {
    const rest = exercise.restSeconds != null ? ` · rest ${formatDuration(exercise.restSeconds)}` : '';
    return formatPrescription(exercise, unit) + rest;
  }
  const sets = pending.has('sets') ? '?' : String(exercise.sets);
  const reps = pending.has('reps') ? '?' : formatReps(exercise.reps, exercise.repsMax, exercise.trackingType);
  let text = `${sets}x ${reps}`;
  if (pending.has('weight')) text += ' @ ?';
  else if (exercise.weight != null) text += ` @ ${formatWeight(exercise.weight, unit)}`;
  if (pending.has('rest')) text += ' · rest ?';
  else if (exercise.restSeconds != null) text += ` · rest ${formatDuration(exercise.restSeconds)}`;
  return text;
}

/** One workout of the reviewed plan: its name, then each exercise's prescription. */
function PreviewDay({
  day,
  unit,
  choicesFor,
  pendingFor,
}: {
  day: ParsedImportDay;
  unit: PlanImportPreview['weightUnit'];
  /** The pickers to show under an exercise, if the reader had to guess any of its values */
  choicesFor: (exerciseName: string) => ReactNode;
  /** Fields of an exercise still waiting on the coach, shown as "?" */
  pendingFor: (exerciseName: string) => Set<ImportChoice['field']>;
}) {
  return (
    <li className="rounded-2xl border border-border px-4 py-3">
      <div className="text-sm font-semibold antialiased">{day.name}</div>
      {day.exercises.length === 0 ? (
        <p className="mt-1 text-[13px] text-muted-foreground antialiased">Nothing listed</p>
      ) : (
        <ul className="mt-1.5 space-y-2">
          {day.exercises.map((exercise, i) => (
            <li key={i} className={cn('text-[13px] antialiased', exercise.supersetWithPrevious && 'ps-3 border-s-2 border-foreground/20')}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate font-medium" title={exercise.name}>{exercise.name}</span>
                <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                  {prescriptionText(exercise, unit, pendingFor(exercise.name))}
                </span>
              </div>
              {exercise.coachNotes && (
                <p className="text-xs text-muted-foreground text-pretty">{exercise.coachNotes}</p>
              )}
              {choicesFor(exercise.name)}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * Import-from-spreadsheet flow: upload a spreadsheet (the template, or any
 * layout the AI reader can map), review the plan it reads as, then create
 * it. Uploads are multipart, so this posts directly instead of going through
 * the JSON-only apiFetch.
 */
export function ImportPlanModal({ isOpen, onClose, onImported }: ImportPlanModalProps) {
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PlanImportPreview | null>(null);
  // One pick per preview.choices entry; starts on the reader's guess
  const [picks, setPicks] = useState<ChoicePick[]>([]);
  const [weekIndex, setWeekIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<ImportRowError[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const baseId = useId();
  const ids = { name: `${baseId}-name`, file: `${baseId}-file`, error: `${baseId}-error` };

  useEffect(() => {
    if (isOpen) {
      setName('');
      setFile(null);
      setPreview(null);
      setWeekIndex(0);
      setIsSubmitting(false);
      setError(null);
      setRowErrors([]);
    }
  }, [isOpen]);

  const handleFileChange = (selected: File | null) => {
    setFile(selected);
    setError(null);
    setRowErrors([]);
    if (selected && name.trim() === '') {
      setName(nameFromFilename(selected.name));
    }
  };

  const showError = (body: { error?: string; rowErrors?: unknown }, fallback: string) => {
    setError(body.error || fallback);
    setRowErrors(Array.isArray(body.rowErrors) ? (body.rowErrors as ImportRowError[]) : []);
  };

  // Step one: read the file into a plan to review — nothing is saved yet
  const handleRead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!file) {
      setError('Choose your spreadsheet first.');
      return;
    }
    if (name.trim().length < 3) {
      setError('Plan name must be at least 3 characters.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setRowErrors([]);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', name.trim());

      const res = await fetch('/api/plans/import/preview', {
        method: 'POST',
        body: formData,
        cache: 'no-store',
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        showError(body, 'Couldn’t read the file. Please try again.');
        return;
      }
      const read = body as PlanImportPreview;
      setPreview(read);
      setPicks(
        read.choices.map((choice) => {
          // Start on the reader's guess; with nothing to offer, straight to typing
          const guess = defaultImportPick(choice);
          return { value: guess ?? '', other: guess == null && choice.options.length === 0 };
        })
      );
      setWeekIndex(0);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Couldn’t read the file. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step two: the coach has checked the plan — create it from the same rows
  const handleCreate = async () => {
    if (isSubmitting || !preview) return;
    setIsSubmitting(true);
    setError(null);
    setRowErrors([]);
    try {
      const res = await fetch('/api/plans/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), rows: reviewedRows }),
        cache: 'no-store',
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        showError(body, 'Import failed. Please try again.');
        return;
      }
      onImported(body as PlanSummary);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Import failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Each pick in the row's format, and the error a typed-in one would cause
  // (checked on its own, so one bad value doesn't hide the others)
  const pickValues = useMemo(
    () => (preview ? picks.map((pick, i) => normalizePick(preview.choices[i].field, pick.value)) : []),
    [preview, picks]
  );
  // What stands in for each choice while the coach hasn't settled it: the
  // reader's guess, or a placeholder the review shows as "?"
  const fallbacks = useMemo(
    () => preview?.choices.map((c) => defaultImportPick(c) ?? IMPORT_CHOICE_PLACEHOLDER[c.field]) ?? [],
    [preview]
  );
  const pickErrors = useMemo(
    () =>
      preview
        ? preview.choices.map((choice, i) => {
            if (pickValues[i] == null) return null;
            const rows = applyImportChoices(
              preview.rows,
              preview.choices,
              fallbacks.map((fallback, j) => (j === i ? pickValues[i] : fallback))
            );
            return (
              parseImportRows(rows, preview.weightUnit).errors.find((e) => e.field === choice.field)?.message ??
              null
            );
          })
        : [],
    [preview, pickValues, fallbacks]
  );
  // Settled per choice: a value that parses. Unsettled ones block Create
  const settled = pickValues.map((value, i) => value != null && !pickErrors[i]);
  // The rows with the coach's picks applied, re-parsed in place so the
  // review shows exactly what Create plan will send (the server re-checks)
  const reviewedRows = useMemo(
    () =>
      preview
        ? applyImportChoices(
            preview.rows,
            preview.choices,
            pickValues.map((value, i) => (value != null && !pickErrors[i] ? value : fallbacks[i]))
          )
        : [],
    [preview, pickValues, pickErrors, fallbacks]
  );
  const reviewedPlan = useMemo(
    () => (preview ? parseImportRows(reviewedRows, preview.weightUnit).plan : null),
    [preview, reviewedRows]
  );
  const pendingCount = settled.filter((ok) => !ok).length;
  const canCreate = !!reviewedPlan && pendingCount === 0 && !isSubmitting;

  const handleBack = () => {
    setPreview(null);
    setError(null);
    setRowErrors([]);
  };

  const canRead = !!file && name.trim().length >= 3 && !isSubmitting;

  const errorBox = error && (
    <div id={ids.error} role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 space-y-2 animate-in fade-in-0 slide-in-from-top-1 duration-150">
      <p className="text-sm font-medium text-destructive antialiased">{error}</p>
      {rowErrors.length > 0 && (
        <ul className="max-h-36 overflow-y-auto overscroll-contain space-y-1">
          {rowErrors.map((rowError, i) => (
            <li key={i} className="text-xs text-destructive/90 antialiased">
              {rowLabel(rowError)}: {rowError.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const primaryButtonClass =
    'h-12 flex-1 rounded-xl gap-2 bg-brand text-brand-foreground hover:bg-brand/90 text-sm font-bold uppercase tracking-wider active:scale-[0.96] transition-[background-color,transform] duration-150';

  const footer = preview ? (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        onClick={handleBack}
        disabled={isSubmitting}
        className="h-12 shrink-0 rounded-xl gap-2 px-5"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back
      </Button>
      <Button onClick={handleCreate} disabled={!canCreate} className={primaryButtonClass}>
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {isSubmitting ? 'Creating…' : 'Create plan'}
        {!isSubmitting && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
      </Button>
    </div>
  ) : (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        onClick={onClose}
        disabled={isSubmitting}
        className="h-12 shrink-0 rounded-xl px-6"
      >
        Cancel
      </Button>
      <Button onClick={handleRead} disabled={!canRead} className={primaryButtonClass}>
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {isSubmitting ? 'Reading…' : 'Read file'}
        {!isSubmitting && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSubmitting ? () => {} : onClose}
      title={
        <span className="block text-2xl sm:text-[28px] font-bold tracking-tight leading-none antialiased">
          {preview ? 'Check your plan' : 'Import from Excel'}
        </span>
      }
      maxWidth="xl"
      footer={footer}
    >
      {preview ? (
        <ImportReview
          preview={preview}
          plan={reviewedPlan ?? preview.plan}
          picks={picks}
          pickErrors={pickErrors}
          settled={settled}
          onPick={(index, pick) => setPicks((current) => current.map((p, i) => (i === index ? pick : p)))}
          weekIndex={weekIndex}
          onWeekChange={setWeekIndex}
          errorBox={errorBox}
        />
      ) : (
        <form onSubmit={handleRead} className="space-y-5">
          {/* Upload, then name the result. Only the real dropzone keeps a
              dashed border — dashed means "drop here", nothing else. */}
          <ol>
            <ImportStep
              number="1"
              title="Upload your spreadsheet"
              description="Any layout works: one row per exercise, a column per week, a tab per week. Excel or CSV."
            >
              <input
                ref={fileInputRef}
                id={ids.file}
                aria-label="Plan spreadsheet"
                type="file"
                accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                className="sr-only"
                onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
              />
              {file ? (
                <div className="mt-2.5 flex items-center gap-3 rounded-2xl border border-border bg-muted/40 px-4 py-3 animate-in fade-in-0 slide-in-from-top-1 duration-150">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                  {/* Truncation hides the middle of long filenames — keep the
                      full name reachable */}
                  <span className="flex-1 min-w-0 truncate text-sm font-medium antialiased" title={file.name}>{file.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      handleFileChange(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    disabled={isSubmitting}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground shrink-0 tap-target"
                    aria-label="Remove file"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2.5 w-full flex items-center justify-center gap-2.5 rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground transition-colors hover:border-foreground/25 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <FileSpreadsheet className="w-5 h-5" aria-hidden="true" />
                  Choose a .xlsx or .csv file
                </button>
              )}
              {/* Said before upload, while there's still time to clean the
                  file — matches the Anthropic entry in the privacy policy */}
              <p className="mt-2 text-xs text-muted-foreground text-pretty antialiased">
                Layouts other than the template are read by Anthropic&rsquo;s AI, so
                remove client names and health details first.{' '}
                {/* New tab: following it shouldn't close the half-filled import */}
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-foreground underline underline-offset-4 hover:text-brand"
                >
                  Privacy Policy
                </a>
              </p>
              {/* A plain anchor: same-origin GET rides the session cookie, and
                  the browser handles the download natively. Styled directly
                  with buttonVariants — this repo's Button doesn't implement
                  asChild, so wrapping the anchor left it unstyled. */}
              <a
                href="/api/plans/import/template"
                download
                className={cn(
                  buttonVariants({ variant: 'ghost', size: 'sm' }),
                  // ps compensates for the leading icon's visual weight
                  'mt-2 rounded-xl gap-2 ps-2.5 text-muted-foreground hover:text-foreground',
                  'active:scale-[0.96] transition-[color,background-color,transform] duration-150'
                )}
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                No spreadsheet yet? Get the template
              </a>
            </ImportStep>

            <ImportStep
              number="2"
              title={<label htmlFor={ids.name}>Name your plan</label>}
              description="Clients see this name on their plan."
              last
            >
              <div className="mt-2.5 flex items-center gap-1 rounded-2xl border border-border bg-muted/40 p-2 transition-colors focus-within:border-foreground/25 focus-within:bg-background">
                <Input
                  id={ids.name}
                  placeholder="e.g., 4-Week Strength Foundation"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-10 flex-1 min-w-0 border-0 bg-transparent px-2 text-base font-semibold tracking-tight placeholder:font-normal placeholder:tracking-normal focus-visible:ring-0 focus-visible:ring-offset-0"
                  maxLength={50}
                  aria-describedby={error ? ids.error : undefined}
                />
                {name.length >= 40 && (
                  <span className="font-mono text-[10px] tabular-nums text-muted-foreground/50 pe-2 shrink-0">
                    {name.length}/50
                  </span>
                )}
              </div>
            </ImportStep>
          </ol>

          {isSubmitting && (
            <p role="status" className="text-[13px] text-muted-foreground text-pretty antialiased animate-in fade-in-0 duration-150">
              Reading your spreadsheet. A layout other than the template can take up to a minute.
            </p>
          )}

          {errorBox}
        </form>
      )}
    </Modal>
  );
}

/**
 * The review step: what was read, the values the reader had to guess (each
 * settled in place, under its exercise), and the plan one week at a time.
 * Nothing is saved until the coach confirms.
 */
function ImportReview({
  preview,
  plan,
  pickErrors,
  settled,
  picks,
  onPick,
  weekIndex,
  onWeekChange,
  errorBox,
}: {
  preview: PlanImportPreview;
  /** The plan with the coach's picks applied */
  plan: ParsedImportPlan;
  picks: ChoicePick[];
  /** Per pick, why a typed-in value can't be used */
  pickErrors: (string | null)[];
  /** Per pick, whether it has a usable value yet */
  settled: boolean[];
  onPick: (index: number, pick: ChoicePick) => void;
  weekIndex: number;
  onWeekChange: (index: number) => void;
  errorBox: ReactNode;
}) {
  const exerciseCount = plan.weeks.reduce(
    (total, week) => total + week.days.reduce((n, day) => n + day.exercises.length, 0),
    0
  );
  const week = plan.weeks[Math.min(weekIndex, plan.weeks.length - 1)];
  const shownNewExercises = preview.newExercises.slice(0, 8);
  const moreNewExercises = preview.newExercises.length - shownNewExercises.length;
  const { choices } = preview;

  const choicesFor = (exerciseName: string) => {
    const matching = choices
      .map((choice, index) => ({ choice, index }))
      .filter(({ choice }) => choice.exercise.toLowerCase() === exerciseName.toLowerCase());
    if (matching.length === 0) return null;
    return matching.map(({ choice, index }) => (
      <ChoicePicker
        key={index}
        choice={choice}
        pick={picks[index]}
        error={pickErrors[index]}
        required={defaultImportPick(choice) == null}
        onPick={(pick) => onPick(index, pick)}
      />
    ));
  };

  // Fields still standing in for a value the coach has to supply, shown "?"
  const pendingFor = (exerciseName: string) =>
    new Set(
      choices
        .filter(
          (choice, index) =>
            !settled[index] &&
            defaultImportPick(choice) == null &&
            choice.exercise.toLowerCase() === exerciseName.toLowerCase()
        )
        .map((choice) => choice.field)
    );
  const pendingCount = choices.filter((choice, i) => !settled[i] && defaultImportPick(choice) == null).length;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2.5 text-[13px] text-muted-foreground text-pretty antialiased">
        {preview.source === 'ai' ? (
          <Sparkles className="w-4 h-4 mt-0.5 shrink-0 text-foreground" aria-hidden="true" />
        ) : (
          <Check className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        )}
        <div className="space-y-1.5">
          <p>
            {preview.source === 'ai'
              ? 'Read automatically from your layout. Check it against your spreadsheet before you create the plan.'
              : 'Read from the template columns.'}{' '}
            <span className="font-medium text-foreground">
              {plural(plan.durationWeeks, 'week')} · {plural(plan.workoutsPerWeek, 'workout')} a week · {plural(exerciseCount, 'exercise')}
            </span>
          </p>
          {choices.length > 0 && (
            <p>
              Your sheet left {choices.length === 1 ? 'one value' : `${choices.length} values`} open. Pick {choices.length === 1 ? 'it' : 'them'} below:{' '}
              <span className="font-medium text-foreground">
                {choices.map((c, i) => (
                  <span key={i} className="whitespace-nowrap">
                    {i > 0 && ' · '}
                    {c.exercise} {CHOICE_FIELD_LABEL[c.field]}
                  </span>
                ))}
              </span>
              .
              {pendingCount > 0 && (
                <>
                  {' '}
                  {pendingCount === 1 ? 'One needs' : `${pendingCount} need`} a value before you can create the plan.
                </>
              )}
            </p>
          )}
          {preview.notes.map((note, i) => (
            <p key={i}>{note}</p>
          ))}
        </div>
      </div>

      {preview.newExercises.length > 0 && (
        <p className="text-[13px] text-muted-foreground text-pretty antialiased">
          Adds {plural(preview.newExercises.length, 'new exercise')} to your library:{' '}
          {shownNewExercises.join(', ')}
          {moreNewExercises > 0 && ` and ${moreNewExercises} more`}.
        </p>
      )}

      {plan.weeks.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto overscroll-contain pb-1 -mx-1 px-1" role="group" aria-label="Week">
          {plan.weeks.map((w, i) => (
            <button
              key={w.weekNumber}
              type="button"
              onClick={() => onWeekChange(i)}
              aria-pressed={w === week}
              className={cn(
                'shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                w === week ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground'
              )}
            >
              Week {w.weekNumber}
            </button>
          ))}
        </div>
      )}

      <ul className="space-y-2.5">
        {week.days.map((day) => (
          <PreviewDay
            key={day.orderIndex}
            day={day}
            unit={preview.weightUnit}
            choicesFor={choicesFor}
            pendingFor={pendingFor}
          />
        ))}
      </ul>

      {errorBox}
    </div>
  );
}
