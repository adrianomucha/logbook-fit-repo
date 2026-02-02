import { useState } from 'react';
import { Exercise } from '@/types';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreVertical,
  Copy,
  Files,
  ChevronUp,
  ChevronDown,
  Trash2,
} from 'lucide-react';

interface ExerciseRowProps {
  exercise: Exercise;
  exerciseIndex: number;
  isFirst: boolean;
  isLast: boolean;
  initialExpanded?: boolean;
  onUpdate: (field: keyof Exercise, value: any) => void;
  onDuplicate: () => void;
  onCopyToWorkouts: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}

export function ExerciseRow({
  exercise,
  exerciseIndex,
  isFirst,
  isLast,
  initialExpanded = false,
  onUpdate,
  onDuplicate,
  onCopyToWorkouts,
  onMoveUp,
  onMoveDown,
  onDelete,
}: ExerciseRowProps) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);

  return (
    <div className="group hover:bg-muted/50 transition-colors">
      {/* Collapsed View */}
      <div
        className="p-4 cursor-pointer flex items-center justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start gap-3 flex-1">
          <span className="text-sm font-semibold text-muted-foreground mt-0.5">
            {exerciseIndex + 1}.
          </span>
          <div className="flex-1">
            <div className="font-medium">{exercise.name}</div>
            <div className="text-sm text-muted-foreground">
              {exercise.sets} sets × {exercise.reps || '—'} reps
              {exercise.weight && ` @ ${exercise.weight}${!/[a-zA-Z]/.test(exercise.weight) ? ` ${(exercise as any).weightUnit || 'lbs'}` : ''}`}
            </div>
          </div>
        </div>

        {/* Actions Menu (visible on hover) */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate();
                }}
              >
                <Copy className="w-4 h-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onCopyToWorkouts();
                }}
              >
                <Files className="w-4 h-4 mr-2" />
                Copy to Other Workouts
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveUp();
                }}
                disabled={isFirst}
              >
                <ChevronUp className="w-4 h-4 mr-2" />
                Move Up
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveDown();
                }}
                disabled={isLast}
              >
                <ChevronDown className="w-4 h-4 mr-2" />
                Move Down
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Expanded Edit View */}
      {isExpanded && (
        <div
          className="px-4 pb-4 space-y-3 bg-muted/30"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Exercise Name */}
          <div>
            <label className="text-xs text-muted-foreground">Exercise Name</label>
            <Input
              value={exercise.name}
              onChange={(e) => onUpdate('name', e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Parameters Grid */}
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Sets</label>
              <Input
                type="number"
                value={exercise.sets}
                onChange={(e) => onUpdate('sets', parseInt(e.target.value))}
                min="1"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Reps</label>
              <Input
                value={exercise.reps || ''}
                onChange={(e) => onUpdate('reps', e.target.value)}
                placeholder="10 or 8-10"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Weight</label>
              <div className="flex gap-1 mt-1">
                <Input
                  value={exercise.weight || ''}
                  onChange={(e) => onUpdate('weight', e.target.value)}
                  placeholder="135"
                  className="w-20"
                />
                <Select
                  value={(exercise as any).weightUnit || 'lbs'}
                  onValueChange={(val: string) => onUpdate('weightUnit' as any, val)}
                >
                  <SelectTrigger className="w-16">
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
            <div>
              <label className="text-xs text-muted-foreground">Rest (sec)</label>
              <Input
                type="number"
                value={(exercise as any).restSeconds || ''}
                onChange={(e) => onUpdate('restSeconds' as any, e.target.value)}
                placeholder="60"
                className="mt-1"
              />
            </div>
          </div>

          {/* Coaching Notes */}
          <div>
            <label className="text-xs text-muted-foreground">Coaching Notes</label>
            <Textarea
              value={exercise.notes || ''}
              onChange={(e) => onUpdate('notes', e.target.value)}
              placeholder="Exercise coaching cues..."
              rows={2}
              className="mt-1"
            />
          </div>
        </div>
      )}
    </div>
  );
}
