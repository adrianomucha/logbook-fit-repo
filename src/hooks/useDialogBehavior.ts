import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface UseDialogBehaviorOptions {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * The behaviour every modal surface owes a keyboard or screen-reader user:
 * body scroll lock, Escape to dismiss, a Tab trap that cycles inside the
 * panel, and focus handed back to whatever opened it.
 *
 * Lives apart from any one layout so dialogs can look however they need to
 * — the generic `Modal` shell and the bespoke confirmation dialog share
 * this, rather than a second copy of the trap drifting out of sync.
 *
 * Attach the returned ref to the panel, which must be focusable
 * (`tabIndex={-1}`) so focus starts inside the dialog rather than on the
 * close button with its ring lit up.
 */
export function useDialogBehavior({
  isOpen,
  onClose,
}: UseDialogBehaviorOptions): RefObject<HTMLDivElement> {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  // Keep onClose current without re-running the effect (and so re-arming the
  // scroll lock) on every parent render
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
        return;
      }

      if (e.key !== 'Tab' || !panelRef.current) return;

      const focusableEls = panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusableEls.length === 0) return;

      const firstEl = focusableEls[0];
      const lastEl = focusableEls[focusableEls.length - 1];
      // -1 when focus sits on the panel itself (initial state)
      const activeIndex = Array.prototype.indexOf.call(focusableEls, document.activeElement);

      if (e.shiftKey) {
        if (activeIndex <= 0) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        if (activeIndex === focusableEls.length - 1) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };

    previouslyFocusedRef.current = document.activeElement as HTMLElement;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    document.addEventListener('keydown', handleKeyDown);

    requestAnimationFrame(() => {
      panelRef.current?.focus();
    });

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocusedRef.current?.focus();
    };
  }, [isOpen]);

  return panelRef;
}
