import { getOverviewStats, type Stat, type WeekBucket } from '@/lib/admin-stats';
import { overallLevel, type HealthCheck } from '@/lib/health';
import { HealthDot } from './HealthDot';
import { TabLink } from '../AdminTabs';

const weekFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

function StatCard({ stat }: { stat: Stat }) {
  const hasFlow = stat.last7 !== undefined || stat.last30 !== undefined;
  return (
    <div className="rounded-xl border border-border p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        {stat.label}
      </p>
      <p className="mt-2 font-mono text-3xl font-semibold tabular-nums tracking-tight">
        {stat.value}
      </p>
      {(hasFlow || stat.hint) && (
        <p className="mt-2 font-mono text-[11px] tabular-nums text-muted-foreground">
          {hasFlow && (
            <>
              <span className="text-foreground">+{stat.last7 ?? 0}</span> 7d ·{' '}
              <span className="text-foreground">+{stat.last30 ?? 0}</span> 30d
            </>
          )}
          {hasFlow && stat.hint && ' · '}
          {stat.hint}
        </p>
      )}
    </div>
  );
}

/**
 * Eight weekly bars, server-rendered as plain divs — the page has no client
 * JavaScript and this reads fine at a glance without a charting library.
 */
function WeekBars({ title, buckets }: { title: string; buckets: WeekBucket[] }) {
  const max = Math.max(1, ...buckets.map((b) => b.count));
  const total = buckets.reduce((sum, b) => sum + b.count, 0);
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-baseline justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          {title}
        </p>
        <p className="font-mono text-[11px] tabular-nums text-muted-foreground">
          {total} in {buckets.length} weeks
        </p>
      </div>
      <ol
        className="mt-4 flex h-28 items-end gap-2"
        aria-label={`${title}, by week`}
      >
        {buckets.map((b) => (
          <li
            key={b.weekStart.toISOString()}
            className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
            title={`Week of ${weekFmt.format(b.weekStart)}: ${b.count}`}
          >
            <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
              {b.count}
            </span>
            <div
              className="w-full rounded-sm bg-brand"
              style={{ height: `${Math.max(2, Math.round((b.count / max) * 72))}px` }}
              aria-hidden="true"
            />
            <span className="w-full truncate text-center font-mono text-[10px] text-muted-foreground">
              {weekFmt.format(b.weekStart)}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Section({ title, stats }: { title: string; stats: Stat[] }) {
  return (
    <section className="mt-8">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        {title}
      </h2>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} stat={stat} />
        ))}
      </div>
    </section>
  );
}

/**
 * Overview tab. `checks` is the same in-flight probe set the Health tab
 * awaits, started once by the page.
 */
export async function OverviewPanel({ checks: pending }: { checks: Promise<HealthCheck[]> }) {
  const [stats, checks] = await Promise.all([getOverviewStats(), pending]);
  const health = overallLevel(checks);
  const failing = checks.filter((c) => c.level !== 'ok');

  return (
    // Unlike the table pages this one scrolls as a whole: cards, not a grid.
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto py-10">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Admin
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Overview</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Counts only — demo and sample accounts are excluded, and chat is
              reported as volume, never content.
            </p>
          </div>
          <TabLink
            tab="health"
            className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
          >
            <HealthDot level={health} />
            {health === 'ok'
              ? 'All systems healthy'
              : `${failing.length} ${failing.length === 1 ? 'check needs' : 'checks need'} attention`}
          </TabLink>
        </div>

        <Section title="People" stats={stats.people} />
        <Section title="Activity" stats={stats.activity} />
        <Section title="Funnel" stats={stats.funnel} />

        <section className="mt-8 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <WeekBars title="Signups" buckets={stats.signupsByWeek} />
          <WeekBars title="Workouts completed" buckets={stats.workoutsByWeek} />
        </section>
      </div>
    </div>
  );
}
