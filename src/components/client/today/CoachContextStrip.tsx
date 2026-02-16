import { Card, CardContent } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';

interface CoachContextStripProps {
  coachName: string;
  coachAvatar?: string;
  message: string;
}

export function CoachContextStrip({ coachName, coachAvatar, message }: CoachContextStripProps) {
  // Truncate message to one line (approximately 80 chars)
  const truncatedMessage = message.length > 80 ? message.slice(0, 77) + '...' : message;

  return (
    <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-base shrink-0">
            {coachAvatar || <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-0.5">
              From {coachName}
            </p>
            <p className="text-sm text-foreground truncate">{truncatedMessage}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
