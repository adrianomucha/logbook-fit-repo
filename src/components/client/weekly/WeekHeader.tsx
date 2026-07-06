import { WorkoutPlan } from '@/types';

interface WeekHeaderProps {
  plan: WorkoutPlan;
  currentWeek: number;
}

export function WeekHeader({ plan, currentWeek }: WeekHeaderProps) {
  const totalWeeks = plan.durationWeeks || plan.weeks.length;

  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground mb-1 tabular-nums">
        Week {currentWeek} of {totalWeeks}
      </p>
      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
        {plan.name}
      </h2>
    </div>
  );
}
