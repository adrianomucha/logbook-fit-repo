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

  return (
    <div className="bg-neutral-800 text-white rounded-xl p-4 sm:p-5 space-y-3.5">
      {/* Top row: hero number + label */}
      <div className="flex items-baseline gap-3">
        <p className="text-[32px] sm:text-[40px] font-black leading-none tracking-tight tabular-nums">
          {total}
        </p>
        <div>
          <p className="text-[11px] uppercase tracking-[0.15em] font-medium text-white/70 leading-tight">
            Active clients
          </p>
          <p className="text-[10px] uppercase tracking-[0.15em] text-white/40 mt-0.5">
            This week
          </p>
        </div>
      </div>

      {/* Ratio bar */}
      {total > 0 && (
        <div className="flex h-1.5 rounded-full overflow-hidden gap-0.5">
          {pctOnTrack > 0 && (
            <div
              className="bg-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${pctOnTrack}%`, minWidth: '6px' }}
            />
          )}
          {pctNeedsAction > 0 && (
            <div
              className="bg-amber-400 rounded-full transition-all duration-500"
              style={{ width: `${pctNeedsAction}%`, minWidth: '6px' }}
            />
          )}
          {pctAtRisk > 0 && (
            <div
              className="bg-red-400 rounded-full transition-all duration-500"
              style={{ width: `${pctAtRisk}%`, minWidth: '6px' }}
            />
          )}
        </div>
      )}

      {/* Stat row — compact */}
      <div className="flex gap-0">
        <div className="flex-1 border-r border-white/15 pr-3">
          <div className="flex items-baseline gap-1">
            <span className="text-lg sm:text-xl font-black tabular-nums leading-none">
              {onTrack}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
          </div>
          <p className="text-[10px] uppercase tracking-[0.12em] text-white/60 font-medium mt-1">
            On Track
          </p>
        </div>

        <div className={cn(
          'flex-1 px-3',
          atRisk > 0 && 'border-r border-white/15'
        )}>
          <div className="flex items-baseline gap-1">
            <span className="text-lg sm:text-xl font-black tabular-nums leading-none">
              {needsAction}
            </span>
            {needsAction > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
            )}
          </div>
          <p className="text-[10px] uppercase tracking-[0.12em] text-white/60 font-medium mt-1">
            Pending
          </p>
        </div>

        <div className="flex-1 pl-3">
          <div className="flex items-baseline gap-1">
            <span className={cn(
              'text-lg sm:text-xl font-black tabular-nums leading-none',
              atRisk > 0 && 'text-red-400'
            )}>
              {atRisk}
            </span>
            {atRisk > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0 animate-pulse" />
            )}
          </div>
          <p className={cn(
            'text-[10px] uppercase tracking-[0.12em] font-medium mt-1',
            atRisk > 0 ? 'text-red-400' : 'text-white/60'
          )}>
            At Risk
          </p>
        </div>
      </div>
    </div>
  );
}
