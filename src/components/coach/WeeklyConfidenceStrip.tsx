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

// Flat status fills — same palette the rest of the app uses.
const SEG_FILL: Record<Bucket, string> = {
  ok: 'bg-success',
  pending: 'bg-warning',
  risk: 'bg-destructive',
};

const VERDICT_TEXT: Record<Bucket, string> = {
  ok: 'text-success',
  pending: 'text-warning',
  risk: 'text-destructive',
};

function Key({
  dot,
  value,
  label,
  active,
}: {
  dot: string;
  value: number;
  label: string;
  active: boolean;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn('w-1.5 h-1.5 rounded-full', active ? dot : 'bg-muted-foreground/20')} />
      <span className={cn('font-semibold tabular-nums', active ? 'text-foreground' : 'text-muted-foreground/40')}>
        {value}
      </span>
      <span className={active ? 'text-muted-foreground' : 'text-muted-foreground/40'}>{label}</span>
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

  // Animate cells growing in on mount, staggered.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // The verdict takes on the most urgent state — risk wins over pending wins over ok.
  const dominant: Bucket = atRisk > 0 ? 'risk' : needsAction > 0 ? 'pending' : 'ok';
  const verdict =
    dominant === 'risk'
      ? `${atRisk} at risk · check in today`
      : dominant === 'pending'
        ? `${needsAction} pending · awaiting replies`
        : 'All clear';

  return (
    <div className={cn(
      'bg-card rounded-xl overflow-hidden p-4 sm:p-5',
      'shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.03),0_0_0_1px_rgba(0,0,0,0.04)]'
    )}>
      {/* Eyebrow + verdict */}
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium antialiased">
          This week
        </p>
        <p className={cn(
          'font-mono text-[10px] uppercase tracking-[0.14em] font-medium tabular-nums antialiased truncate',
          VERDICT_TEXT[dominant]
        )}>
          {verdict}
        </p>
      </div>

      <div className="flex items-center gap-5 sm:gap-6">
        {/* Client count */}
        <div className="shrink-0">
          <p className="font-mono text-3xl font-semibold tabular-nums leading-none antialiased">
            {total}
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium antialiased mt-1.5">
            {total === 1 ? 'Client' : 'Clients'}
          </p>
        </div>

        {/* Meter + legend — one cell per client */}
        <div className="flex-1 min-w-0 space-y-2.5">
          {total > 0 && (
            <div className="flex gap-1" aria-hidden="true">
              {cells.map((b, i) => (
                <div
                  key={i}
                  className={cn('flex-1 h-2.5 rounded-full transition-[transform,opacity] duration-500 ease-out', SEG_FILL[b])}
                  style={{
                    transform: mounted ? 'scaleX(1)' : 'scaleX(0)',
                    transformOrigin: 'left',
                    opacity: mounted ? 1 : 0,
                    transitionDelay: `${i * 55}ms`,
                  }}
                />
              ))}
            </div>
          )}
          <div className="flex items-center gap-4 font-mono text-[11px] antialiased">
            <Key dot="bg-success" value={onTrack} label="on track" active={onTrack > 0} />
            <Key dot="bg-warning" value={needsAction} label="pending" active={needsAction > 0} />
            <Key dot="bg-destructive" value={atRisk} label="at risk" active={atRisk > 0} />
          </div>
        </div>
      </div>
    </div>
  );
}
