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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api-client';
import { WorkoutPlan, Exercise } from '@/types';
import { ExerciseCard } from './ExerciseCard';
import { ExerciseEditorContent } from './ExerciseEditorDrawer';

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
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);

  // Plan name & emoji inline edit state
  const [editingPlanName, setEditingPlanName] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

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

  // Commit emoji change to the API
  const commitEmoji = async (emoji: string) => {
    if (!plan || emoji === plan.emoji) return;
    setShowEmojiPicker(false);
    try {
      await apiFetch(`/api/plans/${plan.id}`, {
        method: 'PUT',
        body: JSON.stringify({ emoji }),
      });
      onUpdatePlan({ ...plan, emoji, updatedAt: new Date().toISOString() });
    } catch {
      // silently fail — old emoji stays
    }
  };

  // Close emoji picker on outside click
  useEffect(() => {
    if (!showEmojiPicker) return;
    const handler = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showEmojiPicker]);

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
      <SheetContent side="right" className="w-full sm:max-w-[500px] p-0 flex flex-col pb-[env(safe-area-inset-bottom)] overflow-visible [&>button[data-radix-collection-item]]:hidden [&>.absolute]:hidden">
        {/* Loading state — skeleton */}
        {isLoading && !plan && (
          <>
            <div className="p-4 border-b space-y-3">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-muted animate-pulse" />
                  <div className="h-6 w-40 rounded-md bg-muted animate-pulse" />
                </SheetTitle>
                <SheetDescription className="sr-only">Loading plan</SheetDescription>
              </SheetHeader>
              <div className="h-10 rounded-xl bg-muted animate-pulse" />
              <div className="flex gap-1.5">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 w-24 rounded-xl bg-muted animate-pulse" />
                ))}
              </div>
            </div>
            <div className="flex-1 p-4 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-14 rounded-lg bg-muted/60 animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
              ))}
            </div>
          </>
        )}

        {/* Error state */}
        {error && !plan && (
          <>
            <div className="p-4 border-b pr-4">
              <SheetHeader>
                <SheetTitle className="font-black tracking-tight">Error</SheetTitle>
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
            <div className="p-4 border-b pr-4">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <span className="text-xl select-none">{plan.emoji || '💪'}</span>
                  <span className="truncate font-black tracking-tight">{plan.name}</span>
                </SheetTitle>
                <SheetDescription className="sr-only">Plan editor</SheetDescription>
              </SheetHeader>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="text-4xl select-none mb-1">📋</div>
              <p className="text-sm font-bold antialiased">No weeks in this plan</p>
              <p className="text-xs text-muted-foreground antialiased">
                Try deleting it and creating a new one
              </p>
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="active:scale-[0.96] transition-transform duration-150">
                Close
              </Button>
            </div>
          </>
        )}

        {/* Normal state: plan loaded with weeks and days */}
        {plan && hasWeeks && !exerciseDrawerOpen && (
          <>
            {/* Header */}
            <div className="p-3 sm:p-4 border-b space-y-3 sm:space-y-4 overflow-visible relative z-10">
              <SheetHeader>
                <SheetTitle asChild>
                  <div className="flex items-center gap-2 min-w-0">
                    {/* Emoji picker */}
                    <div className="relative shrink-0" ref={emojiPickerRef}>
                      <button
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="text-lg leading-none p-1 -m-1 rounded-md hover:bg-muted active:scale-[0.9] transition-all"
                        aria-label="Change emoji"
                      >
                        {plan.emoji || '💪'}
                      </button>
                      {showEmojiPicker && (
                        <div className="absolute top-full left-0 mt-2 bg-card border rounded-xl shadow-lg p-2 z-[100] animate-fade-in-up w-[220px]">
                          <div className="grid grid-cols-6 gap-0.5">
                            {['💪', '🏋️', '🔥', '⚡', '🎯', '🏆', '🦾', '💥', '🏃', '🧘', '🤸', '🚴', '🏊', '⭐', '🌟', '❤️', '🧠', '🍎'].map((e) => (
                              <button
                                key={e}
                                onClick={() => commitEmoji(e)}
                                className={cn(
                                  'w-8 h-8 flex items-center justify-center rounded-md text-sm hover:bg-muted active:scale-[0.85] transition-all',
                                  e === plan.emoji && 'bg-muted ring-1 ring-foreground/20'
                                )}
                              >
                                <span className="text-base leading-none">{e}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Plan name — click to edit */}
                    {editingPlanName ? (
                      <Input
                        ref={planNameInputRef}
                        value={localPlanName}
                        onChange={(e) => setLocalPlanName(e.target.value)}
                        onBlur={() => { commitPlanName(); setEditingPlanName(false); }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { planNameInputRef.current?.blur(); }
                          if (e.key === 'Escape') { setLocalPlanName(plan.name); setEditingPlanName(false); }
                        }}
                        placeholder="Plan name"
                        maxLength={100}
                        aria-label="Plan name"
                        autoFocus
                        className="font-black text-base h-auto py-1 px-2 tracking-tight min-w-0 flex-1"
                      />
                    ) : (
                      <button
                        onClick={() => { setEditingPlanName(true); setLocalPlanName(plan.name); }}
                        className="font-black text-base tracking-tight truncate hover:text-muted-foreground transition-colors text-left min-w-0 flex-1"
                      >
                        {plan.name}
                      </button>
                    )}

                    {/* Close drawer */}
                    <button
                      onClick={() => onOpenChange(false)}
                      className="text-xs font-bold text-muted-foreground hover:text-foreground active:scale-[0.96] transition-all shrink-0 px-2 py-1 rounded-md hover:bg-muted"
                    >
                      Close
                    </button>
                  </div>
                </SheetTitle>
                <SheetDescription className="sr-only">
                  Tap an exercise to edit
                </SheetDescription>
              </SheetHeader>

              {/* Week Navigation */}
              {(() => {
                const daysWithExercises = currentWeek?.days.filter(d => d.exercises?.length > 0).length || 0;
                const totalDays = currentWeek?.days.length || 0;
                return (
                  <div className="flex items-center gap-2 bg-muted/40 rounded-xl px-1.5 py-1.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-8 w-8 shrink-0 active:scale-[0.92] transition-all",
                        selectedWeek === 0 && "opacity-20 pointer-events-none"
                      )}
                      onClick={goToPrevWeek}
                      disabled={selectedWeek === 0}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <div className="flex-1 text-center select-none">
                      <span className="text-xs font-bold tabular-nums antialiased">
                        Week {selectedWeek + 1}
                      </span>
                      <span className="text-xs text-muted-foreground ml-1 tabular-nums">
                        of {plan.weeks.length}
                      </span>
                      {totalDays > 0 && (
                        <span className="text-[10px] text-muted-foreground/60 ml-2 tabular-nums">
                          {daysWithExercises}/{totalDays} ready
                        </span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-8 w-8 shrink-0 active:scale-[0.92] transition-all",
                        selectedWeek === plan.weeks.length - 1 && "opacity-20 pointer-events-none"
                      )}
                      onClick={goToNextWeek}
                      disabled={selectedWeek === plan.weeks.length - 1}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })()}

              {/* Sequential Day Pills */}
              {hasDays && (
                <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1 scrollbar-none snap-x snap-mandatory">
                  {currentWeek.days.map((day, idx) => {
                    const isActive = clampedDay === idx;
                    const exerciseCount = day.exercises?.length || 0;

                    return (
                      <button
                        key={day.id}
                        onClick={() => setSelectedDayId(day.id)}
                        className={cn(
                          'flex items-center gap-1.5 px-3.5 py-2.5 sm:px-3 sm:py-2 rounded-xl transition-all whitespace-nowrap min-h-[44px] shrink-0 snap-start',
                          isActive
                            ? 'bg-foreground text-background scale-[1.02] shadow-[0_2px_8px_rgba(0,0,0,0.15)]'
                            : 'bg-muted/40 hover:bg-muted active:scale-[0.95]'
                        )}
                      >
                        <span className="text-xs font-bold truncate max-w-[120px]">
                          {day.name || `Day ${idx + 1}`}
                        </span>
                        {exerciseCount > 0 && (
                          <span className={cn(
                            'text-[10px] tabular-nums font-bold px-1.5 py-0.5 rounded-md',
                            isActive ? 'bg-background/20 text-background' : 'bg-foreground/10 text-muted-foreground'
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
                    <label className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-medium mb-1.5 block antialiased">
                      Workout name
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
                      aria-label="Workout name"
                      className="font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-medium mb-1.5 block antialiased">
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
                </div>

                {/* Exercise count header */}
                {currentDay.exercises.length > 0 && (
                  <div className="px-4 py-2.5 border-b flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-medium antialiased">
                      Exercises
                    </span>
                    <span className="text-[11px] tabular-nums text-muted-foreground font-bold">
                      {currentDay.exercises.length}
                    </span>
                  </div>
                )}

                {/* Exercise List */}
                <div className="divide-y">
                  {currentDay.exercises.length === 0 ? (
                    <div className="flex flex-col items-center py-16 px-8 text-center animate-fade-in-up">
                      <div className="text-5xl select-none mb-4" role="img" aria-label="weightlifter">🏋️</div>
                      <p className="text-base font-black mb-1 tracking-tight">No exercises yet</p>
                      <p className="text-sm text-muted-foreground mb-6 antialiased max-w-[240px]">
                        Tap below to start building this workout
                      </p>
                      <Button
                        onClick={handleAddExercise}
                        size="lg"
                        className="active:scale-[0.96] transition-transform duration-150 shadow-[0_2px_8px_rgba(0,0,0,0.12)]"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add First Exercise
                      </Button>
                    </div>
                  ) : (
                    <>
                      {currentDay.exercises.map((exercise, idx) => (
                        <div
                          key={exercise.id}
                          className="animate-fade-in-up"
                          style={{ animationDelay: `${idx * 40}ms`, animationFillMode: 'backwards' }}
                        >
                          <ExerciseCard
                            exercise={exercise}
                            exerciseIndex={idx}
                            onClick={() => handleEditExercise(idx)}
                          />
                        </div>
                      ))}
                      <button
                        onClick={handleAddExercise}
                        className="w-full px-4 py-3.5 sm:py-3 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted/50 active:bg-muted/80 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 border-t border-dashed group"
                      >
                        <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform duration-200" />
                        Add Exercise
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 p-8 text-center">
                <div className="text-4xl select-none mb-1">📭</div>
                <p className="text-sm font-bold antialiased">Empty week</p>
                <p className="text-xs text-muted-foreground antialiased">This week has no workout days</p>
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
                className="group flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground active:text-foreground active:scale-[0.97] transition-all min-h-[44px] sm:min-h-[36px]"
              >
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform duration-150" />
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
