import { useState } from 'react';
import { WorkoutPlan, WorkoutDay, Exercise } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, Circle } from 'lucide-react';
import { format } from 'date-fns';

interface WorkoutViewProps {
  plan: WorkoutPlan;
  onCompleteExercise: (weekId: string, dayId: string, exerciseId: string, weight?: string) => void;
  completedExercises: Set<string>;
}

export function WorkoutView({ plan, onCompleteExercise, completedExercises }: WorkoutViewProps) {
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [selectedDay, setSelectedDay] = useState(0);
  const [exerciseWeights, setExerciseWeights] = useState<Record<string, string>>({});

  const currentWeek = plan.weeks[selectedWeek];
  const currentDay = currentWeek?.days[selectedDay];

  const handleToggleExercise = (exerciseId: string) => {
    const weight = exerciseWeights[exerciseId];
    onCompleteExercise(currentWeek.id, currentDay.id, exerciseId, weight);
  };

  const handleWeightChange = (exerciseId: string, weight: string) => {
    setExerciseWeights((prev) => ({ ...prev, [exerciseId]: weight }));
  };

  if (!currentWeek || !currentDay) {
    return <div>No workout plan assigned</div>;
  }

  const completedCount = currentDay.exercises.filter((ex) =>
    completedExercises.has(ex.id)
  ).length;
  const totalCount = currentDay.exercises.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{plan.name}</CardTitle>
          <CardDescription>Week {currentWeek.weekNumber}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {currentWeek.days.map((day, idx) => (
              <Button
                key={day.id}
                variant={selectedDay === idx ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedDay(idx)}
              >
                {day.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">{currentDay.name}</CardTitle>
            <div className="text-sm text-muted-foreground">
              {completedCount}/{totalCount} completed
            </div>
          </div>
          <div className="w-full bg-secondary rounded-full h-2 mt-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {currentDay.exercises.map((exercise) => {
            const isCompleted = completedExercises.has(exercise.id);
            return (
              <Card
                key={exercise.id}
                className={isCompleted ? 'bg-accent border-primary' : ''}
              >
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold">{exercise.name}</h4>
                        <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                          <span>{exercise.sets} sets</span>
                          {exercise.reps && <span>{exercise.reps} reps</span>}
                          {exercise.time && <span>{exercise.time}</span>}
                          {exercise.weight && <span>{exercise.weight}</span>}
                        </div>
                        {exercise.notes && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {exercise.notes}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleToggleExercise(exercise.id)}
                        className="ml-4"
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-6 h-6 text-primary" />
                        ) : (
                          <Circle className="w-6 h-6 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                    {!isCompleted && (
                      <div className="flex gap-2">
                        <Input
                          placeholder="Weight used (optional)"
                          value={exerciseWeights[exercise.id] || ''}
                          onChange={(e) =>
                            handleWeightChange(exercise.id, e.target.value)
                          }
                          className="text-sm"
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {currentDay.exercises.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No exercises scheduled for today
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
