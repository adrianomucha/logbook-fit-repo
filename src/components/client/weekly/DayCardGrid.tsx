import { WeekDayInfo } from '@/lib/workout-week-helpers';
import { DayCard } from './DayCard';
import { Card, CardContent } from '@/components/ui/card';

interface DayCardGridProps {
  days: WeekDayInfo[];
  onDayClick: (day: WeekDayInfo) => void;
}

export function DayCardGrid({ days, onDayClick }: DayCardGridProps) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-2 sm:p-3">
        <div className="divide-y divide-border/40">
          {days.map((day) => (
            <DayCard
              key={day.date.toISOString()}
              day={day}
              onClick={() => onDayClick(day)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
