import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Library, Loader2, Plus, Search, Trash2 } from 'lucide-react';
import { Exercise } from '@/types';
import { cn } from '@/lib/utils';
import { exerciseLibrary, ExerciseTemplate, searchExercises } from '@/lib/exercise-library';

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

  // Form state
  const [name, setName] = useState(exercise?.name || '');
  const [sets, setSets] = useState(exercise?.sets?.toString() || '3');
  const [reps, setReps] = useState(exercise?.reps || '10');
  const [weight, setWeight] = useState(exercise?.weight || '');
  const [weightUnit, setWeightUnit] = useState(exercise?.weightUnit || 'lbs');
  const [restSeconds, setRestSeconds] = useState(exercise?.restSeconds?.toString() || '');
  const [notes, setNotes] = useState(exercise?.notes || '');

  // Reset form when exercise changes
  useEffect(() => {
    if (exercise) {
      setName(exercise.name || '');
      setSets(exercise.sets?.toString() || '3');
      setReps(exercise.reps || '10');
      setWeight(exercise.weight || '');
      setWeightUnit(exercise.weightUnit || 'lbs');
      setRestSeconds(exercise.restSeconds?.toString() || '');
      setNotes(exercise.notes || '');
      setMode('custom');
    } else {
      setName('');
      setSets('3');
      setReps('10');
      setWeight('');
      setWeightUnit('lbs');
      setRestSeconds('');
      setNotes('');
      setMode('library');
    }
    setSearchQuery('');
    setSelectedCategory(null);
    setShowDeleteConfirm(false);
    setIsSaving(false);
  }, [exercise, open]);

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
    if (template.defaultSets) setSets(template.defaultSets.toString());
    if (template.defaultReps) setReps(template.defaultReps);
    if (template.notes) setNotes(template.notes);
    setMode('custom');
  };

  // Replace with library exercise (for existing)
  const handleReplaceWithLibrary = (template: ExerciseTemplate) => {
    setName(template.name);
    if (!sets || sets === '0') setSets(template.defaultSets?.toString() || '3');
    if (!reps) setReps(template.defaultReps || '10');
    setMode('custom');
  };

  const handleSave = async () => {
    if (isSaving || !canSave) return;
    setIsSaving(true);
    const savedExercise: Exercise = {
      id: exercise?.id || `ex-${Date.now()}`,
      name: name.trim(),
      sets: Math.max(1, parseInt(sets) || 3),
      reps,
      weight: weight || undefined,
      weightUnit,
      restSeconds: restSeconds ? Math.max(0, parseInt(restSeconds)) : undefined,
      notes: notes.trim() || undefined,
    };
    try {
      await onSave(savedExercise);
    } finally {
      setIsSaving(false);
    }
    onClose();
  };

  const canSave = name.trim().length > 0 && parseInt(sets) > 0;

  return (
    <>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="mb-1">
          <h2 className="text-base font-bold">
            {isNew ? 'Add Exercise' : `Edit Exercise${exerciseNumber ? ` #${String(exerciseNumber).padStart(2, '0')}` : ''}`}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isNew ? 'Choose from library or create custom' : 'Modify exercise details'}
          </p>
        </div>

        {/* Mode toggle */}
        <div className="mt-3 flex gap-1.5">
          <button
            className={cn(
              'flex-1 text-xs font-medium px-3 py-1.5 rounded-md transition-all flex items-center justify-center gap-1.5',
              mode === 'library'
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
            onClick={() => setMode('library')}
          >
            <Library className="w-3.5 h-3.5" />
            {isNew ? 'Library' : 'Replace'}
          </button>
          <button
            className={cn(
              'flex-1 text-xs font-medium px-3 py-1.5 rounded-md transition-all flex items-center justify-center gap-1.5',
              mode === 'custom'
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
            onClick={() => setMode('custom')}
          >
            <Plus className="w-3.5 h-3.5" />
            {isNew ? 'Custom' : 'Details'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {mode === 'library' ? (
          <div className="p-4 space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search exercises..."
                className="pl-9"
              />
            </div>

            {/* Category filter */}
            <div className="flex gap-1.5 flex-wrap">
              <Badge
                variant={selectedCategory === null ? 'default' : 'outline'}
                className="cursor-pointer text-[10px]"
                onClick={() => setSelectedCategory(null)}
              >
                All
              </Badge>
              {categories.map((cat) => (
                <Badge
                  key={cat}
                  variant={selectedCategory === cat ? 'default' : 'outline'}
                  className="cursor-pointer capitalize text-[10px]"
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </Badge>
              ))}
            </div>

            {/* Exercise list */}
            <div className="space-y-1">
              {filteredLibrary.map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => isNew ? handleSelectFromLibrary(ex) : handleReplaceWithLibrary(ex)}
                  className={cn(
                    'w-full text-left px-3 py-2.5 rounded-lg transition-colors',
                    'hover:bg-muted/80 active:bg-muted'
                  )}
                >
                  <p className="font-bold text-sm truncate">{ex.name}</p>
                  <div className="flex gap-2 mt-0.5 text-[11px] text-muted-foreground items-center">
                    <span className="capitalize">{ex.category}</span>
                    {ex.equipment && (
                      <>
                        <span className="text-border">·</span>
                        <span>{ex.equipment}</span>
                      </>
                    )}
                    {ex.defaultSets && ex.defaultReps && (
                      <>
                        <span className="text-border">·</span>
                        <span className="tabular-nums">
                          {ex.defaultSets} × {ex.defaultReps}
                        </span>
                      </>
                    )}
                  </div>
                </button>
              ))}
              {filteredLibrary.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-2xl select-none mb-2">🔍</div>
                  <p className="text-sm text-muted-foreground antialiased">No exercises found</p>
                  <Button
                    variant="link"
                    className="mt-2 text-xs"
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
          </div>
        ) : (
          /* Custom / Edit form */
          <div className="p-4 space-y-4">
            {/* Exercise Name */}
            <div>
              <label className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-medium mb-1.5 block">
                Exercise Name
              </label>
              <div className="flex gap-2">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Barbell Squat"
                  maxLength={100}
                  className="flex-1 font-bold"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setMode('library')}
                  title="Pick from library"
                >
                  <Library className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Sets & Reps */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-medium mb-1.5 block">
                  Sets
                </label>
                <Input
                  type="number"
                  value={sets}
                  onChange={(e) => setSets(e.target.value)}
                  min={1}
                  max={20}
                  className="tabular-nums"
                />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-medium mb-1.5 block">
                  Reps
                </label>
                <Input
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                  placeholder="10 or 8-12"
                  maxLength={20}
                  className="tabular-nums"
                />
              </div>
            </div>

            {/* Weight */}
            <div>
              <label className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-medium mb-1.5 block">
                Weight
              </label>
              <div className="flex gap-2">
                <Input
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="135"
                  maxLength={20}
                  className="flex-1 tabular-nums"
                />
                <Select value={weightUnit} onValueChange={setWeightUnit}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lbs">lbs</SelectItem>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="bw">BW</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Rest */}
            <div>
              <label className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-medium mb-1.5 block">
                Rest (seconds)
              </label>
              <Input
                type="number"
                value={restSeconds}
                onChange={(e) => setRestSeconds(e.target.value)}
                placeholder="60"
                min={0}
                max={600}
                className="tabular-nums"
              />
            </div>

            {/* Coaching Notes */}
            <div>
              <label className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-medium mb-1.5 block">
                Notes
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Form cues, progressions, modifications..."
                rows={2}
                maxLength={500}
                className="text-sm resize-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t bg-background">
        {mode === 'custom' ? (
          <div className="space-y-2">
            <Button
              onClick={handleSave}
              disabled={!canSave || isSaving}
              className="w-full"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                isNew ? 'Add Exercise' : 'Save Changes'
              )}
            </Button>

            {!isNew && onDelete && (
              showDeleteConfirm ? (
                <div className="flex items-center justify-center gap-3 py-1">
                  <span className="text-xs text-muted-foreground">Remove?</span>
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
                  className="w-full text-center text-xs text-destructive hover:text-destructive/80 transition-colors py-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5 inline mr-1" />
                  Remove Exercise
                </button>
              )
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-center text-xs text-muted-foreground">
              {isNew ? 'Select an exercise or switch to custom' : 'Select to replace current exercise'}
            </p>
            {!isNew && onDelete && (
              <button
                onClick={() => {
                  onDelete();
                  onClose();
                }}
                className="w-full text-center text-xs text-destructive hover:text-destructive/80 transition-colors py-1.5"
              >
                <Trash2 className="w-3.5 h-3.5 inline mr-1" />
                Remove Exercise
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
