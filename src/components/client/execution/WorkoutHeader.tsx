import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WorkoutHeaderProps {
  workoutName: string;
  exercisesDone: number;
  exercisesTotal: number;
  onBack: () => void;
  isReadOnly?: boolean;
  completedDate?: string;
}

export function WorkoutHeader({
  workoutName,
  exercisesDone,
  exercisesTotal,
  onBack,
  isReadOnly,
  completedDate,
}: WorkoutHeaderProps) {
  const allDone = exercisesDone === exercisesTotal;

  return (
    <div className="sticky top-0 z-10 bg-background border-b">
      <div className="p-3 sm:p-4">
        <div className="flex items-center gap-3">
          {/* Back button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          {/* Workout name */}
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-lg truncate">{workoutName}</h1>
            {isReadOnly && completedDate && (
              <p className="text-sm text-muted-foreground">
                Completed {completedDate}
              </p>
            )}
          </div>

          {/* Progress pill */}
          <div
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium flex-shrink-0',
              allDone
                ? 'bg-success/10 text-success'
                : 'bg-muted text-muted-foreground'
            )}
          >
            <span>
              {exercisesDone}/{exercisesTotal}
            </span>
            {/* Progress dots — hide when too many to prevent overflow */}
            {exercisesTotal <= 8 && (
              <div className="hidden sm:flex gap-0.5 ml-1">
                {Array.from({ length: exercisesTotal }, (_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'w-2 h-2 rounded-full transition-colors',
                      i < exercisesDone
                        ? 'bg-success'
                        : 'bg-muted-foreground/30'
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
