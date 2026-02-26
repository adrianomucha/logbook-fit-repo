import { CheckIn, Client } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, AlertCircle, Timer } from 'lucide-react';

interface WeeklyConfidenceStripProps {
  clients: Client[];
  checkIns: CheckIn[];
}

export function WeeklyConfidenceStrip({ clients, checkIns }: WeeklyConfidenceStripProps) {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const checkedInThisWeek = clients.filter((client) => {
    const lastCheckIn = client.lastCheckInDate ? new Date(client.lastCheckInDate) : null;
    return lastCheckIn && lastCheckIn >= weekAgo;
  }).length;

  const needsAttention = clients.filter((client) => {
    const lastCheckIn = client.lastCheckInDate ? new Date(client.lastCheckInDate) : null;
    const daysSinceCheckIn = lastCheckIn
      ? Math.floor((Date.now() - lastCheckIn.getTime()) / (1000 * 60 * 60 * 24))
      : 999;
    return daysSinceCheckIn >= 5;
  }).length;

  // Calculate avg check-in response time from completed check-ins this month
  const avgCheckInTime = (() => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentCompleted = checkIns.filter(
      (c) => c.status === 'completed' && new Date(c.date) >= thirtyDaysAgo
    );
    if (recentCompleted.length === 0) return null;

    // Average days between client's lastCheckInDate and check-in date as a proxy
    // Since we don't track response time directly, show count of completed this month
    return recentCompleted.length;
  })();

  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardContent className="pt-4 sm:pt-6 pb-4 sm:pb-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-base sm:text-lg font-bold">This Week</p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Check-in completion across all clients
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl sm:text-3xl font-bold">
                {checkedInThisWeek}<span className="text-muted-foreground">/{clients.length}</span>
              </p>
              <p className="text-xs text-muted-foreground">checked in</p>
            </div>
          </div>

          <div className="flex gap-4 sm:gap-6 pt-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-success shrink-0" />
              <div>
                <p className="text-xl sm:text-2xl font-bold">{checkedInThisWeek}</p>
                <p className="text-xs text-muted-foreground">Checked In</p>
              </div>
            </div>
            {needsAttention > 0 && (
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-warning shrink-0" />
                <div>
                  <p className="text-xl sm:text-2xl font-bold">{needsAttention}</p>
                  <p className="text-xs text-muted-foreground">Need Attention</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 sm:w-5 sm:h-5 text-info shrink-0" />
              <div>
                <p className="text-xl sm:text-2xl font-bold">{avgCheckInTime ?? '—'}</p>
                <p className="text-xs text-muted-foreground">Check-ins / 30d</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
