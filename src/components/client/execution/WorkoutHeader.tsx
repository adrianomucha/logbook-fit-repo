import { ArrowLeft, RotateCcw } from 'lucide-react';

interface WorkoutHeaderProps {
  workoutName: string;
  /** Small eyebrow above the title, e.g. "Day 2" (rendered uppercase) */
  dayLabel?: string;
  /** Coach note / day description shown as a subtitle */
  description?: string;
  exercisesDone: number;
  exercisesTotal: number;
  onBack: () => void;
  onRestart?: () => void;
  isReadOnly?: boolean;
  completedDate?: string;
}

export function WorkoutHeader({
  workoutName,
  dayLabel,
  description,
  exercisesDone,
  exercisesTotal,
  onBack,
  onRestart,
  isReadOnly,
  completedDate,
}: WorkoutHeaderProps) {
  const pct =
    exercisesTotal > 0
      ? Math.round((exercisesDone / exercisesTotal) * 100)
      : 0;
  const eyebrow = [dayLabel, isReadOnly ? completedDate : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <header className="sticky top-0 z-10 bg-card-foreground pt-[env(safe-area-inset-top)]">
      <div className="px-4 pb-4">
        {/* Top row — back + progress count (+ restart when viewing a finished workout) */}
        <div className="flex items-center justify-between h-[52px]">
          <button
            type="button"
            onClick={onBack}
            className="text-primary-foreground p-2 -ml-2 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-[0.92] transition-transform duration-150"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-1">
            {isReadOnly && onRestart && (
              <button
                type="button"
                onClick={onRestart}
                aria-label="Restart workout"
                className="text-primary-foreground/70 hover:text-primary-foreground p-2 touch-manipulation active:scale-[0.92] transition-[color,transform] duration-150"
              >
                <RotateCcw className="w-[18px] h-[18px]" />
              </button>
            )}
            <span className="text-primary-foreground font-bold text-base tabular-nums">
              {exercisesDone}/{exercisesTotal}
            </span>
          </div>
        </div>

        {/* Eyebrow */}
        {eyebrow && (
          <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-primary-foreground/50">
            {eyebrow}
          </p>
        )}

        {/* Title — full width, never truncated */}
        <h1 className="text-primary-foreground font-bold text-2xl sm:text-3xl tracking-tight leading-[1.1] antialiased mt-1">
          {workoutName}
        </h1>

        {/* Subtitle — day note */}
        {description && (
          <p className="text-sm text-primary-foreground/50 mt-1.5 leading-snug line-clamp-2">
            {description}
          </p>
        )}

        {/* Progress bar */}
        <div
          role="progressbar"
          aria-label="Workout progress"
          aria-valuemin={0}
          aria-valuemax={exercisesTotal}
          aria-valuenow={exercisesDone}
          className="mt-4 h-1 w-full rounded-full bg-primary-foreground/15 overflow-hidden"
        >
          <div
            className="h-full rounded-full bg-success transition-[width] duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </header>
  );
}
