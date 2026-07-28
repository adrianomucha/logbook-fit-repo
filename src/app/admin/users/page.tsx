import { getServerSession } from 'next-auth';
import { notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { isAdminEmail } from '@/lib/admin';
import { isDemoAccount, isLockedDemoAccount } from '@/lib/demo';
import prisma from '@/lib/prisma';
import { AdminNav } from '../AdminNav';
import { ResetPasswordButton } from './ResetPasswordButton';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Accounts · Admin', robots: { index: false } };

const dateFmt = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

function FlagChip({ label, title }: { label: string; title?: string }) {
  return (
    <span
      title={title}
      className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
    >
      {label}
    </span>
  );
}

export default async function AccountsAdminPage() {
  const session = await getServerSession(authOptions);

  // Same posture as the waitlist page: non-admins get a 404, not a redirect.
  if (!isAdminEmail(session?.user?.email)) {
    notFound();
  }

  // Every account ever created, deleted ones included — this page is the
  // owner's registry of the legacy era as much as the current one.
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      deletedAt: true,
      clientProfile: { select: { isSample: true } },
      coachProfile: { select: { _count: { select: { clients: true } } } },
    },
  });

  const active = users.filter((u) => !u.deletedAt);
  const coachCount = active.filter((u) => u.role === 'COACH').length;
  const demoCount = active.filter((u) => isDemoAccount(u.email)).length;

  return (
    <div className="min-h-dvh bg-background px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <AdminNav active="accounts" />

        <div className="mt-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Admin
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Accounts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-mono font-semibold tabular-nums text-foreground">
              {active.length}
            </span>{' '}
            active
            <span className="font-mono text-[11px] uppercase tracking-[0.08em]">
              {' '}
              · {coachCount} {coachCount === 1 ? 'coach' : 'coaches'} ·{' '}
              {active.length - coachCount}{' '}
              {active.length - coachCount === 1 ? 'client' : 'clients'} ·{' '}
              {demoCount} demo · {users.length - active.length} deleted
            </span>
          </p>
        </div>

        <div className="mt-8 overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                <th className="px-4 py-3 font-medium">Account</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Flags</th>
                <th className="px-4 py-3 text-right font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const locked = isLockedDemoAccount(user.email);
                const resettable = !user.deletedAt && !locked;
                return (
                  <tr
                    key={user.id}
                    className="border-b border-border/60 last:border-0"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium">{user.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {user.name}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em]">
                        {user.role === 'COACH'
                          ? `Coach · ${user.coachProfile?._count.clients ?? 0}`
                          : 'Client'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums text-muted-foreground">
                      {dateFmt.format(user.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex flex-wrap gap-1.5">
                        {isDemoAccount(user.email) && (
                          <FlagChip
                            label={locked ? 'Demo · locked' : 'Demo'}
                            title={
                              locked
                                ? 'Locked while demo mode is off in this deployment'
                                : undefined
                            }
                          />
                        )}
                        {user.clientProfile?.isSample && (
                          <FlagChip label="Sample" />
                        )}
                        {user.deletedAt && (
                          <FlagChip
                            label="Deleted"
                            title={`Deleted ${dateFmt.format(user.deletedAt)}`}
                          />
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {resettable ? (
                        <ResetPasswordButton userId={user.id} />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Reset shows a one-time temporary password — hand it over yourself,
          it&rsquo;s never shown again. Demo accounts stay locked regardless of
          password while demo mode is off.
        </p>
      </div>
    </div>
  );
}
