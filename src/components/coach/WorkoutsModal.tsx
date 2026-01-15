import { CompletedWorkout, WorkoutPlan } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Dumbbell } from 'lucide-react';
import { format } from 'date-fns';

interface WorkoutsModalProps {
  workouts: CompletedWorkout[];
  plan?: WorkoutPlan;
  clientName: string;
  onClose: () => void;
}

export function WorkoutsModal({ workouts, plan, clientName, onClose }: WorkoutsModalProps) {
  const sortedWorkouts = [...workouts].sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Workout History - {clientName}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {sortedWorkouts.length} workouts completed
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sortedWorkouts.length > 0 ? (
              sortedWorkouts.map((workout) => {
                const day = plan?.weeks
                  .find((w) => w.id === workout.weekId)
                  ?.days.find((d) => d.id === workout.dayId);

                return (
                  <Card key={workout.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Dumbbell className="w-4 h-4 text-muted-foreground" />
                          <CardTitle className="text-base">{day?.name || 'Workout'}</CardTitle>
                        </div>
                        <Badge variant="secondary">
                          {format(new Date(workout.completedAt), 'MMM d, yyyy')}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {workout.exercises.map((exercise, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <span className="font-medium">{exercise.name}</span>
                            <div className="flex gap-2 text-muted-foreground">
                              <span>{exercise.sets} sets</span>
                              {exercise.reps && <span>× {exercise.reps}</span>}
                              {exercise.weight && (
                                <span className="font-medium text-foreground">
                                  @ {exercise.weight}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-3">
                        {workout.exercises.length} exercises completed
                      </p>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <div className="text-center py-12">
                <Dumbbell className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No workouts completed yet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
