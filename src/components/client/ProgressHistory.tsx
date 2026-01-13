import { CompletedWorkout, WorkoutPlan } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { Calendar, CheckCircle } from 'lucide-react';

interface ProgressHistoryProps {
  completedWorkouts: CompletedWorkout[];
  plans: WorkoutPlan[];
}

export function ProgressHistory({ completedWorkouts, plans }: ProgressHistoryProps) {
  const sortedWorkouts = [...completedWorkouts].sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  );

  const getDayName = (workout: CompletedWorkout) => {
    const plan = plans.find((p) => p.id === workout.planId);
    if (!plan) return 'Unknown';
    const week = plan.weeks.find((w) => w.id === workout.weekId);
    if (!week) return 'Unknown';
    const day = week.days.find((d) => d.id === workout.dayId);
    return day?.name || 'Unknown';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Workout History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {sortedWorkouts.map((workout) => (
          <div
            key={workout.id}
            className="p-3 rounded-md border border-border"
          >
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium">{getDayName(workout)}</h4>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(workout.completedAt), 'MMM d, yyyy • h:mm a')}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span className="text-xs text-muted-foreground">
                    {workout.exercises.filter((e) => e.completed).length} exercises
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}

        {sortedWorkouts.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No completed workouts yet. Get started today!
          </div>
        )}
      </CardContent>
    </Card>
  );
}
