import { Check } from 'lucide-react';
import type { WorkoutMark } from '@/lib/workout-week-helpers';
import { cn } from '@/lib/utils';

/**
 * One workout's state, drawn the same wherever this week appears (the week
 * list and the Progress stepper): lime with a tick once done, a lime ring
 * once started, a dashed ring for the next one, a plain ring for the rest.
 */
export function WorkoutMarkIcon({ mark, size }: { mark: WorkoutMark; size: number }) {
  const small = size < 40;
  return (
    <span
      aria-hidden="true"
      className={cn(
        'rounded-full flex items-center justify-center shrink-0',
        mark === 'done' && 'bg-brand',
        mark === 'started' && 'bg-background border-2 border-brand',
        mark === 'next' && 'bg-background border-2 border-dashed border-muted-foreground/60',
        mark === 'upcoming' && 'bg-background border-2 border-border'
      )}
      style={{ width: size, height: size }}
    >
      {mark === 'done' && <Check className={cn('text-brand-foreground', small ? 'w-3.5 h-3.5' : 'w-5 h-5')} strokeWidth={3} />}
      {mark === 'started' && <span className="rounded-full bg-brand" style={{ width: size / 4, height: size / 4 }} />}
    </span>
  );
}
