import { Button } from '@/components/ui/button';
import { MobileBottomNav } from '@/components/ui/mobile-bottom-nav';
import { Dumbbell, MessageSquare, TrendingUp } from 'lucide-react';

export type ClientNavTab = 'workout' | 'chat' | 'progress';

interface ClientNavProps {
  /** Currently active tab */
  activeTab: ClientNavTab;
  /** Handler for tab changes */
  onTabChange: (tab: ClientNavTab) => void;
}

export function ClientNav({ activeTab, onTabChange }: ClientNavProps) {
  // Mobile bottom nav items
  const mobileNavItems = [
    { id: 'workout' as const, label: 'Workout', icon: Dumbbell },
    { id: 'chat' as const, label: 'Chat', icon: MessageSquare },
    { id: 'progress' as const, label: 'Progress', icon: TrendingUp },
  ];

  return (
    <>
      <div className="flex items-center justify-between">
        {/* Logotype */}
        <button
          onClick={() => onTabChange('workout')}
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
            variant={activeTab === 'workout' ? 'default' : 'ghost'}
            onClick={() => onTabChange('workout')}
            size="sm"
            aria-current={activeTab === 'workout' ? 'page' : undefined}
          >
            <Dumbbell className="w-4 h-4 mr-2" />
            Workout
          </Button>

          <Button
            variant={activeTab === 'chat' ? 'default' : 'ghost'}
            onClick={() => onTabChange('chat')}
            size="sm"
            aria-current={activeTab === 'chat' ? 'page' : undefined}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Chat
          </Button>

          <Button
            variant={activeTab === 'progress' ? 'default' : 'ghost'}
            onClick={() => onTabChange('progress')}
            size="sm"
            aria-current={activeTab === 'progress' ? 'page' : undefined}
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Progress
          </Button>
        </nav>
      </div>

      {/* Mobile bottom navigation */}
      <MobileBottomNav
        items={mobileNavItems}
        activeId={activeTab}
        onSelect={(id) => onTabChange(id as ClientNavTab)}
      />
    </>
  );
}
