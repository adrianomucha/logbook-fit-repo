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
      <Card className="border-warning/30 bg-warning/5">
        <CardContent className="py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Clock className="w-10 h-10 text-warning flex-shrink-0" />
              <div>
                <h3 className="text-lg font-bold">
                  Check-in Sent
                </h3>
                <p className="text-sm text-muted-foreground">
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
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-10 h-10 text-destructive flex-shrink-0" />
              <div>
                <h3 className="text-lg font-bold">
                  Check-in Overdue
                </h3>
                <p className="text-sm text-muted-foreground">
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

  // Note: Removed Variant 2 (Pending Check-in blue banner) per Fix 17.
  // The pending check-in is already visible in the coach dashboard's action list
  // with a clear "Review Check-in" CTA. Per Design Principles ("Quiet until urgent"),
  // we don't show a redundant banner here. Falls through to "All Caught Up" instead.

  // Variant 3: At Risk (Red - urgent)
  if (status.type === 'at-risk') {
    const daysUntilOverdue = 7 - daysSinceCheckIn;

    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-10 h-10 text-destructive flex-shrink-0" />
              <div>
                <h3 className="text-lg font-bold">
                  At Risk
                </h3>
                <p className="text-sm text-muted-foreground">
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
    <Card className="border-success/30 bg-success/5">
      <CardContent className="py-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-10 h-10 text-success flex-shrink-0" />
            <div>
              <h3 className="text-lg font-bold">
                All Caught Up
              </h3>
              <p className="text-sm text-muted-foreground">
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
