import { Copy, Trash2, GripVertical } from 'lucide-react';
import type { WorkoutDay } from '../../types';

interface WorkoutRowProps {
  day: WorkoutDay;
  dayIndex: number;
  onUpdateDay: (day: WorkoutDay) => void;
  onDeleteDay: () => void;
  onDuplicateDay: () => void;
  onMoveDay: (fromIndex: number, toIndex: number) => void;
}

export function WorkoutRow({
  day,
  dayIndex,
  onUpdateDay,
  onDeleteDay,
  onDuplicateDay,
  onMoveDay,
}: WorkoutRowProps) {
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateDay({ ...day, name: e.target.value });
  };

  const handleToggleRestDay = () => {
    onUpdateDay({
      ...day,
      isRestDay: !day.isRestDay,
      name: !day.isRestDay ? 'Rest Day' : `Workout ${dayIndex + 1}`,
    });
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dayIndex.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (fromIndex !== dayIndex) {
      onMoveDay(fromIndex, dayIndex);
    }
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`flex items-center gap-3 p-3 border rounded-lg transition-colors cursor-move ${
        day.isRestDay
          ? 'bg-gray-50 border-gray-200'
          : 'bg-white border-gray-300 hover:border-gray-400'
      }`}
    >
      {/* Drag handle */}
      <div className="text-gray-400 cursor-grab active:cursor-grabbing">
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Editable name */}
      <input
        type="text"
        value={day.name}
        onChange={handleNameChange}
        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder={day.isRestDay ? 'Rest Day' : 'Workout name'}
        disabled={day.isRestDay}
      />

      {/* Rest day toggle */}
      <button
        onClick={handleToggleRestDay}
        className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
          day.isRestDay
            ? 'bg-blue-500 text-white hover:bg-blue-600'
            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
        }`}
      >
        {day.isRestDay ? '✓ Rest Day' : 'Set as Rest'}
      </button>

      {/* Exercise count */}
      <span className="text-sm text-gray-500 min-w-[100px] text-right">
        {day.isRestDay ? '—' : `${day.exercises.length} exercise${day.exercises.length !== 1 ? 's' : ''}`}
      </span>

      {/* Actions */}
      <div className="flex gap-1">
        <button
          onClick={onDuplicateDay}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
          title="Duplicate workout"
        >
          <Copy className="w-4 h-4" />
        </button>
        <button
          onClick={onDeleteDay}
          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
          title="Delete workout"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
