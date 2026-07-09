import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { DashboardClient } from '@/types/api';
import { cn } from '@/lib/utils';
import { avatarColor } from '@/components/coach/shared/clientSignals';

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
const STATUS_DOT: Record<Bucket, string> = {
  ok: 'bg-success',
  pending: 'bg-warning',
  risk: 'bg-destructive',
};

const VERDICT_TEXT: Record<Bucket, string> = {
  ok: 'text-success',
  pending: 'text-warning',
  risk: 'text-destructive',
};

const BUCKET_LABEL: Record<Bucket, string> = {
  ok: 'on track',
  pending: 'pending',
  risk: 'at risk',
};

// Cap the face row so a big roster wraps into a "+N" chip instead of sprawling.
const MAX_FACES = 14;

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
  const router = useRouter();
  const total = clients.length;
  const onTrack = clients.filter((c) => bucketOf(c) === 'ok').length;
  const needsAction = clients.filter((c) => bucketOf(c) === 'pending').length;
  const atRisk = clients.filter((c) => bucketOf(c) === 'risk').length;

  // One face per client, ordered ok → pending → risk so the row reads
  // left-to-right like the meter it replaces — same avatars as the roster below.
  const ordered = [...clients].sort((a, b) => ORDER[bucketOf(a)] - ORDER[bucketOf(b)]);
  const faces = ordered.slice(0, MAX_FACES);
  const overflow = ordered.length - faces.length;

  // Faces pop in on mount, staggered.
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

        {/* Faces + legend — one avatar per client, status as a presence dot */}
        <div className="flex-1 min-w-0 space-y-2.5">
          {total > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {faces.map((client, i) => {
                const bucket = bucketOf(client);
                const displayName = client.user.name || client.user.email;
                return (
                  <div
                    key={client.clientProfileId}
                    className="transition-[transform,opacity] duration-300 ease-out"
                    style={{
                      transform: mounted ? 'scale(1)' : 'scale(0)',
                      opacity: mounted ? 1 : 0,
                      transitionDelay: `${i * 40}ms`,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => router.push(`/coach/clients/${client.clientProfileId}`)}
                      title={`${displayName} — ${BUCKET_LABEL[bucket]}`}
                      aria-label={`${displayName}, ${BUCKET_LABEL[bucket]}`}
                      className={cn(
                        'relative w-7 h-7 rounded-full flex items-center justify-center select-none',
                        'text-[10px] font-bold antialiased',
                        'transition-transform duration-150 hover:scale-110 active:scale-95',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                        avatarColor(displayName)
                      )}
                    >
                      {displayName.charAt(0).toUpperCase()}
                      <span
                        className={cn(
                          'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-card',
                          STATUS_DOT[bucket]
                        )}
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                );
              })}
              {overflow > 0 && (
                <div
                  className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold text-muted-foreground tabular-nums select-none"
                  title={`${overflow} more ${overflow === 1 ? 'client' : 'clients'}`}
                >
                  +{overflow}
                </div>
              )}
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
