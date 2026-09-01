import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ArrowRight, Download, FileSpreadsheet, Loader2, X } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button, buttonVariants } from '../ui/button';
import { Input } from '../ui/input';
import { cn } from '@/lib/utils';
import { ApiError } from '@/lib/api-client';
import type { PlanSummary } from '@/types/api';

interface ImportPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called with the created plan after a successful import. */
  onImported: (plan: PlanSummary) => void;
}

type RowError = { row: number; message: string };

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

/**
 * Import-from-Excel flow: download the template, fill it in, upload it back.
 * Multipart upload, so this posts FormData directly instead of going through
 * the JSON-only apiFetch.
 */
export function ImportPlanModal({ isOpen, onClose, onImported }: ImportPlanModalProps) {
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<RowError[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const baseId = useId();
  const ids = { name: `${baseId}-name`, file: `${baseId}-file`, error: `${baseId}-error` };

  useEffect(() => {
    if (isOpen) {
      setName('');
      setFile(null);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!file) {
      setError('Choose the filled-in template file first.');
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

      const res = await fetch('/api/plans/import', {
        method: 'POST',
        body: formData,
        cache: 'no-store',
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || 'Import failed. Please try again.');
        setRowErrors(Array.isArray(body.rowErrors) ? body.rowErrors : []);
        return;
      }
      onImported(body as PlanSummary);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Import failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = !!file && name.trim().length >= 3 && !isSubmitting;

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSubmitting ? () => {} : onClose}
      title={
        <span className="block text-2xl sm:text-[28px] font-black tracking-tight leading-none antialiased">
          Import from Excel
        </span>
      }
      maxWidth="xl"
      footer={
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-12 shrink-0 rounded-xl px-6"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="h-12 flex-1 rounded-xl gap-2 bg-brand text-brand-foreground hover:bg-brand/90 text-sm font-bold uppercase tracking-wider active:scale-[0.96] transition-[background-color,transform] duration-150"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {isSubmitting ? 'Importing…' : 'Import plan'}
            {!isSubmitting && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* The dialog is a round trip told in order: spreadsheet out,
            spreadsheet back in, name the result. Only the real dropzone
            keeps a dashed border — dashed means "drop here", nothing else. */}
        <ol>
          <ImportStep
            number="1"
            title="Download the template"
            description="One row per exercise — the example rows show the format."
          >
            {/* A plain anchor: same-origin GET rides the session cookie, and
                the browser handles the download natively. Styled directly
                with buttonVariants — this repo's Button doesn't implement
                asChild, so wrapping the anchor left it unstyled. */}
            <a
              href="/api/plans/import/template"
              download
              className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                // ps compensates for the leading icon's visual weight
                'mt-2.5 rounded-xl gap-2 ps-2.5',
                'active:scale-[0.96] transition-[color,background-color,transform] duration-150'
              )}
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              Download template
            </a>
          </ImportStep>

          <ImportStep number="2" title="Fill it in, then upload it back">
            <input
              ref={fileInputRef}
              id={ids.file}
              aria-label="Filled-in template file"
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
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
                Choose the .xlsx file
              </button>
            )}
          </ImportStep>

          <ImportStep
            number="3"
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

        {error && (
          <div id={ids.error} role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 space-y-2 animate-in fade-in-0 slide-in-from-top-1 duration-150">
            <p className="text-sm font-medium text-destructive antialiased">{error}</p>
            {rowErrors.length > 0 && (
              <ul className="max-h-36 overflow-y-auto overscroll-contain space-y-1">
                {rowErrors.map((rowError, i) => (
                  <li key={i} className="text-xs text-destructive/90 antialiased">
                    Row {rowError.row}: {rowError.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </form>
    </Modal>
  );
}
