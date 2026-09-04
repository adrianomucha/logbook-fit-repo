import { getServerSession } from 'next-auth';
import { notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { isAdminEmail } from '@/lib/admin';
import { CRON_JOBS, latestCronRuns } from '@/lib/cron-runs';
import { overallLevel, runHealthChecks } from '@/lib/health';
import { HealthDot, healthLabel } from './HealthDot';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Health · Admin', robots: { index: false } };

const dateTimeFmt = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'UTC',
  timeZoneName: 'short',
});

function summarize(summary: unknown): string {
  if (!summary || typeof summary !== 'object') return '—';
  return Object.entries(summary as Record<string, unknown>)
    .map(([k, v]) => `${k} ${String(v)}`)
    .join(' · ');
}

export default async function HealthAdminPage() {
  const session = await getServerSession(authOptions);

  // Same posture as the other admin pages: non-admins get a 404, not a redirect.
  if (!isAdminEmail(session?.user?.email)) {
    notFound();
  }

  const [checks, runs] = await Promise.all([
    runHealthChecks(),
    latestCronRuns(CRON_JOBS.checkIns, 14).catch(() => []),
  ]);
  const overall = overallLevel(checks);
  const checkedAt = new Date();

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto py-10">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Admin
          </p>
          <h1 className="mt-1 flex items-center gap-3 text-2xl font-bold tracking-tight">
            <HealthDot level={overall} className="h-2.5 w-2.5" />
            Health
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live probes, run on every visit. Checked{' '}
            <span className="font-mono tabular-nums">{dateTimeFmt.format(checkedAt)}</span>
            . Reload to re-check.
          </p>
        </div>

        <ul className="mt-8 divide-y divide-border/60 rounded-xl border border-border">
          {checks.map((check) => (
            <li key={check.id} className="flex items-start gap-4 px-4 py-4">
              <HealthDot level={check.level} className="mt-1.5" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                  <p className="font-medium">{check.label}</p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    {healthLabel(check.level)}
                    {check.latencyMs !== undefined && (
                      <span className="tabular-nums"> · {check.latencyMs} ms</span>
                    )}
                  </p>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {check.detail}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <section className="mt-10">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Check-in sweep · recent runs
          </h2>
          {runs.length === 0 ? (
            <div className="mt-3 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No runs recorded yet. The sweep writes a row here every time it
              fires (nightly at 09:00 UTC, or by hand with the cron secret).
            </div>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-background shadow-[inset_0_-1px_0_0_hsl(var(--border))]">
                  <tr className="text-left font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground whitespace-nowrap">
                    <th className="px-4 py-3 font-medium">Started</th>
                    <th className="px-4 py-3 font-medium">Outcome</th>
                    <th className="px-4 py-3 font-medium">Duration</th>
                    <th className="px-4 py-3 font-medium">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => {
                    const duration = run.finishedAt
                      ? `${((run.finishedAt.getTime() - run.startedAt.getTime()) / 1000).toFixed(1)} s`
                      : 'unfinished';
                    return (
                      <tr
                        key={run.id}
                        className="border-b border-border/60 align-top last:border-0"
                      >
                        <td className="px-4 py-3 font-mono tabular-nums text-muted-foreground whitespace-nowrap">
                          {dateTimeFmt.format(run.startedAt)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-2">
                            <HealthDot level={run.ok === true ? 'ok' : 'warn'} />
                            {run.ok === true
                              ? 'Succeeded'
                              : run.finishedAt
                                ? 'Failed'
                                : 'Did not finish'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono tabular-nums text-muted-foreground whitespace-nowrap">
                          {duration}
                        </td>
                        <td className="min-w-[16rem] px-4 py-3 font-mono text-[11px] text-muted-foreground">
                          {run.error ?? summarize(run.summary)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p className="mt-4 text-xs text-muted-foreground">
          Email can only be checked for configuration — Resend has no probe
          that doesn&rsquo;t send. Send failures log{' '}
          <span className="font-mono">[EMAIL_ALERT]</span> in Vercel.
        </p>
      </div>
    </div>
  );
}
