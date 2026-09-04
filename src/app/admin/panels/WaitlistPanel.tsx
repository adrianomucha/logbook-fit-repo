import { Download } from 'lucide-react';
import type { WaitlistStatus } from '@prisma/client';
import { waitlistInvitePath } from '@/lib/waitlist';
import prisma from '@/lib/prisma';
import { InviteActions } from './InviteActions';

const dateFmt = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const STATUS_BADGE: Record<WaitlistStatus, { label: string; className: string }> =
  {
    PENDING: {
      label: 'Pending',
      className: 'bg-muted text-muted-foreground',
    },
    INVITED: {
      label: 'Invited',
      className: 'border border-border text-foreground',
    },
    JOINED: {
      label: 'Joined',
      className: 'bg-brand text-brand-foreground',
    },
  };

function StatusBadge({
  status,
  detail,
}: {
  status: WaitlistStatus;
  detail?: string;
}) {
  const badge = STATUS_BADGE[status];
  return (
    <span
      title={detail}
      className={`inline-flex items-center rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] ${badge.className}`}
    >
      {badge.label}
    </span>
  );
}

/** Waitlist tab. Access is checked once by the /admin page that renders it. */
export async function WaitlistPanel() {
  const entries = await prisma.waitlistEntry.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      status: true,
      inviteToken: true,
      invitedAt: true,
      joinedAt: true,
      createdAt: true,
      source: true,
      clientCount: true,
    },
  });

  const counts = entries.reduce(
    (acc, e) => {
      acc[e.status] += 1;
      return acc;
    },
    { PENDING: 0, INVITED: 0, JOINED: 0 } as Record<WaitlistStatus, number>
  );

  // Signups per channel — the number that decides where the next push goes.
  // Entries from before attribution existed have no source and group as
  // "unknown" rather than being dropped from the count.
  const bySource = [...
    entries
      .reduce((acc, entry) => {
        const key = entry.source || 'unknown';
        acc.set(key, (acc.get(key) ?? 0) + 1);
        return acc;
      }, new Map<string, number>())
  ].sort((a, b) => b[1] - a[1]);

  return (
    <div className="flex min-h-0 flex-1 flex-col py-10">
      {/* Horizontal padding lives inside the centered box, matching the
          header, so page content and nav share the same left edge */}
      <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Admin
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Waitlist</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-mono font-semibold tabular-nums text-foreground">
                {entries.length}
              </span>{' '}
              {entries.length === 1 ? 'signup' : 'signups'}
              <span className="font-mono text-[11px] uppercase tracking-[0.08em]">
                {' '}
                · {counts.PENDING} pending · {counts.INVITED} invited ·{' '}
                {counts.JOINED} joined
              </span>
            </p>
          </div>
          <a
            href="/api/waitlist/export"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-foreground px-4 text-sm font-bold uppercase tracking-wider text-background transition-opacity hover:opacity-90"
          >
            <Download className="h-4 w-4" />
            Download CSV
          </a>
        </div>

        {bySource.length > 0 && (
          <div className="mt-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              By channel
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {bySource.map(([source, count]) => (
                <span
                  key={source}
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm"
                >
                  <span className="font-medium">{source}</span>
                  <span className="font-mono font-semibold tabular-nums text-muted-foreground">
                    {count}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* min-h-0 lets the table shrink to the viewport and scroll inside
            this container, so the page itself never scrolls vertically */}
        <div className="mt-8 min-h-0 overflow-auto rounded-xl border border-border">
          {entries.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              No signups yet.
            </p>
          ) : (
            <table className="w-full text-sm">
              {/* inset shadow instead of border-b: collapsed-table borders
                  scroll away under a sticky thead, the shadow stays put */}
              <thead className="sticky top-0 z-10 bg-background shadow-[inset_0_-1px_0_0_hsl(var(--border))]">
                <tr className="text-left font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Channel</th>
                  <th className="px-4 py-3 font-medium">Clients</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-border/60 last:border-0"
                  >
                    <td className="px-4 py-3 font-medium">{entry.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {entry.source || '—'}
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums text-muted-foreground">
                      {entry.clientCount || '—'}
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums text-muted-foreground">
                      {dateFmt.format(entry.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        status={entry.status}
                        detail={
                          entry.status === 'JOINED' && entry.joinedAt
                            ? `Joined ${dateFmt.format(entry.joinedAt)}`
                            : entry.status === 'INVITED' && entry.invitedAt
                              ? `Invited ${dateFmt.format(entry.invitedAt)}`
                              : undefined
                        }
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <InviteActions
                        id={entry.id}
                        status={entry.status}
                        invitePath={
                          entry.status === 'INVITED' && entry.inviteToken
                            ? waitlistInvitePath(entry.inviteToken)
                            : null
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Sending an invite emails a single-use signup link. Re-sending
          replaces the previous link, so it also works as a revoke.
        </p>
      </div>
    </div>
  );
}
