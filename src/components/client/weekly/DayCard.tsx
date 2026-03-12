import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WeekDayInfo } from '@/lib/workout-week-helpers';
import { format } from 'date-fns';

interface DayCardProps {
  day: WeekDayInfo;
  onClick?: () => void;
}

export function DayCard({ day, onClick }: DayCardProps) {
  const { date, dayOfWeek, workoutDay, status, isInteractive } = day;
  const exerciseCount = workoutDay?.exercises?.length || 0;

  const handleClick = () => {
    if (isInteractive && onClick) {
      onClick();
    }
  };

  const isRest = status === 'REST';
  const isCompleted = status === 'COMPLETED';
  const isToday = status === 'TODAY';
  const isUpcoming = status === 'UPCOMING';
  const isMissed = status === 'MISSED';

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3.5 py-3 rounded-lg transition-colors touch-manipulation',
        isToday && 'bg-muted/80',
        isCompleted && 'opacity-70',
        isUpcoming && 'opacity-35 pointer-events-none',
        isMissed && 'opacity-45',
        isRest && 'opacity-30',
        isInteractive && 'cursor-pointer hover:bg-muted/60 active:bg-muted',
      )}
      onClick={handleClick}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      aria-label={
        isInteractive
          ? `${dayOfWeek} – ${workoutDay?.name || 'Workout'}`
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
      {/* Day abbreviation — fixed width */}
      <div className="w-10 shrink-0">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          {dayOfWeek.slice(0, 3)}
        </p>
        <p className="text-[10px] tabular-nums text-muted-foreground/60">
          {format(date, 'M/d')}
        </p>
      </div>

      {/* Middle — workout info */}
      <div className="flex-1 min-w-0">
        {isRest ? (
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
            Rest
          </p>
        ) : (
          <>
            <p className="text-sm font-bold truncate tracking-tight">
              {workoutDay?.name || 'Workout'}
            </p>
            <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-medium">
              {exerciseCount} exercises
            </p>
          </>
        )}
      </div>

      {/* Right — status indicator */}
      <div className="shrink-0">
        {isCompleted ? (
          <div className="w-6 h-6 rounded-full bg-success/15 flex items-center justify-center">
            <Check className="w-3.5 h-3.5 text-success stroke-[3]" />
          </div>
        ) : isToday ? (
          <span className="w-2 h-2 rounded-full bg-info block" />
        ) : isMissed ? (
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
            Missed
          </span>
        ) : null}
      </div>
    </div>
  );
}
