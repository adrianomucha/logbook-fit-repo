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
  /**
   * Tint of the active-tab pill. 'brand' is the client app's volt accent —
   * the same accent its desktop tabs underline with; 'neutral' is the coach
   * app's quieter grey.
   */
  accent?: 'brand' | 'neutral';
}

/**
 * Mobile tab bar: a translucent blurred bar with a hairline top border, and a
 * single pill that slides to whichever tab is active (Material's active
 * indicator, with the app's volt accent). The icon pops as it lands and dips
 * under the thumb on press, so switching tabs reads as one motion instead of
 * a colour change. Bar height comes from --tabbar-h so layouts that sit above
 * a fixed bar clear exactly the right amount.
 */
export function MobileBottomNav({
  items,
  activeId,
  onSelect,
  accent = 'neutral',
}: MobileBottomNavProps) {
  const activeIndex = items.findIndex((item) => item.id === activeId);
  const isBrand = accent === 'brand';

  return (
    // z-40 keeps the nav above page content but below dialogs/sheets (z-50),
    // so full-screen modal footers aren't covered on mobile
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 left-0 right-0 z-40 sm:hidden bg-background/80 backdrop-blur-xl border-t border-border/60 pb-[env(safe-area-inset-bottom)]"
    >
      <div className="relative flex h-[var(--tabbar-h)]">
        {/* The travelling pill. One element for all tabs — it slides a whole
            column per tab, so the indicator reads as continuous motion rather
            than a cross-fade between three static backgrounds. top-[5px]
            centres the 46px of content (32 icon + 4 gap + 10 label) in the
            bar and puts the pill on the icon row. */}
        <div className="pointer-events-none absolute inset-x-0 top-[5px] h-8" aria-hidden="true">
          <div
            className={cn(
              'h-full transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.34,1.4,0.5,1)] motion-reduce:transition-none',
              activeIndex < 0 && 'opacity-0'
            )}
            style={{
              width: `${100 / items.length}%`,
              transform: `translateX(${Math.max(activeIndex, 0) * 100}%)`,
            }}
          >
            <span
              className={cn(
                'mx-auto block h-full w-16 rounded-full',
                isBrand ? 'bg-brand' : 'bg-secondary'
              )}
            />
          </div>
        </div>

        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeId === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className="group relative flex flex-1 flex-col items-center gap-1 pt-[5px] touch-manipulation focus-visible:outline-none"
            >
              <span
                className={cn(
                  'flex h-8 w-16 items-center justify-center rounded-full transition-transform duration-200',
                  'group-active:scale-90 motion-reduce:transition-none',
                  'group-focus-visible:ring-2 group-focus-visible:ring-ring'
                )}
              >
                <span className="relative">
                  <Icon
                    className={cn(
                      'h-[22px] w-[22px] transition-colors',
                      isActive
                        ? cn(
                            'stroke-[2.2] animate-tab-pop',
                            isBrand ? 'text-brand-foreground' : 'text-foreground'
                          )
                        : 'stroke-[1.75] text-muted-foreground'
                    )}
                  />
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none tabular-nums text-destructive-foreground ring-2 ring-background"
                      aria-hidden="true"
                    >
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </span>
              </span>
              <span
                className={cn(
                  'text-[10px] leading-none transition-colors',
                  isActive ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground'
                )}
              >
                {item.label}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="sr-only"> — {item.badge} unread</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
