import { useState, useEffect, useMemo, useId } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ChevronLeft, Library, Link2, Loader2, Plus, Search, Trash2 } from 'lucide-react';
import { Exercise } from '@/types';
import { cn } from '@/lib/utils';
import { exerciseLibrary, ExerciseTemplate, searchExercises } from '@/lib/exercise-library';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { TallyMark } from '@/components/brand/LogoMark';
import { FieldLabel, FieldShell, StatusLine } from '../shared/formSurfaces';
import {
  formatWeightNumber,
  fromDisplayWeight,
  weightUnitLabel,
  type WeightUnit,
} from '@logbook/shared/weight-units';

/** A stored (lb) weight as the form's text, in the coach's unit. */
function toFormWeight(stored: string | number | undefined, unit: WeightUnit): string {
  const n = stored != null && stored !== '' ? Number(stored) : NaN;
  return Number.isNaN(n) ? '' : formatWeightNumber(n, unit);
}

interface ExerciseEditorContentProps {
  /** Existing exercise to edit, or null for new exercise */
  exercise: Exercise | null;
  /** Called when exercise is saved */
  onSave: (exercise: Exercise) => void | Promise<void>;
  /** Called to close the editor */
  onClose: () => void;
  /** Called when exercise is deleted (only shown when editing existing) */
  onDelete?: () => void;
  /** Exercise number for display (1-indexed) */
  exerciseNumber?: number;
  /** Whether this is rendered inline (true) or standalone */
  open?: boolean;
  /** Name of the exercise directly above this one, when there is one — enables the superset toggle */
  previousExerciseName?: string | null;
  /** Name of the day this exercise belongs to — shown for context in the header */
  dayName?: string | null;
}

/**
 * Exercise editor content — renders inline (no Sheet wrapper).
 * Used inside PlanEditorDrawer as a view swap.
 */
