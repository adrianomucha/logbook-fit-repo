import { getServerSession } from 'next-auth';
import { notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { isAdminEmail } from '@/lib/admin';
import { AdminHeader } from './AdminHeader';

export const dynamic = 'force-dynamic';

/**
 * Shell for every admin surface. The allowlist check runs here as well as in
 * each page: bouncing at the layout keeps the nav chrome itself from
 * advertising these routes to signed-in non-admins, who get a plain 404.
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

  return (
    <div className="min-h-dvh bg-background">
      <AdminHeader />
      {children}
    </div>
  );
}
