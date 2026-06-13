import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { MobileBottomNav } from '@/components/ui/mobile-bottom-nav';
import { SwitchAccountButton } from '@/components/SwitchAccountButton';
import { Home, Users, Dumbbell } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CoachNavTab = 'dashboard' | 'clients' | 'plans';

interface CoachNavProps {
  /** Currently active tab */
  activeTab: CoachNavTab;
  /** Number of unread messages to show as badge on Clients tab */
  unreadCount?: number;
  /** Handler for tab changes (for in-page view switching like CoachDashboard) */
  onTabChange?: (tab: CoachNavTab) => void;
}

const DESKTOP_TABS: { id: CoachNavTab; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'clients', label: 'Clients' },
  { id: 'plans', label: 'Plans' },
];

export function CoachNav({
  activeTab,
  unreadCount = 0,
  onTabChange,
}: CoachNavProps) {
  const router = useRouter();

  const handleTabClick = (tab: CoachNavTab) => {
    if (onTabChange) {
      onTabChange(tab);
      return;
    }

    switch (tab) {
      case 'dashboard':
        router.push('/coach');
        break;
      case 'clients':
        router.push('/coach/clients');
        break;
      case 'plans':
        router.push('/coach?view=plans');
        break;
    }
  };

  // Mobile bottom nav items
  const mobileNavItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: Home },
    { id: 'clients' as const, label: 'Clients', icon: Users, badge: unreadCount },
    { id: 'plans' as const, label: 'Plans', icon: Dumbbell },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 flex h-12 items-center justify-between">
          <div className="flex items-center self-stretch gap-4 sm:gap-6">
            {/* Logotype */}
            <button
              onClick={() => router.push('/coach')}
              className="flex items-baseline gap-1.5 rounded-sm group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Logbook Fitness home"
            >
              <span className="text-xs sm:text-sm font-bold uppercase tracking-[0.15em] text-foreground">
                Logbook
              </span>
              <span className="text-[10px] sm:text-[11px] font-normal uppercase tracking-[0.15em] text-muted-foreground/60 group-hover:text-muted-foreground transition-colors">
                Fitness
              </span>
            </button>

            {/* Brand / nav divider */}
            <div className="hidden sm:block h-3.5 w-px bg-border" aria-hidden="true" />

            {/* Desktop tabs — underline indicator sits on the header hairline */}
            <nav className="hidden sm:flex items-stretch self-stretch gap-5" aria-label="Main navigation">
              {DESKTOP_TABS.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => handleTabClick(id)}
                  aria-current={activeTab === id ? 'page' : undefined}
                  className={cn(
                    'inline-flex items-center gap-1.5 border-b-2 px-0.5 text-[11px] font-medium uppercase tracking-[0.12em] transition-colors touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                    activeTab === id
                      ? 'border-foreground text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                >
                  {label}
                  {id === 'clients' && unreadCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="h-4 min-w-4 justify-center px-1 py-0 text-[10px] tabular-nums"
                    >
                      {unreadCount}
                    </Badge>
                  )}
                </button>
              ))}
            </nav>
          </div>

          <SwitchAccountButton />
        </div>
      </header>

      {/* Mobile bottom navigation */}
      <MobileBottomNav
        items={mobileNavItems}
        activeId={activeTab}
        onSelect={(id) => handleTabClick(id as CoachNavTab)}
      />
    </>
  );
}
