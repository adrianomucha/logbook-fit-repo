import { WeekDayInfo } from '@/lib/workout-week-helpers';
import { DayCard } from './DayCard';

interface DayCardGridProps {
  days: WeekDayInfo[];
  onDayClick: (day: WeekDayInfo) => void;
}

export function DayCardGrid({ days, onDayClick }: DayCardGridProps) {
  return (
    <div className="grid gap-3">
      {days.map((day) => (
        <DayCard
          key={day.dayNumber}
          day={day}
          onClick={() => onDayClick(day)}
        />
      ))}
    </div>
  );
}
