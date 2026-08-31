'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AccountMenu } from '@/components/AccountMenu';
import { Logo, LogoMark } from '@/components/brand/LogoMark';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { cn } from '@/lib/utils';

const SECTIONS = [
  { label: 'Waitlist', href: '/admin/waitlist' },
  { label: 'Accounts', href: '/admin/users' },
  { label: 'Feedback', href: '/admin/feedback' },
] as const;

/**
 * Nav chrome for the admin surfaces — same shape as the coach and client
 * headers, so admin doesn't feel like a detached corner of the app. The
 * logotype is the way back: it points at whichever home this session's role
 * has ("/" resolves there too, and covers the moment before /api/me lands).
 */
export function AdminHeader() {
  const pathname = usePathname();
  const { role } = useCurrentUser();

  const homeHref = role === 'COACH' ? '/coach' : role === 'CLIENT' ? '/client' : '/';

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-sm">
      <div className="mx-auto flex h-12 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center self-stretch gap-3 sm:gap-6">
          {/* Logotype — doubles as "back to the app" */}
          <Link
            href={homeHref}
            aria-label="Back to Logbook Fitness"
            className="flex items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <LogoMark size={20} className="sm:hidden" />
            <Logo markSize={20} className="hidden sm:inline-flex" />
          </Link>

          {/* Brand / nav divider */}
          <div className="h-3.5 w-px bg-border" aria-hidden="true" />

          {/* Section tabs — underline indicator sits on the header hairline */}
          <nav
            className="flex items-stretch self-stretch gap-4 sm:gap-5"
            aria-label="Admin sections"
          >
            {SECTIONS.map(({ label, href }) => {
              // startsWith, not equality: any future detail page under a
              // section keeps that section marked.
              const isActive = pathname?.startsWith(href) ?? false;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'inline-flex items-center border-b-2 px-0.5 font-mono text-[11px] font-medium uppercase tracking-[0.12em] transition-colors touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                    isActive
                      ? 'border-foreground text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        <AccountMenu />
      </div>
    </header>
  );
}
