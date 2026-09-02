'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { ClientNav } from '@/components/client/ClientNav';
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
  profile: () => <ProfileSection role="client" />,
  account: () => <AccountSection role="client" />,
  password: () => <PasswordSection />,
  notifications: () => <NotificationsSection role="client" />,
};

/**
 * The client's settings — same panes as the coach page, in the client app's
 * chrome: the single max-w-2xl column and volt-underlined section tabs, the
 * idiom of ClientNav's own tabs. No side rail — a rail plus a form doesn't
 * fit a one-column app.
 */
export function ClientSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading } = useCurrentUser();

  const requested = searchParams?.get('section');
  const section: SettingsSectionId = SETTINGS_SECTIONS.some((s) => s.id === requested)
    ? (requested as SettingsSectionId)
    : 'profile';

  const Pane = SECTION_PANES[section];

  return (
    <div className="min-h-dvh bg-background pb-[calc(var(--tabbar-h)+1.25rem+env(safe-area-inset-bottom))] sm:pb-8">
      {/* The dashboard's tabs deep-link as /client?tab=… */}
      <ClientNav
        activeTab="workout"
        onTabChange={(tab) => router.push(`/client?tab=${tab}`)}
      />

      <div className="max-w-2xl mx-auto w-full space-y-4 sm:space-y-5 px-4 pt-4 sm:pt-7">
        <div className="animate-enter">
          <button
            onClick={() => router.push('/client')}
            className="flex items-center gap-0.5 -ms-1.5 mb-1 font-mono text-[11px] uppercase tracking-[0.12em] font-medium text-muted-foreground hover:text-foreground transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 tap-target"
          >
            <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
            Today
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight antialiased">
            Settings
          </h1>
        </div>

        {/* Section tabs — brand underline, matching the nav's own tabs */}
        <nav aria-label="Settings sections" className="animate-enter">
          <ul className="flex gap-5 overflow-x-auto scrollbar-hide -mx-4 px-4 border-b border-border">
            {SETTINGS_SECTIONS.map(({ id, label, icon: Icon }) => (
              <li key={id} className="shrink-0">
                <Link
                  href={`/client/settings?section=${id}`}
                  replace
                  scroll={false}
                  aria-current={section === id ? 'page' : undefined}
                  className={cn(
                    'inline-flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.12em]',
                    'transition-colors touch-manipulation tap-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                    'border-b-2 px-0.5 pb-2.5 pt-1',
                    section === id
                      ? 'border-brand text-foreground'
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

        <main className="animate-enter">
          {isLoading || !user ? (
            <div className="flex items-center justify-center py-12" role="status">
              <Loader2
                className="w-6 h-6 animate-spin text-muted-foreground"
                aria-hidden="true"
              />
              <span className="sr-only">Loading settings</span>
            </div>
          ) : (
            <div className={settingsCardClass}>
              <Pane />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
