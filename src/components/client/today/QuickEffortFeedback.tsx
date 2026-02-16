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
  { value: 'EASY', label: 'Easy', icon: Smile, color: 'text-green-600 bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700' },
  { value: 'MEDIUM', label: 'Medium', icon: Meh, color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700' },
  { value: 'HARD', label: 'Hard', icon: Frown, color: 'text-red-600 bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700' },
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
    <Card className="border-slate-200 dark:border-slate-700">
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
                  'flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-lg border-2 transition-all',
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
            className="text-xs text-muted-foreground hover:text-foreground underline mb-3"
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
