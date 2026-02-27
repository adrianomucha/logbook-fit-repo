import { CompletedWorkout, WorkoutPlan } from '@/types';
import { getRecentWorkouts } from '@/lib/checkin-helpers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dumbbell, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

interface WeekSummaryCardProps {
  clientId: string;
  completedWorkouts: CompletedWorkout[];
  plan?: WorkoutPlan;
}

export function WeekSummaryCard({ clientId, completedWorkouts, plan }: WeekSummaryCardProps) {
  const recentWorkouts = getRecentWorkouts(clientId, completedWorkouts, 7);
  const targetPerWeek = plan?.workoutsPerWeek || 0;

  const getWorkoutName = (dayId: string): string => {
    if (!plan) return 'Workout';
    for (const week of plan.weeks) {
      const day = week.days.find(d => d.id === dayId);
      if (day) return day.name;
    }
    return 'Workout';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Dumbbell className="w-4 h-4" />
          This Week's Workouts
        </CardTitle>
        {targetPerWeek > 0 && (
          <p className="text-xs text-muted-foreground">
            {recentWorkouts.length} of {targetPerWeek} workouts completed
          </p>
        )}
      </CardHeader>
      <CardContent>
        {recentWorkouts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No workouts completed this week
          </p>
        ) : (
          <div className="space-y-2">
            {recentWorkouts.map((workout) => (
              <div
                key={workout.id}
                className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
              >
                <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{getWorkoutName(workout.dayId)}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(workout.completedAt), 'EEEE, MMM d')}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground shrink-0">
                  {workout.exercises.length} {workout.exercises.length === 1 ? 'exercise' : 'exercises'}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
