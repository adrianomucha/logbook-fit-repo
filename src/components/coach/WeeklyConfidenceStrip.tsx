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

// Solid fill per segment in the meter.
const SEG_FILL: Record<Bucket, string> = {
  ok: 'bg-emerald-400',
  pending: 'bg-amber-400',
  risk: 'bg-red-500',
};

// Dominant-state palette. `rgb` is space-separated for use in rgb(R G B / a).
const STATE = {
  ok: { rgb: '52 211 153', text: 'text-emerald-300' },
  pending: { rgb: '251 191 36', text: 'text-amber-300' },
  risk: { rgb: '248 113 113', text: 'text-red-400' },
} as const;

function Key({
  dot,
  value,
  label,
  active,
  pulse,
}: {
  dot: string;
  value: number;
  label: string;
  active: boolean;
  pulse?: boolean;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full',
          active ? dot : 'bg-white/15',
          active && pulse && 'animate-pulse motion-reduce:animate-none'
        )}
      />
      <span className={cn('font-bold tabular-nums', active ? 'text-white/85' : 'text-white/30')}>
        {value}
      </span>
      <span className={active ? 'text-white/45' : 'text-white/25'}>{label}</span>
    </span>
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

  // Animate cells powering on from a sliver, staggered.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // The card takes on the color of its most urgent state — risk wins over pending wins over ok.
  const dominant: Bucket = atRisk > 0 ? 'risk' : needsAction > 0 ? 'pending' : 'ok';
  const s = STATE[dominant];

  // State-aware verdict: tell the coach what to do, not just a count.
  const verdict =
    dominant === 'risk'
      ? { lead: `${atRisk} `, word: 'AT RISK', desc: 'check in today', live: true }
      : dominant === 'pending'
        ? { lead: `${needsAction} `, word: 'PENDING', desc: 'awaiting replies', live: true }
        : { lead: '', word: 'ALL CLEAR', desc: 'nice coaching', live: false };

  // Zero-padded odometer numeral with a dimmed leading zero.
  const padded = String(total).padStart(2, '0');
  const firstSig = padded.search(/[^0]/);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-neutral-900 to-neutral-950 ring-1 ring-white/10 text-white">
      {/* Graph-paper hairlines — instrument texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(90deg, #fff 0, #fff 1px, transparent 1px, transparent 30px)',
        }}
      />

      {/* Left severity rail — bleeds the dominant status color across the panel */}
      <div
        aria-hidden
        className="absolute inset-y-0 left-0 w-1 origin-top transition-transform duration-700 ease-out"
        style={{
          backgroundColor: `rgb(${s.rgb})`,
          boxShadow: `0 0 28px 3px rgb(${s.rgb} / 0.55)`,
          transform: mounted ? 'scaleY(1)' : 'scaleY(0)',
        }}
      />

      <div className="relative flex flex-col gap-2.5 pl-4 pr-4 py-3.5 sm:pl-6 sm:pr-5 sm:py-4">
        {/* Header: odometer count (left) + command verdict (right) */}
        <div className="flex items-end justify-between gap-3">
          <div className="flex items-end gap-2.5">
            <div className="font-bold tabular-nums tracking-tighter leading-[0.78] text-3xl sm:text-5xl">
              {padded.split('').map((ch, i) => (
                <span key={i} className={i < firstSig ? 'text-white/15' : 'text-white'}>
                  {ch}
                </span>
              ))}
            </div>
            <div className="pb-1 sm:pb-1.5 leading-[1.2]">
              <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.18em] font-medium text-white/45">
                clients
              </div>
              <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.18em] font-medium text-white/30">
                this week
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pb-1 min-w-0">
            <span
              className={cn(
                'h-3.5 sm:h-4 w-1.5 rounded-[2px] shrink-0',
                verdict.live && 'animate-pulse motion-reduce:animate-none'
              )}
              style={{
                backgroundColor: `rgb(${s.rgb})`,
                boxShadow: `0 0 12px rgb(${s.rgb} / 0.7)`,
              }}
            />
            <span
              className={cn(
                'font-bold tracking-tight tabular-nums whitespace-nowrap text-sm sm:text-base',
                s.text
              )}
            >
              {verdict.lead}
              {verdict.word}
            </span>
            <span className="hidden sm:inline text-[13px] font-medium text-white/35 whitespace-nowrap">
              · {verdict.desc}
            </span>
          </div>
        </div>

        {/* The meter — segments seated in a machined channel, one cell per client */}
        {total > 0 && (
          <div className="rounded-full bg-black/50 ring-1 ring-inset ring-white/5 p-1 shadow-[inset_0_1px_3px_rgba(0,0,0,0.6)]">
            <div className="flex gap-1">
              {cells.map((b, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex-1 h-3 sm:h-3.5 rounded-[4px] origin-bottom transition-all duration-500 ease-out',
                    SEG_FILL[b]
                  )}
                  style={{
                    transform: mounted ? 'scaleY(1)' : 'scaleY(0.12)',
                    opacity: mounted ? 1 : 0,
                    transitionDelay: `${i * 55}ms`,
                    boxShadow:
                      b === 'risk'
                        ? 'inset 0 1px 0 rgba(255,255,255,0.35), 0 0 14px -1px rgba(239,68,68,0.65)'
                        : 'inset 0 1px 0 rgba(255,255,255,0.3)',
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Legend — quiet status key */}
        <div className="flex items-center gap-4 text-xs sm:text-[13px]">
          <Key dot="bg-emerald-400" value={onTrack} label="on track" active={onTrack > 0} />
          <Key dot="bg-amber-400" value={needsAction} label="pending" active={needsAction > 0} pulse />
          <Key dot="bg-red-500" value={atRisk} label="at risk" active={atRisk > 0} pulse />
        </div>
      </div>
    </div>
  );
}
