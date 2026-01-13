import { useState } from 'react';
import { WorkoutPlan, WorkoutWeek, WorkoutDay, Exercise } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2 } from 'lucide-react';

interface PlanBuilderProps {
  plan: WorkoutPlan;
  onUpdatePlan: (plan: WorkoutPlan) => void;
}

export function PlanBuilder({ plan, onUpdatePlan }: PlanBuilderProps) {
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [selectedDay, setSelectedDay] = useState(0);

  const currentWeek = plan.weeks[selectedWeek];
  const currentDay = currentWeek?.days[selectedDay];

  const addExercise = () => {
    if (!currentDay) return;

    const newExercise: Exercise = {
      id: `ex-${Date.now()}`,
      name: '',
      sets: 3,
      reps: '10'
    };

    const updatedPlan = { ...plan };
    updatedPlan.weeks[selectedWeek].days[selectedDay].exercises.push(newExercise);
    onUpdatePlan(updatedPlan);
  };

  const updateExercise = (exerciseIndex: number, field: keyof Exercise, value: any) => {
    const updatedPlan = { ...plan };
    const exercise = updatedPlan.weeks[selectedWeek].days[selectedDay].exercises[exerciseIndex];
    (exercise as any)[field] = value;
    onUpdatePlan(updatedPlan);
  };

  const deleteExercise = (exerciseIndex: number) => {
    const updatedPlan = { ...plan };
    updatedPlan.weeks[selectedWeek].days[selectedDay].exercises.splice(exerciseIndex, 1);
    onUpdatePlan(updatedPlan);
  };

  const addDay = () => {
    const newDay: WorkoutDay = {
      id: `day-${Date.now()}`,
      name: `Day ${currentWeek.days.length + 1}`,
      exercises: []
    };

    const updatedPlan = { ...plan };
    updatedPlan.weeks[selectedWeek].days.push(newDay);
    onUpdatePlan(updatedPlan);
  };

  if (!currentWeek || !currentDay) {
    return <div>No workout plan available</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{plan.name}</CardTitle>
          <Button size="sm" onClick={addDay}>
            <Plus className="w-4 h-4 mr-1" />
            Add Day
          </Button>
        </div>
        {plan.description && (
          <p className="text-sm text-muted-foreground">{plan.description}</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
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

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{currentDay.name}</h3>
              <Button size="sm" onClick={addExercise}>
                <Plus className="w-4 h-4 mr-1" />
                Add Exercise
              </Button>
            </div>

            {currentDay.exercises.map((exercise, idx) => (
              <Card key={exercise.id}>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Exercise name"
                        value={exercise.name}
                        onChange={(e) => updateExercise(idx, 'name', e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteExercise(idx)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-xs text-muted-foreground">Sets</label>
                        <Input
                          type="number"
                          value={exercise.sets}
                          onChange={(e) => updateExercise(idx, 'sets', parseInt(e.target.value))}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Reps</label>
                        <Input
                          placeholder="10 or 8-10"
                          value={exercise.reps || ''}
                          onChange={(e) => updateExercise(idx, 'reps', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Weight</label>
                        <Input
                          placeholder="e.g. 135 lbs"
                          value={exercise.weight || ''}
                          onChange={(e) => updateExercise(idx, 'weight', e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Notes</label>
                      <Textarea
                        placeholder="Exercise notes..."
                        value={exercise.notes || ''}
                        onChange={(e) => updateExercise(idx, 'notes', e.target.value)}
                        rows={2}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {currentDay.exercises.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No exercises yet. Click "Add Exercise" to get started.
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
