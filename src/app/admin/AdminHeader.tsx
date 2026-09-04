'use client';

import Link from 'next/link';
import { AccountMenu } from '@/components/AccountMenu';
import { Logo, LogoMark } from '@/components/brand/LogoMark';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { AdminTabBar } from './AdminTabs';

/**
 * Nav chrome for the admin surfaces — same shape as the coach and client
 * headers, so admin doesn't feel like a detached corner of the app. The
 * logotype is the way back: it points at whichever home this session's role
 * has ("/" resolves there too, and covers the moment before /api/me lands).
 */
export function AdminHeader() {
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

          {/* Section tabs — switch in place, see AdminTabs.tsx */}
          <AdminTabBar />
        </div>

        <AccountMenu />
      </div>
    </header>
  );
}
