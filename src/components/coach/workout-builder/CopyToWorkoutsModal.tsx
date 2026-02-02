import { useState, useEffect } from 'react';
import { Exercise, WorkoutPlan } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { X } from 'lucide-react';

interface CopyToWorkoutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  exercise: Exercise;
  plan: WorkoutPlan;
  currentWeekIdx: number;
  currentDayIdx: number;
  onCopy: (targetWorkouts: { weekIdx: number; dayIdx: number }[]) => void;
}

export function CopyToWorkoutsModal({
  isOpen,
  onClose,
  exercise,
  plan,
  currentWeekIdx,
  currentDayIdx,
  onCopy,
}: CopyToWorkoutsModalProps) {
  const [selectedWorkouts, setSelectedWorkouts] = useState<
    { weekIdx: number; dayIdx: number }[]
  >([]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedWorkouts([]);
    }
  }, [isOpen]);

  const handleToggle = (weekIdx: number, dayIdx: number) => {
    const key = `${weekIdx}-${dayIdx}`;
    const exists = selectedWorkouts.some(
      (w) => w.weekIdx === weekIdx && w.dayIdx === dayIdx
    );

    if (exists) {
      setSelectedWorkouts(
        selectedWorkouts.filter(
          (w) => !(w.weekIdx === weekIdx && w.dayIdx === dayIdx)
        )
      );
    } else {
      setSelectedWorkouts([...selectedWorkouts, { weekIdx, dayIdx }]);
    }
  };

  const handleCopy = () => {
    onCopy(selectedWorkouts);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <CardContent className="pt-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              Copy "{exercise.name}" to:
            </h3>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Workout List */}
          <div className="overflow-y-auto max-h-[60vh] space-y-4 mb-4">
            {plan.weeks.map((week, weekIdx) => {
              // Get all non-rest workouts that aren't the current one
              const availableWorkouts = week.days.filter((day, dayIdx) => {
                const isCurrent =
                  weekIdx === currentWeekIdx && dayIdx === currentDayIdx;
                return !day.isRestDay && !isCurrent;
              });

              if (availableWorkouts.length === 0) return null;

              return (
                <div key={week.id} className="space-y-2">
                  <h4 className="text-sm font-semibold text-muted-foreground">
                    Week {week.weekNumber}
                  </h4>
                  <div className="space-y-2">
                    {week.days.map((day, dayIdx) => {
                      const isCurrent =
                        weekIdx === currentWeekIdx && dayIdx === currentDayIdx;
                      if (day.isRestDay || isCurrent) return null;

                      const isSelected = selectedWorkouts.some(
                        (w) => w.weekIdx === weekIdx && w.dayIdx === dayIdx
                      );

                      return (
                        <div
                          key={day.id}
                          className="flex items-center gap-3 p-2 hover:bg-muted rounded-md cursor-pointer"
                          onClick={() => handleToggle(weekIdx, dayIdx)}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleToggle(weekIdx, dayIdx)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{day.name}</p>
                            {isCurrent && (
                              <p className="text-xs text-muted-foreground">
                                (current workout)
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {day.exercises.length} exercises
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleCopy} disabled={selectedWorkouts.length === 0}>
              Copy to {selectedWorkouts.length} {selectedWorkouts.length === 1 ? 'Workout' : 'Workouts'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
