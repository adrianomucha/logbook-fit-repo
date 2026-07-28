'use client';

import Link from 'next/link';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { cn } from '@/lib/utils';

/**
 * Nav-chrome link to the admin surfaces, rendered only for accounts on the
 * ADMIN_EMAILS allowlist (the flag comes from /api/me, so the check itself
 * stays server-side). Purely navigational — every /admin page and API
 * re-checks the allowlist independently.
 */
export function AdminButton({ className }: { className?: string }) {
  const { isAdmin } = useCurrentUser();

  if (!isAdmin) return null;

  return (
    <Link
      href="/admin/waitlist"
      className={cn(
        'inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 touch-manipulation',
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />
      Admin
    </Link>
  );
}
