/**
 * Promises the public site makes in more than one place: the landing pages,
 * the waitlist confirmation and the welcome email. One copy of each, so the
 * page a coach signed up on and the email they get next can't disagree.
 */

/** The founding-price promise, in full. Used where there's room to explain it. */
export const FOUNDING_PRICE =
  'Logbook.fit is free during the private beta. Coaches who join during the beta keep a founding price, lower than the regular one, for as long as they stay, and you’ll hear about pricing well before anything costs money.';

/**
 * The hero form's one line of reassurance: price, then the human touch.
 * Three short phrases in one style, so the space under the button reads as
 * a single note instead of a stack of competing lines.
 */
export const FORM_PROMISES = [
  'Free in the beta',
  'Then a founding price',
  'Setup call included',
] as const;

/**
 * What happens after signup. Deliberately no timing: batches go out when
 * there's room for setup calls, not on a schedule.
 */
export const WAITLIST_NEXT_STEPS =
  'Your invite comes to this inbox when your spot opens. We let coaches in a small batch at a time so each one gets a setup call, where we bring your programs across with you.';

/**
 * The confirmation screen's last step, for coaches: book the setup call on
 * Cal.com, which sends the invite straight away (see lib/setup-call.ts).
 */
export const SETUP_CALL_OFFER = {
  lead: 'Last step, and the quickest way in:',
  prompt: 'Book your setup call and your invite comes straight away.',
  detail: 'A video call where we bring your programs across with you.',
  cta: 'Pick a time',
  skip: 'Not now',
  /** On the sign-off, for a coach who said "Not now" */
  reconsider: 'Want in sooner? Book your setup call',
} as const;

/** After booking: the spreadsheet upload. */
export const SETUP_FILE_ASK =
  'Coach from a spreadsheet? Upload it now and we’ll have it imported before the call.';
export const SETUP_FILE_FALLBACK =
  'Or reply to your invite email with it attached.';
