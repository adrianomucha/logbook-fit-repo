'use client';

import { signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';

/**
 * Inline "switch account" control for the nav chrome. Replaces the old global
 * floating button that overlapped focused flows like the workout screen.
 */
export function SwitchAccountButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: '/login' })}
      className={cn(
        'text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60 hover:text-foreground transition-colors px-2 py-1.5 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 touch-manipulation',
        className
      )}
    >
      Switch
    </button>
  );
}
