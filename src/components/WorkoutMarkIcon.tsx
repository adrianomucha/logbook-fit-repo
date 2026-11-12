import { Check } from 'lucide-react';
import type { WorkoutMark } from '@/lib/workout-week-helpers';
import { cn } from '@/lib/utils';

/**
 * One workout's state, drawn the same wherever a week appears: the client's
 * week list and Progress stepper, and the coach's view of that week. Volt
 * with a tick once done (a logged workout is the one thing that earns volt),
 * an ink ring once started, a dashed ring for the
 * next one, a plain ring for the rest.
 */
export function WorkoutMarkIcon({ mark, size }: { mark: WorkoutMark; size: number }) {
  const small = size < 40;
  return (
    <span
      aria-hidden="true"
      className={cn(
        'rounded-full flex items-center justify-center shrink-0',
        mark === 'done' && 'bg-brand',
        mark === 'started' && 'bg-background border-2 border-foreground',
        mark === 'next' && 'bg-background border-2 border-dashed border-muted-foreground/60',
        mark === 'upcoming' && 'bg-background border-2 border-border'
      )}
      style={{ width: size, height: size }}
    >
      {mark === 'done' && <Check className={cn('text-brand-foreground', small ? 'w-3.5 h-3.5' : 'w-5 h-5')} strokeWidth={3} />}
      {mark === 'started' && <span className="rounded-full bg-foreground" style={{ width: size / 4, height: size / 4 }} />}
    </span>
  );
}
