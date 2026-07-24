'use client';

import { signOut, useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';

/**
 * Inline sign-out control for the nav chrome. Replaces the old global
 * floating button that overlapped focused flows like the workout screen.
 *
 * Reads as "Switch" only for admins, who hop between the coach and client
 * sides of a demo. Everyone else — a coach who just signed up, a real client —
 * gets a plain "Log out", which is what the action has always actually done.
 * Admin-ness comes from the session (server-derived from ADMIN_EMAILS); it is
 * a labelling decision, not an access grant, so there is nothing here to
 * enforce server-side.
 */
export function SwitchAccountButton({ className }: { className?: string }) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.isAdmin === true;

  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: '/login' })}
      className={cn(
        'text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 touch-manipulation',
        className
      )}
    >
      {isAdmin ? 'Switch' : 'Log out'}
    </button>
  );
}
