import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { WorkoutCompletion, WorkoutPlan, Client } from '@/types';
import { getCurrentWeekNumber } from '@/lib/workout-week-helpers';
import { TrendingUp, TrendingDown, Minus, Flame, Target, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  startOfWeek,
  endOfWeek,
  subWeeks,
  isWithinInterval,
  parseISO,
  differenceInDays,
} from 'date-fns';

interface ProgressSummaryRowProps {
  client: Client;
  plan: WorkoutPlan;
  completions: WorkoutCompletion[];
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendText?: string;
  accentColor?: string;
}

function StatCard({ icon, label, value, subtext, trend, trendText, accentColor = 'text-primary' }: StatCardProps) {
  return (
    <Card className="flex-1 min-w-[100px]">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start gap-2 sm:gap-3">
          <div className={cn('p-1.5 sm:p-2 rounded-lg bg-muted shrink-0', accentColor)}>
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            <p className="text-lg sm:text-xl font-bold truncate">{value}</p>
            {subtext && (
              <p className="text-xs text-muted-foreground truncate">{subtext}</p>
            )}
            {trend && trendText && (
              <div className="flex items-center gap-1 mt-0.5">
                {trend === 'up' && <TrendingUp className="w-3 h-3 text-green-500" />}
                {trend === 'down' && <TrendingDown className="w-3 h-3 text-red-500" />}
                {trend === 'neutral' && <Minus className="w-3 h-3 text-muted-foreground" />}
                <span className={cn(
                  'text-xs',
                  trend === 'up' && 'text-green-600',
                  trend === 'down' && 'text-red-600',
                  trend === 'neutral' && 'text-muted-foreground'
                )}>
                  {trendText}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProgressSummaryRow({ client, plan, completions }: ProgressSummaryRowProps) {
  const stats = useMemo(() => {
    const now = new Date();
    const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
    const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });

    // Calculate this week's completed workouts
    const thisWeekCompleted = completions.filter((c) => {
      if (!c.completedAt || c.status !== 'COMPLETED') return false;
      const date = parseISO(c.completedAt);
      return isWithinInterval(date, { start: thisWeekStart, end: thisWeekEnd });
    }).length;

    // Calculate last week's completed workouts
    const lastWeekCompleted = completions.filter((c) => {
      if (!c.completedAt || c.status !== 'COMPLETED') return false;
      const date = parseISO(c.completedAt);
      return isWithinInterval(date, { start: lastWeekStart, end: lastWeekEnd });
    }).length;

    // Target workouts per week
    const targetPerWeek = plan.workoutsPerWeek || 3;

    // Adherence rate (this week so far)
    const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay(); // 1-7, Monday = 1
    const expectedByNow = Math.min(Math.floor((dayOfWeek / 7) * targetPerWeek) + 1, targetPerWeek);
    const adherenceRate = Math.round((thisWeekCompleted / Math.max(expectedByNow, 1)) * 100);

    // Calculate streak (consecutive completed workouts)
    const sortedCompletions = completions
      .filter((c) => c.status === 'COMPLETED' && c.completedAt)
      .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());

    let streak = 0;
    if (sortedCompletions.length > 0) {
      // Count consecutive workout days
      let lastDate = now;
      for (const completion of sortedCompletions) {
        const completionDate = parseISO(completion.completedAt!);
        const daysDiff = differenceInDays(lastDate, completionDate);

        // Allow 1-2 day gaps (rest days are expected)
        if (daysDiff <= 3) {
          streak++;
          lastDate = completionDate;
        } else {
          break;
        }
      }
    }

    // Calculate weekly volume trend
    const calculateVolume = (comps: WorkoutCompletion[]) => {
      // Simple volume = sum of (sets completed)
      // More advanced would include weight × reps × sets
      return comps.reduce((sum, c) => sum + (c.exercisesDone * 3), 0); // Rough estimate: 3 sets per exercise
    };

    const thisWeekVolume = calculateVolume(
      completions.filter((c) => {
        if (!c.completedAt || c.status !== 'COMPLETED') return false;
        const date = parseISO(c.completedAt);
        return isWithinInterval(date, { start: thisWeekStart, end: thisWeekEnd });
      })
    );

    const lastWeekVolume = calculateVolume(
      completions.filter((c) => {
        if (!c.completedAt || c.status !== 'COMPLETED') return false;
        const date = parseISO(c.completedAt);
        return isWithinInterval(date, { start: lastWeekStart, end: lastWeekEnd });
      })
    );

    const volumeChange = lastWeekVolume > 0
      ? Math.round(((thisWeekVolume - lastWeekVolume) / lastWeekVolume) * 100)
      : 0;

    return {
      thisWeekCompleted,
      targetPerWeek,
      adherenceRate,
      streak,
      volumeChange,
      lastWeekCompleted,
    };
  }, [completions, plan]);

  // Determine trend direction
  const volumeTrend: 'up' | 'down' | 'neutral' =
    stats.volumeChange > 5 ? 'up' : stats.volumeChange < -5 ? 'down' : 'neutral';

  const adherenceTrend: 'up' | 'down' | 'neutral' =
    stats.thisWeekCompleted > stats.lastWeekCompleted
      ? 'up'
      : stats.thisWeekCompleted < stats.lastWeekCompleted
      ? 'down'
      : 'neutral';

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      <StatCard
        icon={<Target className="w-4 h-4 sm:w-5 sm:h-5" />}
        label="This Week"
        value={`${stats.thisWeekCompleted}/${stats.targetPerWeek}`}
        subtext="workouts"
        trend={adherenceTrend}
        trendText={adherenceTrend === 'up' ? 'On track' : adherenceTrend === 'down' ? 'Behind' : 'Same pace'}
        accentColor="text-blue-600"
      />
      <StatCard
        icon={<Flame className="w-4 h-4 sm:w-5 sm:h-5" />}
        label="Streak"
        value={`${stats.streak}`}
        subtext={stats.streak === 1 ? 'workout' : 'workouts'}
        accentColor="text-orange-500"
      />
      <StatCard
        icon={<Activity className="w-4 h-4 sm:w-5 sm:h-5" />}
        label="Volume"
        value={stats.volumeChange === 0 ? '—' : `${stats.volumeChange > 0 ? '+' : ''}${stats.volumeChange}%`}
        subtext="vs last week"
        trend={volumeTrend}
        trendText={volumeTrend === 'up' ? 'Increasing' : volumeTrend === 'down' ? 'Decreasing' : 'Stable'}
        accentColor="text-green-600"
      />
    </div>
  );
}
