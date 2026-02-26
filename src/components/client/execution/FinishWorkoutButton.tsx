import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
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
  const hasProgress = exercisesDone > 0;

  return (
    <div className="sticky bottom-0 z-10 bg-background border-t p-4">
      <Button
        onClick={onFinish}
        disabled={disabled}
        className={cn(
          'w-full h-12 text-base font-semibold transition-all',
          allDone
            ? 'bg-success hover:bg-success/90'
            : hasProgress
              ? 'bg-primary hover:bg-primary/90'
              : 'bg-primary hover:bg-primary/90'
        )}
      >
        {allDone ? (
          <>
            <Check className="w-5 h-5 mr-2" />
            Finish Workout
          </>
        ) : (
          <>
            Finish Workout ({exercisesDone}/{exercisesTotal} done)
          </>
        )}
      </Button>
    </div>
  );
}
