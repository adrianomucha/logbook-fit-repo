import { CheckIn } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const FEELING_LABELS: Record<string, { label: string; emoji: string }> = {
  TOO_EASY: { label: 'Too Easy', emoji: '😴' },
  ABOUT_RIGHT: { label: 'About Right', emoji: '💪' },
  TOO_HARD: { label: 'Too Hard', emoji: '😰' },
  FRESH: { label: 'Fresh', emoji: '✨' },
  NORMAL: { label: 'Normal', emoji: '👍' },
  TIRED: { label: 'Tired', emoji: '😓' },
  RUN_DOWN: { label: 'Run Down', emoji: '🥴' },
};

interface LastCheckInSnippetProps {
  checkIn: CheckIn;
  clientName: string;
}

export function LastCheckInSnippet({ checkIn, clientName }: LastCheckInSnippetProps) {
  const notes = checkIn.clientNotes || checkIn.notes;
  const workoutFeeling = checkIn.workoutFeeling ? FEELING_LABELS[checkIn.workoutFeeling] : null;
  const bodyFeeling = checkIn.bodyFeeling ? FEELING_LABELS[checkIn.bodyFeeling] : null;

  return (
    <Card className="border-dashed">
      <CardContent className="py-3">
        <div className="flex items-start gap-3">
          <MessageCircle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground mb-1">
              {clientName}'s last check-in · {formatDistanceToNow(new Date(checkIn.completedAt || checkIn.date), { addSuffix: true })}
            </p>
            {(workoutFeeling || bodyFeeling) && (
              <div className="flex items-center gap-2 mb-1">
                {workoutFeeling && (
                  <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">
                    {workoutFeeling.emoji} {workoutFeeling.label}
                  </span>
                )}
                {bodyFeeling && (
                  <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">
                    {bodyFeeling.emoji} {bodyFeeling.label}
                  </span>
                )}
              </div>
            )}
            {notes && (
              <p className="text-sm italic line-clamp-2">
                "{notes}"
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
