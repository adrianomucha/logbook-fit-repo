import { Card, CardContent } from '@/components/ui/card';
import { Lightbulb } from 'lucide-react';

interface CoachContextStripProps {
  coachName: string;
  coachAvatar?: string;
  /** Coaching note/instruction for today's workout */
  note: string;
}

export function CoachContextStrip({ coachName, coachAvatar, note }: CoachContextStripProps) {
  // Truncate note to one line (approximately 80 chars)
  const truncatedNote = note.length > 80 ? note.slice(0, 77) + '...' : note;

  return (
    <Card className="border-info/20 bg-info/5">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-info/10 flex items-center justify-center text-base shrink-0">
            {coachAvatar || <Lightbulb className="w-4 h-4 text-info" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-info font-medium mb-0.5">
              Coach tip
            </p>
            <p className="text-sm text-foreground truncate">{truncatedNote}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
