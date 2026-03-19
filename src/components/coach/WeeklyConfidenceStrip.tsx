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

  const pctOnTrack = total > 0 ? (onTrack / total) * 100 : 0;
  const pctNeedsAction = total > 0 ? (needsAction / total) * 100 : 0;
  const pctAtRisk = total > 0 ? (atRisk / total) * 100 : 0;

  return (
    <div className="bg-neutral-800 text-white rounded-xl px-4 py-3 sm:px-5 sm:py-3.5 space-y-2.5">
      {/* Single row: hero number + label | stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <p className="text-2xl sm:text-3xl font-black leading-none tracking-tight tabular-nums">
            {total}
          </p>
          <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.15em] font-medium text-white/50">
            clients this week
          </p>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 text-[11px] sm:text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="font-bold tabular-nums">{onTrack}</span>
            <span className="text-white/50 font-medium">ok</span>
          </div>
          {needsAction > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="font-bold tabular-nums">{needsAction}</span>
              <span className="text-white/50 font-medium">pending</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className={cn(
              'w-1.5 h-1.5 rounded-full',
              atRisk > 0 ? 'bg-red-400 animate-pulse' : 'bg-red-400/30'
            )} />
            <span className={cn(
              'font-bold tabular-nums',
              atRisk > 0 && 'text-red-400'
            )}>
              {atRisk}
            </span>
            <span className={cn(
              'font-medium',
              atRisk > 0 ? 'text-red-400/60' : 'text-white/50'
            )}>risk</span>
          </div>
        </div>
      </div>

      {/* Ratio bar */}
      {total > 0 && (
        <div className="flex h-1 rounded-full overflow-hidden gap-0.5">
          {pctOnTrack > 0 && (
            <div
              className="bg-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${pctOnTrack}%`, minWidth: '4px' }}
            />
          )}
          {pctNeedsAction > 0 && (
            <div
              className="bg-amber-400 rounded-full transition-all duration-500"
              style={{ width: `${pctNeedsAction}%`, minWidth: '4px' }}
            />
          )}
          {pctAtRisk > 0 && (
            <div
              className="bg-red-400 rounded-full transition-all duration-500"
              style={{ width: `${pctAtRisk}%`, minWidth: '4px' }}
            />
          )}
        </div>
      )}
    </div>
  );
}
