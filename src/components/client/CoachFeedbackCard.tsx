import { CheckIn } from '@/types';
import { truncateText } from '@/lib/checkin-context-helpers';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

interface CoachFeedbackCardProps {
  checkIn: CheckIn | null;
  onViewDetails: () => void;
}

/**
 * Card showing the coach's most recent feedback on the client dashboard.
 * Only renders if there's a completed check-in with coach response.
 */
export function CoachFeedbackCard({ checkIn, onViewDetails }: CoachFeedbackCardProps) {
  // Don't render if no check-in, not completed, or no coach response
  if (!checkIn || checkIn.status !== 'completed' || !checkIn.coachResponse) {
    return null;
  }

  const feedbackPreview = truncateText(checkIn.coachResponse, 200);
  const checkInDate = format(
    new Date(checkIn.completedAt || checkIn.date),
    'MMM d'
  );

  return (
    <Card className="border-info/20 bg-info/5">
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-info/10 shrink-0">
            <MessageSquare className="w-5 h-5 text-info" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground mb-1">
              Your Coach's Feedback
            </p>
            <p className="text-sm text-muted-foreground mb-2">
              "{feedbackPreview}"
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              From check-in on {checkInDate}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={onViewDetails}
              className="border-info/30 text-info hover:bg-info/5"
            >
              View Full Check-in
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
