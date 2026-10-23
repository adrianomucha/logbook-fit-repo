/**
 * Promises the public site makes in more than one place: the landing pages,
 * the waitlist confirmation and the welcome email. One copy of each, so the
 * page a coach signed up on and the email they get next can't disagree.
 */

/** The founding-price promise, in full. Used where there's room to explain it. */
export const FOUNDING_PRICE =
  'Logbook.fit is free during the private beta. Coaches who join during the beta keep a founding price, lower than the regular one, for as long as they stay, and you’ll hear about pricing well before anything costs money.';

/** The same promise, short enough for a line under a form. */
export const FOUNDING_PRICE_SHORT =
  'Free during the beta, then a founding price for as long as you stay.';

/**
 * What happens after signup. Deliberately no timing: batches go out when
 * there's room for setup calls, not on a schedule.
 */
export const WAITLIST_NEXT_STEPS =
  'Your invite comes to this inbox when your spot opens. We let coaches in a small batch at a time so each one gets a setup call, where we bring your programs across with you.';
