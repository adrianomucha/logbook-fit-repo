import { useId, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Send } from 'lucide-react';

type EffortRating = 'EASY' | 'MEDIUM' | 'HARD';

interface QuickEffortFeedbackProps {
  onSubmit: (rating: EffortRating, notes?: string) => void;
  isSubmitting?: boolean;
}

const effortOptions: { value: EffortRating; label: string; selectedClass: string }[] = [
  { value: 'EASY', label: 'Easy', selectedClass: 'text-success bg-success/10 border-success/40 ring-1 ring-success/20' },
  { value: 'MEDIUM', label: 'Medium', selectedClass: 'text-foreground bg-muted border-foreground/25 ring-1 ring-foreground/10' },
  { value: 'HARD', label: 'Hard', selectedClass: 'text-warning bg-warning/10 border-warning/40 ring-1 ring-warning/20' },
];

export function QuickEffortFeedback({ onSubmit, isSubmitting = false }: QuickEffortFeedbackProps) {
  const [selectedRating, setSelectedRating] = useState<EffortRating | null>(null);
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const promptId = useId();
  const notesId = useId();

  const handleSubmit = () => {
    if (!selectedRating) return;
    onSubmit(selectedRating, notes.trim() || undefined);
  };

  return (
    <Card className="border-border shadow-none">
      <CardContent className="p-5 sm:p-6">
        <p id={promptId} className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground mb-3">
          How did that feel?
        </p>

        {/* Named group + aria-pressed: selection was communicated by colour
            alone, and the buttons carried no reference to the question. */}
        <div role="group" aria-labelledby={promptId} className="flex gap-2.5 mb-4">
          {effortOptions.map((option) => {
            const isSelected = selectedRating === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelectedRating(option.value)}
                className={cn(
                  'flex-1 py-3.5 px-2 rounded-lg border-2 transition-[background-color,border-color,color,box-shadow] min-h-[52px] touch-manipulation',
                  'text-sm font-bold uppercase tracking-wide',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  isSelected
                    ? option.selectedClass
                    : 'border-transparent bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        {selectedRating && !showNotes && (
          <button
            type="button"
            onClick={() => setShowNotes(true)}
            className="text-xs text-muted-foreground hover:text-foreground underline mb-3 min-h-[44px] flex items-center touch-manipulation rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Add a note (optional)
          </button>
        )}

        {showNotes && (
          <>
            <label htmlFor={notesId} className="sr-only">
              Note for your coach
            </label>
            <Textarea
              id={notesId}
              placeholder="Felt strong on the last set"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mb-3 min-h-[60px] text-base sm:text-sm"
            />
          </>
        )}

        {selectedRating && (
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full"
          >
            <Send className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Sending…' : 'Send to coach'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
