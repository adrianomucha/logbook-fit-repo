import { CheckIn } from '@/types';
import { format } from 'date-fns';
import { CHECK_IN_REPLY_COPY } from '@logbook/shared/checkin-reply';
import { CoachContextStrip } from './today/CoachContextStrip';

interface CoachFeedbackCardProps {
  checkIn: CheckIn | null;
  coachName: string;
  coachAvatar?: string;
  onViewDetails: () => void;
}

/**
 * The coach's reply to the latest check-in, on Today while it's fresh. The
 * same card as the coach's note; tapping it opens the full check-in.
 * Renders only for a check-in with a reply.
 */
export function CoachFeedbackCard({ checkIn, coachName, coachAvatar, onViewDetails }: CoachFeedbackCardProps) {
  if (!checkIn || checkIn.status !== 'completed' || !checkIn.coachResponse) {
    return null;
  }

  return (
    <CoachContextStrip
      coachName={coachName}
      coachAvatar={coachAvatar}
      label={CHECK_IN_REPLY_COPY.label}
      meta={format(new Date(checkIn.completedAt || checkIn.date), 'MMM d')}
      note={checkIn.coachResponse}
      maxLines={3}
      onClick={onViewDetails}
    />
  );
}
