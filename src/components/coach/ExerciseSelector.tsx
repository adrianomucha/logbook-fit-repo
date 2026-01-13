import { useState } from 'react';
import { Exercise } from '@/types';
import { exerciseLibrary, ExerciseTemplate, searchExercises } from '@/lib/exercise-library';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, X } from 'lucide-react';

interface ExerciseSelectorProps {
  onSelect: (exercise: Exercise) => void;
  onClose: () => void;
}

export function ExerciseSelector({ onSelect, onClose }: ExerciseSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = Array.from(new Set(exerciseLibrary.map((ex) => ex.category)));

  const filteredExercises = searchQuery
    ? searchExercises(searchQuery)
    : selectedCategory
    ? exerciseLibrary.filter((ex) => ex.category === selectedCategory)
    : exerciseLibrary;

  const handleSelectExercise = (template: ExerciseTemplate) => {
    const exercise: Exercise = {
      id: `ex-${Date.now()}-${Math.random()}`,
      name: template.name,
      sets: template.defaultSets || 3,
      reps: template.defaultReps || '10',
      weight: '',
      notes: template.notes || ''
    };
    onSelect(exercise);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[80vh] flex flex-col">
        <CardContent className="pt-6 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Add Exercise</h3>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search exercises..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2 mb-4 flex-wrap">
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

          <ScrollArea className="flex-1">
            <div className="space-y-2">
              {filteredExercises.map((exercise) => (
                <div
                  key={exercise.id}
                  className="p-3 border rounded-md hover:bg-muted cursor-pointer transition-colors"
                  onClick={() => handleSelectExercise(exercise)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{exercise.name}</p>
                      <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                        <Badge variant="secondary" className="text-xs capitalize">
                          {exercise.category}
                        </Badge>
                        {exercise.equipment && (
                          <span>{exercise.equipment}</span>
                        )}
                        {exercise.defaultSets && exercise.defaultReps && (
                          <span>
                            {exercise.defaultSets} x {exercise.defaultReps}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {filteredExercises.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No exercises found. Try a different search term.
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
