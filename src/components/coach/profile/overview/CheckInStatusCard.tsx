import { Client } from '@/types';
import { ClientStatus } from '@/lib/client-status';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Clock, CheckCircle2, ClipboardCheck } from 'lucide-react';

interface CheckInStatusCardProps {
  client: Client;
  status: ClientStatus;
  daysSinceCheckIn: number;
  onStartCheckIn: () => void;
  onReviewCheckIn?: () => void;
  onSendMessage: () => void;
}

export function CheckInStatusCard({
  client,
  status,
  daysSinceCheckIn,
  onStartCheckIn,
  onReviewCheckIn,
  onSendMessage
}: CheckInStatusCardProps) {
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
            <Button variant="destructive" size="lg" onClick={onStartCheckIn}>
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
                  Submitted {checkInAge} days ago · Awaiting your response
                </p>
                {status.checkIn.notes && (
                  <p className="text-sm text-blue-600 dark:text-blue-300 mt-1 italic line-clamp-1">
                    "{status.checkIn.notes.length > 60 ? status.checkIn.notes.slice(0, 60) + '…' : status.checkIn.notes}"
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
              variant="destructive"
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
