/**
 * The admin area's tabs. One list drives the header, the panel switcher, the
 * account-menu links and the legacy-URL redirects, so adding a tab is one
 * entry here plus a panel component.
 *
 * Tabs live in the URL as `?tab=<key>` on /admin — one page, switched on the
 * client without a round trip, but still refresh-, back- and link-safe.
 */
export const ADMIN_TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'waitlist', label: 'Waitlist' },
  { key: 'accounts', label: 'Accounts' },
  { key: 'feedback', label: 'Feedback' },
  { key: 'health', label: 'Health' },
] as const;

export type AdminTab = (typeof ADMIN_TABS)[number]['key'];

export const DEFAULT_ADMIN_TAB: AdminTab = 'overview';

export function isAdminTab(value: string | null | undefined): value is AdminTab {
  return ADMIN_TABS.some((t) => t.key === value);
}

/** Href for a tab — the default tab is the bare page, so that URL stays clean. */
export function adminTabHref(tab: AdminTab): string {
  return tab === DEFAULT_ADMIN_TAB ? '/admin' : `/admin?tab=${tab}`;
}
