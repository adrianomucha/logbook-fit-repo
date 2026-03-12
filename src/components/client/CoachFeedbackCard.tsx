import { CheckIn } from '@/types';
import { truncateText } from '@/lib/checkin-context-helpers';
import { format } from 'date-fns';

interface CoachFeedbackCardProps {
  checkIn: CheckIn | null;
  onViewDetails: () => void;
}

/**
 * Coach feedback strip for the weekly view.
 * Only renders if there's a completed check-in with coach response.
 */
export function CoachFeedbackCard({ checkIn, onViewDetails }: CoachFeedbackCardProps) {
  if (!checkIn || checkIn.status !== 'completed' || !checkIn.coachResponse) {
    return null;
  }

  const feedbackPreview = truncateText(checkIn.coachResponse, 180);
  const checkInDate = format(
    new Date(checkIn.completedAt || checkIn.date),
    'MMM d'
  );

  return (
    <div className="rounded-lg bg-muted/40 px-4 py-3.5">
      <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-medium mb-1.5">
        Coach Feedback · {checkInDate}
      </p>
      <p className="text-sm text-foreground/80 leading-relaxed line-clamp-2 mb-2">
        {feedbackPreview}
      </p>
      <button
        onClick={onViewDetails}
        className="text-[11px] uppercase tracking-wide font-bold text-muted-foreground hover:text-foreground transition-colors touch-manipulation underline underline-offset-2"
      >
        View Check-in
      </button>
    </div>
  );
}
