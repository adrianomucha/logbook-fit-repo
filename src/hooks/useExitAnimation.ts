import { useEffect, useRef, useState } from 'react';

/**
 * Keeps an overlay rendered for a moment after it closes, so it can animate
 * out instead of vanishing.
 *
 * `shouldRender` stays true for `durationMs` after `isOpen` flips false, and
 * `isClosing` is true for that window. Callers swap their enter classes for
 * exit classes while closing, and make the lingering panel inert
 * (pointer-events-none) so it can't be clicked on its way out.
 */
export function useExitAnimation(isOpen: boolean, durationMs: number) {
  const [isClosing, setIsClosing] = useState(false);
  const [shouldRender, setShouldRender] = useState(isOpen);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (isOpen) {
      clearTimeout(closeTimerRef.current);
      setShouldRender(true);
      setIsClosing(false);
      return;
    }
    if (!shouldRender) return;
    setIsClosing(true);
    closeTimerRef.current = setTimeout(() => {
      setShouldRender(false);
      setIsClosing(false);
    }, durationMs);
    return () => clearTimeout(closeTimerRef.current);
  }, [isOpen, shouldRender, durationMs]);

  return { shouldRender, isClosing };
}
