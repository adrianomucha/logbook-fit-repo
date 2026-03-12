import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SetRowProps {
  setNumber: number;
  reps?: string;
  weight?: string;
  time?: string;
  completed: boolean;
  onToggle: () => void;
  /** If true, render a top border to separate from the previous row */
  showDivider?: boolean;
}

export function SetRow({
  setNumber,
  reps,
  weight,
  time,
  completed,
  onToggle,
  showDivider = false,
}: SetRowProps) {
  // Build the set description — just reps (weight lives in the card header)
  const getSetDescription = () => {
    const parts: string[] = [];
    if (reps) parts.push(`${reps} reps`);
    if (time) parts.push(time);
    return parts.join(' ');
  };

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'w-full flex items-center justify-between py-3.5 px-1 transition-all min-h-[44px] touch-manipulation',
        'hover:bg-muted/30 active:scale-[0.99]',
        showDivider && 'border-t border-border/60'
      )}
    >
      {/* Left: Set label */}
      <span className="font-medium text-sm text-foreground">
        Set {setNumber}
      </span>

      {/* Right: description + checkbox */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">
          {getSetDescription()}
        </span>

        {/* Circle checkbox — matches Figma check-circle-2 style */}
        <div
          className={cn(
            'w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
            completed
              ? 'bg-success border-success'
              : 'border-muted-foreground/30 bg-transparent'
          )}
        >
          {completed && <Check className="w-4 h-4 text-success-foreground" />}
        </div>
      </div>
    </button>
  );
}
