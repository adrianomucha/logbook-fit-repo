import { useState } from 'react';
import { ChevronUp, ChevronDown, Copy, Trash2 } from 'lucide-react';
import type { WorkoutWeek, WorkoutDay } from '../../types';
import { WorkoutRow } from './WorkoutRow';
import { duplicateDay } from '../../lib/workout-helpers';
import { Modal } from '../ui/Modal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface WeekCardProps {
  week: WorkoutWeek;
  weekIndex: number;
  totalWeeks: number;
  onUpdateWeek: (week: WorkoutWeek) => void;
  onDeleteWeek: () => void;
  onDuplicateWeek: () => void;
  onMoveWeek: (direction: 'up' | 'down') => void;
  onCopyToNextWeek?: () => void;
}

export function WeekCard({
  week,
  weekIndex,
  totalWeeks,
  onUpdateWeek,
  onDeleteWeek,
  onDuplicateWeek,
  onMoveWeek,
  onCopyToNextWeek,
}: WeekCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleUpdateDay = (dayIndex: number, updatedDay: WorkoutDay) => {
    const updatedWeek = {
      ...week,
      days: week.days.map((d, idx) => (idx === dayIndex ? updatedDay : d)),
    };
    onUpdateWeek(updatedWeek);
  };

  const handleDeleteDay = (dayIndex: number) => {
    if (week.days.length <= 1) {
      alert('Cannot delete the last workout. Weeks must have at least one day.');
      return;
    }

    const updatedWeek = {
      ...week,
      days: week.days.filter((_, idx) => idx !== dayIndex),
    };
    onUpdateWeek(updatedWeek);
  };

  const handleDuplicateDay = (dayIndex: number) => {
    const dayToDuplicate = week.days[dayIndex];
    const newDay = duplicateDay(dayToDuplicate);

    const updatedWeek = {
      ...week,
      days: [
        ...week.days.slice(0, dayIndex + 1),
        newDay,
        ...week.days.slice(dayIndex + 1),
      ],
    };
    onUpdateWeek(updatedWeek);
  };

  const handleMoveDay = (fromIndex: number, toIndex: number) => {
    const newDays = [...week.days];
    const [movedDay] = newDays.splice(fromIndex, 1);
    newDays.splice(toIndex, 0, movedDay);

    const updatedWeek = {
      ...week,
      days: newDays,
    };
    onUpdateWeek(updatedWeek);
  };

  const handleDeleteWeek = () => {
    if (totalWeeks <= 1) {
      alert('Cannot delete the last week. Plans must have at least one week.');
      return;
    }
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    setShowDeleteConfirm(false);
    onDeleteWeek();
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg">Week {week.weekNumber}</CardTitle>
          <div className="flex gap-2">
            {weekIndex > 0 && (
              <button
                onClick={() => onMoveWeek('up')}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                title="Move week up"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
            )}
            {weekIndex < totalWeeks - 1 && (
              <button
                onClick={() => onMoveWeek('down')}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                title="Move week down"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onDuplicateWeek}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
              title="Duplicate week"
            >
              <Copy className="w-4 h-4" />
            </button>
            {totalWeeks > 1 && (
              <button
                onClick={handleDeleteWeek}
                className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                title="Delete week"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-2">
            {week.days.map((day, dayIdx) => (
              <WorkoutRow
                key={day.id}
                day={day}
                dayIndex={dayIdx}
                onUpdateDay={(updatedDay) => handleUpdateDay(dayIdx, updatedDay)}
                onDeleteDay={() => handleDeleteDay(dayIdx)}
                onDuplicateDay={() => handleDuplicateDay(dayIdx)}
                onMoveDay={handleMoveDay}
              />
            ))}
          </div>

          {/* Copy to Next Week button */}
          {weekIndex < totalWeeks - 1 && onCopyToNextWeek && (
            <button
              onClick={onCopyToNextWeek}
              className="mt-4 w-full px-4 py-2 text-sm font-medium text-foreground bg-background border border-input rounded-md hover:bg-muted transition-colors"
            >
              Copy to Week {week.weekNumber + 1}
            </button>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <Modal
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          title="Delete Week?"
          footer={
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-foreground bg-background border border-input rounded-md hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          }
        >
          <p className="text-muted-foreground">
            Are you sure you want to delete Week {week.weekNumber}? This cannot be undone.
          </p>
        </Modal>
      )}
    </>
  );
}
