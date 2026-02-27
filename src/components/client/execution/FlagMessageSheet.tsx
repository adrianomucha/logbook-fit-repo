import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Dumbbell, Send } from 'lucide-react';
import type { WorkoutExercise } from '@/types/api';
import { getCompletedSetsCount } from '@/hooks/api/useWorkoutExecution';

interface FlagMessageSheetProps {
  isOpen: boolean;
  onClose: () => void;
  exercise: WorkoutExercise | null;
  onSend: (message: string) => void;
}

export function FlagMessageSheet({
  isOpen,
  onClose,
  exercise,
  onSend,
}: FlagMessageSheetProps) {
  const [message, setMessage] = useState('');

  // Build prescription text
  const getPrescription = () => {
    if (!exercise) return '';
    const parts: string[] = [`${exercise.sets}x`];
    if (exercise.reps) parts.push(exercise.reps);
    if (exercise.weight) parts.push(`@ ${exercise.weight}`);
    return parts.join(' ');
  };

  // Reset message when sheet opens
  useEffect(() => {
    if (isOpen) {
      setMessage('');
    }
  }, [isOpen]);

  const handleSend = () => {
    onSend(message);
    setMessage('');
  };

  const setsCompleted = exercise ? getCompletedSetsCount(exercise) : 0;
  const totalSets = exercise?.sets ?? 0;
  const flagNote = exercise?.flag?.note;

  return (
    <Sheet open={isOpen && !!exercise} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl p-0 max-h-[70vh]">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
        </div>

        {/* Header */}
        <SheetHeader className="px-4 pb-3 border-b text-left">
          <SheetTitle>Message Coach</SheetTitle>
          <SheetDescription className="sr-only">
            Send a message to your coach about {exercise?.exercise.name}
          </SheetDescription>
        </SheetHeader>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(70vh-10rem)]">
          {/* Exercise context card - auto-attached */}
          <div className="bg-muted rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{exercise?.exercise.name}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {getPrescription()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Progress: {setsCompleted}/{totalSets} sets done
            </p>
            {flagNote && (
              <p className="text-sm mt-2 italic text-muted-foreground">
                Your note: &ldquo;{flagNote}&rdquo;
              </p>
            )}
          </div>

          {/* Message input */}
          <Textarea
            placeholder="Add more context for your coach..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="resize-none"
          />
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1 min-h-[44px]">
            Cancel
          </Button>
          <Button onClick={handleSend} className="flex-1 min-h-[44px]">
            <Send className="w-4 h-4 mr-2" />
            Send Message
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
