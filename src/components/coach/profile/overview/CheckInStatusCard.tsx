import { Client, CheckIn } from '@/types';
import { ClientStatus } from '@/lib/client-status';
import { getActiveCheckIn } from '@/lib/checkin-helpers';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Clock, CheckCircle2, ClipboardCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface CheckInStatusCardProps {
  client: Client;
  status: ClientStatus;
  daysSinceCheckIn: number;
  checkIns?: CheckIn[];
  onStartCheckIn: () => void;
  onReviewCheckIn?: () => void;
  onSendMessage: () => void;
}

export function CheckInStatusCard({
  client,
  status,
  daysSinceCheckIn,
  checkIns,
  onStartCheckIn,
  onReviewCheckIn,
  onSendMessage
}: CheckInStatusCardProps) {
  // Check for pending check-in (sent to client, awaiting their response)
  const pendingCheckIn = checkIns ? getActiveCheckIn(client.id, checkIns) : undefined;
  const hasPendingAwaitingClient = pendingCheckIn?.status === 'pending';

  // Variant 0: Awaiting client response (Amber) — check-in sent but client hasn't responded
  if (hasPendingAwaitingClient && status.type !== 'pending-checkin') {
    const sentAgo = formatDistanceToNow(new Date(pendingCheckIn.date), { addSuffix: true });

    return (
      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
        <CardContent className="py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Clock className="w-10 h-10 text-amber-600 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-bold text-amber-900 dark:text-amber-100">
                  Check-in Sent
                </h3>
                <p className="text-sm text-amber-700 dark:text-amber-200">
                  Sent {sentAgo} · Waiting for {client.name} to respond
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={onReviewCheckIn}>
              View Check-in
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Variant 1: Overdue (Red)
  if (status.type === 'overdue') {
    return (
      <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
        <CardContent className="py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-10 h-10 text-red-600 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-bold text-red-900 dark:text-red-100">
                  Check-in Overdue
                </h3>
                <p className="text-sm text-red-700 dark:text-red-200">
                  {daysSinceCheckIn} days since last check-in · 7-day cadence · {daysSinceCheckIn - 7} {daysSinceCheckIn - 7 === 1 ? 'day' : 'days'} overdue
                </p>
              </div>
            </div>
            <Button variant="default" size="lg" onClick={onStartCheckIn}>
              <ClipboardCheck className="w-4 h-4 mr-2" />
              Send Check-in
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Variant 2: Pending Check-in (Blue)
  if (status.type === 'pending-checkin' && status.checkIn) {
    const checkInAge = Math.floor(
      (Date.now() - new Date(status.checkIn.date).getTime()) / (1000 * 60 * 60 * 24)
    );

    return (
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
        <CardContent className="py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3">
              <ClipboardCheck className="w-10 h-10 text-blue-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100">
                  Check-in Ready to Review
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-200">
                  Submitted {checkInAge} {checkInAge === 1 ? 'day' : 'days'} ago · Awaiting your response
                </p>
                {(status.checkIn.clientNotes || status.checkIn.notes) && (
                  <p className="text-sm text-blue-600 dark:text-blue-300 mt-1 italic line-clamp-1">
                    "{(() => {
                      const text = status.checkIn!.clientNotes || status.checkIn!.notes || '';
                      return text.length > 60 ? text.slice(0, 60) + '…' : text;
                    })()}"
                  </p>
                )}
              </div>
            </div>
            <Button variant="default" size="lg" onClick={onReviewCheckIn}>
              Review Check-in
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Variant 3: At Risk (Red - urgent)
  if (status.type === 'at-risk') {
    const daysUntilOverdue = 7 - daysSinceCheckIn;

    return (
      <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
        <CardContent className="py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-10 h-10 text-red-600 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-bold text-red-900 dark:text-red-100">
                  At Risk
                </h3>
                <p className="text-sm text-red-700 dark:text-red-200">
                  {daysSinceCheckIn} days since last check-in · 7-day cadence · {daysUntilOverdue} {daysUntilOverdue === 1 ? 'day' : 'days'} until overdue
                </p>
              </div>
            </div>
            <Button
              variant="default"
              size="lg"
              onClick={onStartCheckIn}
            >
              <ClipboardCheck className="w-4 h-4 mr-2" />
              Send Check-in
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Variant 4: All Caught Up (Green)
  const daysUntilNextCheckIn = Math.max(0, 7 - daysSinceCheckIn);

  return (
    <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
      <CardContent className="py-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-10 h-10 text-green-600 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-bold text-green-900 dark:text-green-100">
                All Caught Up
              </h3>
              <p className="text-sm text-green-700 dark:text-green-200">
                Checked in {daysSinceCheckIn} {daysSinceCheckIn === 1 ? 'day' : 'days'} ago · 7-day cadence · next due in {daysUntilNextCheckIn} {daysUntilNextCheckIn === 1 ? 'day' : 'days'}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onSendMessage}>
            Send Message
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
