import { useState, useMemo, useEffect } from 'react';
import { Exercise, CoachExercise, ExerciseCategory, ExerciseEquipment } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, X, Plus } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface EnhancedExercisePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onAddExercises: (exercises: Exercise[]) => void;
  coachExercises: CoachExercise[];
  onCreateNew?: () => void;
}

const MAX_SELECTION = 20;

const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: 'ALL', label: 'All Categories' },
  { value: 'UPPER_BODY', label: 'Upper Body' },
  { value: 'LOWER_BODY', label: 'Lower Body' },
  { value: 'CORE', label: 'Core' },
  { value: 'CARDIO', label: 'Cardio' },
  { value: 'MOBILITY', label: 'Mobility' },
  { value: 'OTHER', label: 'Other' },
];

const EQUIPMENT_OPTIONS: { value: string; label: string }[] = [
  { value: 'ALL', label: 'All Equipment' },
  { value: 'BARBELL', label: 'Barbell' },
  { value: 'DUMBBELL', label: 'Dumbbell' },
  { value: 'KETTLEBELL', label: 'Kettlebell' },
  { value: 'BODYWEIGHT', label: 'Bodyweight' },
  { value: 'MACHINE', label: 'Machine' },
  { value: 'CABLE', label: 'Cable' },
  { value: 'BANDS', label: 'Bands' },
  { value: 'OTHER', label: 'Other' },
];

export function EnhancedExercisePicker({
  isOpen,
  onClose,
  onAddExercises,
  coachExercises,
  onCreateNew,
}: EnhancedExercisePickerProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [equipmentFilter, setEquipmentFilter] = useState<string>('ALL');

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedIds(new Set());
      setSearchQuery('');
      setCategoryFilter('ALL');
      setEquipmentFilter('ALL');
    }
  }, [isOpen]);

  // Filter exercises based on search and filters
  const filteredExercises = useMemo(() => {
    let filtered = coachExercises;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((ex) => ex.name.toLowerCase().includes(query));
    }

    // Apply category filter
    if (categoryFilter !== 'ALL') {
      filtered = filtered.filter((ex) => ex.category === categoryFilter);
    }

    // Apply equipment filter
    if (equipmentFilter !== 'ALL') {
      filtered = filtered.filter((ex) => ex.equipment === equipmentFilter);
    }

    return filtered;
  }, [coachExercises, searchQuery, categoryFilter, equipmentFilter]);

  const handleToggle = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else if (newSelected.size < MAX_SELECTION) {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredExercises.length) {
      // Deselect all
      setSelectedIds(new Set());
    } else {
      // Select all (up to max)
      const newSelected = new Set<string>();
      filteredExercises.slice(0, MAX_SELECTION).forEach((ex) => {
        newSelected.add(ex.id);
      });
      setSelectedIds(newSelected);
    }
  };

  const handleAddSelected = () => {
    const exercises: Exercise[] = Array.from(selectedIds)
      .map((id) => {
        const coachEx = coachExercises.find((ex) => ex.id === id);
        if (!coachEx) return null;

        const exercise: Exercise = {
          id: `ex-${Date.now()}-${Math.random()}`,
          name: coachEx.name,
          sets: coachEx.defaultSets,
          reps: '10',
          weight: '',
          notes: coachEx.notes || '',
        };
        return exercise;
      })
      .filter((ex): ex is Exercise => ex !== null);

    onAddExercises(exercises);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && selectedIds.size > 0) {
      handleAddSelected();
    }
  };

  if (!isOpen) return null;

  const allSelected = filteredExercises.length > 0 && selectedIds.size === filteredExercises.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <Card className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
        <CardContent className="pt-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Add Exercises to Workout</h3>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search exercises..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>

          {/* Filters */}
          <div className="flex gap-3 mb-4">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={equipmentFilter} onValueChange={setEquipmentFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Equipment" />
              </SelectTrigger>
              <SelectContent>
                {EQUIPMENT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {filteredExercises.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="ml-auto"
              >
                {allSelected ? 'Deselect All' : 'Select All'}
              </Button>
            )}
          </div>

          {/* Exercise List */}
          <div className="overflow-y-auto max-h-[50vh] min-h-[50vh] space-y-2 pr-2">
            {coachExercises.length === 0 && (
              <div className="text-center py-12 space-y-4">
                <p className="text-muted-foreground">
                  No exercises in your library yet.
                </p>
                {onCreateNew && (
                  <Button onClick={onCreateNew} variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Exercise
                  </Button>
                )}
              </div>
            )}

            {coachExercises.length > 0 && filteredExercises.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No exercises found. Try different filters or search terms.
              </p>
            )}

            {filteredExercises.map((exercise) => {
              const isSelected = selectedIds.has(exercise.id);
              const isDisabled = !isSelected && selectedIds.size >= MAX_SELECTION;

              return (
                <div
                  key={exercise.id}
                  className={`p-3 border rounded-md transition-colors ${
                    isSelected
                      ? 'bg-primary/10 border-primary'
                      : isDisabled
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-muted cursor-pointer'
                  }`}
                  onClick={() => !isDisabled && handleToggle(exercise.id)}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={isSelected}
                      disabled={isDisabled}
                      onCheckedChange={() => !isDisabled && handleToggle(exercise.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{exercise.name}</p>
                      <div className="flex gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                        <Badge variant="secondary" className="text-xs">
                          {exercise.category.replace('_', ' ')}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {exercise.equipment}
                        </Badge>
                        <span>{exercise.defaultSets} sets</span>
                        {exercise.usageCount > 0 && (
                          <span>• Used in {exercise.usageCount} plans</span>
                        )}
                      </div>
                      {exercise.notes && (
                        <p className="text-xs text-muted-foreground mt-1">
                          💬 {exercise.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selection warning */}
          {selectedIds.size >= MAX_SELECTION && (
            <div className="mt-3 text-sm text-warning bg-warning/10 border border-warning/20 rounded-md p-2">
              Maximum {MAX_SELECTION} exercises per selection. Add these first, then add more.
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            {onCreateNew && (
              <Button variant="outline" size="sm" onClick={onCreateNew}>
                <Plus className="w-4 h-4 mr-2" />
                Create New Exercise
              </Button>
            )}
            {!onCreateNew && <div />}

            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleAddSelected} disabled={selectedIds.size === 0}>
                Add Selected ({selectedIds.size})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
