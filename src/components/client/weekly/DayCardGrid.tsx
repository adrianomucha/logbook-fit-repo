import { WeekDayInfo } from '@/lib/workout-week-helpers';
import { DayCard } from './DayCard';
import { Card, CardContent } from '@/components/ui/card';

interface DayCardGridProps {
  days: WeekDayInfo[];
  onDayClick: (day: WeekDayInfo) => void;
}

export function DayCardGrid({ days, onDayClick }: DayCardGridProps) {
  return (
    // rounded-[18px] = the day rows' 10px radius + this card's 8px padding,
    // so the nested corners stay concentric
    <Card className="border-border/60 shadow-none rounded-[18px]">
      <CardContent className="p-2 sm:p-3">
        <div className="divide-y divide-border/40">
          {days.map((day) => (
            <DayCard
              key={day.workoutDay.id}
              day={day}
              onClick={() => onDayClick(day)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
