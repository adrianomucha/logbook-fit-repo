import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

const FITNESS_EMOJIS = ['💪', '🏋️', '🏃', '🚴', '🧘', '⚡', '🔥', '🎯'];

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
}

export function EmojiPicker({ value, onChange }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleEmojiSelect = (emoji: string) => {
    onChange(emoji);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-10 h-10 flex items-center justify-center text-2xl',
          'bg-muted border border-border rounded-lg cursor-pointer',
          'hover:bg-accent transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
        )}
        aria-label="Select emoji"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {value}
      </button>

      {isOpen && (
        <div
          className={cn(
            'absolute top-12 left-0 z-50 w-[232px]',
            'bg-popover border-2 border-border rounded-lg shadow-lg p-3'
          )}
          role="listbox"
          aria-label="Fitness emojis"
        >
          <div className="grid grid-cols-4 gap-2">
            {FITNESS_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                role="option"
                aria-selected={emoji === value}
                onClick={() => handleEmojiSelect(emoji)}
                className={cn(
                  'w-12 h-12 flex items-center justify-center text-[28px] rounded-md cursor-pointer',
                  'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  emoji === value
                    ? 'bg-accent border-2 border-primary'
                    : 'bg-background border border-border hover:bg-accent'
                )}
                aria-label={`Select ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
