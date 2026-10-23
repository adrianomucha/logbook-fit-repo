import { cn } from '@/lib/utils';
import { WeekDayInfo, WORKOUT_MARK_LABEL, workoutMark } from '@/lib/workout-week-helpers';
import { parseSessionName } from '@logbook/shared/parse-session-name';
import { WorkoutMarkIcon } from '../WorkoutMarkIcon';

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
  const mark = workoutMark(day);
  const markLabel = WORKOUT_MARK_LABEL[mark];
  // The coach's "Day 5: Lower B (Backup)" reads as day 05, "Lower B"
  const parsed = parseSessionName(workoutDay?.name || 'Workout');
  const dayNumber = parsed.day ?? String(orderIndex);

  // Status reaches sighted users through the mark, so it has to travel in
  // the accessible name too; aria-label replaces the content.
  const statusText = isCompleted ? 'done' : markLabel.toLowerCase() || null;

  const content = (
    <>
      {/* Position number — fixed width */}
      <div className="w-9 shrink-0 text-left">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Day
        </p>
        <p className="font-mono text-sm font-bold tabular-nums leading-none mt-0.5">
          {dayNumber.padStart(2, '0')}
        </p>
      </div>

      {/* Middle — workout info */}
      <div className="flex-1 min-w-0 text-left">
        <p className={cn('text-[15px] font-semibold truncate tracking-tight', isCompleted && 'text-muted-foreground')}>
          {parsed.title}
        </p>
        <p className="font-mono text-[10px] text-muted-foreground tabular-nums mt-0.5">
          {exerciseCount} exercises
        </p>
      </div>

      {/* Right: the same mark as the Progress stepper. A started workout
          must never look identical to an untouched one. */}
      <div className="shrink-0 flex items-center gap-2">
        {markLabel && <span className="text-[11px] font-semibold text-foreground">{markLabel}</span>}
        <WorkoutMarkIcon mark={mark} size={24} />
      </div>
    </>
  );

  // rounded-lg (10px) sits concentrically inside the grid card's 18px corner
  // over its 8px padding; rounded-xl made the inner corner rounder than the outer.
  const shell = cn(
    'w-full flex items-center gap-3 px-3.5 py-3 rounded-lg transition-colors touch-manipulation min-h-[56px]',
    isCurrent && 'bg-muted/60 ring-1 ring-inset ring-brand/50',
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
        parsed.title,
        statusText,
      ]
        .filter(Boolean)
        .join(', ')}
    >
      {content}
    </button>
  );
}
