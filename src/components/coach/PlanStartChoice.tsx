import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PlanStartChoice as Choice, PlanStartOption } from '@logbook/shared/plan-start';

interface PlanStartChoiceProps {
  options: PlanStartOption[];
  value: Choice;
  onChange: (value: Choice) => void;
}

/**
 * Today or next Monday, as a pair of radio rows. Plan weeks run Monday to
 * Sunday on the client's calendar, so the coach decides whether week 1 is
 * what's left of this week or a full week starting Monday.
 */
export function PlanStartChoice({ options, value, onChange }: PlanStartChoiceProps) {
  return (
    <div
      role="radiogroup"
      aria-label="When the plan starts"
      className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border"
    >
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative flex w-full items-center gap-3 px-4 py-3 text-start transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
              isSelected ? 'bg-brand/10' : 'hover:bg-muted/50 active:bg-muted/70'
            )}
          >
            {/* Volt edge marks the pick, as in the plan picker */}
            <span
              className={cn(
                'absolute inset-y-0 left-0 w-[3px] bg-brand transition-opacity duration-150',
                isSelected ? 'opacity-100' : 'opacity-0'
              )}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-bold leading-tight tracking-tight antialiased">
                {option.label}
              </span>
              <span className="mt-0.5 block text-pretty text-[13px] leading-snug text-muted-foreground antialiased">
                {option.detail}
              </span>
            </span>
            <span className="flex w-5 shrink-0 justify-end" aria-hidden="true">
              {isSelected && <Check className="h-4 w-4 text-foreground" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
