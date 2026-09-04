'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type AnchorHTMLAttributes,
  type ReactNode,
} from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  ADMIN_TABS,
  DEFAULT_ADMIN_TAB,
  adminTabHref,
  isAdminTab,
  type AdminTab,
} from './tabs';

/**
 * Client-side tab state for the one-page admin.
 *
 * Every panel is server-rendered into the page (streamed in behind its own
 * Suspense fallback); switching tabs only toggles which one is visible, so
 * it is instant and never re-runs the panels' queries. The active tab is
 * mirrored to `?tab=` with history.replaceState — Next syncs that into
 * useSearchParams, so refresh, back-to-app and copied links all land on the
 * right tab, and router.refresh() after an action (invite, reset, resolve)
 * keeps the tab in place.
 */

type TabContextValue = {
  active: AdminTab;
  select: (tab: AdminTab) => void;
};

const TabContext = createContext<TabContextValue | null>(null);

function tabFromParams(value: string | null): AdminTab {
  return isAdminTab(value) ? value : DEFAULT_ADMIN_TAB;
}

export function AdminTabProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const fromUrl = tabFromParams(searchParams.get('tab'));
  const [active, setActive] = useState<AdminTab>(fromUrl);

  // Follow the URL when something else changes it (a menu link, back/forward).
  useEffect(() => {
    setActive(fromUrl);
  }, [fromUrl]);

  useEffect(() => {
    const label = ADMIN_TABS.find((t) => t.key === active)?.label ?? 'Admin';
    document.title = `${label} · Admin`;
  }, [active]);

  const select = useCallback(
    (tab: AdminTab) => {
      setActive(tab);
      if (pathname === '/admin') {
        window.history.replaceState(window.history.state, '', adminTabHref(tab));
      }
    },
    [pathname]
  );

  const value = useMemo(() => ({ active, select }), [active, select]);
  return <TabContext.Provider value={value}>{children}</TabContext.Provider>;
}

function useAdminTabs(): TabContextValue {
  const ctx = useContext(TabContext);
  if (!ctx) {
    throw new Error('Admin tab components must render inside AdminTabProvider');
  }
  return ctx;
}

/**
 * A link to a tab that switches in place. Still a real anchor with a real
 * href, so middle-click, copy-link and no-JS all behave.
 */
export function TabLink({
  tab,
  className,
  children,
  ...rest
}: {
  tab: AdminTab;
  className?: string;
  children: ReactNode;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'onClick'>) {
  const { active, select } = useAdminTabs();
  return (
    <a
      href={adminTabHref(tab)}
      aria-current={active === tab ? 'page' : undefined}
      className={className}
      onClick={(event) => {
        // Let modified clicks open a new tab/window the normal way
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
          return;
        }
        event.preventDefault();
        select(tab);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}

/** The header's tab strip — underline indicator sits on the header hairline. */
export function AdminTabBar() {
  const { active } = useAdminTabs();
  return (
    <nav className="flex items-stretch self-stretch gap-4 sm:gap-5" aria-label="Admin sections">
      {ADMIN_TABS.map(({ key, label }) => (
        <TabLink
          key={key}
          tab={key}
          className={cn(
            'inline-flex items-center border-b-2 px-0.5 font-mono text-[11px] font-medium uppercase tracking-[0.12em] transition-colors touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
            active === key
              ? 'border-foreground text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          {label}
        </TabLink>
      ))}
    </nav>
  );
}

/**
 * Renders every panel, showing only the active one. Panels arrive from the
 * server as React nodes (async server components wrapped in Suspense), so
 * this component never fetches anything itself.
 */
export function AdminPanels({ panels }: { panels: Record<AdminTab, ReactNode> }) {
  const { active } = useAdminTabs();
  return (
    <>
      {ADMIN_TABS.map(({ key, label }) => (
        <section
          key={key}
          role="tabpanel"
          aria-label={label}
          // `hidden` via class, not the attribute: Tailwind's `flex` utility
          // would win over preflight's [hidden] rule.
          className={active === key ? 'flex min-h-0 flex-1 flex-col' : 'hidden'}
        >
          {panels[key]}
        </section>
      ))}
    </>
  );
}
