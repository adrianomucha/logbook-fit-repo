import { CompletedWorkout, WorkoutPlan } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dumbbell } from 'lucide-react';
import { format } from 'date-fns';
import { Modal } from '@/components/ui/Modal';

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
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Workout History – ${clientName}`}
      maxWidth="lg"
    >
      <p className="text-sm text-muted-foreground -mt-2 mb-4">
        {sortedWorkouts.length} workouts completed
      </p>
      <div className="space-y-4">
        {sortedWorkouts.length > 0 ? (
          sortedWorkouts.map((workout) => {
            const day = plan?.weeks
              .find((w) => w.id === workout.weekId)
              ?.days.find((d) => d.id === workout.dayId);

            return (
              <Card key={workout.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Dumbbell className="w-4 h-4 text-muted-foreground shrink-0" />
                      <CardTitle className="text-base truncate">{day?.name || 'Workout'}</CardTitle>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {format(new Date(workout.completedAt), 'MMM d, yyyy')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {workout.exercises.map((exercise, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm gap-3">
                        <span className="font-medium truncate min-w-0 flex-1">{exercise.name}</span>
                        <div className="flex gap-2 text-muted-foreground shrink-0">
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
    </Modal>
  );
}
