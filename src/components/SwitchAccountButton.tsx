'use client';

import { useState } from 'react';
import { signIn, signOut } from 'next-auth/react';
import { ArrowLeftRight, Loader2 } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { cn } from '@/lib/utils';

const controlClass =
  'inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 touch-manipulation disabled:opacity-60';

/**
 * Session controls for the nav chrome. When this account has a linked
 * counterpart (users.linkedUserId), a one-click switch appears beside the
 * sign-out: it trades the current session for the paired account via a
 * short-lived server-minted token — no password re-entry.
 */
export function SwitchAccountButton({ className }: { className?: string }) {
  const { linkedAccount } = useCurrentUser();
  const [isSwitching, setIsSwitching] = useState(false);

  const switchAccount = async () => {
    if (isSwitching) return;
    setIsSwitching(true);
    try {
      const res = await fetch('/api/account/switch', { method: 'POST' });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.token) {
        setIsSwitching(false);
        return;
      }

      const result = await signIn('account-switch', {
        token: data.token,
        redirect: false,
      });
      if (result?.error) {
        setIsSwitching(false);
        return;
      }

      // Hard navigation on purpose: the SWR cache is full of the old
      // account's data, and a full load swaps every bit of it at once.
      window.location.href = data.role === 'COACH' ? '/coach' : '/client';
    } catch {
      setIsSwitching(false);
    }
  };

  return (
    <span className={cn('flex items-center', className)}>
      {linkedAccount && (
        <button
          type="button"
          onClick={switchAccount}
          disabled={isSwitching}
          className={controlClass}
          title={`Switch to ${linkedAccount.name}`}
        >
          {isSwitching ? (
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
          ) : (
            <ArrowLeftRight className="h-3 w-3" aria-hidden="true" />
          )}
          {linkedAccount.role === 'COACH' ? 'Coach' : 'Client'}
        </button>
      )}
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: '/login' })}
        className={controlClass}
      >
        Sign out
      </button>
    </span>
  );
}
