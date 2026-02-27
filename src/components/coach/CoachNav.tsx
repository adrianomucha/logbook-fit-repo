import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MobileBottomNav } from '@/components/ui/mobile-bottom-nav';
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
      <div className="flex items-center justify-between">
        {/* Logotype */}
        <button
          onClick={() => router.push('/coach')}
          className="flex items-center gap-1.5 rounded-sm group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="Logbook Fitness home"
        >
          <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground group-hover:text-foreground transition-colors">
            Logbook
          </span>
          <span className="text-[11px] sm:text-xs font-normal uppercase tracking-[0.15em] text-muted-foreground/60 group-hover:text-muted-foreground transition-colors">
            Fitness
          </span>
        </button>

        {/* Desktop navigation tabs — hidden on mobile */}
        <nav className="hidden sm:flex gap-1" aria-label="Main navigation">
          <Button
            variant={activeTab === 'dashboard' ? 'default' : 'ghost'}
            onClick={() => handleTabClick('dashboard')}
            size="sm"
            aria-current={activeTab === 'dashboard' ? 'page' : undefined}
          >
            <Home className="w-4 h-4 mr-2" />
            Dashboard
          </Button>

          <Button
            variant={activeTab === 'clients' ? 'default' : 'ghost'}
            onClick={() => handleTabClick('clients')}
            size="sm"
            aria-current={activeTab === 'clients' ? 'page' : undefined}
          >
            <Users className="w-4 h-4 mr-2" />
            Clients
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className={cn(
                  'ml-1 px-1.5 py-0 h-5 text-xs',
                  activeTab === 'clients' && 'bg-white text-primary'
                )}
              >
                {unreadCount}
              </Badge>
            )}
          </Button>

          <Button
            variant={activeTab === 'plans' ? 'default' : 'ghost'}
            onClick={() => handleTabClick('plans')}
            size="sm"
            aria-current={activeTab === 'plans' ? 'page' : undefined}
          >
            <Dumbbell className="w-4 h-4 mr-2" />
            Plans
          </Button>
        </nav>
      </div>

      {/* Mobile bottom navigation */}
      <MobileBottomNav
        items={mobileNavItems}
        activeId={activeTab}
        onSelect={(id) => handleTabClick(id as CoachNavTab)}
      />
    </>
  );
}
