import { format } from 'date-fns';
import type { CheckIn } from '@logbook/shared/types';
import { CHECK_IN_REPLY_COPY } from '@logbook/shared/checkin-reply';
import { CoachContextStrip } from '@/components/today/CoachContextStrip';

/**
 * The coach's reply to the latest check-in, on Today while it's fresh. The
 * same card as the coach's note; tapping it opens the full check-in, and
 * the close button puts it away.
 * Renders only for a check-in with a reply.
 * The web's CoachFeedbackCard.
 */
export function CoachFeedbackCard({
  checkIn,
  coachName,
  coachAvatar,
  onViewDetails,
  onDismiss,
}: {
  checkIn: CheckIn | null;
  coachName: string;
  coachAvatar?: string | null;
  onViewDetails: () => void;
  onDismiss: () => void;
}) {
  if (!checkIn || checkIn.status !== 'completed' || !checkIn.coachResponse) return null;
  return (
    <CoachContextStrip
      coachName={coachName}
      coachAvatar={coachAvatar}
      label={CHECK_IN_REPLY_COPY.label}
      meta={format(new Date(checkIn.completedAt || checkIn.date), 'MMM d')}
      note={checkIn.coachResponse}
      maxLines={3}
      onPress={onViewDetails}
      openLabel={CHECK_IN_REPLY_COPY.open}
      onDismiss={onDismiss}
      dismissLabel={CHECK_IN_REPLY_COPY.dismiss}
    />
  );
}
