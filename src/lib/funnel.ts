import { track } from '@vercel/analytics';

/**
 * The signup funnel as custom analytics events, so visits, started signups
 * and completed signups can be told apart, per source. Page views alone
 * (all that existed before) say how many came, not how many tried.
 *
 * The device opt-out (localStorage 'va-disable', see AnalyticsWithOptOut)
 * covers these too: the Analytics component's beforeSend sees every event.
 */
export type FunnelEvent =
  /** Typed into the waitlist email field */
  | 'Waitlist started'
  /** The waitlist accepted the email */
  | 'Waitlist joined'
  /** Typed into the signup form */
  | 'Signup started'
  /** Account created */
  | 'Signup completed'
  /** Booked a setup call from the waitlist confirmation */
  | 'Setup call booked';

/** How someone reached the signup form */
export type SignupKind = 'coach-beta-invite' | 'coach-open' | 'client-invite';

export interface Attribution {
  source: string;
  medium?: string;
  campaign?: string;
  referrer?: string;
}

/**
 * Campaign attribution from a page URL, falling back to the referring host
 * so an untagged link from a forum or newsletter still lands in a bucket
 * instead of "unknown". `pageCampaign` names the page the form sits on, for
 * visits whose link carried no utm_campaign of its own.
 */
export function attributionFrom(
  search: string,
  referrer: string | undefined,
  currentHost: string,
  pageCampaign?: string
): Attribution {
  const params = new URLSearchParams(search);

  let referrerHost: string | undefined;
  if (referrer) {
    try {
      const url = new URL(referrer);
      // Same-origin navigations say nothing about acquisition.
      if (url.host !== currentHost) referrerHost = url.host;
    } catch {
      // A malformed referrer is not worth failing a signup over.
    }
  }

  return {
    source: params.get('utm_source') ?? referrerHost ?? 'direct',
    medium: params.get('utm_medium') ?? undefined,
    campaign: params.get('utm_campaign') ?? pageCampaign,
    referrer: referrer || undefined,
  };
}

/** Attribution for the page the visitor is on now. Empty during server render. */
export function readAttribution(pageCampaign?: string): Attribution | Record<string, never> {
  if (typeof window === 'undefined') return {};
  return attributionFrom(
    window.location.search,
    document.referrer || undefined,
    window.location.host,
    pageCampaign
  );
}

/** Which signup this is, from the tokens in the URL */
export function signupKind(inviteToken: string | null, betaToken: string | null): SignupKind {
  if (inviteToken) return 'client-invite';
  return betaToken ? 'coach-beta-invite' : 'coach-open';
}

/**
 * Record a funnel step. Never throws: analytics must not break a signup.
 * Only short labels go out (source, campaign, kind), never an email, a
 * token or the full referrer URL.
 */
export function trackFunnel(event: FunnelEvent, props: Record<string, string | undefined> = {}): void {
  try {
    const clean: Record<string, string> = {};
    for (const [key, value] of Object.entries(props)) {
      if (value) clean[key] = value.slice(0, 100);
    }
    track(event, clean);
  } catch {
    // Deliberately swallowed.
  }
}
