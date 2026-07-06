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
 */
export function WorkoutViewToggle({ value, onChange }: WorkoutViewToggleProps) {
  return (
    <div
      role="tablist"
      aria-label="Workout view"
      className="flex h-10 rounded-xl bg-muted/60 p-1 gap-1"
    >
      {SEGMENTS.map(({ id, label }) => {
        const isActive = value === id;
        return (
          <button
            key={id}
            role="tab"
            aria-selected={isActive}
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
