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
    <div className="fixed bottom-0 left-0 right-0 z-10 bg-background/80 backdrop-blur-sm border-t p-3 sm:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <button
        type="button"
        onClick={onFinish}
        disabled={disabled}
        className={cn(
          'w-full h-14 rounded-lg text-sm font-bold uppercase tracking-[0.1em] transition-all duration-200 touch-manipulation active:scale-[0.97]',
          'text-primary-foreground',
          allDone
            ? 'bg-success hover:bg-success/90 shadow-[0_0_20px_hsl(var(--success)/0.3)]'
            : 'bg-card-foreground hover:bg-card-foreground/90',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        Finish Workout
        {!allDone && (
          <span className="ml-2 text-primary-foreground/50 font-bold tabular-nums">
            {exercisesDone}/{exercisesTotal}
          </span>
        )}
      </button>
    </div>
  );
}
