'use client';

import { useId, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Buckets for the confirmation-screen question. Values match `waitlistQualifySchema`. */
const CLIENT_COUNTS = [
  { value: '1-5', label: '1–5' },
  { value: '6-15', label: '6–15' },
  { value: '16-30', label: '16–30' },
  { value: '30+', label: '30+' },
  { value: 'not-coaching', label: 'Not coaching yet' },
] as const;

/**
 * Reads campaign attribution from the current URL, falling back to the
 * referring host so an untagged link from a forum or newsletter still lands
 * in a bucket instead of "unknown".
 */
function readAttribution() {
  if (typeof window === 'undefined') return {};

  const params = new URLSearchParams(window.location.search);
  const referrer = document.referrer || undefined;

  let referrerHost: string | undefined;
  if (referrer) {
    try {
      const url = new URL(referrer);
      // Same-origin navigations say nothing about acquisition.
      if (url.host !== window.location.host) referrerHost = url.host;
    } catch {
      // A malformed referrer is not worth failing a signup over.
    }
  }

  return {
    source: params.get('utm_source') ?? referrerHost ?? 'direct',
    medium: params.get('utm_medium') ?? undefined,
    campaign: params.get('utm_campaign') ?? undefined,
    referrer,
  };
}

/**
 * Email capture for the public landing page. Posts to /api/waitlist, then
 * spends the confirmation, the highest-intent moment in the funnel, on one
 * optional qualifying question rather than on a receipt. The question sits
 * after the submit deliberately: extra fields before it would cost signups.
 */
export function WaitlistForm() {
  const inputId = useId();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'qualify' | 'done'>(
    'idle'
  );
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStatus('loading');

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, ...readAttribution() }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(
          res.status === 429
            ? 'Too many attempts. Please try again in a bit.'
            : body?.error === 'Validation failed'
              ? 'That doesn’t look like a valid email address.'
              : 'Something went wrong. Please try again.'
        );
        setStatus('idle');
        return;
      }

      setStatus('qualify');
    } catch {
      setError('Something went wrong. Please try again.');
      setStatus('idle');
    }
  };

  // The signup is already saved, so this is best-effort: a failure here is
  // silent and simply moves the coach along to the confirmation.
  const handleQualify = async (clientCount: string) => {
    setStatus('done');
    try {
      await fetch('/api/waitlist', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, clientCount }),
      });
    } catch {
      // Ignored on purpose.
    }
  };

  // Shared header for both confirmation states: the card keeps one identity
  // while its body swaps from the question to the sign-off. The volt fill is
  // deliberate — this is the page's accent color spent on its best moment.
  const confirmationHeader = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-foreground text-brand animate-bounce-once">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="h-5 w-5"
          >
            <path d="M4.5 12.5l5 5L19.5 6.5" pathLength={20} className="animate-draw-check" />
          </svg>
        </span>
        <p className="pt-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-brand-foreground/70 antialiased">
          Request received
        </p>
      </div>
      <p className="mt-5 text-[2rem] font-bold uppercase leading-[0.95] tracking-tight antialiased sm:text-[2.4rem]">
        You’re on
        <br />
        the list.
      </p>
    </>
  );

  if (status === 'qualify') {
    return (
      <div
        role="status"
        className="rounded-2xl bg-brand p-6 text-left text-brand-foreground animate-fade-in-up sm:p-7"
      >
        {confirmationHeader}
        <p className="mt-5 text-sm font-medium text-brand-foreground/75 antialiased">
          One question so we can put you in the right batch:
        </p>
        <p className="mt-1 text-base font-semibold antialiased">
          How many clients are you coaching right now?
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {CLIENT_COUNTS.map((option, i) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleQualify(option.value)}
              style={{ animationDelay: `${150 + i * 50}ms` }}
              className="animate-fade-in-up rounded-lg border-2 border-brand-foreground/30 px-3.5 py-2 font-mono text-xs font-medium uppercase tracking-[0.08em] antialiased transition-colors hover:border-brand-foreground hover:bg-brand-foreground hover:text-brand active:scale-[0.97]"
            >
              {option.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setStatus('done')}
          className="mt-4 text-sm text-brand-foreground/60 antialiased underline-offset-4 transition-colors hover:text-brand-foreground hover:underline"
        >
          Skip
        </button>
      </div>
    );
  }

  if (status === 'done') {
    return (
      <div
        role="status"
        className="overflow-hidden rounded-2xl bg-brand text-left text-brand-foreground animate-fade-in-up"
      >
        <div className="p-6 sm:p-7">
          {confirmationHeader}
          <p className="mt-4 text-sm leading-relaxed text-brand-foreground/80 antialiased">
            Your invite lands by email. In the meantime, hit reply on it and tell
            us what you’re using to keep track of clients today. We read every
            one, and it shapes what we build next.
          </p>
        </div>
        {/* Echoes the page's black-on-volt marquee, inverted: a ticket-stub
            footer that closes the loop on the brand's ticker language. */}
        <p className="bg-brand-foreground px-6 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-brand antialiased sm:px-7">
          Invite incoming · Watch your inbox
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor={inputId} className="sr-only">
          Email address
        </label>
        <Input
          id={inputId}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required
          className="h-11 flex-1"
        />
        <Button
          type="submit"
          disabled={status === 'loading'}
          className={cn(
            'h-11 shrink-0 bg-brand px-6 text-sm font-bold uppercase tracking-wider text-brand-foreground',
            'hover:bg-brand/90 active:scale-[0.97] transition-transform duration-150'
          )}
        >
          {status === 'loading' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Request an invite
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive antialiased">
          {error}
        </p>
      )}
    </form>
  );
}
