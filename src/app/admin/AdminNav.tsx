import Link from 'next/link';
import { cn } from '@/lib/utils';

const TABS = [
  { key: 'waitlist', label: 'Waitlist', href: '/admin/waitlist' },
  { key: 'accounts', label: 'Accounts', href: '/admin/users' },
] as const;

/** Section switcher shared by the admin pages. */
export function AdminNav({ active }: { active: (typeof TABS)[number]['key'] }) {
  return (
    <nav
      aria-label="Admin sections"
      className="flex w-fit items-center gap-1 rounded-lg border border-border p-1"
    >
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={tab.key === active ? 'page' : undefined}
          className={cn(
            'rounded-md px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors',
            tab.key === active
              ? 'bg-foreground text-background'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
