import { WorkoutPlan, WorkoutDay, WorkoutWeek } from '@/types';
import { CheckCircle, AlertCircle, MinusCircle, MoreVertical, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  generateDaysForWeek,
  duplicateWeek,
  duplicateDay,
  moveWeek,
} from '@/lib/workout-helpers';

interface WorkoutSidebarProps {
  plan: WorkoutPlan;
  currentWeekIndex: number;
  currentDayIndex: number;
  onSelectWorkout: (weekIdx: number, dayIdx: number) => void;
  onUpdatePlan?: (plan: WorkoutPlan) => void;
}

type WorkoutStatus = 'rest' | 'empty' | 'complete';

function getWorkoutStatus(day: WorkoutDay): WorkoutStatus {
  if (day.isRestDay) return 'rest';
  if (day.exercises.length === 0) return 'empty';
  return 'complete';
}

function StatusIcon({ status }: { status: WorkoutStatus }) {
  switch (status) {
    case 'rest':
      return <MinusCircle className="w-4 h-4 text-gray-400" />;
    case 'empty':
      return <AlertCircle className="w-4 h-4 text-amber-500" />;
    case 'complete':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
  }
}

export function WorkoutSidebar({
  plan,
  currentWeekIndex,
  currentDayIndex,
  onSelectWorkout,
  onUpdatePlan,
}: WorkoutSidebarProps) {
  // Calculate total workouts and completion stats
  const totalWorkouts = plan.weeks.reduce(
    (acc, week) => acc + week.days.filter((d) => !d.isRestDay).length,
    0
  );
  const completedWorkouts = plan.weeks.reduce(
    (acc, week) =>
      acc + week.days.filter((d) => !d.isRestDay && d.exercises.length > 0).length,
    0
  );

  // Week handlers
  const handleAddWeek = () => {
    if (!onUpdatePlan) return;

    const newWeek: WorkoutWeek = {
      id: `week-${Date.now()}`,
      weekNumber: plan.weeks.length + 1,
      days: generateDaysForWeek(plan.workoutsPerWeek || 4),
    };

    const updatedPlan: WorkoutPlan = {
      ...plan,
      weeks: [...plan.weeks, newWeek],
      durationWeeks: plan.weeks.length + 1,
      updatedAt: new Date().toISOString(),
    };

    onUpdatePlan(updatedPlan);
  };

  const handleDeleteWeek = (weekIdx: number) => {
    if (!onUpdatePlan) return;
    if (plan.weeks.length <= 1) {
      alert('Cannot delete the last week. Plans must have at least one week.');
      return;
    }

    const updatedWeeks = plan.weeks.filter((_, idx) => idx !== weekIdx);
    const renumberedWeeks = updatedWeeks.map((week, idx) => ({
      ...week,
      weekNumber: idx + 1,
    }));

    const updatedPlan: WorkoutPlan = {
      ...plan,
      weeks: renumberedWeeks,
      durationWeeks: renumberedWeeks.length,
      updatedAt: new Date().toISOString(),
    };

    onUpdatePlan(updatedPlan);
  };

  const handleDuplicateWeek = (weekIdx: number) => {
    if (!onUpdatePlan) return;

    const weekToDuplicate = plan.weeks[weekIdx];
    const newWeekNumber = plan.weeks.length + 1;
    const newWeek = duplicateWeek(weekToDuplicate, newWeekNumber);

    const updatedPlan: WorkoutPlan = {
      ...plan,
      weeks: [...plan.weeks, newWeek],
      durationWeeks: plan.weeks.length + 1,
      updatedAt: new Date().toISOString(),
    };

    onUpdatePlan(updatedPlan);
  };

  const handleMoveWeek = (weekIdx: number, direction: 'up' | 'down') => {
    if (!onUpdatePlan) return;

    const toIndex = direction === 'up' ? weekIdx - 1 : weekIdx + 1;
    if (toIndex < 0 || toIndex >= plan.weeks.length) return;

    const reorderedWeeks = moveWeek(plan.weeks, weekIdx, toIndex);

    const updatedPlan: WorkoutPlan = {
      ...plan,
      weeks: reorderedWeeks,
      updatedAt: new Date().toISOString(),
    };

    onUpdatePlan(updatedPlan);
  };

  // Day handlers
  const handleDeleteDay = (weekIdx: number, dayIdx: number) => {
    if (!onUpdatePlan) return;

    const week = plan.weeks[weekIdx];
    if (week.days.length <= 1) {
      alert('Cannot delete the last day. Weeks must have at least one day.');
      return;
    }

    const updatedPlan: WorkoutPlan = {
      ...plan,
      weeks: plan.weeks.map((w, wIdx) =>
        wIdx === weekIdx
          ? { ...w, days: w.days.filter((_, dIdx) => dIdx !== dayIdx) }
          : w
      ),
      updatedAt: new Date().toISOString(),
    };

    onUpdatePlan(updatedPlan);
  };

  const handleDuplicateDay = (weekIdx: number, dayIdx: number) => {
    if (!onUpdatePlan) return;

    const dayToDuplicate = plan.weeks[weekIdx].days[dayIdx];
    const newDay = duplicateDay(dayToDuplicate);

    const updatedPlan: WorkoutPlan = {
      ...plan,
      weeks: plan.weeks.map((w, wIdx) =>
        wIdx === weekIdx
          ? {
              ...w,
              days: [
                ...w.days.slice(0, dayIdx + 1),
                newDay,
                ...w.days.slice(dayIdx + 1),
              ],
            }
          : w
      ),
      updatedAt: new Date().toISOString(),
    };

    onUpdatePlan(updatedPlan);
  };

  const handleToggleRestDay = (weekIdx: number, dayIdx: number) => {
    if (!onUpdatePlan) return;

    const day = plan.weeks[weekIdx].days[dayIdx];
    const updatedDay: WorkoutDay = {
      ...day,
      isRestDay: !day.isRestDay,
      name: !day.isRestDay ? 'Rest Day' : 'Workout',
      exercises: !day.isRestDay ? [] : day.exercises,
    };

    const updatedPlan: WorkoutPlan = {
      ...plan,
      weeks: plan.weeks.map((w, wIdx) =>
        wIdx === weekIdx
          ? {
              ...w,
              days: w.days.map((d, dIdx) => (dIdx === dayIdx ? updatedDay : d)),
            }
          : w
      ),
      updatedAt: new Date().toISOString(),
    };

    onUpdatePlan(updatedPlan);
  };

  const handleAddDay = (weekIdx: number) => {
    if (!onUpdatePlan) return;

    const week = plan.weeks[weekIdx];
    const newDay: WorkoutDay = {
      id: `day-${Date.now()}`,
      name: `Workout ${week.days.length + 1}`,
      exercises: [],
      isRestDay: false,
    };

    const updatedPlan: WorkoutPlan = {
      ...plan,
      weeks: plan.weeks.map((w, wIdx) =>
        wIdx === weekIdx ? { ...w, days: [...w.days, newDay] } : w
      ),
      updatedAt: new Date().toISOString(),
    };

    onUpdatePlan(updatedPlan);
  };

  return (
    <div className="bg-white rounded-lg border">
      {/* Compact Header */}
      <div className="p-4 border-b space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Plan Structure</h3>
          <span className="text-sm text-muted-foreground">
            {completedWorkouts}/{totalWorkouts} workouts
          </span>
        </div>

        {/* Legend */}
        <div className="flex gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-green-500" />
            <span>Has exercises</span>
          </div>
          <div className="flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-amber-500" />
            <span>Empty</span>
          </div>
          <div className="flex items-center gap-1">
            <MinusCircle className="w-3 h-3 text-gray-400" />
            <span>Rest</span>
          </div>
        </div>
      </div>

      {/* Workout List */}
      <div className="p-2">
        <div className="space-y-4">
          {plan.weeks.map((week, weekIdx) => {
            const isFirstWeek = weekIdx === 0;
            const isLastWeek = weekIdx === plan.weeks.length - 1;
            const isOnlyWeek = plan.weeks.length === 1;

            return (
              <div key={week.id} className="space-y-1">
                {/* Week Header with Controls */}
                <div className="flex items-center justify-between px-2 group">
                  <div className="text-xs font-semibold text-muted-foreground">
                    Week {week.weekNumber}
                  </div>
                  {onUpdatePlan && (
                    <div className="flex items-center gap-1 z-10 relative">
                      {/* Add Day Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAddDay(weekIdx)}
                        className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Add day"
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                      {/* Week Menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreVertical className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="z-50">
                          <DropdownMenuItem onClick={() => handleDuplicateWeek(weekIdx)}>
                            Duplicate Week
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleMoveWeek(weekIdx, 'up')}
                            disabled={isFirstWeek}
                          >
                            Move Up
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleMoveWeek(weekIdx, 'down')}
                            disabled={isLastWeek}
                          >
                            Move Down
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteWeek(weekIdx)}
                            disabled={isOnlyWeek}
                          >
                            Delete Week
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>

                {/* Days List */}
                <div className="space-y-0.5">
                  {week.days.map((day, dayIdx) => {
                    const isCurrent =
                      weekIdx === currentWeekIndex && dayIdx === currentDayIndex;
                    const status = getWorkoutStatus(day);
                    const exerciseCount = day.exercises.length;
                    const isOnlyDay = week.days.length === 1;

                    return (
                      <div key={day.id} className="relative group/day">
                        <button
                          onClick={() => onSelectWorkout(weekIdx, dayIdx)}
                          className={cn(
                            'w-full text-left px-3 py-2 rounded-md transition-colors flex items-center gap-2 text-sm',
                            isCurrent
                              ? 'bg-primary text-primary-foreground font-medium'
                              : 'hover:bg-muted',
                            day.isRestDay && !isCurrent && 'opacity-60'
                          )}
                        >
                          <StatusIcon status={status} />
                          <span className="flex-1 truncate">{day.name}</span>
                          {!day.isRestDay && (
                            <span
                              className={cn(
                                'text-xs',
                                isCurrent
                                  ? 'text-primary-foreground/80'
                                  : 'text-muted-foreground'
                              )}
                            >
                              {exerciseCount}
                            </span>
                          )}
                        </button>
                        {/* Day Menu */}
                        {onUpdatePlan && (
                          <div className="absolute right-1 top-1/2 -translate-y-1/2 z-10">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 opacity-0 group-hover/day:opacity-100 transition-opacity"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreVertical className="w-3 h-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="z-50">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleRestDay(weekIdx, dayIdx);
                                  }}
                                >
                                  {day.isRestDay ? 'Mark as Workout' : 'Mark as Rest Day'}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDuplicateDay(weekIdx, dayIdx);
                                  }}
                                >
                                  Duplicate Day
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteDay(weekIdx, dayIdx);
                                  }}
                                  disabled={isOnlyDay}
                                >
                                  Delete Day
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Week Button */}
      {onUpdatePlan && (
        <div className="p-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddWeek}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Week
          </Button>
        </div>
      )}
    </div>
  );
}
