import { getServerSession } from 'next-auth';
import { notFound } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { isAdminEmail } from '@/lib/admin';
import { emailConfigStatus } from '@/lib/services/email';
import { AdminHeader } from './AdminHeader';

export const dynamic = 'force-dynamic';

/**
 * Shell for every admin surface. The allowlist check runs here as well as in
 * each page: bouncing at the layout keeps the nav chrome itself from
 * advertising these routes to signed-in non-admins, who get a plain 404.
 *
 * The mailer health banner also lives here rather than on any one page:
 * with no paid alerting, an admin visit is the alarm channel, so broken
 * email config should be unmissable on every admin screen.
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

  const mailer = emailConfigStatus();

  return (
    // h-dvh + overflow-hidden: admin pages never scroll the window — long
    // tables scroll inside their own container instead.
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <AdminHeader />
      {!mailer.ok && (
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
                Email sending is broken
              </p>
              <p className="mt-1 text-muted-foreground">{mailer.reason}</p>
            </div>
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
