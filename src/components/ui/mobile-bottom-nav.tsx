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

export function MobileBottomNav({ items, activeId, onSelect }: MobileBottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border/50 px-2 pb-[env(safe-area-inset-bottom)] sm:hidden z-50">
      <div className="flex items-center justify-around py-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeId === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={cn(
                'flex flex-col items-center justify-center gap-1 min-w-[64px] min-h-[48px] py-2 px-3 transition-colors touch-manipulation',
                isActive
                  ? 'text-foreground'
                  : 'text-muted-foreground/60 hover:text-muted-foreground'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    'w-[22px] h-[22px]',
                    isActive ? 'stroke-[2px]' : 'stroke-[1.5px]'
                  )}
                />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-0.5 -right-1 w-2 h-2 bg-warning rounded-full" />
                )}
              </div>
              <span
                className={cn(
                  'text-[11px] leading-tight',
                  isActive ? 'font-semibold' : 'font-normal'
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
