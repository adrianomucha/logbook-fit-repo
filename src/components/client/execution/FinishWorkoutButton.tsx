import { cn } from '@/lib/utils';

interface FinishWorkoutButtonProps {
  exercisesDone: number;
  exercisesTotal: number;
  onFinish: () => void;
  disabled?: boolean;
}

export function FinishWorkoutButton({
  exercisesDone,
  exercisesTotal,
  onFinish,
  disabled,
}: FinishWorkoutButtonProps) {
  const allDone = exercisesDone === exercisesTotal;

  return (
    // sticky, not fixed: iOS Safari detaches fixed bars after keyboard/scroll events
    <div className="sticky bottom-0 z-10 w-full bg-background/85 backdrop-blur-sm border-t border-border p-3 sm:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="max-w-2xl mx-auto">
        <button
          type="button"
          onClick={onFinish}
          disabled={disabled}
          className={cn(
            'w-full h-14 rounded-xl text-sm font-bold uppercase tracking-wider transition-[background-color,transform] duration-150 touch-manipulation active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            allDone
              ? 'bg-brand text-brand-foreground hover:bg-brand/90'
              : 'bg-foreground text-background hover:bg-foreground/90',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          Finish Workout
          {!allDone && (
            <span className="ml-2 font-mono tabular-nums opacity-50">
              {exercisesDone}/{exercisesTotal}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
