import { useState } from 'react';
import { WorkoutPlan, WorkoutWeek, WorkoutDay, Exercise } from '@/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ExerciseSelector } from './ExerciseSelector';
import { Plus, Trash2, Copy, Library } from 'lucide-react';

interface PlanBuilderProps {
  plan: WorkoutPlan;
  onUpdatePlan: (plan: WorkoutPlan) => void;
}

export function PlanBuilder({ plan, onUpdatePlan }: PlanBuilderProps) {
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [selectedDay, setSelectedDay] = useState(0);
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);

  const currentWeek = plan.weeks[selectedWeek];
  const currentDay = currentWeek?.days[selectedDay];

  const addExercise = () => {
    setShowExerciseSelector(true);
  };

  const handleAddExerciseFromLibrary = (exercise: Exercise) => {
    if (!currentDay) return;

    const updatedPlan = { ...plan };
    updatedPlan.weeks[selectedWeek].days[selectedDay].exercises.push(exercise);
    onUpdatePlan(updatedPlan);
  };

  const addBlankExercise = () => {
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

  const duplicateExercise = (exerciseIndex: number) => {
    const exerciseToCopy = currentDay.exercises[exerciseIndex];
    const newExercise: Exercise = {
      ...exerciseToCopy,
      id: `ex-${Date.now()}-${Math.random()}`
    };

    const updatedPlan = { ...plan };
    updatedPlan.weeks[selectedWeek].days[selectedDay].exercises.splice(
      exerciseIndex + 1,
      0,
      newExercise
    );
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
    setSelectedDay(updatedPlan.weeks[selectedWeek].days.length - 1);
  };

  const deleteDay = (dayIndex: number) => {
    if (currentWeek.days.length <= 1) {
      alert('Cannot delete the last day. Plans must have at least one day.');
      return;
    }

    const updatedPlan = { ...plan };
    updatedPlan.weeks[selectedWeek].days.splice(dayIndex, 1);
    onUpdatePlan(updatedPlan);

    if (selectedDay >= updatedPlan.weeks[selectedWeek].days.length) {
      setSelectedDay(updatedPlan.weeks[selectedWeek].days.length - 1);
    }
  };

  const duplicateDay = (dayIndex: number) => {
    const dayToCopy = currentWeek.days[dayIndex];
    const newDay: WorkoutDay = {
      id: `day-${Date.now()}`,
      name: `${dayToCopy.name} (Copy)`,
      exercises: dayToCopy.exercises.map(ex => ({
        ...ex,
        id: `ex-${Date.now()}-${Math.random()}`
      }))
    };

    const updatedPlan = { ...plan };
    updatedPlan.weeks[selectedWeek].days.splice(dayIndex + 1, 0, newDay);
    onUpdatePlan(updatedPlan);
    setSelectedDay(dayIndex + 1);
  };

  const updateDayName = (name: string) => {
    const updatedPlan = { ...plan };
    updatedPlan.weeks[selectedWeek].days[selectedDay].name = name;
    onUpdatePlan(updatedPlan);
  };

  const updatePlanName = (name: string) => {
    const updatedPlan = { ...plan, name, updatedAt: new Date().toISOString() };
    onUpdatePlan(updatedPlan);
  };

  const updatePlanDescription = (description: string) => {
    const updatedPlan = { ...plan, description, updatedAt: new Date().toISOString() };
    onUpdatePlan(updatedPlan);
  };

  if (!currentWeek || !currentDay) {
    return <div>No workout plan available</div>;
  }

  return (
    <>
    <Card>
      <CardHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            {plan.emoji && <span className="text-3xl">{plan.emoji}</span>}
            <div className="flex-1">
              <Input
                value={plan.name}
                onChange={(e) => updatePlanName(e.target.value)}
                className="text-xl font-bold"
                placeholder="Plan name"
              />
              {plan.description && (
                <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
              )}
            </div>
            <Button size="sm" onClick={addDay}>
              <Plus className="w-4 h-4 mr-1" />
              Add Day
            </Button>
          </div>
          {(plan.durationWeeks || plan.workoutsPerWeek) && (
            <div className="flex gap-2">
              {plan.durationWeeks && (
                <Badge variant="secondary">
                  {plan.durationWeeks} {plan.durationWeeks === 1 ? 'week' : 'weeks'}
                </Badge>
              )}
              {plan.workoutsPerWeek && (
                <Badge variant="secondary">
                  {plan.workoutsPerWeek} {plan.workoutsPerWeek === 1 ? 'workout' : 'workouts'}/week
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {currentWeek.days.map((day, idx) => (
              <div key={day.id} className="flex gap-1">
                <Button
                  variant={selectedDay === idx ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedDay(idx)}
                  className={day.isRestDay ? 'opacity-60' : ''}
                >
                  {day.name}
                </Button>
                {selectedDay === idx && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => duplicateDay(idx)}
                      title="Duplicate day"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                    {currentWeek.days.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => deleteDay(idx)}
                        title="Delete day"
                      >
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Input
                value={currentDay.name}
                onChange={(e) => updateDayName(e.target.value)}
                className="font-semibold max-w-xs"
                placeholder="Day name"
              />
              {!currentDay.isRestDay && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={addBlankExercise}>
                    <Plus className="w-4 h-4 mr-1" />
                    Blank
                  </Button>
                  <Button size="sm" onClick={addExercise}>
                    <Library className="w-4 h-4 mr-1" />
                    From Library
                  </Button>
                </div>
              )}
            </div>

            {currentDay.isRestDay ? (
              <div className="text-center py-12 space-y-2">
                <div className="text-4xl">😴</div>
                <p className="text-lg font-medium text-gray-700">Rest Day</p>
                <p className="text-sm text-gray-500">No exercises scheduled for this day</p>
              </div>
            ) : (
              <>
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
                        onClick={() => duplicateExercise(idx)}
                        title="Duplicate exercise"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteExercise(idx)}
                        title="Delete exercise"
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
                    No exercises yet. Click "From Library" to add from the exercise library.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>

    {showExerciseSelector && (
      <ExerciseSelector
        onSelect={handleAddExerciseFromLibrary}
        onClose={() => setShowExerciseSelector(false)}
      />
    )}
  </>
  );
}
