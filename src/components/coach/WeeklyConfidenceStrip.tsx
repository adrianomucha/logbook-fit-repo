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
  risk: 'bg-destructive dark:bg-red-500',
};

const VERDICT_CHIP: Record<Bucket, string> = {
  ok: 'bg-success/10 text-success',
  pending: 'bg-warning/10 text-warning',
  risk: 'bg-destructive/10 text-destructive dark:bg-red-500/10 dark:text-red-400',
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
  // left-to-right like a meter — same avatars as the roster below.
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
      {/* Eyebrow + verdict pill */}
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium antialiased">
          This week
        </p>
        <p className={cn(
          'flex items-center gap-1.5 min-w-0 rounded-full px-2.5 py-1',
          'font-mono text-[10px] uppercase tracking-[0.12em] font-medium tabular-nums antialiased',
          VERDICT_CHIP[dominant]
        )}>
          <span
            className={cn(
              'w-1.5 h-1.5 rounded-full shrink-0',
              STATUS_DOT[dominant],
              dominant === 'risk' && 'animate-pulse'
            )}
            aria-hidden="true"
          />
          <span className="truncate">{verdict}</span>
        </p>
      </div>

      {/* Faces — one avatar per client, status as a presence dot */}
      {total > 0 && (
        <div className="flex flex-wrap items-center gap-2 mt-4">
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
                    'relative w-9 h-9 rounded-full flex items-center justify-center select-none',
                    'text-xs font-bold antialiased',
                    'transition-transform duration-150 hover:scale-110 active:scale-95',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                    avatarColor(displayName)
                  )}
                >
                  {displayName.charAt(0).toUpperCase()}
                  <span
                    className={cn(
                      'absolute -bottom-px -right-px w-3 h-3 rounded-full ring-2 ring-card',
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
              className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground tabular-nums select-none"
              title={`${overflow} more ${overflow === 1 ? 'client' : 'clients'}`}
            >
              +{overflow}
            </div>
          )}
        </div>
      )}

      {/* Status meter — the divider carries the data: each segment's width
          is that bucket's share of the roster. */}
      {total > 0 ? (
        <div
          className="flex h-1.5 gap-1 mt-4 origin-left transition-transform duration-500 ease-out"
          style={{ transform: mounted ? 'scaleX(1)' : 'scaleX(0)' }}
          aria-hidden="true"
        >
          {([['ok', onTrack], ['pending', needsAction], ['risk', atRisk]] as const)
            .filter(([, count]) => count > 0)
            .map(([bucket, count]) => (
              <div
                key={bucket}
                className={cn('rounded-full min-w-[10px]', STATUS_DOT[bucket])}
                style={{ flexGrow: count, flexBasis: 0 }}
              />
            ))}
        </div>
      ) : (
        <div className="border-t border-border mt-4" aria-hidden="true" />
      )}

      {/* Footer — count + legend on one quiet line */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-[11px] antialiased mt-3">
        <span>
          <span className="font-semibold tabular-nums">{total}</span>{' '}
          <span className="text-muted-foreground">{total === 1 ? 'client' : 'clients'}</span>
        </span>
        <Key dot={STATUS_DOT.ok} value={onTrack} label="on track" active={onTrack > 0} />
        <Key dot={STATUS_DOT.pending} value={needsAction} label="pending" active={needsAction > 0} />
        <Key dot={STATUS_DOT.risk} value={atRisk} label="at risk" active={atRisk > 0} />
      </div>
    </div>
  );
}
