import { WorkoutPlan } from '@/types';

interface WeekHeaderProps {
  plan: WorkoutPlan;
  currentWeek: number;
}

export function WeekHeader({ plan, currentWeek }: WeekHeaderProps) {
  const totalWeeks = plan.durationWeeks || plan.weeks.length;

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {plan.emoji && (
          <span className="text-3xl" role="img" aria-label={`${plan.name} icon`}>
            {plan.emoji}
          </span>
        )}
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{plan.name}</h2>
          <p className="text-sm text-muted-foreground">
            Week {currentWeek} of {totalWeeks}
          </p>
        </div>
      </div>
    </div>
  );
}
