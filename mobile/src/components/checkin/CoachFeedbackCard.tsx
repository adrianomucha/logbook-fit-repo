import { format } from 'date-fns';
import type { CheckIn } from '@logbook/shared/types';
import { CoachContextStrip } from '@/components/today/CoachContextStrip';

/**
 * The coach's reply to the latest check-in, on the week view. The same card
 * as the coach's note on Today. Renders only for a check-in with a reply.
 * The web's CoachFeedbackCard.
 */
export function CoachFeedbackCard({
  checkIn,
  coachName,
  coachAvatar,
  onViewDetails,
}: {
  checkIn: CheckIn | null;
  coachName: string;
  coachAvatar?: string | null;
  onViewDetails: () => void;
}) {
  if (!checkIn || checkIn.status !== 'completed' || !checkIn.coachResponse) return null;
  const date = format(new Date(checkIn.completedAt || checkIn.date), 'MMM d');
  return (
    <CoachContextStrip
      coachName={coachName}
      coachAvatar={coachAvatar}
      label={`Check-in reply, ${date}`}
      note={checkIn.coachResponse}
      maxLines={3}
      action={{ label: 'View check-in', onPress: onViewDetails }}
    />
  );
}
