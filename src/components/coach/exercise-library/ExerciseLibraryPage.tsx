import { useState, useMemo } from 'react';
import { Search, Plus, Edit2, Trash2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ExerciseForm } from './ExerciseForm';
import type { CoachExercise, ExerciseCategory, ExerciseFormData } from '@/types';

interface ExerciseLibraryPageProps {
  exercises: CoachExercise[];
  onUpdateExercises: (updater: (exercises: CoachExercise[]) => CoachExercise[]) => void;
  onBack: () => void;
}

const CATEGORIES: { value: ExerciseCategory | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'UPPER_BODY', label: 'Upper Body' },
  { value: 'LOWER_BODY', label: 'Lower Body' },
  { value: 'CORE', label: 'Core' },
  { value: 'CARDIO', label: 'Cardio' },
  { value: 'MOBILITY', label: 'Mobility' },
  { value: 'OTHER', label: 'Other' },
];

const EQUIPMENT_LABELS: Record<string, string> = {
  BARBELL: 'Barbell',
  DUMBBELL: 'Dumbbell',
  KETTLEBELL: 'Kettlebell',
  BODYWEIGHT: 'Bodyweight',
  MACHINE: 'Machine',
  CABLE: 'Cable',
  BANDS: 'Bands',
  OTHER: 'Other',
};

export function ExerciseLibraryPage({
  exercises,
  onUpdateExercises,
  onBack,
}: ExerciseLibraryPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ExerciseCategory | 'ALL'>('ALL');
  const [showForm, setShowForm] = useState(false);
  const [editingExercise, setEditingExercise] = useState<CoachExercise | undefined>(
    undefined
  );

  // Filter exercises
  const filteredExercises = useMemo(() => {
    let filtered = exercises;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (ex) =>
          ex.name.toLowerCase().includes(query) ||
          ex.equipment.toLowerCase().includes(query) ||
          (ex.notes && ex.notes.toLowerCase().includes(query))
      );
    }

    // Category filter
    if (selectedCategory !== 'ALL') {
      filtered = filtered.filter((ex) => ex.category === selectedCategory);
    }

    return filtered;
  }, [exercises, searchQuery, selectedCategory]);

  // Group by category
  const groupedExercises = useMemo(() => {
    const groups: Record<string, CoachExercise[]> = {};

    filteredExercises.forEach((ex) => {
      if (!groups[ex.category]) {
        groups[ex.category] = [];
      }
      groups[ex.category].push(ex);
    });

    return groups;
  }, [filteredExercises]);

  const handleAddExercise = (data: ExerciseFormData) => {
    const now = new Date().toISOString();
    const newExercise: CoachExercise = {
      id: `ex-${Date.now()}-${Math.random()}`,
      coachId: 'coach-1', // TODO: Get from auth context
      name: data.name.trim(),
      category: data.category,
      equipment: data.equipment,
      defaultSets: data.defaultSets,
      notes: data.notes.trim(),
      usageCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    onUpdateExercises((exercises) => [...exercises, newExercise]);
  };

  const handleEditExercise = (data: ExerciseFormData) => {
    if (!editingExercise) return;

    onUpdateExercises((exercises) =>
      exercises.map((ex) =>
        ex.id === editingExercise.id
          ? {
              ...ex,
              name: data.name.trim(),
              category: data.category,
              equipment: data.equipment,
              defaultSets: data.defaultSets,
              notes: data.notes.trim(),
              updatedAt: new Date().toISOString(),
            }
          : ex
      )
    );

    setEditingExercise(undefined);
  };

  const handleDeleteExercise = (exerciseId: string) => {
    const exercise = exercises.find((ex) => ex.id === exerciseId);
    if (!exercise) return;

    const confirmMessage =
      exercise.usageCount > 0
        ? `Delete "${exercise.name}"? This exercise is used in ${exercise.usageCount} workout${
            exercise.usageCount > 1 ? 's' : ''
          }. It will be removed from future plans but existing workouts remain unchanged.`
        : `Delete "${exercise.name}"? This cannot be undone.`;

    if (window.confirm(confirmMessage)) {
      onUpdateExercises((exercises) => exercises.filter((ex) => ex.id !== exerciseId));
    }
  };

  const handleOpenForm = (exercise?: CoachExercise) => {
    setEditingExercise(exercise);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingExercise(undefined);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onBack} size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-2xl font-bold text-foreground">My Exercise Library</h2>
        </div>
        <Button onClick={() => handleOpenForm()} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Exercise
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="Search exercises..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Category Filters */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((cat) => (
          <Badge
            key={cat.value}
            variant={selectedCategory === cat.value ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setSelectedCategory(cat.value)}
          >
            {cat.label}
          </Badge>
        ))}
      </div>

      {/* Exercise List */}
      {filteredExercises.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No exercises found.</p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-primary hover:underline mt-2"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedExercises).map(([category, exs]) => (
            <div key={category} className="space-y-3">
              <h3 className="text-lg font-semibold text-foreground">
                {CATEGORIES.find((c) => c.value === category)?.label || category} (
                {exs.length})
              </h3>
              <div className="space-y-2">
                {exs.map((exercise) => (
                  <Card key={exercise.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-1">
                          <h4 className="font-medium text-foreground">{exercise.name}</h4>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span>{EQUIPMENT_LABELS[exercise.equipment]}</span>
                            <span>•</span>
                            <span>
                              {exercise.defaultSets} set{exercise.defaultSets !== 1 ? 's' : ''}
                            </span>
                            {exercise.usageCount > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-primary">
                                  Used in {exercise.usageCount} plan
                                  {exercise.usageCount !== 1 ? 's' : ''}
                                </span>
                              </>
                            )}
                          </div>
                          {exercise.notes && (
                            <p className="text-sm text-muted-foreground mt-2">💬 {exercise.notes}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenForm(exercise)}
                            title="Edit exercise"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteExercise(exercise.id)}
                            title="Delete exercise"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Exercise Form Modal */}
      {showForm && (
        <ExerciseForm
          isOpen={showForm}
          onClose={handleCloseForm}
          onSubmit={editingExercise ? handleEditExercise : handleAddExercise}
          initialData={editingExercise}
          existingExercises={exercises}
        />
      )}
    </div>
  );
}
