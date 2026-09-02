/**
 * "Hide until they respond" for a pending check-in card.
 *
 * The coach can tuck the "Waiting on <name>" row away once they've seen it.
 * The choice is keyed by check-in id, so it lapses on its own: a new check-in
 * gets a new id, and once the client responds the card is a review, not a
 * wait, and never consults this flag. Stored per device — it's a reading
 * preference, not part of the check-in.
 */
const KEY_PREFIX = 'logbook.checkin.hidden-while-pending:';

/** Minimal slice of Storage, so this stays testable without a DOM. */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function hiddenPendingKey(checkInId: string): string {
  return KEY_PREFIX + checkInId;
}

export function readHiddenPending(storage: KeyValueStorage | null, checkInId: string): boolean {
  try {
    return storage?.getItem(hiddenPendingKey(checkInId)) === '1';
  } catch {
    // Storage throws in private/locked-down modes — show the card.
    return false;
  }
}

export function writeHiddenPending(
  storage: KeyValueStorage | null,
  checkInId: string,
  hidden: boolean
): void {
  try {
    if (hidden) storage?.setItem(hiddenPendingKey(checkInId), '1');
    else storage?.removeItem(hiddenPendingKey(checkInId));
  } catch {
    // Nothing to do — the card still hides for this page view.
  }
}
