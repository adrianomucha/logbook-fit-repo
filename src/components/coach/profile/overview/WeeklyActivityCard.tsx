import { Client, WorkoutPlan } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { WeeklyActivity } from '@/lib/client-activity';
import { formatDistanceToNow } from 'date-fns';

interface WeeklyActivityCardProps {
  client: Client;
  plan: WorkoutPlan | undefined;
  weeklyActivity: WeeklyActivity;
}

export function WeeklyActivityCard({ client, plan, weeklyActivity }: WeeklyActivityCardProps) {
  const { completed, scheduled, lastWorkout } = weeklyActivity;
  const percentage = scheduled > 0 ? (completed / scheduled) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">This Week's Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Progress bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold">
                {completed}/{scheduled}
              </span>
              <span className="text-sm text-muted-foreground">workouts completed</span>
            </div>
            <Progress value={percentage} className="h-2" />
          </div>

          {/* Last completed workout */}
          {lastWorkout && plan && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-1">Last completed</p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {plan.weeks
                    .find(w => w.id === lastWorkout.weekId)
                    ?.days.find(d => d.id === lastWorkout.dayId)?.name || 'Workout'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(lastWorkout.completedAt), { addSuffix: true })}
                </span>
              </div>
            </div>
          )}

          {!lastWorkout && scheduled > 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              No workouts completed this week yet
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
