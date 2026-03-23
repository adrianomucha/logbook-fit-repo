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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api-client';
import { WorkoutPlan, Exercise } from '@/types';
import { ExerciseCard } from './ExerciseCard';
import { ExerciseEditorContent } from './ExerciseEditorDrawer';

// No weekday constants needed — days are sequential now

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
  // Track selected day by ID so it survives data re-sorts (e.g. weekday changes)
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);

  // Exercise editor drawer state
  const [exerciseDrawerOpen, setExerciseDrawerOpen] = useState(false);
  const [editingExerciseIndex, setEditingExerciseIndex] = useState<number | null>(null);

  // Prevent double-submit on async operations
  const [isSaving, setIsSaving] = useState(false);

  // Clamp week index to valid range
  const clampedWeek = plan ? Math.min(selectedWeek, Math.max(0, plan.weeks.length - 1)) : 0;
  const currentWeek = plan?.weeks[clampedWeek];

  // Resolve selected day: find by ID, fall back to first day
  const currentDayIndex = currentWeek?.days.findIndex((d) => d.id === selectedDayId) ?? -1;
  const clampedDay = currentDayIndex >= 0 ? currentDayIndex : 0;
  const currentDay = currentWeek?.days[clampedDay];

  // Auto-select first day when entering a week with no selection
  useEffect(() => {
    if (currentWeek && currentWeek.days.length > 0 && currentDayIndex < 0) {
      setSelectedDayId(currentWeek.days[0].id);
    }
  }, [currentWeek, currentDayIndex]);

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
  // localDayNumber removed — days are sequential, no weekday assignment

  // Local state for day description (workout briefing for clients)
  const [localDayDescription, setLocalDayDescription] = useState(currentDay?.description || '');

  // Sync local day fields when navigating to a different day/week or when plan changes externally
  const currentDayId = currentDay?.id;
  const currentDayName = currentDay?.name;
  const currentDayDesc = currentDay?.description;
  useEffect(() => {
    setLocalDayName(currentDayName || '');
    setLocalDayDescription(currentDayDesc || '');
  }, [currentDayId, currentDayName, currentDayDesc]);

  // Reset selection when plan changes (e.g. opening a different plan)
  useEffect(() => {
    setSelectedWeek(initialWeekIndex);
    // Resolve initial day index to an ID
    const week = plan?.weeks[initialWeekIndex];
    const day = week?.days[initialDayIndex];
    setSelectedDayId(day?.id ?? null);
  }, [plan?.id, initialWeekIndex, initialDayIndex]);

  // Navigate weeks
  const goToPrevWeek = () => {
    if (selectedWeek > 0) {
      setSelectedWeek(selectedWeek - 1);
      setSelectedDayId(null); // will auto-select first day via effect
    }
  };

  const goToNextWeek = () => {
    if (plan && selectedWeek < plan.weeks.length - 1) {
      setSelectedWeek(selectedWeek + 1);
      setSelectedDayId(null); // will auto-select first day via effect
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
    if (!plan || !currentDay || isSaving) return;
    const dayId = currentDay.id;
    setIsSaving(true);

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
    } finally {
      setIsSaving(false);
    }

    onRefresh?.();
  };

  // Delete exercise — persists via API
  const handleDeleteExercise = async () => {
    if (!plan || editingExerciseIndex === null || !currentDay || isSaving) return;
    const exerciseToDelete = currentDay.exercises[editingExerciseIndex];
    setIsSaving(true);

    try {
      await apiFetch(`/api/workout-exercises/${exerciseToDelete.id}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('Failed to delete exercise:', err);
      return;
    } finally {
      setIsSaving(false);
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

  const closeExerciseEditor = () => {
    setExerciseDrawerOpen(false);
    setEditingExerciseIndex(null);
  };

  return (
    <Sheet open={open} onOpenChange={(o) => {
      if (!o) closeExerciseEditor();
      onOpenChange(o);
    }}>
      <SheetContent side="right" className="w-full sm:max-w-[500px] p-0 flex flex-col pb-[env(safe-area-inset-bottom)]">
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
              <div className="text-4xl select-none mb-1">😵</div>
              <p className="text-sm text-muted-foreground antialiased">{error}</p>
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="active:scale-[0.96] transition-transform duration-150">
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
        {plan && hasWeeks && !exerciseDrawerOpen && (
          <>
            {/* Header */}
            <div className="p-3 sm:p-4 border-b space-y-3 sm:space-y-4">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2.5">
                  <span className="text-3xl select-none">{plan.emoji || '💪'}</span>
                  <Input
                    ref={planNameInputRef}
                    value={localPlanName}
                    onChange={(e) => setLocalPlanName(e.target.value)}
                    onBlur={commitPlanName}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') planNameInputRef.current?.blur();
                      if (e.key === 'Escape') { setLocalPlanName(plan.name); planNameInputRef.current?.blur(); }
                    }}
                    placeholder="Plan name"
                    maxLength={100}
                    className="font-black text-xl h-auto py-1 px-2 border-transparent hover:border-input focus:border-input transition-colors tracking-tight"
                  />
                </SheetTitle>
                <SheetDescription className="sr-only">
                  Tap an exercise to edit
                </SheetDescription>
              </SheetHeader>

              {/* Week Navigation */}
              <div className="flex items-center justify-between bg-foreground text-background rounded-xl px-1 py-1.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 sm:h-8 sm:w-8 text-background hover:bg-background/10 hover:text-background active:scale-[0.92] transition-all"
                  onClick={goToPrevWeek}
                  disabled={selectedWeek === 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="text-center">
                  <span className="text-sm font-black tracking-tight tabular-nums">
                    Week {selectedWeek + 1}
                  </span>
                  <span className="text-xs text-background/50 ml-1.5 tabular-nums">
                    / {plan.weeks.length}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 sm:h-8 sm:w-8 text-background hover:bg-background/10 hover:text-background active:scale-[0.92] transition-all"
                  onClick={goToNextWeek}
                  disabled={selectedWeek === plan.weeks.length - 1}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Sequential Day Pills */}
              {hasDays && (
                <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1 scrollbar-none">
                  {currentWeek.days.map((day, idx) => {
                    const isActive = clampedDay === idx;
                    const exerciseCount = day.exercises?.length || 0;

                    return (
                      <button
                        key={day.id}
                        onClick={() => setSelectedDayId(day.id)}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all whitespace-nowrap min-h-[44px] sm:min-h-0 shrink-0',
                          isActive
                            ? 'bg-foreground text-background scale-[1.02] shadow-[0_2px_8px_rgba(0,0,0,0.15)]'
                            : 'hover:bg-muted active:scale-[0.95]'
                        )}
                      >
                        <span className="text-xs font-bold truncate max-w-[120px]">
                          {day.name || `Day ${idx + 1}`}
                        </span>
                        {exerciseCount > 0 && (
                          <span className={cn(
                            'text-[10px] tabular-nums font-bold px-1.5 py-0.5 rounded-md',
                            isActive ? 'bg-background/20 text-background' : 'bg-muted text-muted-foreground'
                          )}>
                            {exerciseCount}
                          </span>
                        )}
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
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') dayNameInputRef.current?.blur();
                        if (e.key === 'Escape') { setLocalDayName(currentDay?.name || ''); dayNameInputRef.current?.blur(); }
                      }}
                      placeholder="e.g., Push Day"
                      maxLength={80}
                      className="font-bold"
                    />
                  </div>
                  {(
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
                        maxLength={500}
                      />
                    </div>
                  )}
                </div>

                {/* Exercise List */}
                <div className="divide-y">
                  {currentDay.exercises.length === 0 ? (
                    <div className="flex flex-col items-center py-16 px-8 text-center">
                      <div className="text-4xl select-none mb-4">🏋️</div>
                      <p className="text-base font-black mb-1 tracking-tight">No exercises yet</p>
                      <p className="text-xs text-muted-foreground mb-6 antialiased">Build this workout by adding exercises</p>
                      <Button
                        onClick={handleAddExercise}
                        className="active:scale-[0.96] transition-transform duration-150"
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
                        className="w-full px-4 py-3.5 sm:py-3 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted/50 active:bg-muted/80 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 border-t border-dashed"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Exercise
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8 text-center text-muted-foreground">
                <p className="text-sm">No days in this week</p>
              </div>
            )}
          </>
        )}

        {/* Exercise editor — inline view swap (no stacking sheets) */}
        {plan && hasWeeks && exerciseDrawerOpen && (
          <>
            {/* Back button header */}
            <div className="px-4 py-2 border-b">
              <button
                onClick={closeExerciseEditor}
                className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground active:text-foreground active:scale-[0.97] transition-all min-h-[44px] sm:min-h-[36px]"
              >
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                Back to {currentDay?.name || 'workout'}
              </button>
            </div>
            <ExerciseEditorContent
              exercise={editingExercise || null}
              onSave={handleSaveExercise}
              onClose={closeExerciseEditor}
              onDelete={editingExerciseIndex !== null ? handleDeleteExercise : undefined}
              exerciseNumber={editingExerciseIndex !== null ? editingExerciseIndex + 1 : undefined}
              open={exerciseDrawerOpen}
            />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
