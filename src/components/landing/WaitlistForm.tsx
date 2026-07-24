'use client';

import { useId, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Buckets for the confirmation-screen question. Values match `waitlistQualifySchema`. */
const CLIENT_COUNTS = [
  { value: '1-5', label: '1 to 5' },
  { value: '6-15', label: '6 to 15' },
  { value: '16-30', label: '16 to 30' },
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

  if (status === 'qualify') {
    return (
      <div className="rounded-xl border border-border/70 bg-card p-4 text-left animate-fade-in-up">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand">
            <Check className="h-4 w-4 text-brand-foreground" strokeWidth={3} />
          </span>
          <p className="text-sm font-semibold antialiased">You’re on the list.</p>
        </div>

        <p className="mt-4 text-sm font-medium antialiased">
          One question, so we invite you in the right batch: how many clients are
          you coaching right now?
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {CLIENT_COUNTS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleQualify(option.value)}
              className="rounded-lg border border-border px-3 py-2 text-sm font-medium antialiased transition-colors hover:border-brand hover:bg-accent active:scale-[0.97]"
            >
              {option.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setStatus('done')}
          className="mt-3 text-sm text-muted-foreground antialiased underline-offset-4 transition-colors hover:text-foreground hover:underline"
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
        className="flex items-start gap-3 rounded-xl border border-border/70 bg-card px-4 py-3.5 animate-fade-in-up"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand">
          <Check className="h-4 w-4 text-brand-foreground" strokeWidth={3} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold antialiased">You’re on the list.</p>
          <p className="mt-1 text-sm text-muted-foreground antialiased">
            Your invite lands by email. In the meantime, hit reply on it and tell
            us what you’re using to keep track of clients today. We read every
            one, and it shapes what we build next.
          </p>
        </div>
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
