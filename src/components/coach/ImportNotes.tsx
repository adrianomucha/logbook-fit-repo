import { useState } from 'react';
import { AlertTriangle, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ImportWarning } from '@/lib/plan-import';

/**
 * The AI plan reader's "Worth a look" notes, shared by the import dialog's
 * review step and the plan editor so a note reads the same in both places.
 */

/** The amber mark on an exercise a note points at. */
export function FlaggedDot({ className }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="Worth a look"
      title="Worth a look"
      className={cn('inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500', className)}
    />
  );
}

/** Each note, with the exercises it concerns underneath. */
export function ImportWarningList({ warnings }: { warnings: ImportWarning[] }) {
  return (
    <ul className="mt-1.5 space-y-1.5 ps-6 list-disc text-xs text-amber-800 dark:text-amber-300 antialiased">
      {warnings.map((warning, i) => (
        <li key={i}>
          {warning.message}
          {warning.exercises.length > 0 && (
            <span className="block font-medium">{warning.exercises.join(' · ')}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * The notes carried into the plan editor right after an import, so the
 * coach can fix what the reader guessed. Collapsible to keep the editor
 * usable on a phone; dismissed once the coach has been through them.
 */
export function ImportNotesBanner({
  warnings,
  onDismiss,
}: {
  warnings: ImportWarning[];
  onDismiss: () => void;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="shrink-0 border-b bg-amber-500/10 px-4 sm:px-5 py-2.5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="flex flex-1 min-w-0 items-center gap-2 rounded-md text-left text-sm font-medium text-amber-700 dark:text-amber-400 antialiased focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span className="truncate">
            Worth a look · {warnings.length} {warnings.length === 1 ? 'note' : 'notes'} from the import
          </span>
          <ChevronDown
            className={cn('w-4 h-4 shrink-0 transition-transform duration-150', expanded && 'rotate-180')}
            aria-hidden="true"
          />
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-md px-2 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-amber-800 hover:bg-amber-500/15 dark:text-amber-300 active:scale-[0.96] transition-[background-color,transform] tap-target"
        >
          Done
        </button>
      </div>
      {expanded && (
        <div className="animate-in fade-in-0 duration-150">
          <ImportWarningList warnings={warnings} />
          <p className="mt-2 ps-6 text-xs text-amber-800/80 dark:text-amber-300/80 antialiased">
            The exercises they mention are marked <FlaggedDot className="mx-0.5 align-middle" /> in each workout.
          </p>
        </div>
      )}
    </div>
  );
}
