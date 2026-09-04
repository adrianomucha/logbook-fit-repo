import { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { isAdminEmail } from '@/lib/admin';
import { runHealthChecks } from '@/lib/health';
import { AdminPanels } from './AdminTabs';
import { OverviewPanel } from './panels/OverviewPanel';
import { WaitlistPanel } from './panels/WaitlistPanel';
import { AccountsPanel } from './panels/AccountsPanel';
import { FeedbackPanel } from './panels/FeedbackPanel';
import { HealthPanel } from './panels/HealthPanel';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin', robots: { index: false } };

/**
 * The whole admin area is this one page. Each tab is an async server
 * component streamed in behind its own fallback, so the shell and the first
 * finished panel paint without waiting for the slowest query (the health
 * probes, bounded at 4s each). Switching tabs is client-side — see
 * AdminTabs.tsx — and costs no request.
 */
export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  // Non-admins get a 404, not a redirect, so the route's existence isn't
  // advertised to signed-in users who aren't on the allowlist.
  if (!isAdminEmail(session?.user?.email)) {
    notFound();
  }

  // Started once, awaited by both the overview badge and the health tab.
  const checks = runHealthChecks();

  return (
    <AdminPanels
      panels={{
        overview: (
          <Suspense fallback={<PanelLoading label="Overview" />}>
            <OverviewPanel checks={checks} />
          </Suspense>
        ),
        waitlist: (
          <Suspense fallback={<PanelLoading label="Waitlist" />}>
            <WaitlistPanel />
          </Suspense>
        ),
        accounts: (
          <Suspense fallback={<PanelLoading label="Accounts" />}>
            <AccountsPanel />
          </Suspense>
        ),
        feedback: (
          <Suspense fallback={<PanelLoading label="Feedback" />}>
            <FeedbackPanel />
          </Suspense>
        ),
        health: (
          <Suspense fallback={<PanelLoading label="Health" />}>
            <HealthPanel checks={checks} />
          </Suspense>
        ),
      }}
    />
  );
}

/** Same eyebrow + title block as a loaded panel, so the layout doesn't jump. */
function PanelLoading({ label }: { label: string }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col py-10" aria-busy="true">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          Admin
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{label}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Loading…</p>
      </div>
    </div>
  );
}
