import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

interface MobileBottomNavProps {
  items: NavItem[];
  activeId: string;
  onSelect: (id: string) => void;
}

/**
 * iOS-style tab bar: compact 50px content height plus the home-indicator
 * safe area, translucent blurred background with a hairline top border,
 * 24px icons over 10px labels, and tint (not indicator bars) for the
 * active state — per Apple HIG tab bar conventions.
 */
export function MobileBottomNav({ items, activeId, onSelect }: MobileBottomNavProps) {
  return (
    // z-40 keeps the nav above page content but below dialogs/sheets (z-50),
    // so full-screen modal footers aren't covered on mobile
    <nav className="fixed bottom-0 left-0 right-0 z-40 sm:hidden bg-background/90 backdrop-blur-xl border-t border-border/60 pb-[env(safe-area-inset-bottom)]">
      <div className="flex h-[50px]">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeId === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-1 touch-manipulation transition-colors',
                isActive ? 'text-foreground' : 'text-muted-foreground'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    'w-6 h-6',
                    isActive ? 'stroke-[2.2]' : 'stroke-[1.7]'
                  )}
                />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-0.5 -right-1 w-2 h-2 bg-warning rounded-full" />
                )}
              </div>
              <span
                className={cn(
                  'text-[10px] leading-none',
                  isActive ? 'font-semibold' : 'font-medium'
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
