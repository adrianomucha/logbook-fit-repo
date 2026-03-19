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
    <div className="bg-neutral-800 text-white rounded-xl p-4 sm:p-5 space-y-3.5">
      {/* Top row: label + hero number + week dots */}
      <div className="flex items-start justify-between">
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

        {/* Week progress dots */}
        <div className="flex gap-1.5 pt-1">
          {dayLabels.map((label, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className={cn(
                'text-[9px] font-bold uppercase',
                i <= dayIndex ? 'text-white/70' : 'text-white/40'
              )}>
                {label}
              </span>
              <div className={cn(
                'w-1.5 h-1.5 rounded-full',
                i < dayIndex
                  ? 'bg-white/50'
                  : i === dayIndex
                    ? 'bg-white w-1.5 h-1.5'
                    : 'bg-white/15'
              )} />
            </div>
          ))}
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
