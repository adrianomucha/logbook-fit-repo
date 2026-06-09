import { useState, useEffect } from 'react';
import type { DashboardClient } from '@/types/api';
import { cn } from '@/lib/utils';

interface WeeklyConfidenceStripProps {
  clients: DashboardClient[];
}

type Bucket = 'ok' | 'pending' | 'risk';

function bucketOf(c: DashboardClient): Bucket {
  if (c.urgency === 'ON_TRACK') return 'ok';
  if (c.urgency === 'AT_RISK') return 'risk';
  return 'pending'; // AWAITING_RESPONSE | CHECKIN_DUE
}

const ORDER: Record<Bucket, number> = { ok: 0, pending: 1, risk: 2 };

const STAT_STYLES = {
  emerald: { dot: 'bg-emerald-400', on: 'text-emerald-300' },
  amber: { dot: 'bg-amber-400', on: 'text-amber-300' },
  red: { dot: 'bg-red-400', on: 'text-red-300' },
} as const;

function Stat({
  color,
  value,
  label,
  active,
  pulse,
}: {
  color: keyof typeof STAT_STYLES;
  value: number;
  label: string;
  active: boolean;
  pulse?: boolean;
}) {
  const s = STAT_STYLES[color];
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={cn(
          'w-2 h-2 rounded-full transition-all',
          active ? s.dot : 'bg-white/15',
          active && pulse && 'animate-pulse'
        )}
      />
      <span className={cn('font-bold tabular-nums', active ? s.on : 'text-white/40')}>
        {value}
      </span>
      <span className={cn('font-medium', active ? 'text-white/55' : 'text-white/30')}>
        {label}
      </span>
    </div>
  );
}

export function WeeklyConfidenceStrip({ clients }: WeeklyConfidenceStripProps) {
  const total = clients.length;
  const buckets = clients.map(bucketOf);
  const onTrack = buckets.filter((b) => b === 'ok').length;
  const needsAction = buckets.filter((b) => b === 'pending').length;
  const atRisk = buckets.filter((b) => b === 'risk').length;

  // One cell per client, ordered ok → pending → risk so the meter reads left-to-right.
  const cells = [...buckets].sort((a, b) => ORDER[a] - ORDER[b]);

  // Animate cells rising in from 0 on mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Ambient glow reflects overall roster health.
  const allClear = total > 0 && onTrack === total;
  const mostlyRisk = total > 0 && atRisk / total >= 0.5;

  return (
    <div className="relative overflow-hidden rounded-xl px-4 py-5 sm:px-5 sm:py-6 flex flex-col gap-4 text-white bg-gradient-to-br from-neutral-800 to-neutral-900 ring-1 ring-white/5">
      {/* Ambient health glow */}
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute -top-16 -right-10 h-40 w-40 rounded-full blur-3xl transition-opacity duration-700',
          allClear ? 'bg-emerald-500/20' : mostlyRisk ? 'bg-red-500/20' : 'bg-amber-500/15',
          mounted ? 'opacity-100' : 'opacity-0'
        )}
      />

      {/* Header: total + legend */}
      <div className="relative flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <p className="text-2xl sm:text-3xl font-black leading-none tracking-tight tabular-nums">
            {total}
          </p>
          <p className="text-[11px] sm:text-xs uppercase tracking-[0.14em] font-semibold text-white/45">
            clients this week
          </p>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm">
          <Stat color="emerald" value={onTrack} label="ok" active={onTrack > 0} />
          {needsAction > 0 && (
            <Stat color="amber" value={needsAction} label="pending" active pulse />
          )}
          <Stat color="red" value={atRisk} label="risk" active={atRisk > 0} pulse={atRisk > 0} />
        </div>
      </div>

      {/* Roster meter — one segment per client */}
      {total > 0 && (
        <div className="relative flex gap-1">
          {cells.map((b, i) => (
            <div key={i} className="flex-1">
              <div
                className={cn(
                  'h-2.5 rounded-full origin-bottom transition-all duration-500 ease-out',
                  b === 'ok' && 'bg-emerald-400',
                  b === 'pending' && 'bg-amber-400',
                  b === 'risk' && 'bg-red-400 shadow-[0_0_10px_-1px] shadow-red-500/50'
                )}
                style={{
                  transform: mounted ? 'scaleY(1)' : 'scaleY(0)',
                  opacity: mounted ? 1 : 0,
                  transitionDelay: `${i * 60}ms`,
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
