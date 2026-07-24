import { getServerSession } from 'next-auth';
import { notFound } from 'next/navigation';
import { Download } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { isAdminEmail } from '@/lib/admin';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Waitlist · Admin', robots: { index: false } };

const dateFmt = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

export default async function WaitlistAdminPage() {
  const session = await getServerSession(authOptions);

  // Not an admin → 404 rather than a login redirect, so the route's
  // existence isn't advertised to signed-in non-admins.
  if (!isAdminEmail(session?.user?.email)) {
    notFound();
  }

  const entries = await prisma.waitlistEntry.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      createdAt: true,
      source: true,
      clientCount: true,
    },
  });

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
    <div className="min-h-dvh bg-background px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
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

        <div className="mt-8 overflow-x-auto rounded-xl border border-border">
          {entries.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              No signups yet.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Channel</th>
                  <th className="px-4 py-3 font-medium">Clients</th>
                  <th className="px-4 py-3 text-right font-medium">Joined</th>
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
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-muted-foreground">
                      {dateFmt.format(entry.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
