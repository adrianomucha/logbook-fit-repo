'use client';

import { useEffect, useState } from 'react';

/**
 * Overlap smaller than this is Safari's collapsing URL bar or a rubber-band
 * scroll, not a keyboard. A software keyboard is never this short.
 */
const KEYBOARD_MIN_HEIGHT = 120;

export interface KeyboardInset {
  /** px of the layout viewport the keyboard covers along the bottom */
  bottom: number;
  /** px the visual viewport is scrolled down inside the layout viewport */
  top: number;
  /** True once the overlap is big enough to be a real keyboard */
  isOpen: boolean;
}

const CLOSED: KeyboardInset = { bottom: 0, top: 0, isOpen: false };

/**
 * Tracks how much of the screen the on-screen keyboard is covering.
 *
 * iOS never shrinks the *layout* viewport for the keyboard — it shrinks the
 * visual viewport and scrolls the page so the focused field clears it. So
 * `position: fixed; bottom: 0` still means "the bottom of the full-height
 * screen", which after that scroll sits somewhere underneath the keyboard,
 * and anything anchored there (a tab bar, a chat composer) drifts out of
 * place with the page showing through the difference.
 *
 * visualViewport is the only thing that knows where the visible area actually
 * ends, so measure against it and let callers pin to those numbers.
 *
 * Returns zeroes where the API is missing and on Android, where Chrome
 * resizes the layout viewport itself and nothing needs correcting.
 */
export function useKeyboardInset(): KeyboardInset {
  const [inset, setInset] = useState<KeyboardInset>(CLOSED);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const update = () => {
      const overlap = window.innerHeight - viewport.height - viewport.offsetTop;
      setInset((previous) => {
        const next: KeyboardInset =
          overlap > KEYBOARD_MIN_HEIGHT
            ? { bottom: Math.round(overlap), top: Math.round(viewport.offsetTop), isOpen: true }
            : CLOSED;
        // The keyboard animates open over ~250ms and fires a resize per frame;
        // bail on identical values so those frames don't each re-render.
        return previous.bottom === next.bottom &&
          previous.top === next.top &&
          previous.isOpen === next.isOpen
          ? previous
          : next;
      });
    };

    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
    };
  }, []);

  return inset;
}
