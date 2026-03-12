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
        'w-full flex items-center justify-between py-3.5 px-1 transition-all duration-150 min-h-[44px] touch-manipulation',
        'hover:bg-muted/30 active:scale-[0.98]',
        showDivider && 'border-t border-border/40'
      )}
    >
      {/* Left: Set label */}
      <span
        className={cn(
          'font-bold text-sm tabular-nums transition-colors duration-150',
          completed ? 'text-foreground/30' : 'text-foreground'
        )}
      >
        Set {setNumber}
      </span>

      {/* Right: description + checkbox */}
      <div className="flex items-center gap-4">
        <span
          className={cn(
            'text-sm tabular-nums transition-colors duration-150',
            completed
              ? 'text-muted-foreground/30 line-through decoration-1'
              : 'text-muted-foreground'
          )}
        >
          {getSetDescription()}
        </span>

        {/* Circle checkbox — scale pop on completion */}
        <div
          className={cn(
            'w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200',
            completed
              ? 'bg-success border-success'
              : 'border-foreground/15 bg-transparent'
          )}
        >
          {completed && (
            <Check className="w-4 h-4 text-success-foreground animate-set-complete" />
          )}
        </div>
      </div>
    </button>
  );
}
