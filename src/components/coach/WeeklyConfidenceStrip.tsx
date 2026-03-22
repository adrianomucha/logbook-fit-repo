import { useState, useEffect } from 'react';
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

  // Animate bar segments growing from 0 on mount
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="bg-neutral-800 text-white rounded-xl px-4 py-5 sm:px-5 sm:py-6 space-y-3">
      {/* Single row: total + label | stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <p className="text-lg sm:text-xl font-black leading-none tracking-tight tabular-nums">
            {total}
          </p>
          <p className="text-[11px] sm:text-xs uppercase tracking-[0.12em] font-medium text-white/50">
            clients this week
          </p>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm">
          <div className="flex items-center gap-1.5">
            <span className={cn(
              'w-2 h-2 rounded-full bg-emerald-400 transition-transform duration-300',
              onTrack === total && total > 0 && 'scale-125'
            )} />
            <span className="font-bold tabular-nums">{onTrack}</span>
            <span className="text-white/50 font-medium">ok</span>
          </div>
          {needsAction > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="font-bold tabular-nums">{needsAction}</span>
              <span className="text-white/50 font-medium">pending</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className={cn(
              'w-2 h-2 rounded-full',
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

      {/* Ratio bar — segments grow from 0 on mount */}
      {total > 0 && (
        <div className="flex h-1.5 rounded-full overflow-hidden gap-0.5">
          {pctOnTrack > 0 && (
            <div
              className="bg-emerald-400 rounded-full transition-all duration-700 ease-out"
              style={{
                width: mounted ? `${pctOnTrack}%` : '0%',
                minWidth: mounted ? '4px' : '0px',
                transitionDelay: '0ms',
              }}
            />
          )}
          {pctNeedsAction > 0 && (
            <div
              className="bg-amber-400 rounded-full transition-all duration-700 ease-out"
              style={{
                width: mounted ? `${pctNeedsAction}%` : '0%',
                minWidth: mounted ? '4px' : '0px',
                transitionDelay: '150ms',
              }}
            />
          )}
          {pctAtRisk > 0 && (
            <div
              className="bg-red-400 rounded-full transition-all duration-700 ease-out"
              style={{
                width: mounted ? `${pctAtRisk}%` : '0%',
                minWidth: mounted ? '4px' : '0px',
                transitionDelay: '300ms',
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
