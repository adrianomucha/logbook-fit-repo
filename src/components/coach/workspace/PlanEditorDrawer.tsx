import { useState, useEffect, useRef } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api-client';
import { WorkoutPlan, Exercise } from '@/types';
import { ExerciseCard } from './ExerciseCard';
import { ExerciseEditorDrawer } from './ExerciseEditorDrawer';

interface PlanEditorDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: WorkoutPlan | null;
  onUpdatePlan: (plan: WorkoutPlan) => void;
  /** Re-fetch plan detail from the API after mutations */
  onRefresh?: () => void;
  /** Show a loading spinner while the plan detail is being fetched */
  isLoading?: boolean;
  /** Error message to display if plan failed to load */
  error?: string;
  /** Initial week to show (0-indexed) */
  initialWeekIndex?: number;
  /** Initial day to show (0-indexed) */
  initialDayIndex?: number;
}

export function PlanEditorDrawer({
  open,
  onOpenChange,
  plan,
  onUpdatePlan,
  onRefresh,
  isLoading,
  error,
  initialWeekIndex = 0,
  initialDayIndex = 0,
}: PlanEditorDrawerProps) {
  const [selectedWeek, setSelectedWeek] = useState(initialWeekIndex);
  const [selectedDay, setSelectedDay] = useState(initialDayIndex);

  // Exercise editor drawer state
  const [exerciseDrawerOpen, setExerciseDrawerOpen] = useState(false);
  const [editingExerciseIndex, setEditingExerciseIndex] = useState<number | null>(null);

  const currentWeek = plan?.weeks[selectedWeek];
  const currentDay = currentWeek?.days[selectedDay];

  // Local state for plan name input — same pattern as day name below.
  const [localPlanName, setLocalPlanName] = useState(plan?.name || '');
  const planNameInputRef = useRef<HTMLInputElement>(null);

  // Sync local plan name when a different plan is loaded
  useEffect(() => {
    setLocalPlanName(plan?.name || '');
  }, [plan?.id, plan?.name]);

  // Local state for day name input to prevent keyboard dismissal on each keystroke.
  // The parent's onUpdatePlan triggers an API refresh which would otherwise
  // overwrite the input value and cause focus loss on mobile.
  const [localDayName, setLocalDayName] = useState(currentDay?.name || '');
  const dayNameInputRef = useRef<HTMLInputElement>(null);

  // Local state for day description (workout briefing for clients)
  const [localDayDescription, setLocalDayDescription] = useState(currentDay?.description || '');

  // Sync local day name when navigating to a different day/week or when plan changes externally
  useEffect(() => {
    setLocalDayName(currentDay?.name || '');
    setLocalDayDescription(currentDay?.description || '');
  }, [selectedWeek, selectedDay, currentDay?.name, currentDay?.description]);

  // Reset selection when plan changes (e.g. opening a different plan)
  useEffect(() => {
    setSelectedWeek(initialWeekIndex);
    setSelectedDay(initialDayIndex);
  }, [plan?.id, initialWeekIndex, initialDayIndex]);

  // Navigate weeks
  const goToPrevWeek = () => {
    if (selectedWeek > 0) {
      setSelectedWeek(selectedWeek - 1);
      setSelectedDay(0);
    }
  };

  const goToNextWeek = () => {
    if (plan && selectedWeek < plan.weeks.length - 1) {
      setSelectedWeek(selectedWeek + 1);
      setSelectedDay(0);
    }
  };

  // Open exercise drawer for new exercise
  const handleAddExercise = () => {
    setEditingExerciseIndex(null);
    setExerciseDrawerOpen(true);
  };

  // Open exercise drawer for editing
  const handleEditExercise = (index: number) => {
    setEditingExerciseIndex(index);
    setExerciseDrawerOpen(true);
  };

  // Save exercise (new or update) — persists via API
  const handleSaveExercise = async (exercise: Exercise) => {
    if (!plan || !currentDay) return;
    const dayId = currentDay.id;

    try {
      if (editingExerciseIndex !== null) {
        // Update existing workout exercise
        const existingExercise = currentDay.exercises[editingExerciseIndex];
        await apiFetch(`/api/workout-exercises/${existingExercise.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            sets: exercise.sets,
            reps: parseInt(exercise.reps || '0') || null,
            weight: exercise.weight ? parseFloat(exercise.weight) : null,
            restSeconds: exercise.restSeconds || null,
            coachNotes: exercise.notes || null,
          }),
        });
      } else {
        // New exercise: find-or-create in the library, then add to day
        let libraryExerciseId: string;
        try {
          const created = await apiFetch<{ id: string }>('/api/exercises', {
            method: 'POST',
            body: JSON.stringify({ name: exercise.name }),
          });
          libraryExerciseId = created.id;
        } catch {
          // 409 = already exists — search for it
          const results = await apiFetch<{ id: string; name: string }[]>(
            `/api/exercises?search=${encodeURIComponent(exercise.name)}`
          );
          const match = results.find(
            (e) => e.name.toLowerCase() === exercise.name.toLowerCase()
          );
          if (!match) throw new Error('Could not find or create exercise');
          libraryExerciseId = match.id;
        }

        await apiFetch(`/api/days/${dayId}/exercises`, {
          method: 'POST',
          body: JSON.stringify({
            exerciseId: libraryExerciseId,
            sets: exercise.sets,
            reps: parseInt(exercise.reps || '0') || undefined,
            weight: exercise.weight ? parseFloat(exercise.weight) : undefined,
            restSeconds: exercise.restSeconds || undefined,
            coachNotes: exercise.notes || undefined,
          }),
        });
      }
    } catch (err) {
      console.error('Failed to save exercise:', err);
      return; // Don't refresh on error
    }

    onRefresh?.();
  };

  // Delete exercise — persists via API
  const handleDeleteExercise = async () => {
    if (!plan || editingExerciseIndex === null || !currentDay) return;
    const exerciseToDelete = currentDay.exercises[editingExerciseIndex];

    try {
      await apiFetch(`/api/workout-exercises/${exerciseToDelete.id}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('Failed to delete exercise:', err);
      return;
    }

    onRefresh?.();
  };

  // Commit the plan name to the API on blur
  const commitPlanName = async () => {
    const trimmed = localPlanName.trim();
    if (!plan || !trimmed || trimmed === plan.name) return;
    try {
      await apiFetch(`/api/plans/${plan.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: trimmed }),
      });
      // Refresh parent list so card title updates too
      onUpdatePlan({ ...plan, name: trimmed, updatedAt: new Date().toISOString() });
    } catch {
      // Revert on error
      setLocalPlanName(plan.name);
    }
  };

  // Commit the day name to the API on blur
  const commitDayName = async () => {
    if (!plan || !currentDay || localDayName === currentDay.name) return;
    try {
      await apiFetch(`/api/days/${currentDay.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: localDayName }),
      });
      onRefresh?.();
    } catch {
      // Revert on error
      setLocalDayName(currentDay.name || '');
    }
  };

  // Commit the day description to the API on blur
  const commitDayDescription = async () => {
    if (!plan || !currentDay) return;
    const newDesc = localDayDescription.trim() || null;
    const oldDesc = currentDay.description || null;
    if (newDesc === oldDesc) return;
    try {
      await apiFetch(`/api/days/${currentDay.id}`, {
        method: 'PUT',
        body: JSON.stringify({ description: newDesc }),
      });
      onRefresh?.();
    } catch {
      setLocalDayDescription(currentDay.description || '');
    }
  };

  // Get the exercise being edited (if any)
  const editingExercise = editingExerciseIndex !== null
    ? currentDay?.exercises[editingExerciseIndex]
    : null;

  // Determine what content to show inside the Sheet
  const hasWeeks = plan && plan.weeks.length > 0;
  const hasDays = currentWeek && currentWeek.days.length > 0;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-[500px] p-0 flex flex-col">
          {/* Loading state */}
          {isLoading && !plan && (
            <>
              <div className="p-4 border-b">
                <SheetHeader>
                  <SheetTitle>Loading plan…</SheetTitle>
                  <SheetDescription>Please wait</SheetDescription>
                </SheetHeader>
              </div>
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            </>
          )}

          {/* Error state */}
          {error && !plan && (
            <>
              <div className="p-4 border-b">
                <SheetHeader>
                  <SheetTitle>Error</SheetTitle>
                  <SheetDescription>Something went wrong</SheetDescription>
                </SheetHeader>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
                <AlertCircle className="w-10 h-10 text-destructive" />
                <p className="text-sm text-muted-foreground">{error}</p>
                <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
              </div>
            </>
          )}

          {/* Plan loaded but has no weeks */}
          {plan && !hasWeeks && (
            <>
              <div className="p-4 border-b">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <span className="text-xl">{plan.emoji || '💪'}</span>
                    <span className="truncate">{plan.name}</span>
                  </SheetTitle>
                  <SheetDescription>Plan editor</SheetDescription>
                </SheetHeader>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
                <Dumbbell className="w-10 h-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  This plan has no weeks yet. Try deleting it and creating a new one.
                </p>
                <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
              </div>
            </>
          )}

          {/* Normal state: plan loaded with weeks and days */}
          {plan && hasWeeks && (
            <>
              {/* Header */}
              <div className="p-4 border-b space-y-4">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2.5">
                    <span className="text-2xl">{plan.emoji || '💪'}</span>
                    <Input
                      ref={planNameInputRef}
                      value={localPlanName}
                      onChange={(e) => setLocalPlanName(e.target.value)}
                      onBlur={commitPlanName}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') planNameInputRef.current?.blur();
                      }}
                      placeholder="Plan name"
                      className="font-bold text-lg h-auto py-1 px-2 border-transparent hover:border-input focus:border-input transition-colors"
                    />
                  </SheetTitle>
                  <SheetDescription>
                    Tap an exercise to edit
                  </SheetDescription>
                </SheetHeader>

                {/* Week Navigation */}
                <div className="flex items-center justify-between bg-muted/50 rounded-lg px-2 py-1.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={goToPrevWeek}
                    disabled={selectedWeek === 0}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <div className="text-center">
                    <span className="text-sm font-bold tracking-tight">
                      Week {selectedWeek + 1}
                    </span>
                    <span className="text-xs text-muted-foreground ml-1.5">
                      / {plan.weeks.length}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={goToNextWeek}
                    disabled={selectedWeek === plan.weeks.length - 1}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>

                {/* Day Tabs */}
                {hasDays && (
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {currentWeek.days.map((day, idx) => {
                      const exerciseCount = day.exercises?.length || 0;
                      const isActive = selectedDay === idx;
                      return (
                        <button
                          key={day.id}
                          className={cn(
                            'shrink-0 text-xs font-medium px-3 py-1.5 rounded-md transition-all',
                            isActive
                              ? 'bg-foreground text-background'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                            day.isRestDay && !isActive && 'opacity-50'
                          )}
                          onClick={() => setSelectedDay(idx)}
                        >
                          {day.name || `Day ${idx + 1}`}
                          {day.isRestDay ? ' 💤' : ` (${exerciseCount})`}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Content */}
              {currentDay ? (
                <div className="flex-1 overflow-y-auto">
                  {/* Day Name & Description Edit */}
                  <div className="p-4 border-b space-y-3">
                    <div>
                      <label className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-medium mb-1.5 block">
                        Workout Name
                      </label>
                      <Input
                        ref={dayNameInputRef}
                        value={localDayName}
                        onChange={(e) => setLocalDayName(e.target.value)}
                        onBlur={commitDayName}
                        placeholder="e.g., Push Day, Upper Body"
                        className="font-bold"
                      />
                    </div>
                    {!currentDay.isRestDay && (
                      <div>
                        <label className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-medium mb-1.5 block">
                          Briefing
                        </label>
                        <Textarea
                          value={localDayDescription}
                          onChange={(e) => setLocalDayDescription(e.target.value)}
                          onBlur={commitDayDescription}
                          placeholder="Describe this workout for your client — what to expect, how to approach it..."
                          className="text-sm resize-none"
                          rows={2}
                        />
                      </div>
                    )}
                  </div>

                  {/* Exercise List or Rest Day */}
                  {currentDay.isRestDay ? (
                    <div className="p-12 text-center space-y-2">
                      <p className="text-4xl">😴</p>
                      <p className="text-sm font-medium text-muted-foreground">Rest day</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {currentDay.exercises.length === 0 ? (
                        <div className="flex flex-col items-center py-16 px-8 text-center">
                          <Dumbbell className="w-6 h-6 text-muted-foreground/40 mb-4" />
                          <p className="text-sm font-bold mb-1">No exercises yet</p>
                          <p className="text-xs text-muted-foreground mb-6">Add your first exercise to this day</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleAddExercise}
                          >
                            <Plus className="w-3.5 h-3.5 mr-1.5" />
                            Add Exercise
                          </Button>
                        </div>
                      ) : (
                        <>
                          {currentDay.exercises.map((exercise, idx) => (
                            <ExerciseCard
                              key={exercise.id}
                              exercise={exercise}
                              exerciseIndex={idx}
                              onClick={() => handleEditExercise(idx)}
                            />
                          ))}
                          <button
                            onClick={handleAddExercise}
                            className="w-full px-4 py-3 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors flex items-center justify-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add Exercise
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center p-8 text-center text-muted-foreground">
                  <p className="text-sm">No days in this week</p>
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Exercise Editor Drawer - nested */}
      <ExerciseEditorDrawer
        open={exerciseDrawerOpen}
        onOpenChange={setExerciseDrawerOpen}
        exercise={editingExercise || null}
        onSave={handleSaveExercise}
        onDelete={editingExerciseIndex !== null ? handleDeleteExercise : undefined}
        exerciseNumber={editingExerciseIndex !== null ? editingExerciseIndex + 1 : undefined}
      />
    </>
  );
}
