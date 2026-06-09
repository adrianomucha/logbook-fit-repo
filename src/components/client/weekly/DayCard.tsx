import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WeekDayInfo } from '@/lib/workout-week-helpers';

interface DayCardProps {
  day: WeekDayInfo;
  onClick?: () => void;
}

export function DayCard({ day, onClick }: DayCardProps) {
  const { orderIndex, workoutDay, status, isInteractive } = day;
  const exerciseCount = workoutDay?.exercises?.length || 0;

  const handleClick = () => {
    if (isInteractive && onClick) {
      onClick();
    }
  };

  const isCompleted = status === 'COMPLETED';
  const isCurrent = status === 'CURRENT';

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3.5 py-3 rounded-lg transition-colors touch-manipulation min-h-[52px]',
        isCurrent && 'bg-muted/80',
        isCompleted && 'opacity-70',
        isInteractive && 'cursor-pointer hover:bg-muted/60 active:bg-muted',
      )}
      onClick={handleClick}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      aria-label={
        isInteractive
          ? `Workout ${orderIndex} – ${workoutDay?.name || 'Workout'}`
          : undefined
      }
      onKeyDown={
        isInteractive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleClick();
              }
            }
          : undefined
      }
    >
      {/* Position number — fixed width */}
      <div className="w-10 shrink-0">
        <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/60 font-medium">
          Day
        </p>
        <p className="text-sm font-bold tabular-nums leading-none">
          {orderIndex}
        </p>
      </div>

      {/* Middle — workout info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate tracking-tight">
          {workoutDay?.name || 'Workout'}
        </p>
        <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-medium">
          {exerciseCount} exercises
        </p>
      </div>

      {/* Right — status indicator */}
      <div className="shrink-0">
        {isCompleted ? (
          <div className="w-6 h-6 rounded-full bg-success/15 flex items-center justify-center">
            <Check className="w-3.5 h-3.5 text-success stroke-[3]" />
          </div>
        ) : isCurrent ? (
          <span className="w-2 h-2 rounded-full bg-info block" />
        ) : null}
      </div>
    </div>
  );
}
