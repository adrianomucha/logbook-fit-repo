import { cva } from 'class-variance-authority';
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

const tabVariants = cva(
  'flex flex-col items-center justify-center gap-0.5 min-w-[64px] min-h-[56px] px-3 py-2 rounded-lg transition-colors',
  {
    variants: {
      active: {
        true: 'bg-primary text-primary-foreground',
        false: 'text-muted-foreground hover:text-foreground hover:bg-muted',
      },
    },
    defaultVariants: {
      active: false,
    },
  }
);

export function MobileBottomNav({ items, activeId, onSelect }: MobileBottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-2 pb-[env(safe-area-inset-bottom)] sm:hidden z-50">
      <div className="flex items-center justify-around py-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeId === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={cn(tabVariants({ active: isActive }))}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium leading-tight mt-0.5">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
