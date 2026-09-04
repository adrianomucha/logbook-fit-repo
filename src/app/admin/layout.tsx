import { getServerSession } from 'next-auth';
import { notFound } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { isAdminEmail } from '@/lib/admin';
import { emailConfigStatus } from '@/lib/services/email';
import { envProblems, reportEnvProblemsOnce } from '@/lib/env-check';
import { AdminHeader } from './AdminHeader';
import { AdminTabProvider } from './AdminTabs';

export const dynamic = 'force-dynamic';

/**
 * Shell for every admin surface. The allowlist check runs here as well as in
 * each page: bouncing at the layout keeps the nav chrome itself from
 * advertising these routes to signed-in non-admins, who get a plain 404.
 *
 * The deployment-health banner also lives here rather than on any one page:
 * with no paid alerting, an admin visit is the alarm channel, so broken
 * env config (dead mailer, inert rate limiting, wrong link host) should be
 * unmissable on every admin screen.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!isAdminEmail(session?.user?.email)) {
    notFound();
  }

  reportEnvProblemsOnce();

  // In production every misconfiguration matters; in dev only the mailer is
  // worth a banner (Redis and NEXTAUTH_URL are expected to be absent).
  const mailer = emailConfigStatus();
  const problems =
    process.env.NODE_ENV === 'production'
      ? envProblems()
      : mailer.ok
        ? []
        : [mailer.reason];

  return (
    // The tab provider wraps header and page together so the header's tab
    // strip and the page's panels share one notion of "active".
    // h-dvh + overflow-hidden: admin never scrolls the window — long tables
    // scroll inside their own container instead.
    <AdminTabProvider>
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <AdminHeader />
      {problems.length > 0 && (
        <div className="mx-auto w-full max-w-7xl px-4 pt-6 sm:px-6">
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4"
          >
            <AlertTriangle
              className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
              aria-hidden="true"
            />
            <div className="text-sm leading-relaxed">
              <p className="font-semibold text-destructive">
                {problems.length === 1
                  ? 'Deployment configuration problem'
                  : 'Deployment configuration problems'}
              </p>
              <ul className="mt-1 space-y-1 text-muted-foreground">
                {problems.map((problem) => (
                  <li key={problem}>{problem}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
      {children}
    </div>
    </AdminTabProvider>
  );
}
