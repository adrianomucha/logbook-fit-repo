import type { DashboardClient } from '@/types/api';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, AlertCircle, Users } from 'lucide-react';

interface WeeklyConfidenceStripProps {
  clients: DashboardClient[];
}

export function WeeklyConfidenceStrip({ clients }: WeeklyConfidenceStripProps) {
  const onTrack = clients.filter((c) => c.urgency === 'ON_TRACK').length;
  const atRisk = clients.filter((c) => c.urgency === 'AT_RISK').length;
  const needsAction = clients.filter(
    (c) => c.urgency === 'AWAITING_RESPONSE' || c.urgency === 'CHECKIN_DUE'
  ).length;

  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardContent className="pt-4 sm:pt-6 pb-4 sm:pb-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-base sm:text-lg font-bold">This Week</p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Client status overview
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl sm:text-3xl font-bold">
                {clients.length}
              </p>
              <p className="text-xs text-muted-foreground">active clients</p>
            </div>
          </div>

          <div className="flex gap-4 sm:gap-6 pt-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-success shrink-0" />
              <div>
                <p className="text-xl sm:text-2xl font-bold">{onTrack}</p>
                <p className="text-xs text-muted-foreground">On Track</p>
              </div>
            </div>
            {needsAction > 0 && (
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-info shrink-0" />
                <div>
                  <p className="text-xl sm:text-2xl font-bold">{needsAction}</p>
                  <p className="text-xs text-muted-foreground">Needs Action</p>
                </div>
              </div>
            )}
            {atRisk > 0 && (
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-warning shrink-0" />
                <div>
                  <p className="text-xl sm:text-2xl font-bold">{atRisk}</p>
                  <p className="text-xs text-muted-foreground">At Risk</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
