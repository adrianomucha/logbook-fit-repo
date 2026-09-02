'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { CoachNav } from '@/components/coach/CoachNav';
import { PageHeader } from '@/components/coach/PageHeader';
import {
  AccountSection,
  NotificationsSection,
  PasswordSection,
  ProfileSection,
  SETTINGS_SECTIONS,
  settingsCardClass,
  type SettingsSectionId,
} from '@/components/settings/sections';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { cn } from '@/lib/utils';

const SECTION_PANES: Record<SettingsSectionId, () => React.JSX.Element> = {
  profile: () => <ProfileSection role="coach" />,
  account: () => <AccountSection role="coach" />,
  password: () => <PasswordSection />,
  notifications: () => <NotificationsSection role="coach" />,
};

export function CoachSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading } = useCurrentUser();

  const requested = searchParams?.get('section');
  const section: SettingsSectionId = SETTINGS_SECTIONS.some((s) => s.id === requested)
    ? (requested as SettingsSectionId)
    : 'profile';

  const Pane = SECTION_PANES[section];

  return (
    <div className="min-h-dvh bg-background pb-24 sm:pb-4">
      <CoachNav activeTab="settings" />

      {/* Narrower measure than the roster pages: the rail plus one form
          column is all this page is, and centering it keeps a wide screen
          balanced instead of stranding the content on the left */}
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 px-3 pt-3 sm:px-4 sm:pt-7">
        <div className="animate-enter mb-1.5 sm:mb-3">
          <PageHeader
            title="Settings"
            subtitle="Your account · How clients see you"
            breadcrumb={{ label: 'Dashboard', onClick: () => router.push('/coach') }}
          />
        </div>

        <div className="flex flex-col lg:flex-row gap-4 sm:gap-5 lg:gap-8 animate-enter">
          {/* Section rail: underline tabs on mobile (the nav's idiom), a
              side-rail list on desktop. Same voice as the header tabs. */}
          <nav aria-label="Settings sections" className="lg:w-44 shrink-0">
            <ul
              className={cn(
                'flex gap-5 overflow-x-auto scrollbar-hide -mx-3 px-3 border-b border-border',
                'lg:flex-col lg:gap-1 lg:overflow-visible lg:mx-0 lg:px-0 lg:border-b-0'
              )}
            >
              {SETTINGS_SECTIONS.map(({ id, label, icon: Icon }) => (
                <li key={id} className="shrink-0">
                  {/* Real links: the sections are deep-linkable URLs, so they
                      earn cmd-click and copy-link for free */}
                  <Link
                    href={`/coach/settings?section=${id}`}
                    replace
                    scroll={false}
                    aria-current={section === id ? 'page' : undefined}
                    className={cn(
                      'inline-flex w-full items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.12em]',
                      'transition-colors touch-manipulation tap-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                      'border-b-2 px-0.5 pb-2.5 pt-1',
                      'lg:border-b-0 lg:border-s-2 lg:px-3 lg:py-2',
                      section === id
                        ? 'border-foreground text-foreground'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <main className="flex-1 min-w-0">
            {isLoading || !user ? (
              <div className="flex items-center justify-center py-12" role="status">
                <Loader2
                  className="w-6 h-6 animate-spin text-muted-foreground"
                  aria-hidden="true"
                />
                <span className="sr-only">Loading settings</span>
              </div>
            ) : (
              // The page wrapper already animates in once; section switches
              // swap instantly — repeated interactions get instant feedback
              <div className={settingsCardClass}>
                <Pane />
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
