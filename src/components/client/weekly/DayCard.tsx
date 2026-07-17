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
  const isInProgress = day.completion?.status === 'IN_PROGRESS';
  const isCurrent = status === 'CURRENT';

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3.5 py-3 rounded-xl transition-colors touch-manipulation min-h-[56px]',
        isCurrent && 'bg-muted/60 ring-1 ring-inset ring-brand/50',
        isCompleted && 'opacity-60',
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
      <div className="w-9 shrink-0">
        <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground/60">
          Day
        </p>
        <p className="font-mono text-sm font-bold tabular-nums leading-none mt-0.5">
          {String(orderIndex).padStart(2, '0')}
        </p>
      </div>

      {/* Middle — workout info */}
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold truncate tracking-tight">
          {workoutDay?.name || 'Workout'}
        </p>
        <p className="font-mono text-[10px] text-muted-foreground tabular-nums mt-0.5">
          {exerciseCount} exercises
        </p>
      </div>

      {/* Right — status indicator. A started workout must never look
          identical to an untouched one, wherever it sits in the week. */}
      <div className="shrink-0">
        {isCompleted ? (
          <div className="w-6 h-6 rounded-full bg-success/15 flex items-center justify-center">
            <Check className="w-3.5 h-3.5 text-success stroke-[3]" />
          </div>
        ) : isInProgress ? (
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] font-bold bg-warning/15 text-warning rounded-full px-2 py-1">
            In progress
          </span>
        ) : isCurrent ? (
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] font-bold bg-brand text-brand-foreground rounded-full px-2 py-1">
            Up next
          </span>
        ) : null}
      </div>
    </div>
  );
}
