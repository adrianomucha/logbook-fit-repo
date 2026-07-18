import { useEffect } from 'react';

/**
 * Keeps iOS Safari's "Undo Typing" dialog from popping up mid-workout.
 *
 * iOS keeps a page-level undo stack for typed text and treats any sharp
 * jolt of the phone as the shake-to-undo gesture — so after logging a
 * weight, racking a dumbbell next to the phone is enough to summon the
 * native "Undo Typing" alert. The web has no API to opt out of the
 * gesture, but WebKit discards a field's undo entries once its value is
 * replaced programmatically. Rewriting the value on focusout keeps the
 * undo stack empty whenever the user isn't actively typing, which is
 * exactly when shakes happen.
 */

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iP(hone|ad|od)/.test(navigator.userAgent) ||
    // iPadOS reports itself as macOS but is the only "Mac" with touch
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

function clearUndoHistory(el: HTMLInputElement | HTMLTextAreaElement) {
  const proto =
    el instanceof HTMLInputElement
      ? HTMLInputElement.prototype
      : HTMLTextAreaElement.prototype;
  // The prototype setter, not el.value: React overrides the instance
  // property for change tracking, and this write must not look like input.
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (!setter) return;
  const value = el.value;
  // The value has to actually change for WebKit to drop the undo entries;
  // restoring it immediately leaves the DOM (and React state) untouched.
  setter.call(el, value + '\u200b');
  setter.call(el, value);
}

export function useSuppressShakeToUndo() {
  useEffect(() => {
    if (!isIOS()) return;

    const onFocusOut = (e: FocusEvent) => {
      const el = e.target;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        clearUndoHistory(el);
      }
    };

    document.addEventListener('focusout', onFocusOut);
    return () => document.removeEventListener('focusout', onFocusOut);
  }, []);
}
