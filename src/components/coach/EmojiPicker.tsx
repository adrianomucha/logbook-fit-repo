import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

const FITNESS_EMOJIS = ['💪', '🏋️', '🏃', '🚴', '🧘', '⚡', '🔥', '🎯'];
const GRID_COLS = 4;

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
}

export function EmojiPicker({ value, onChange }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const emojiRefs = useRef<(HTMLButtonElement | null)[]>([]);

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

  // Focus the active emoji when the picker opens
  useEffect(() => {
    if (isOpen) {
      const currentIndex = FITNESS_EMOJIS.indexOf(value);
      const idx = currentIndex >= 0 ? currentIndex : 0;
      setFocusedIndex(idx);
      requestAnimationFrame(() => {
        emojiRefs.current[idx]?.focus();
      });
    }
  }, [isOpen, value]);

  const handleEmojiSelect = (emoji: string) => {
    onChange(emoji);
    setIsOpen(false);
  };

  const handleGridKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      let nextIndex = focusedIndex;

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          nextIndex = focusedIndex + 1;
          if (nextIndex >= FITNESS_EMOJIS.length) nextIndex = 0;
          break;
        case 'ArrowLeft':
          e.preventDefault();
          nextIndex = focusedIndex - 1;
          if (nextIndex < 0) nextIndex = FITNESS_EMOJIS.length - 1;
          break;
        case 'ArrowDown':
          e.preventDefault();
          nextIndex = focusedIndex + GRID_COLS;
          if (nextIndex >= FITNESS_EMOJIS.length) nextIndex = focusedIndex % GRID_COLS;
          break;
        case 'ArrowUp':
          e.preventDefault();
          nextIndex = focusedIndex - GRID_COLS;
          if (nextIndex < 0) {
            // Wrap to same column in last row
            const col = focusedIndex % GRID_COLS;
            const lastRowStart = Math.floor((FITNESS_EMOJIS.length - 1) / GRID_COLS) * GRID_COLS;
            nextIndex = Math.min(lastRowStart + col, FITNESS_EMOJIS.length - 1);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          return;
        case 'Home':
          e.preventDefault();
          nextIndex = 0;
          break;
        case 'End':
          e.preventDefault();
          nextIndex = FITNESS_EMOJIS.length - 1;
          break;
        default:
          return;
      }

      setFocusedIndex(nextIndex);
      emojiRefs.current[nextIndex]?.focus();
    },
    [focusedIndex]
  );

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
          onKeyDown={handleGridKeyDown}
        >
          <div className="grid grid-cols-4 gap-2">
            {FITNESS_EMOJIS.map((emoji, index) => (
              <button
                key={emoji}
                ref={(el) => { emojiRefs.current[index] = el; }}
                type="button"
                role="option"
                aria-selected={emoji === value}
                tabIndex={index === focusedIndex ? 0 : -1}
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
