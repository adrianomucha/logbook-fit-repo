import { MobileBottomNav } from '@/components/ui/mobile-bottom-nav';
import { SwitchAccountButton } from '@/components/SwitchAccountButton';
import { Dumbbell, MessageSquare, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ClientNavTab = 'workout' | 'chat' | 'progress';

interface ClientNavProps {
  /** Currently active tab */
  activeTab: ClientNavTab;
  /** Handler for tab changes */
  onTabChange: (tab: ClientNavTab) => void;
}

const DESKTOP_TABS: { id: ClientNavTab; label: string }[] = [
  { id: 'workout', label: 'Workout' },
  { id: 'chat', label: 'Chat' },
  { id: 'progress', label: 'Progress' },
];

export function ClientNav({ activeTab, onTabChange }: ClientNavProps) {
  // Mobile bottom nav items
  const mobileNavItems = [
    { id: 'workout' as const, label: 'Workout', icon: Dumbbell },
    { id: 'chat' as const, label: 'Chat', icon: MessageSquare },
    { id: 'progress' as const, label: 'Progress', icon: TrendingUp },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 shrink-0 border-b border-border bg-background/85 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-3 sm:px-4 flex h-12 items-center justify-between">
          <div className="flex items-center self-stretch gap-4 sm:gap-6">
            {/* Logotype */}
            <button
              onClick={() => onTabChange('workout')}
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
                  onClick={() => onTabChange(id)}
                  aria-current={activeTab === id ? 'page' : undefined}
                  className={cn(
                    'inline-flex items-center border-b-2 px-0.5 text-[11px] font-medium uppercase tracking-[0.12em] transition-colors touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                    activeTab === id
                      ? 'border-foreground text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                >
                  {label}
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
        onSelect={(id) => onTabChange(id as ClientNavTab)}
      />
    </>
  );
}
