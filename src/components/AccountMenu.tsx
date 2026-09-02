'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signIn, signOut } from 'next-auth/react';
import {
  ArrowLeftRight,
  ChevronDown,
  Loader2,
  LogOut,
  MessageSquarePlus,
  Trash2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FeedbackDialog } from '@/components/feedback/FeedbackDialog';
import { DeleteAccountDialog } from '@/components/account/DeleteAccountDialog';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { cn } from '@/lib/utils';

const ADMIN_LINKS = [
  { label: 'Waitlist', href: '/admin/waitlist' },
  { label: 'Accounts', href: '/admin/users' },
  { label: 'Feedback', href: '/admin/feedback' },
] as const;

const itemClass =
  'cursor-pointer gap-2 text-[13px] text-muted-foreground focus:text-foreground';

const sectionLabelClass =
  'px-2 pb-1 pt-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70';

/** Two-letter monogram for the trigger — falls back to the email's first letter. */
function initials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || '';
  if (!source) return '';
  const words = source.split(/\s+/).filter(Boolean);
  if (words.length > 1) return (words[0][0] + words[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

/**
 * Single entry point for everything that used to sit loose in the nav chrome:
 * the admin surfaces, the linked-account switch, and sign-out. Admin entries
 * render only for accounts on the ADMIN_EMAILS allowlist (the flag comes from
 * /api/me, so the check stays server-side) — they're purely navigational, and
 * every /admin page and API re-checks the allowlist independently.
 */
export function AccountMenu({ className }: { className?: string }) {
  const { user, isAdmin, linkedAccount } = useCurrentUser();
  const [isSwitching, setIsSwitching] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

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

  const monogram = initials(user?.name, user?.email);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Account menu"
          className={cn(
            'inline-flex items-center gap-1 rounded-full py-0.5 pl-0.5 pr-1.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 touch-manipulation',
            className
          )}
        >
          <span className="relative inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-muted/40 font-mono text-[10px] font-semibold uppercase tracking-[0.04em] text-foreground">
            {monogram}
            {isAdmin && (
              <span
                className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-brand ring-2 ring-background"
                aria-hidden="true"
              />
            )}
          </span>
          <ChevronDown className="h-3 w-3" aria-hidden="true" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="min-w-[13rem]">
          <DropdownMenuLabel className="pb-1 pt-1.5 font-normal">
            <span className="block truncate text-[13px] font-medium text-foreground">
              {user?.name || 'Account'}
            </span>
            {user?.email && (
              <span className="block truncate text-[11px] text-muted-foreground">
                {user.email}
              </span>
            )}
          </DropdownMenuLabel>

          {linkedAccount && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className={itemClass}
                disabled={isSwitching}
                // Keep the menu open so the spinner stays visible until the
                // hard navigation takes over.
                onSelect={(event) => {
                  event.preventDefault();
                  void switchAccount();
                }}
              >
                {isSwitching ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                Switch to {linkedAccount.role === 'COACH' ? 'coach' : 'client'}
              </DropdownMenuItem>
            </>
          )}

          {isAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className={sectionLabelClass}>
                Admin
              </DropdownMenuLabel>
              {ADMIN_LINKS.map(({ label, href }) => (
                <DropdownMenuItem key={href} asChild className={itemClass}>
                  <Link href={href}>
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-brand"
                      aria-hidden="true"
                    />
                    {label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem
            className={itemClass}
            onSelect={() => setIsFeedbackOpen(true)}
          >
            <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden="true" />
            Send feedback
          </DropdownMenuItem>
          <DropdownMenuItem
            className={itemClass}
            onSelect={() => signOut({ callbackUrl: '/login' })}
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            Sign out
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuItem
            className={cn(itemClass, 'text-destructive focus:text-destructive')}
            onSelect={() => setIsDeleteOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Delete account
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Sibling of the menu, not a child: the dropdown closes on select and
          would take the dialog down with it */}
      <FeedbackDialog
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
      />
      <DeleteAccountDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        role={user?.role}
      />
    </>
  );
}
