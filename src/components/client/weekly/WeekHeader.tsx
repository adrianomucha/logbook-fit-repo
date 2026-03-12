import { WorkoutPlan } from '@/types';

interface WeekHeaderProps {
  plan: WorkoutPlan;
  currentWeek: number;
}

export function WeekHeader({ plan, currentWeek }: WeekHeaderProps) {
  const totalWeeks = plan.durationWeeks || plan.weeks.length;

  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground font-medium mb-1">
        Week {currentWeek} of {totalWeeks}
      </p>
      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
        {plan.name}
      </h2>
    </div>
  );
}
