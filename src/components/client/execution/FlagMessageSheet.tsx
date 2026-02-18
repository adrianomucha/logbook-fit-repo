import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dumbbell, Send, X } from 'lucide-react';
import { Exercise } from '@/types';

interface FlagMessageSheetProps {
  isOpen: boolean;
  onClose: () => void;
  exercise: Exercise | null;
  flagNote?: string;
  completionState: { setsCompleted: number; totalSets: number };
  onSend: (message: string) => void;
}

export function FlagMessageSheet({
  isOpen,
  onClose,
  exercise,
  flagNote,
  completionState,
  onSend,
}: FlagMessageSheetProps) {
  const [message, setMessage] = useState('');
  const sheetRef = useRef<HTMLDivElement>(null);

  // Build prescription text
  const getPrescription = () => {
    if (!exercise) return '';
    const parts: string[] = [`${exercise.sets}x`];
    if (exercise.reps) parts.push(exercise.reps);
    if (exercise.time) parts.push(exercise.time);
    if (exercise.weight) parts.push(`@ ${exercise.weight}`);
    return parts.join(' ');
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Reset message when sheet opens
  useEffect(() => {
    if (isOpen) {
      setMessage('');
    }
  }, [isOpen]);

  if (!isOpen || !exercise) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSend = () => {
    onSend(message);
    setMessage('');
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50"
      onClick={handleBackdropClick}
    >
      {/* Bottom sheet */}
      <div
        ref={sheetRef}
        className="absolute bottom-0 left-0 right-0 bg-background rounded-t-2xl shadow-xl animate-in slide-in-from-bottom duration-300"
        style={{ maxHeight: '70vh' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-4 pb-3 flex items-center justify-between border-b">
          <h2 className="text-lg font-semibold">Message Coach</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(70vh - 120px)' }}>
          {/* Exercise context card - auto-attached */}
          <div className="bg-muted rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{exercise.name}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {getPrescription()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Progress: {completionState.setsCompleted}/{completionState.totalSets} sets done
            </p>
            {flagNote && (
              <p className="text-sm mt-2 italic text-muted-foreground">
                Your note: "{flagNote}"
              </p>
            )}
          </div>

          {/* Message input */}
          <div>
            <Textarea
              placeholder="Add more context for your coach..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
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
      </div>
    </div>
  );
}
