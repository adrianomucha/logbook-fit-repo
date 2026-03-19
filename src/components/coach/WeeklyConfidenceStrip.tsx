import type { DashboardClient } from '@/types/api';
import { cn } from '@/lib/utils';

interface WeeklyConfidenceStripProps {
  clients: DashboardClient[];
}

export function WeeklyConfidenceStrip({ clients }: WeeklyConfidenceStripProps) {
  const total = clients.length;
  const onTrack = clients.filter((c) => c.urgency === 'ON_TRACK').length;
  const atRisk = clients.filter((c) => c.urgency === 'AT_RISK').length;
  const needsAction = clients.filter(
    (c) => c.urgency === 'AWAITING_RESPONSE' || c.urgency === 'CHECKIN_DUE'
  ).length;

  // Percentages for the ratio bar
  const pctOnTrack = total > 0 ? (onTrack / total) * 100 : 0;
  const pctNeedsAction = total > 0 ? (needsAction / total) * 100 : 0;
  const pctAtRisk = total > 0 ? (atRisk / total) * 100 : 0;

  // Day of week progress (0=Sun, 1=Mon … 6=Sat)
  const today = new Date().getDay();
  // Convert to Mon=0 … Sun=6 for a training-week perspective
  const dayIndex = today === 0 ? 6 : today - 1;
  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div className="bg-foreground text-background rounded-2xl p-5 sm:p-6 space-y-5">
      {/* Top row: label + hero number */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.2em] font-medium text-background/50">
            This Week
          </p>
          <p className="text-[40px] sm:text-[56px] font-black leading-[0.85] tracking-tight tabular-nums">
            {total}
          </p>
          <p className="text-[11px] sm:text-xs text-background/40 font-medium">
            active clients
          </p>
        </div>

        {/* Week progress dots */}
        <div className="flex gap-1.5 pt-1">
          {dayLabels.map((label, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className={cn(
                'text-[9px] font-bold uppercase',
                i <= dayIndex ? 'text-background/60' : 'text-background/20'
              )}>
                {label}
              </span>
              <div className={cn(
                'w-1.5 h-1.5 rounded-full transition-all',
                i < dayIndex
                  ? 'bg-background/50'
                  : i === dayIndex
                    ? 'bg-background w-2 h-2'
                    : 'bg-background/15'
              )} />
            </div>
          ))}
        </div>
      </div>

      {/* Ratio bar — stacked horizontal showing client health distribution */}
      {total > 0 && (
        <div className="space-y-2">
          <div className="flex h-2.5 sm:h-3 rounded-full overflow-hidden gap-px">
            {pctOnTrack > 0 && (
              <div
                className="bg-success rounded-full transition-all duration-500"
                style={{ width: `${pctOnTrack}%` }}
              />
            )}
            {pctNeedsAction > 0 && (
              <div
                className="bg-warning rounded-full transition-all duration-500"
                style={{ width: `${pctNeedsAction}%` }}
              />
            )}
            {pctAtRisk > 0 && (
              <div
                className="bg-destructive rounded-full transition-all duration-500"
                style={{ width: `${pctAtRisk}%` }}
              />
            )}
          </div>
        </div>
      )}

      {/* Stat row — dramatic numbers with tiny labels */}
      <div className="flex gap-0">
        {/* On Track — always shown */}
        <div className="flex-1 border-r border-background/10 pr-4">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black tabular-nums leading-none">
              {onTrack}
            </span>
            <span className="w-2 h-2 rounded-full bg-success shrink-0" />
          </div>
          <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.15em] text-background/40 font-medium mt-1">
            On Track
          </p>
        </div>

        {/* Needs Action */}
        <div className={cn(
          'flex-1 px-4',
          atRisk > 0 && 'border-r border-background/10'
        )}>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black tabular-nums leading-none">
              {needsAction}
            </span>
            {needsAction > 0 && (
              <span className="w-2 h-2 rounded-full bg-warning shrink-0" />
            )}
          </div>
          <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.15em] text-background/40 font-medium mt-1">
            Action
          </p>
        </div>

        {/* At Risk — visually heavier when non-zero */}
        <div className="flex-1 pl-4">
          <div className="flex items-baseline gap-1.5">
            <span className={cn(
              'text-2xl sm:text-3xl font-black tabular-nums leading-none',
              atRisk > 0 && 'text-destructive'
            )}>
              {atRisk}
            </span>
            {atRisk > 0 && (
              <span className="w-2 h-2 rounded-full bg-destructive shrink-0 animate-pulse" />
            )}
          </div>
          <p className={cn(
            'text-[10px] sm:text-[11px] uppercase tracking-[0.15em] font-medium mt-1',
            atRisk > 0 ? 'text-destructive/70' : 'text-background/40'
          )}>
            At Risk
          </p>
        </div>
      </div>
    </div>
  );
}
