import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

const FITNESS_EMOJIS = ['💪', '🏋️', '🏃', '🚴', '🧘', '⚡', '🔥', '🎯'];
const GRID_COLS = 4;

// Tiles mirror the 40px trigger (w-10 gap-1.5 p-2 + 1px borders), so the
// popover reads as an extension of it: 4×40 + 3×6 + 2×8 + 2 = 196 wide.
const POPOVER_WIDTH = 196;
/** Approximate rendered height (2 rows + padding) — only used to decide
 * whether to flip the popover above the trigger near the viewport bottom. */
const POPOVER_HEIGHT = 104;
const POPOVER_GAP = 8;

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
  /** Extra classes for the trigger tile (e.g. to match the height of an adjacent input) */
  className?: string;
}

export function EmojiPicker({ value, onChange, className }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const emojiRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // The popover portals to <body> so no ancestor overflow (FieldShell's
  // overflow-hidden, the modal body's overflow-y-auto) can clip it — it used
  // to render absolutely inside the trigger and got cut off in dialogs.
  // Fixed positioning off the trigger rect, clamped to the viewport,
  // flipped above when there's no room below.
  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const left = Math.max(
      POPOVER_GAP,
      Math.min(rect.left, window.innerWidth - POPOVER_WIDTH - POPOVER_GAP)
    );
    const openUp = rect.bottom + POPOVER_GAP + POPOVER_HEIGHT > window.innerHeight;
    const top = openUp
      ? Math.max(POPOVER_GAP, rect.top - POPOVER_GAP - POPOVER_HEIGHT)
      : rect.bottom + POPOVER_GAP;
    setPosition({ top, left });
  }, []);

  const handleTriggerClick = () => {
    if (!isOpen) updatePosition();
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) {
        return;
      }
      setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    // Track the trigger while the dialog body scrolls or the window resizes
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, updatePosition]);

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
    triggerRef.current?.focus();
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
          // Just the picker — without this the modal's document-level
          // Escape handler would tear down the whole dialog too
          e.stopPropagation();
          setIsOpen(false);
          triggerRef.current?.focus();
          return;
        case 'Tab':
          // The portal sits outside the modal's Tab trap; close and hand
          // focus back to the trigger so Tab continues inside the dialog
          setIsOpen(false);
          triggerRef.current?.focus();
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
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleTriggerClick}
        className={cn(
          'w-10 h-10 flex items-center justify-center text-2xl',
          'bg-muted border border-border rounded-lg cursor-pointer',
          'hover:bg-accent transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          className
        )}
        aria-label="Select emoji"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {value}
      </button>

      {isOpen &&
        position &&
        createPortal(
          <div
            ref={popoverRef}
            style={{ top: position.top, left: position.left, width: POPOVER_WIDTH }}
            // Above the modal overlay's z-50 so it never sinks behind the dialog
            className="fixed z-[60] bg-popover border border-border rounded-xl shadow-lg p-2"
            role="listbox"
            aria-label="Fitness emojis"
            onKeyDown={handleGridKeyDown}
          >
            <div className="grid grid-cols-4 gap-1.5">
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
                    // Same tile as the trigger, so the grid reads as more of it.
                    // Selection uses a 1px border + ring so tiles never shift.
                    'w-10 h-10 flex items-center justify-center text-2xl rounded-lg cursor-pointer',
                    'border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    emoji === value
                      ? 'bg-accent border-primary ring-1 ring-primary'
                      : 'bg-background border-border hover:bg-accent'
                  )}
                  aria-label={`Select ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
