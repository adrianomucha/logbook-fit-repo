import { Client, WorkoutPlan } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { WeeklyActivity } from '@/lib/client-activity';
import { formatDistanceToNow, getDay } from 'date-fns';

interface WeeklyActivityCardProps {
  client: Client;
  plan: WorkoutPlan | undefined;
  weeklyActivity: WeeklyActivity;
}

function getProgressLabel(completed: number, scheduled: number): { text: string; color: string } {
  if (scheduled === 0) return { text: 'No plan assigned', color: 'text-muted-foreground' };
  if (completed >= scheduled) return { text: 'Week complete', color: 'text-success' };

  const remaining = scheduled - completed;
  // 0=Sun, 1=Mon ... 6=Sat
  const dayOfWeek = getDay(new Date());
  // Days left in the week (Sun=0 means 0 days left, Sat=6 means 6 days left if week starts Sun)
  const daysLeftInWeek = 6 - dayOfWeek;

  if (remaining > daysLeftInWeek) {
    return { text: `${remaining} remaining · Behind schedule`, color: 'text-warning' };
  }
  return { text: `${remaining} remaining this week`, color: 'text-muted-foreground' };
}

export function WeeklyActivityCard({ client, plan, weeklyActivity }: WeeklyActivityCardProps) {
  const { completed, scheduled, lastWorkout } = weeklyActivity;
  const percentage = scheduled > 0 ? (completed / scheduled) * 100 : 0;
  const progressLabel = getProgressLabel(completed, scheduled);

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
            <p className={`text-xs mt-1.5 ${progressLabel.color}`}>
              {progressLabel.text}
            </p>
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
