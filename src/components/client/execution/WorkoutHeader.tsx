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
    <header className="sticky top-0 z-10 bg-card-foreground pt-[env(safe-area-inset-top)]">
      <div className="px-4 pb-3.5">
        {/* Row 1 — back, progress, actions */}
        <div className="flex items-center justify-between h-[52px]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="text-primary-foreground p-2 -ml-2 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-[0.92] transition-transform duration-150"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5">
              <span className="text-primary-foreground font-bold text-base tabular-nums">
                {exercisesDone}/{exercisesTotal}
              </span>
              {exercisesTotal <= 8 && (
                <div className="flex gap-1">
                  {Array.from({ length: exercisesTotal }, (_, i) => (
                    <div
                      key={i}
                      className={cn(
                        'w-2.5 h-2.5 rounded-full transition-all duration-300',
                        i < exercisesDone
                          ? 'bg-success scale-110'
                          : 'bg-primary-foreground/20'
                      )}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right — completed date / restart (read-only only) */}
          <div className="flex items-center gap-2">
            {isReadOnly && completedDate && (
              <span className="text-primary-foreground/60 text-xs font-bold tabular-nums">
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
          </div>
        </div>

        {/* Row 2 — full-width workout title (own line, wraps, never truncated) */}
        <h1 className="text-primary-foreground font-bold text-xl sm:text-2xl tracking-tight leading-[1.15] antialiased">
          {workoutName}
        </h1>
      </div>
    </header>
  );
}
