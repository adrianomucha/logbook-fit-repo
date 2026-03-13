import { useState } from 'react';
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

  const handleSubmit = () => {
    if (!selectedRating) return;
    onSubmit(selectedRating, notes.trim() || undefined);
  };

  return (
    <Card className="border-border">
      <CardContent className="p-5 sm:p-6">
        <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-medium mb-3">
          How did that feel?
        </p>

        <div className="flex gap-2.5 mb-4">
          {effortOptions.map((option) => {
            const isSelected = selectedRating === option.value;
            return (
              <button
                key={option.value}
                onClick={() => setSelectedRating(option.value)}
                className={cn(
                  'flex-1 py-3.5 px-2 rounded-lg border-2 transition-all min-h-[52px] touch-manipulation',
                  'text-sm font-bold uppercase tracking-wide',
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
            onClick={() => setShowNotes(true)}
            className="text-xs text-muted-foreground hover:text-foreground underline mb-3 min-h-[44px] flex items-center touch-manipulation"
          >
            Add a note (optional)
          </button>
        )}

        {showNotes && (
          <Textarea
            placeholder="Any notes for your coach..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mb-3 min-h-[60px] text-sm"
          />
        )}

        {selectedRating && (
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full"
          >
            <Send className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Sending...' : 'Send to Coach'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
