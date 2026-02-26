import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Send, Smile, Meh, Frown } from 'lucide-react';

type EffortRating = 'EASY' | 'MEDIUM' | 'HARD';

interface QuickEffortFeedbackProps {
  onSubmit: (rating: EffortRating, notes?: string) => void;
  isSubmitting?: boolean;
}

const effortOptions: { value: EffortRating; label: string; icon: typeof Smile; color: string }[] = [
  { value: 'EASY', label: 'Easy', icon: Smile, color: 'text-success bg-success/10 border-success/30' },
  { value: 'MEDIUM', label: 'Medium', icon: Meh, color: 'text-foreground bg-muted border-foreground/20' },
  { value: 'HARD', label: 'Hard', icon: Frown, color: 'text-warning bg-warning/10 border-warning/30' },
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
      <CardContent className="p-4 sm:p-5">
        <h4 className="text-sm font-medium mb-3">How did that feel?</h4>

        <div className="flex gap-2 mb-3">
          {effortOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = selectedRating === option.value;
            return (
              <button
                key={option.value}
                onClick={() => setSelectedRating(option.value)}
                className={cn(
                  'flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-lg border-2 transition-all min-h-[44px] touch-manipulation',
                  isSelected
                    ? option.color
                    : 'border-transparent bg-muted/50 text-muted-foreground hover:bg-muted'
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{option.label}</span>
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
            size="sm"
          >
            <Send className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Sending...' : 'Send to Coach'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
