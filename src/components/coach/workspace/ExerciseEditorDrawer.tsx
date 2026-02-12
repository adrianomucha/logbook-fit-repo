import { useState, useEffect, useMemo } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Library, Plus, Search, Trash2 } from 'lucide-react';
import { Exercise } from '@/types';
import { cn } from '@/lib/utils';
import { exerciseLibrary, ExerciseTemplate, searchExercises } from '@/lib/exercise-library';

interface ExerciseEditorDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Existing exercise to edit, or null for new exercise */
  exercise: Exercise | null;
  /** Called when exercise is saved */
  onSave: (exercise: Exercise) => void;
  /** Called when exercise is deleted (only shown when editing existing) */
  onDelete?: () => void;
  /** Exercise number for display (1-indexed) */
  exerciseNumber?: number;
}

export function ExerciseEditorDrawer({
  open,
  onOpenChange,
  exercise,
  onSave,
  onDelete,
  exerciseNumber,
}: ExerciseEditorDrawerProps) {
  const isNew = !exercise;
  const [mode, setMode] = useState<'library' | 'custom'>(isNew ? 'library' : 'custom');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Get unique categories from the library
  const categories = useMemo(() =>
    Array.from(new Set(exerciseLibrary.map((ex) => ex.category))),
    []
  );

  // Form state
  const [name, setName] = useState(exercise?.name || '');
  const [sets, setSets] = useState(exercise?.sets?.toString() || '3');
  const [reps, setReps] = useState(exercise?.reps || '10');
  const [weight, setWeight] = useState(exercise?.weight || '');
  const [weightUnit, setWeightUnit] = useState((exercise as any)?.weightUnit || 'lbs');
  const [restSeconds, setRestSeconds] = useState((exercise as any)?.restSeconds?.toString() || '');
  const [notes, setNotes] = useState(exercise?.notes || '');

  // Reset form when exercise changes
  useEffect(() => {
    if (exercise) {
      setName(exercise.name || '');
      setSets(exercise.sets?.toString() || '3');
      setReps(exercise.reps || '10');
      setWeight(exercise.weight || '');
      setWeightUnit((exercise as any)?.weightUnit || 'lbs');
      setRestSeconds((exercise as any)?.restSeconds?.toString() || '');
      setNotes(exercise.notes || '');
      setMode('custom'); // Start on form when editing
    } else {
      // New exercise - reset to defaults
      setName('');
      setSets('3');
      setReps('10');
      setWeight('');
      setWeightUnit('lbs');
      setRestSeconds('');
      setNotes('');
      setMode('library'); // Start on library for new
    }
    setSearchQuery('');
    setSelectedCategory(null);
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

  // Select from library (for new exercises) - populates with defaults
  const handleSelectFromLibrary = (template: ExerciseTemplate) => {
    setName(template.name);
    if (template.defaultSets) setSets(template.defaultSets.toString());
    if (template.defaultReps) setReps(template.defaultReps);
    if (template.notes) setNotes(template.notes);
    setMode('custom');
  };

  // Replace with library exercise (for existing) - keeps current sets/reps/weight
  const handleReplaceWithLibrary = (template: ExerciseTemplate) => {
    setName(template.name);
    // Optionally update defaults if current values are empty
    if (!sets || sets === '0') setSets(template.defaultSets?.toString() || '3');
    if (!reps) setReps(template.defaultReps || '10');
    setMode('custom');
  };

  const handleSave = () => {
    const savedExercise: Exercise = {
      id: exercise?.id || `ex-${Date.now()}`,
      name,
      sets: parseInt(sets) || 3,
      reps,
      weight: weight || undefined,
      notes: notes || undefined,
    };
    // Add extended properties
    (savedExercise as any).weightUnit = weightUnit;
    if (restSeconds) {
      (savedExercise as any).restSeconds = parseInt(restSeconds);
    }
    onSave(savedExercise);
    onOpenChange(false);
  };

  const canSave = name.trim().length > 0 && parseInt(sets) > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[480px] p-0 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <SheetHeader>
            <SheetTitle>
              {isNew ? 'Add Exercise' : `Edit Exercise${exerciseNumber ? ` #${exerciseNumber}` : ''}`}
            </SheetTitle>
            <SheetDescription>
              {isNew ? 'Choose from library or create custom' : 'Modify exercise details'}
            </SheetDescription>
          </SheetHeader>

          {/* Mode toggle - always available */}
          <div className="mt-4 flex gap-2">
            <Button
              variant={mode === 'library' ? 'default' : 'outline'}
              size="sm"
              className="flex-1 gap-2"
              onClick={() => setMode('library')}
            >
              <Library className="w-4 h-4" />
              {isNew ? 'From Library' : 'Replace'}
            </Button>
            <Button
              variant={mode === 'custom' ? 'default' : 'outline'}
              size="sm"
              className="flex-1 gap-2"
              onClick={() => setMode('custom')}
            >
              <Plus className="w-4 h-4" />
              {isNew ? 'Custom' : 'Edit Details'}
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {mode === 'library' ? (
            <div className="p-4 space-y-4">
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
              <div className="flex gap-2 flex-wrap">
                <Badge
                  variant={selectedCategory === null ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setSelectedCategory(null)}
                >
                  All
                </Badge>
                {categories.map((cat) => (
                  <Badge
                    key={cat}
                    variant={selectedCategory === cat ? 'default' : 'outline'}
                    className="cursor-pointer capitalize"
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </Badge>
                ))}
              </div>

              {/* Exercise list */}
              <div className="space-y-2">
                {filteredLibrary.map((ex) => (
                  <button
                    key={ex.id}
                    onClick={() => isNew ? handleSelectFromLibrary(ex) : handleReplaceWithLibrary(ex)}
                    className={cn(
                      'w-full text-left p-3 border rounded-lg transition-colors',
                      'hover:bg-muted/80 active:bg-muted'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{ex.name}</p>
                        <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                          <Badge variant="secondary" className="text-xs capitalize">
                            {ex.category}
                          </Badge>
                          {ex.equipment && (
                            <span>{ex.equipment}</span>
                          )}
                          {ex.defaultSets && ex.defaultReps && (
                            <span>
                              {ex.defaultSets} × {ex.defaultReps}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
                {filteredLibrary.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No exercises found</p>
                    <Button
                      variant="link"
                      className="mt-2"
                      onClick={() => {
                        setMode('custom');
                        setName(searchQuery);
                      }}
                    >
                      Create "{searchQuery}" as custom
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Custom / Edit form */
            <div className="p-4 space-y-4">
              {/* Exercise Name - with library picker */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Exercise Name</label>
                <div className="flex gap-2">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Barbell Squat"
                    className="flex-1"
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Sets</label>
                  <Input
                    type="number"
                    value={sets}
                    onChange={(e) => setSets(e.target.value)}
                    min="1"
                    max="20"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Reps</label>
                  <Input
                    value={reps}
                    onChange={(e) => setReps(e.target.value)}
                    placeholder="10 or 8-12"
                  />
                </div>
              </div>

              {/* Weight */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Weight</label>
                <div className="flex gap-2">
                  <Input
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="135"
                    className="flex-1"
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
                <label className="text-sm font-medium mb-1.5 block">Rest (seconds)</label>
                <Input
                  type="number"
                  value={restSeconds}
                  onChange={(e) => setRestSeconds(e.target.value)}
                  placeholder="60"
                />
              </div>

              {/* Coaching Notes */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Coaching Notes</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Form cues, progressions, modifications..."
                  rows={3}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-background">
          {mode === 'custom' ? (
            <div className="space-y-3">
              <Button
                onClick={handleSave}
                disabled={!canSave}
                className="w-full"
              >
                {isNew ? 'Add Exercise' : 'Save Changes'}
              </Button>

              {/* Delete option for existing exercises */}
              {!isNew && onDelete && (
                <button
                  onClick={() => {
                    onDelete();
                    onOpenChange(false);
                  }}
                  className="w-full text-center text-sm text-destructive hover:text-destructive/80 transition-colors py-2"
                >
                  <Trash2 className="w-4 h-4 inline mr-1.5" />
                  Remove Exercise
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-center text-sm text-muted-foreground">
                {isNew ? 'Select an exercise or switch to custom' : 'Select an exercise to replace current'}
              </p>
              {/* Delete option available in library mode too for existing */}
              {!isNew && onDelete && (
                <button
                  onClick={() => {
                    onDelete();
                    onOpenChange(false);
                  }}
                  className="w-full text-center text-sm text-destructive hover:text-destructive/80 transition-colors py-2"
                >
                  <Trash2 className="w-4 h-4 inline mr-1.5" />
                  Remove Exercise
                </button>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
