import { EFFORT_CHOICES, type EffortRating } from '@logbook/shared/client-copy';
import { cn } from '@/lib/utils';

/**
 * "How did that feel?": the one effort picker, on the workout-finished
 * screen and the Today card alike. Outline pills; the chosen one fills ink.
 */
export function EffortPicker({
  value,
  onPick,
  disabled,
  labelledBy,
}: {
  value?: EffortRating | null;
  onPick: (rating: EffortRating) => void;
  disabled?: boolean;
  labelledBy: string;
}) {
  return (
    <div role="group" aria-labelledby={labelledBy} className="flex gap-2.5">
      {EFFORT_CHOICES.map((choice) => {
        const isSelected = value === choice.value;
        return (
          <button
            key={choice.value}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onPick(choice.value)}
            disabled={disabled}
            className={cn(
              'flex-1 min-h-[52px] px-3 rounded-full border-2 text-sm font-semibold touch-manipulation',
              'transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.97] disabled:opacity-50',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              isSelected
                ? 'bg-foreground border-foreground text-background'
                : 'bg-card border-border text-foreground hover:border-foreground/40'
            )}
          >
            {choice.label}
          </button>
        );
      })}
    </div>
  );
}
