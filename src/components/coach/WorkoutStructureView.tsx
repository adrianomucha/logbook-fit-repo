import { useState } from 'react';
import { Plus, ArrowLeft, ArrowRight } from 'lucide-react';
import type { WorkoutPlan, WorkoutWeek } from '../../types';
import { WeekCard } from './WeekCard';
import { generateDaysForWeek, duplicateWeek, moveWeek } from '../../lib/workout-helpers';

interface WorkoutStructureViewProps {
  plan: WorkoutPlan;
  onUpdatePlan: (plan: WorkoutPlan) => void;
  onBack: () => void;
  onContinue?: () => void;
}

export function WorkoutStructureView({
  plan,
  onUpdatePlan,
  onBack,
  onContinue,
}: WorkoutStructureViewProps) {
  const [localPlan, setLocalPlan] = useState(plan);
  const [hasChanges, setHasChanges] = useState(false);

  const handleAddWeek = () => {
    const newWeek: WorkoutWeek = {
      id: `week-${Date.now()}`,
      weekNumber: localPlan.weeks.length + 1,
      days: generateDaysForWeek(localPlan.workoutsPerWeek || 4),
    };

    const updatedPlan = {
      ...localPlan,
      weeks: [...localPlan.weeks, newWeek],
      durationWeeks: (localPlan.durationWeeks || 0) + 1,
      updatedAt: new Date().toISOString(),
    };

    setLocalPlan(updatedPlan);
    setHasChanges(true);
  };

  const handleUpdateWeek = (weekIndex: number, updatedWeek: WorkoutWeek) => {
    const updatedPlan = {
      ...localPlan,
      weeks: localPlan.weeks.map((w, idx) => (idx === weekIndex ? updatedWeek : w)),
      updatedAt: new Date().toISOString(),
    };

    setLocalPlan(updatedPlan);
    setHasChanges(true);
  };

  const handleDeleteWeek = (weekIndex: number) => {
    if (localPlan.weeks.length <= 1) {
      return;
    }

    const updatedWeeks = localPlan.weeks.filter((_, idx) => idx !== weekIndex);

    // Renumber weeks
    const renumberedWeeks = updatedWeeks.map((week, idx) => ({
      ...week,
      weekNumber: idx + 1,
    }));

    const updatedPlan = {
      ...localPlan,
      weeks: renumberedWeeks,
      durationWeeks: renumberedWeeks.length,
      updatedAt: new Date().toISOString(),
    };

    setLocalPlan(updatedPlan);
    setHasChanges(true);
  };

  const handleDuplicateWeek = (weekIndex: number) => {
    const weekToDuplicate = localPlan.weeks[weekIndex];
    const newWeekNumber = localPlan.weeks.length + 1;
    const newWeek = duplicateWeek(weekToDuplicate, newWeekNumber);

    const updatedPlan = {
      ...localPlan,
      weeks: [...localPlan.weeks, newWeek],
      durationWeeks: (localPlan.durationWeeks || 0) + 1,
      updatedAt: new Date().toISOString(),
    };

    setLocalPlan(updatedPlan);
    setHasChanges(true);
  };

  const handleMoveWeek = (weekIndex: number, direction: 'up' | 'down') => {
    const toIndex = direction === 'up' ? weekIndex - 1 : weekIndex + 1;

    if (toIndex < 0 || toIndex >= localPlan.weeks.length) {
      return;
    }

    const reorderedWeeks = moveWeek(localPlan.weeks, weekIndex, toIndex);

    const updatedPlan = {
      ...localPlan,
      weeks: reorderedWeeks,
      updatedAt: new Date().toISOString(),
    };

    setLocalPlan(updatedPlan);
    setHasChanges(true);
  };

  const handleCopyToNextWeek = (weekIndex: number) => {
    if (weekIndex >= localPlan.weeks.length - 1) {
      return;
    }

    const sourceWeek = localPlan.weeks[weekIndex];
    const targetWeek = localPlan.weeks[weekIndex + 1];

    // Copy the structure (workout names and rest day status) but not exercises
    const updatedTargetWeek: WorkoutWeek = {
      ...targetWeek,
      days: sourceWeek.days.map((sourceDay) => ({
        id: `day-${Date.now()}-${Math.random()}`,
        name: sourceDay.name,
        isRestDay: sourceDay.isRestDay,
        exercises: [], // Don't copy exercises
      })),
    };

    handleUpdateWeek(weekIndex + 1, updatedTargetWeek);
  };

  const handleSaveAndContinue = () => {
    if (hasChanges) {
      onUpdatePlan(localPlan);
    }
    if (onContinue) {
      onContinue();
    } else {
      onBack();
    }
  };

  const handleBack = () => {
    if (hasChanges) {
      const confirmLeave = window.confirm(
        'You have unsaved changes. Are you sure you want to go back?'
      );
      if (!confirmLeave) return;
    }
    onBack();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{localPlan.emoji}</span>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{localPlan.name}</h2>
            <p className="text-sm text-gray-600">
              {localPlan.weeks.length} week{localPlan.weeks.length !== 1 ? 's' : ''} •{' '}
              {localPlan.workoutsPerWeek} workout{localPlan.workoutsPerWeek !== 1 ? 's' : ''} per
              week
            </p>
          </div>
        </div>
        <button
          onClick={handleAddWeek}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Week
        </button>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <strong>Customize your workout structure:</strong> Edit workout names, toggle rest days,
          duplicate or delete workouts and weeks. Changes won't affect exercises you've already
          added.
        </p>
      </div>

      {/* Weeks */}
      <div className="space-y-4">
        {localPlan.weeks.map((week, idx) => (
          <WeekCard
            key={week.id}
            week={week}
            weekIndex={idx}
            totalWeeks={localPlan.weeks.length}
            onUpdateWeek={(updatedWeek) => handleUpdateWeek(idx, updatedWeek)}
            onDeleteWeek={() => handleDeleteWeek(idx)}
            onDuplicateWeek={() => handleDuplicateWeek(idx)}
            onMoveWeek={(direction) => handleMoveWeek(idx, direction)}
            onCopyToNextWeek={
              idx < localPlan.weeks.length - 1 ? () => handleCopyToNextWeek(idx) : undefined
            }
          />
        ))}
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-200 sticky bottom-0 bg-white py-4">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Plans
        </button>
        <div className="flex items-center gap-3">
          {hasChanges && (
            <span className="text-sm text-amber-600 font-medium">Unsaved changes</span>
          )}
          <button
            onClick={handleSaveAndContinue}
            className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 transition-colors"
          >
            Continue to Exercises
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
