import { ArrowLeft, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WorkoutHeaderProps {
  workoutName: string;
  exercisesDone: number;
  exercisesTotal: number;
  onBack: () => void;
  onRestart?: () => void;
  isReadOnly?: boolean;
  completedDate?: string;
}

export function WorkoutHeader({
  workoutName,
  exercisesDone,
  exercisesTotal,
  onBack,
  onRestart,
  isReadOnly,
  completedDate,
}: WorkoutHeaderProps) {
  return (
    <div className="sticky top-0 z-10 bg-card-foreground rounded-b-lg">
      <div className="flex items-center justify-between px-4 h-[64px]">
        {/* Left — back + optional progress */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="text-primary-foreground p-1 -ml-1 touch-manipulation"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Progress pill */}
          <div className="flex items-center gap-1.5">
            <span className="text-primary-foreground/80 text-sm font-semibold">
              {exercisesDone}/{exercisesTotal}
            </span>
            {exercisesTotal <= 8 && (
              <div className="flex gap-1 ml-0.5">
                {Array.from({ length: exercisesTotal }, (_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'w-2 h-2 rounded-full transition-colors',
                      i < exercisesDone
                        ? 'bg-success'
                        : 'bg-primary-foreground/30'
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Centre — workout name */}
        <h1 className="text-primary-foreground font-semibold text-lg tracking-tight truncate max-w-[55%] text-center">
          {workoutName}
        </h1>

        {/* Right — read-only badge / restart */}
        <div className="flex items-center gap-2">
          {isReadOnly && completedDate && (
            <span className="text-primary-foreground/60 text-xs">
              {completedDate}
            </span>
          )}
          {isReadOnly && onRestart && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRestart}
              className="text-primary-foreground hover:bg-primary-foreground/10 gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              Restart
            </Button>
          )}
          {/* Spacer so the title stays centred when there's nothing on the right */}
          {!isReadOnly && <div className="w-5" />}
        </div>
      </div>
    </div>
  );
}
