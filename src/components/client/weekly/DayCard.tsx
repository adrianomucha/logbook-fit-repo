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

  // Status reaches sighted users through a badge or an icon-only check, so it
  // has to travel in the accessible name too — aria-label replaces the content.
  const statusText = isCompleted
    ? 'completed'
    : isInProgress
      ? 'in progress'
      : isCurrent
        ? 'up next'
        : null;

  const content = (
    <>
      {/* Position number — fixed width */}
      <div className="w-9 shrink-0 text-left">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Day
        </p>
        <p className="font-mono text-sm font-bold tabular-nums leading-none mt-0.5">
          {String(orderIndex).padStart(2, '0')}
        </p>
      </div>

      {/* Middle — workout info */}
      <div className="flex-1 min-w-0 text-left">
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
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] font-bold bg-warning/15 text-warning rounded-full px-2 py-1">
            In progress
          </span>
        ) : isCurrent ? (
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] font-bold bg-brand text-brand-foreground rounded-full px-2 py-1">
            Up next
          </span>
        ) : null}
      </div>
    </>
  );

  // rounded-lg (10px) sits concentrically inside the grid card's 18px corner
  // over its 8px padding; rounded-xl made the inner corner rounder than the outer.
  const shell = cn(
    'w-full flex items-center gap-3 px-3.5 py-3 rounded-lg transition-colors touch-manipulation min-h-[56px]',
    isCurrent && 'bg-muted/60 ring-1 ring-inset ring-brand/50',
    isCompleted && 'opacity-60',
  );

  if (!isInteractive) {
    return <div className={shell}>{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        shell,
        'cursor-pointer hover:bg-muted/60 active:bg-muted',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
      )}
      aria-label={[
        `Workout ${orderIndex}`,
        workoutDay?.name || 'Workout',
        statusText,
      ]
        .filter(Boolean)
        .join(', ')}
    >
      {content}
    </button>
  );
}
