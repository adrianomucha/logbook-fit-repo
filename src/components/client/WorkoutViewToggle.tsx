import { cn } from '@/lib/utils';

export type WorkoutViewMode = 'today' | 'weekly';

interface WorkoutViewToggleProps {
  value: WorkoutViewMode;
  onChange: (mode: WorkoutViewMode) => void;
}

const SEGMENTS: { id: WorkoutViewMode; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'weekly', label: 'This week' },
];

/**
 * Quiet segmented control for switching between the today focus view and
 * the full-week overview. Deliberately gray chrome — the volt CTA below
 * stays the loudest element on the screen.
 *
 * Plain buttons with aria-pressed, not role="tab": these segments swap the
 * whole view rather than a tabpanel, and the APG tab pattern would owe the
 * user arrow-key navigation and a roving tabindex this control doesn't have.
 */
export function WorkoutViewToggle({ value, onChange }: WorkoutViewToggleProps) {
  return (
    <div
      role="group"
      aria-label="Workout view"
      className="flex h-10 rounded-xl bg-muted/60 p-1 gap-1"
    >
      {SEGMENTS.map(({ id, label }) => {
        const isActive = value === id;
        return (
          <button
            key={id}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(id)}
            className={cn(
              'flex-1 rounded-lg font-mono text-[11px] uppercase tracking-[0.12em] font-medium transition-colors touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isActive
                ? 'bg-card text-foreground border border-border/70'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
