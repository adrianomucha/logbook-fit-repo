import { useState } from 'react';
import { CheckIn } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, History } from 'lucide-react';
import { format } from 'date-fns';

const FEELING_LABELS: Record<string, { label: string; emoji: string }> = {
  TOO_EASY: { label: 'Too Easy', emoji: '😴' },
  ABOUT_RIGHT: { label: 'About Right', emoji: '💪' },
  TOO_HARD: { label: 'Too Hard', emoji: '😰' },
  FRESH: { label: 'Fresh', emoji: '✨' },
  NORMAL: { label: 'Normal', emoji: '👍' },
  TIRED: { label: 'Tired', emoji: '😓' },
  RUN_DOWN: { label: 'Run Down', emoji: '🥴' },
};

interface PreviousCheckInsProps {
  checkIns: CheckIn[];
  clientId: string;
}

export function PreviousCheckIns({ checkIns, clientId }: PreviousCheckInsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const completedCheckIns = checkIns
    .filter(c => c.clientId === clientId && c.status === 'completed')
    .sort((a, b) => new Date(b.completedAt || b.date).getTime() - new Date(a.completedAt || a.date).getTime())
    .slice(0, 3);

  if (completedCheckIns.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full text-left"
        >
          <CardTitle className="text-base flex items-center gap-2">
            <History className="w-4 h-4" />
            Previous Check-ins ({completedCheckIns.length})
          </CardTitle>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </CardHeader>
      {isExpanded && (
        <CardContent>
          <div className="space-y-4">
            {completedCheckIns.map((checkIn) => (
              <div key={checkIn.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    {format(new Date(checkIn.completedAt || checkIn.date), 'MMM d, yyyy')}
                  </p>
                  <div className="flex items-center gap-2">
                    {checkIn.workoutFeeling && FEELING_LABELS[checkIn.workoutFeeling] && (
                      <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                        {FEELING_LABELS[checkIn.workoutFeeling].emoji} {FEELING_LABELS[checkIn.workoutFeeling].label}
                      </span>
                    )}
                    {checkIn.bodyFeeling && FEELING_LABELS[checkIn.bodyFeeling] && (
                      <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                        {FEELING_LABELS[checkIn.bodyFeeling].emoji} {FEELING_LABELS[checkIn.bodyFeeling].label}
                      </span>
                    )}
                  </div>
                </div>
                {checkIn.clientNotes && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {checkIn.clientNotes}
                  </p>
                )}
                {checkIn.coachResponse && (
                  <div className="bg-muted/50 rounded p-2">
                    <p className="text-xs font-medium mb-1">Coach response:</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {checkIn.coachResponse}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
