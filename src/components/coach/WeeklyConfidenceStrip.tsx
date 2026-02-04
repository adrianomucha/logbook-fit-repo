import { CheckIn, Client } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, AlertCircle, Clock } from 'lucide-react';

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

  const atRisk = clients.filter((client) => {
    const lastCheckIn = client.lastCheckInDate ? new Date(client.lastCheckInDate) : null;
    const daysSinceCheckIn = lastCheckIn
      ? Math.floor((Date.now() - lastCheckIn.getTime()) / (1000 * 60 * 60 * 24))
      : 999;
    return daysSinceCheckIn >= 5 && daysSinceCheckIn < 7;
  }).length;

  const overdue = clients.filter((client) => {
    const lastCheckIn = client.lastCheckInDate ? new Date(client.lastCheckInDate) : null;
    const daysSinceCheckIn = lastCheckIn
      ? Math.floor((Date.now() - lastCheckIn.getTime()) / (1000 * 60 * 60 * 24))
      : 999;
    return daysSinceCheckIn >= 7;
  }).length;

  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardContent className="pt-4 sm:pt-6 pb-4 sm:pb-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-base sm:text-lg font-bold">This Week</p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Weekly check-in progress
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
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 shrink-0" />
              <div>
                <p className="text-xl sm:text-2xl font-bold">{checkedInThisWeek}</p>
                <p className="text-xs text-muted-foreground">Checked In</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 shrink-0" />
              <div>
                <p className="text-xl sm:text-2xl font-bold">{atRisk}</p>
                <p className="text-xs text-muted-foreground">At Risk</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 shrink-0" />
              <div>
                <p className="text-xl sm:text-2xl font-bold">{overdue}</p>
                <p className="text-xs text-muted-foreground">Overdue</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