export function ExerciseEditorContent({
  exercise,
  onSave,
  onClose,
  onDelete,
  exerciseNumber,
  open = true,
  previousExerciseName,
  dayName,
}: ExerciseEditorContentProps) {
  const isNew = !exercise;
  const [mode, setMode] = useState<'library' | 'custom'>(isNew ? 'library' : 'custom');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Get unique categories from the library
  const categories = useMemo(() =>
    Array.from(new Set(exerciseLibrary.map((ex) => ex.category))),
    []
  );

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Weights are stored lb; the form reads and takes the coach's own unit
  const { weightUnit } = useCurrentUser();

  // Form state
  const [name, setName] = useState(exercise?.name || '');
  const [trackingType, setTrackingType] = useState<'REPS' | 'TIME'>(exercise?.trackingType || 'REPS');
  const [sets, setSets] = useState(exercise?.sets?.toString() || '3');
  const [reps, setReps] = useState(exercise?.reps || '10');
  const [weight, setWeight] = useState(toFormWeight(exercise?.weight, weightUnit));
  const [restSeconds, setRestSeconds] = useState(exercise?.restSeconds?.toString() || '');
  const [notes, setNotes] = useState(exercise?.notes || '');
  const [supersetWithPrevious, setSupersetWithPrevious] = useState(!!exercise?.supersetWithPrevious);

  // Reset form when exercise changes
  useEffect(() => {
    if (exercise) {
      setName(exercise.name || '');
      setTrackingType(exercise.trackingType || 'REPS');
      setSets(exercise.sets?.toString() || '3');
      setReps(exercise.reps || '10');
      setWeight(toFormWeight(exercise.weight, weightUnit));
      setRestSeconds(exercise.restSeconds?.toString() || '');
      setNotes(exercise.notes || '');
      setSupersetWithPrevious(!!exercise.supersetWithPrevious);
      setMode('custom');
    } else {
      setName('');
      setTrackingType('REPS');
      setSets('3');
      setReps('10');
      setWeight('');
      setRestSeconds('');
      setNotes('');
      setSupersetWithPrevious(false);
      setMode('library');
    }
    setSearchQuery('');
    setSelectedCategory(null);
    setShowDeleteConfirm(false);
    setIsSaving(false);
  }, [exercise, open, weightUnit]);

  // Filter exercises from library
  const filteredLibrary = useMemo(() => {
    if (searchQuery) {
      return searchExercises(searchQuery);
    }
    if (selectedCategory) {
      return exerciseLibrary.filter((ex) => ex.category === selectedCategory);
    }
    return exerciseLibrary;
  }, [searchQuery, selectedCategory]);

  // Select from library (for new exercises)
  const handleSelectFromLibrary = (template: ExerciseTemplate) => {
    setName(template.name);
    setTrackingType(template.trackingType || 'REPS');
    if (template.defaultSets) setSets(template.defaultSets.toString());
    if (template.defaultReps) setReps(template.defaultReps);
    if (template.notes) setNotes(template.notes);
    setMode('custom');
  };

  // Replace with library exercise (for existing)
  const handleReplaceWithLibrary = (template: ExerciseTemplate) => {
    setName(template.name);
    const templateType = template.trackingType || 'REPS';
    if (templateType !== trackingType) {
      // The old prescription is in the wrong unit — take the template's
      setTrackingType(templateType);
      setReps(template.defaultReps || (templateType === 'TIME' ? '60s' : '10'));
    } else if (!reps) {
      setReps(template.defaultReps || '10');
    }
    if (!sets || sets === '0') setSets(template.defaultSets?.toString() || '3');
    setMode('custom');
  };

  // Toggle between rep-based and time-based prescriptions. The current value
  // is in the other unit, so swap in that mode's default.
  const handleTrackingTypeChange = (next: 'REPS' | 'TIME') => {
    if (next === trackingType) return;
    setTrackingType(next);
    setReps(next === 'TIME' ? '60s' : '10');
  };

  const handleSave = async () => {
    if (isSaving || !canSave) return;
    setIsSaving(true);
    // Back to stored lb; an untouched value keeps its exact stored number
    const typedWeight = parseFloat(weight);
    const savedWeight = Number.isNaN(typedWeight)
      ? undefined
      : String(
          fromDisplayWeight(typedWeight, weightUnit, [
            exercise?.weight ? Number(exercise.weight) : null,
          ])
        );
    const savedExercise: Exercise = {
      id: exercise?.id || `ex-${Date.now()}`,
      name: name.trim(),
      trackingType,
      sets: Math.max(1, parseInt(sets) || 3),
      reps,
      weight: savedWeight,
      restSeconds: restSeconds ? Math.max(0, parseInt(restSeconds)) : undefined,
      notes: notes.trim() || undefined,
      supersetWithPrevious: previousExerciseName ? supersetWithPrevious : false,
    };
    try {
      await onSave(savedExercise);
    } finally {
      setIsSaving(false);
    }
    onClose();
  };

  const canSave = name.trim().length > 0 && parseInt(sets) > 0;

  const idPrefix = useId();
  const ids = {
    name: `${idPrefix}-name`,
    sets: `${idPrefix}-sets`,
    reps: `${idPrefix}-reps`,
    weight: `${idPrefix}-weight`,
    rest: `${idPrefix}-rest`,
    notes: `${idPrefix}-notes`,
  };
  const removeLink = 'w-full flex items-center justify-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] font-medium text-destructive hover:text-destructive/80 transition-colors py-1.5';

  // Segmented controls share one shape: mono caps, the active option a dark tile
  const segment = (active: boolean) => cn(
    'flex items-center gap-1.5 rounded-md font-mono uppercase tracking-[0.12em] font-medium transition-[background-color,color]',
    active ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
  );
  // Numbers read in the data voice, like the profile's vitals
  const numberInput = 'h-9 border-0 bg-transparent px-4 pb-2 pt-0.5 font-mono text-lg sm:text-lg font-semibold tabular-nums focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:font-normal placeholder:text-muted-foreground/40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';
  const unitSuffix = 'pointer-events-none absolute inset-y-0 right-4 flex items-center pb-1.5 font-mono text-xs text-muted-foreground';

  return (
    <>
      {/* Header — a mono back link to the day, the same shape as the page's
          "‹ Clients" link, then the exercise in display weight */}
      <div className="px-4 sm:px-5 pt-3 pb-3.5 border-b shrink-0">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            aria-label={`Back to ${dayName || 'workout'}`}
            className="group flex items-center gap-0.5 -ms-1.5 min-w-0 font-mono text-[11px] uppercase tracking-[0.12em] font-medium text-muted-foreground hover:text-foreground transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring tap-target"
          >
            <ChevronLeft className="w-3.5 h-3.5 shrink-0 group-hover:-translate-x-0.5 transition-transform duration-150" />
            <span className="truncate">{dayName || 'Workout'}</span>
          </button>

          {/* Mode switch */}
          <div className="flex rounded-lg border p-0.5 shrink-0" role="group" aria-label="Editor mode">
            <button
              aria-pressed={mode === 'library'}
              className={cn(segment(mode === 'library'), 'px-2.5 py-1 text-[10px]')}
              onClick={() => setMode('library')}
            >
              <Library className="w-3 h-3" />
              {isNew ? 'Library' : 'Replace'}
            </button>
            <button
              aria-pressed={mode === 'custom'}
              className={cn(segment(mode === 'custom'), 'px-2.5 py-1 text-[10px]')}
              onClick={() => setMode('custom')}
            >
              <Plus className="w-3 h-3" />
              {isNew ? 'Custom' : 'Details'}
            </button>
          </div>
        </div>
        <h2 className="mt-2 flex items-baseline gap-2.5 min-w-0 text-xl font-bold tracking-tight leading-tight antialiased">
          {exerciseNumber && (
            <span className="font-mono text-sm font-semibold tabular-nums text-muted-foreground shrink-0">
              {String(exerciseNumber).padStart(2, '0')}
            </span>
          )}
          <span className="truncate">
            {isNew ? 'Add exercise' : name.trim() || 'Untitled exercise'}
          </span>
        </h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {mode === 'library' ? (
          <>
            <div className="px-4 sm:px-5 pt-4 pb-3 space-y-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search exercises…"
                  aria-label="Search exercises"
                  className="h-11 pl-10 rounded-xl bg-muted/40 focus-visible:bg-background"
                />
              </div>

              {/* Category filter */}
              <div className="flex gap-1.5 flex-wrap" role="group" aria-label="Filter by category">
                {[null, ...categories].map((cat) => (
                  <button
                    key={cat ?? 'all'}
                    type="button"
                    aria-pressed={selectedCategory === cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={cn(
                      segment(selectedCategory === cat),
                      'h-7 px-2.5 text-[10px] border',
                      selectedCategory === cat ? 'border-foreground' : 'border-border hover:border-foreground/25'
                    )}
                  >
                    {cat ?? 'All'}
                  </button>
                ))}
              </div>
            </div>

            {/* Library list — full-bleed rows, same rhythm as the day's exercise list */}
            <div className="px-4 sm:px-5 py-2.5 border-y flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-medium antialiased">
                {searchQuery ? 'Results' : selectedCategory ?? 'Library'}
              </span>
              <span className="font-mono text-[11px] tabular-nums text-muted-foreground font-bold">
                {filteredLibrary.length}
              </span>
            </div>
            <div className="divide-y">
              {filteredLibrary.map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => isNew ? handleSelectFromLibrary(ex) : handleReplaceWithLibrary(ex)}
                  className="w-full flex items-center gap-3 text-left px-4 sm:px-5 py-3 transition-colors hover:bg-muted/60 active:bg-muted/80 group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm leading-snug truncate group-hover:translate-x-0.5 transition-transform duration-150">
                      {ex.name}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground truncate antialiased">
                      {ex.category}
                      {ex.equipment && <span className="text-border mx-1.5" aria-hidden="true">/</span>}
                      {ex.equipment}
                    </p>
                  </div>
                  {ex.defaultSets && ex.defaultReps && (
                    <span className="font-mono text-xs tabular-nums text-muted-foreground shrink-0 antialiased">
                      <span className="font-semibold text-foreground">{ex.defaultSets}</span>
                      <span className="mx-1">×</span>
                      {ex.defaultReps}
                    </span>
                  )}
                </button>
              ))}
              {filteredLibrary.length === 0 && (
                <div className="flex flex-col items-center text-center py-10 px-8">
                  <TallyMark size={44} className="text-foreground/15 mb-2" />
                  <p className="text-sm font-bold tracking-tight">No exercises found</p>
                  <Button
                    variant="link"
                    className="mt-1 text-xs"
                    onClick={() => {
                      setMode('custom');
                      setName(searchQuery);
                    }}
                  >
                    Create &ldquo;{searchQuery}&rdquo; as custom
                  </Button>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Custom / Edit form — each field a filled shell holding its own
             label, the same surfaces the coach dialogs are built from */
          <div className="px-4 sm:px-5 py-4 space-y-3">
            <FieldShell label="Exercise" htmlFor={ids.name}>
              <Input
                id={ids.name}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Barbell Squat"
                maxLength={100}
                className="h-10 border-0 bg-transparent px-4 pb-2 pt-0.5 text-base sm:text-base font-bold tracking-tight placeholder:font-normal placeholder:tracking-normal focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </FieldShell>

            <div className="grid grid-cols-2 gap-3">
              <FieldShell label="Sets" htmlFor={ids.sets}>
                <Input
                  id={ids.sets}
                  type="number"
                  value={sets}
                  onChange={(e) => setSets(e.target.value)}
                  min={1}
                  max={20}
                  className={numberInput}
                />
              </FieldShell>
              <FieldShell
                label={trackingType === 'TIME' ? 'Time' : 'Reps'}
                htmlFor={ids.reps}
                trailing={
                  <div className="flex rounded-md border p-px -my-1 -me-1.5" role="group" aria-label="Measure by">
                    {(['REPS', 'TIME'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => handleTrackingTypeChange(t)}
                        aria-pressed={trackingType === t}
                        className={cn(segment(trackingType === t), 'px-1.5 py-0.5 text-[9px] rounded')}
                      >
                        {t === 'REPS' ? 'Reps' : 'Time'}
                      </button>
                    ))}
                  </div>
                }
              >
                <Input
                  id={ids.reps}
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                  placeholder={trackingType === 'TIME' ? '30-60s' : '8-12'}
                  maxLength={20}
                  className={numberInput}
                />
              </FieldShell>

              {/* The coach's unit from Settings; clients each see their own */}
              <FieldShell label="Weight" htmlFor={ids.weight}>
                <div className="relative">
                  <Input
                    id={ids.weight}
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder={weightUnit === 'KG' ? '60' : '135'}
                    inputMode="decimal"
                    maxLength={20}
                    aria-label={`Weight in ${weightUnitLabel(weightUnit)}`}
                    className={cn(numberInput, 'pr-10')}
                  />
                  <span className={unitSuffix} aria-hidden="true">
                    {weightUnitLabel(weightUnit)}
                  </span>
                </div>
              </FieldShell>
              <FieldShell label="Rest" htmlFor={ids.rest}>
                <div className="relative">
                  <Input
                    id={ids.rest}
                    type="number"
                    value={restSeconds}
                    onChange={(e) => setRestSeconds(e.target.value)}
                    placeholder="60"
                    min={0}
                    max={600}
                    aria-label="Rest in seconds"
                    className={cn(numberInput, 'pr-10')}
                  />
                  <span className={unitSuffix} aria-hidden="true">sec</span>
                </div>
              </FieldShell>
            </div>

            {/* Superset toggle — only when there's an exercise above to pair with */}
            {previousExerciseName && (
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-muted/40 px-4 py-3">
                <div className="min-w-0">
                  <FieldLabel htmlFor="superset-toggle" className="flex items-center gap-1.5 cursor-pointer">
                    <Link2 className="w-3 h-3" />
                    Superset with previous
                  </FieldLabel>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 antialiased">
                    Pairs with <span className="font-semibold text-foreground">{previousExerciseName}</span>, client alternates sets
                  </p>
                </div>
                <Switch
                  id="superset-toggle"
                  checked={supersetWithPrevious}
                  onCheckedChange={setSupersetWithPrevious}
                />
              </div>
            )}

            <FieldShell label="Coaching notes" htmlFor={ids.notes}>
              <Textarea
                id={ids.notes}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Form cues, progressions, modifications…"
                rows={2}
                maxLength={500}
                className="min-h-[64px] resize-none border-0 bg-transparent px-4 pb-3 pt-1.5 text-base sm:text-sm leading-relaxed focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </FieldShell>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 sm:px-5 py-4 border-t bg-background">
        {mode === 'custom' ? (
          <div className="space-y-2">
            {/* The app's primary action: a volt fill, same as the coach dialogs */}
            <Button
              onClick={handleSave}
              disabled={!canSave || isSaving}
              className="w-full h-12 rounded-xl bg-brand text-brand-foreground hover:bg-brand/90 text-sm font-bold uppercase tracking-wider active:scale-[0.98] transition-[background-color,transform] duration-150"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                isNew ? 'Add exercise' : 'Save changes'
              )}
            </Button>

            {!isNew && onDelete && (
              showDeleteConfirm ? (
                <div className="flex items-center justify-center gap-3 py-1">
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Remove?</span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      onDelete();
                      onClose();
                    }}
                  >
                    Remove
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className={removeLink}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove exercise
                </button>
              )
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <StatusLine tone="idle">
              {isNew ? 'Pick one, or switch to custom' : 'Pick one to replace this exercise'}
            </StatusLine>
            {!isNew && onDelete && (
              <button
                onClick={() => {
                  onDelete();
                  onClose();
                }}
                className={removeLink}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remove exercise
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
