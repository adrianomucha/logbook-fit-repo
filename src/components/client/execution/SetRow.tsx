import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SetRowProps {
  setNumber: number;
  reps?: string;
  weight?: string;
  time?: string;
  completed: boolean;
  onToggle: () => void;
}

export function SetRow({
  setNumber,
  reps,
  weight,
  time,
  completed,
  onToggle,
}: SetRowProps) {
  // Build the set description
  const getSetDescription = () => {
    const parts: string[] = [];
    if (reps) parts.push(`${reps} reps`);
    if (time) parts.push(time);
    if (weight) parts.push(`@ ${weight}`);
    return parts.join(' ');
  };

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-lg transition-all',
        'hover:bg-muted/50 active:scale-[0.99]',
        completed && 'bg-green-50 dark:bg-green-950/30'
      )}
    >
      {/* Checkbox circle */}
      <div
        className={cn(
          'w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
          completed
            ? 'bg-green-600 border-green-600'
            : 'border-muted-foreground/40'
        )}
      >
        {completed && <Check className="w-4 h-4 text-white" />}
      </div>

      {/* Set info */}
      <div className="flex-1 text-left">
        <span
          className={cn(
            'font-medium text-sm',
            completed && 'text-green-700 dark:text-green-400'
          )}
        >
          Set {setNumber}
        </span>
        <span className="text-sm text-muted-foreground ml-2">
          {getSetDescription()}
        </span>
      </div>
    </button>
  );
}
