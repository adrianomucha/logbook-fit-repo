import { useState, useEffect, useMemo } from 'react';
import { Exercise, WorkoutPlan } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Copy } from 'lucide-react';

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

  // Check if there are any available workouts to copy to
  const hasAvailableWorkouts = useMemo(() => {
    return plan.weeks.some((week, weekIdx) =>
      week.days.some((day, dayIdx) => {
        const isCurrent = weekIdx === currentWeekIdx && dayIdx === currentDayIdx;
        return !day.isRestDay && !isCurrent;
      })
    );
  }, [plan.weeks, currentWeekIdx, currentDayIdx]);

  const handleToggle = (weekIdx: number, dayIdx: number) => {
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

  if (!hasAvailableWorkouts) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title={`Copy "${exercise.name}"`} maxWidth="md">
        <div className="text-center py-8">
          <Copy className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Workouts Available</h3>
          <p className="text-muted-foreground">
            There are no other workouts to copy this exercise to.
          </p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Copy "${exercise.name}" to:`}
      maxWidth="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCopy} disabled={selectedWorkouts.length === 0}>
            Copy to {selectedWorkouts.length}{' '}
            {selectedWorkouts.length === 1 ? 'Workout' : 'Workouts'}
          </Button>
        </div>
      }
    >
      <div className="overflow-y-auto max-h-[60vh] space-y-4">
        {plan.weeks.map((week, weekIdx) => {
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
              <div className="space-y-2" role="group" aria-label={`Week ${week.weekNumber} workouts`}>
                {week.days.map((day, dayIdx) => {
                  const isCurrent =
                    weekIdx === currentWeekIdx && dayIdx === currentDayIdx;
                  if (day.isRestDay || isCurrent) return null;

                  const isSelected = selectedWorkouts.some(
                    (w) => w.weekIdx === weekIdx && w.dayIdx === dayIdx
                  );

                  return (
                    <label
                      key={day.id}
                      className="flex items-center gap-3 p-2 hover:bg-muted rounded-md cursor-pointer"
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggle(weekIdx, dayIdx)}
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium">{day.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {day.exercises.length} exercises
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
