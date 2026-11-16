import { isCoachSignupOpen } from '@/lib/waitlist';
import { FORM_PROMISES, FOUNDING_PRICE } from '@/lib/landing-copy';
import { appStoreUrl } from '@/lib/app-store';

export { appStoreUrl };

/**
 * What the public pages are offering right now, decided by the same switch
 * that decides what /signup accepts (OPEN_COACH_SIGNUP), so the page can
 * never sell a waitlist while signup is open, or the other way round.
 *
 *  - "waitlist": coach signup is invite-only. The pages collect an email.
 *  - "open": anyone can create a coach account. The pages send them to it.
 *
 * Both are free: there is no billing. The founding-price promise made to
 * waitlist coaches carries over unchanged, without the word "private".
 */
export type OfferMode = 'waitlist' | 'open';

export function offerMode(): OfferMode {
  return isCoachSignupOpen() ? 'open' : 'waitlist';
}

export interface OfferCopy {
  /** Mono line above the homepage headline */
  heroEyebrow: string;
  /** The offer's slot in the homepage ticker */
  marquee: string;
  /** Reassurances under the hero's call to action */
  promises: readonly string[];
  /** "What does it cost?" */
  price: string;
  /** The FAQ entry about what happens after the call to action */
  nextStep: { q: string; a: string };
  /** The button in the "who it's for" section */
  midCta: { label: string; href: string };
  /** The closing section's heading, as its two lines */
  closingTitle: readonly [string, string];
  /** The line under that heading, per page */
  closingBody: { home: string; spreadsheet: string };
  /** Spreadsheet page: "What if my file doesn't come across cleanly?" */
  importHelp: string;
  /** schema.org Offer fields */
  structured: { description: string; availability: string };
}

export const OFFER_COPY: Record<OfferMode, OfferCopy> = {
  waitlist: {
    heroEyebrow: 'Private beta · for independent coaches',
    marquee: 'Private beta · onboarding in small batches',
    promises: FORM_PROMISES,
    price: FOUNDING_PRICE,
    nextStep: {
      q: 'When will I get my invite?',
      a: 'Right away if you book your setup call when you sign up: the invite comes as soon as the call is booked, and on the call we bring your programs across with you. Otherwise it comes to the email you signed up with when your spot opens.',
    },
    midCta: { label: 'Request an invite', href: '#waitlist' },
    closingTitle: ['Get on', 'the list'],
    closingBody: {
      home: 'Ten coaches at a time. Every one gets a setup call where we import your roster with you.',
      spreadsheet: 'Ten coaches at a time. Every one gets a setup call where we bring your first program across with you.',
    },
    importHelp:
      'Every coach in the beta gets a setup call. Bring the file and we’ll get your first program in with you, and use what tripped it up to improve the importer.',
    structured: {
      description: 'Free during the private beta. Beta coaches keep a founding price once paid plans start.',
      availability: 'https://schema.org/PreOrder',
    },
  },
  open: {
    heroEyebrow: 'Open beta · for independent coaches',
    marquee: 'Open beta · free to start',
    promises: ['Free in the beta', 'Then a founding price', 'Bring your spreadsheet'],
    price:
      'Logbook.fit is free during the beta. Coaches who join during the beta keep a founding price, lower than the regular one, for as long as they stay, and you’ll hear about pricing well before anything costs money.',
    nextStep: {
      q: 'How do I get started?',
      a: 'Create your coach account, import a program or build one, and send your first client an invite link. It takes a few minutes and there is nothing to install.',
    },
    midCta: { label: 'Create your account', href: '/signup' },
    closingTitle: ['Start', 'today'],
    closingBody: {
      home: 'Create your account, bring your programs across, and invite your first client today.',
      spreadsheet: 'Create your account and upload the file you coach from. Nothing is saved until you say so.',
    },
    importHelp:
      'Nothing is saved until you have checked it, so a messy import costs you nothing. Send us the file from Send feedback in the app and we’ll use what tripped it up to improve the importer. You can also download our template and paste your program into it.',
    structured: {
      description: 'Free during the beta. Beta coaches keep a founding price once paid plans start.',
      availability: 'https://schema.org/InStock',
    },
  },
};

/** What a client needs, with the iPhone app named once it is in the store. */
export function clientNeeds(hasApp: boolean): string {
  return hasApp
    ? 'Just their phone. They join from the invite link you send, then train in the Logbook.fit iPhone app or in their browser.'
    : 'Just their phone. They join from the invite link you send, train from Logbook.fit in their browser, and can add it to their home screen like an app.';
}

export interface Offer {
  mode: OfferMode;
  copy: OfferCopy;
  appStoreUrl: string | null;
}

/** The offer for this deployment, read from its environment. */
export function getOffer(): Offer {
  const mode = offerMode();
  return { mode, copy: OFFER_COPY[mode], appStoreUrl: appStoreUrl() };
}
