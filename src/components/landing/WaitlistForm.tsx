'use client';

import { Fragment, useCallback, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, Loader2 } from 'lucide-react';
import { FormError } from '@/components/ui/form-error';
import { cn } from '@/lib/utils';
import { SETUP_CALL_OFFER, WAITLIST_NEXT_STEPS } from '@/lib/landing-copy';
import { readAttribution, trackFunnel } from '@/lib/funnel';
import { offersSetupCall, setupCallLink } from '@/lib/setup-call';
import { SetupCallBooked, type SetupCallBooking } from '@/components/landing/SetupCallBooked';
import { useSetupCallWidget } from '@/components/landing/useSetupCallWidget';

/** Buckets for the confirmation-screen question. Values match `waitlistQualifySchema`. */
const CLIENT_COUNTS = [
  { value: '1-5', label: '1–5' },
  { value: '6-15', label: '6–15' },
  { value: '16-30', label: '16–30' },
  { value: '30+', label: '30+' },
  { value: 'not-coaching', label: 'Not coaching yet' },
] as const;

/** Values match `WAITLIST_CURRENT_TOOLS`. */
const CURRENT_TOOLS = [
  { value: 'spreadsheets', label: 'Sheets or Excel' },
  { value: 'notes-and-messages', label: 'Notes and messages' },
  { value: 'trainerize', label: 'Trainerize' },
  { value: 'truecoach', label: 'TrueCoach' },
  { value: 'everfit', label: 'Everfit' },
  { value: 'other-app', label: 'Another app' },
] as const;

/**
 * Email capture for the public landing pages. Posts to /api/waitlist, then
 * spends the confirmation, the highest-intent moment in the funnel, on two
 * optional one-tap questions rather than on a receipt: how many clients, and
 * what they coach on today. They sit after the submit deliberately: extra
 * fields before it would cost signups.
 *
 * Then, for anyone coaching (see offersSetupCall), a last step: book the
 * setup call on Cal.com. Booking sends the invite straight away (the Cal.com
 * webhook does it), and the card turns into the booked state, which points
 * the coach at importing their program before the call.
 */
export function WaitlistForm({
  campaign,
  promises,
}: {
  campaign?: string;
  /** Short reassurances shown under the button, above the consent line */
  promises?: readonly string[];
} = {}) {
  const inputId = useId();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<
    'idle' | 'loading' | 'qualify' | 'tool' | 'book' | 'booked' | 'done'
  >('idle');
  const [error, setError] = useState<'registered' | string>('');
  const [clientCount, setClientCount] = useState<string | null>(null);
  const [booking, setBooking] = useState<SetupCallBooking | null>(null);
  // Whether the coach was shown the booking step and said "Not now"
  const [declinedCall, setDeclinedCall] = useState(false);

  const calLink = setupCallLink();
  const canBook = Boolean(calLink) && offersSetupCall(clientCount);

  // Funnel: one "started" per page view, on the first character typed
  const startedRef = useRef(false);
  const funnelProps = () => {
    const from = readAttribution(campaign);
    return { source: from.source, medium: from.medium, campaign: from.campaign };
  };
  const markStarted = () => {
    if (startedRef.current) return;
    startedRef.current = true;
    trackFunnel('Waitlist started', funnelProps());
  };

  const onBooked = useCallback(
    (booked: SetupCallBooking) => {
      setBooking(booked);
      setStatus('booked');
      const from = readAttribution(campaign);
      trackFunnel('Setup call booked', { source: from.source, campaign: from.campaign });
    },
    [campaign]
  );
  // Loads Cal.com's script once the booking step is on screen, not before
  const openBooking = useSetupCallWidget({
    link: calLink,
    email,
    enabled: canBook && (status === 'book' || status === 'done'),
    onBooked,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStatus('loading');

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, ...readAttribution(campaign) }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(
          body?.error === 'already_registered'
            ? 'registered'
            : res.status === 429
              ? 'Too many attempts. Please try again in a bit.'
              : body?.error === 'Validation failed'
                ? 'That doesn’t look like a valid email address.'
                : 'Something went wrong. Please try again.'
        );
        setStatus('idle');
        return;
      }

      trackFunnel('Waitlist joined', funnelProps());
      setStatus('qualify');
    } catch {
      setError('Something went wrong. Please try again.');
      setStatus('idle');
    }
  };

  // The signup is already saved, so each answer is best-effort: a failure is
  // silent and simply moves the coach along to the next step.
  const saveAnswer = async (answer: { clientCount: string } | { currentTool: string }) => {
    try {
      await fetch('/api/waitlist', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, ...answer }),
      });
    } catch {
      // Ignored on purpose.
    }
  };

  // Shared header for every confirmation state: the card keeps one identity
  // while its body swaps from the question to the sign-off. The volt fill is
  // deliberate: this is the page's accent color spent on its best moment.
  // `title` is the heading's lines: one entry per line
  const header = (eyebrow: string, title: readonly string[]) => (
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
          {eyebrow}
        </p>
      </div>
      <p className="mt-5 text-[2rem] font-bold uppercase leading-[0.95] tracking-tight antialiased sm:text-[2.4rem]">
        {title.map((line, i) => (
          <Fragment key={line}>
            {i > 0 && <br />}
            {line}
          </Fragment>
        ))}
      </p>
    </>
  );
  const confirmationHeader = header('Request received', ['You’re on', 'the list.']);
  const afterQuestions = () => setStatus(canBook ? 'book' : 'done');

  if (status === 'qualify' || status === 'tool') {
    const question =
      status === 'qualify'
        ? {
            lead: 'Two quick taps so we can put you in the right batch:',
            prompt: 'How many clients are you coaching right now?',
            options: CLIENT_COUNTS,
            pick: (value: string) => {
              setClientCount(value);
              setStatus('tool');
              saveAnswer({ clientCount: value });
            },
            skip: () => setStatus('tool'),
          }
        : {
            lead: 'And one more:',
            prompt: 'What do you run your coaching on today?',
            options: CURRENT_TOOLS,
            pick: (value: string) => {
              afterQuestions();
              saveAnswer({ currentTool: value });
            },
            skip: afterQuestions,
          };

    return (
      <div
        role="status"
        className="rounded-2xl bg-brand p-6 text-left text-brand-foreground animate-fade-in-up sm:p-7"
      >
        {confirmationHeader}
        <p className="mt-5 text-sm font-medium text-brand-foreground/75 antialiased">
          {question.lead}
        </p>
        <p className="mt-1 text-base font-semibold antialiased">{question.prompt}</p>
        {/* Keyed by step so the options replay their entrance on the swap */}
        <div key={status} className="mt-4 flex flex-wrap gap-2">
          {question.options.map((option, i) => (
            <button
              key={option.value}
              type="button"
              onClick={() => question.pick(option.value)}
              style={{ animationDelay: `${150 + i * 50}ms` }}
              className="animate-fade-in-up min-h-11 rounded-lg border-2 border-brand-foreground/30 px-3.5 font-mono text-xs font-medium uppercase tracking-[0.08em] antialiased transition-[color,background-color,border-color,transform] duration-150 ease-out-strong hover:border-brand-foreground hover:bg-brand-foreground hover:text-brand active:scale-[0.97] active:border-brand-foreground"
            >
              {option.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={question.skip}
          className="mt-1 inline-flex min-h-11 items-center text-sm text-brand-foreground/60 antialiased underline-offset-4 transition-colors hover:text-brand-foreground hover:underline active:text-brand-foreground"
        >
          Skip
        </button>
      </div>
    );
  }

  if (status === 'book') {
    return (
      <div
        role="status"
        className="rounded-2xl bg-brand p-6 text-left text-brand-foreground animate-fade-in-up sm:p-7"
      >
        {confirmationHeader}
        <p className="mt-5 text-sm font-medium text-brand-foreground/75 antialiased">
          {SETUP_CALL_OFFER.lead}
        </p>
        <p className="mt-1 text-base font-semibold antialiased">{SETUP_CALL_OFFER.prompt}</p>
        <p className="mt-1 text-sm text-brand-foreground/75 antialiased">{SETUP_CALL_OFFER.detail}</p>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1">
          <button
            type="button"
            onClick={openBooking}
            className="animate-fade-in-up inline-flex min-h-11 items-center rounded-lg bg-brand-foreground px-5 text-sm font-bold uppercase tracking-wider text-brand antialiased transition-[opacity,transform] duration-150 ease-out-strong hover:opacity-90 active:scale-[0.97]"
          >
            {SETUP_CALL_OFFER.cta}
          </button>
          <button
            type="button"
            onClick={() => {
              setDeclinedCall(true);
              setStatus('done');
            }}
            className="inline-flex min-h-11 items-center text-sm text-brand-foreground/60 antialiased underline-offset-4 transition-colors hover:text-brand-foreground hover:underline active:text-brand-foreground"
          >
            {SETUP_CALL_OFFER.skip}
          </button>
        </div>
      </div>
    );
  }

  if (status === 'booked' && booking) {
    return (
      <SetupCallBooked
        header={header('Call booked', ['You’re in.'])}
        email={email}
        booking={booking}
      />
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
            {WAITLIST_NEXT_STEPS}
          </p>
          {declinedCall && canBook && (
            <button
              type="button"
              onClick={openBooking}
              className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold antialiased underline underline-offset-4 transition-opacity hover:opacity-80"
            >
              {SETUP_CALL_OFFER.reconsider}
            </button>
          )}
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
          onChange={(e) => {
            markStarted();
            setEmail(e.target.value);
          }}
          placeholder="you@example.com"
          autoComplete="email"
          // The phone keyboard: an email layout, a Send key, and no
          // capitalising or correcting an address
          inputMode="email"
          enterKeyHint="send"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          className="h-11 flex-1"
        />
        <Button
          type="submit"
          disabled={status === 'loading'}
          className={cn(
            'h-11 shrink-0 bg-brand px-6 text-sm font-bold uppercase tracking-wider text-brand-foreground',
            'hover:bg-brand/90'
          )}
        >
          {status === 'loading' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Request an invite
        </Button>
      </div>
      {error && (
        <FormError>
          {error === 'registered' ? (
            <>
              Good news: you already have an account.{' '}
              <Link
                href="/login"
                className="font-medium underline underline-offset-2"
              >
                Sign in
              </Link>{' '}
              and get after it.
            </>
          ) : (
            error
          )}
        </FormError>
      )}
      {/* A check per item rather than dot separators: a wrapped line on a
          phone then starts with a check, never with a stray dot. */}
      {promises && (
        <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 pt-2 text-sm text-muted-foreground antialiased">
          {promises.map((promise) => (
            <li key={promise} className="flex items-center gap-1.5 whitespace-nowrap">
              <Check className="h-3.5 w-3.5 shrink-0 text-brand" strokeWidth={3} aria-hidden="true" />
              {promise}
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground/80 antialiased">
        By requesting an invite you agree to our{' '}
        <Link
          href="/terms"
          className="underline underline-offset-2 transition-colors hover:text-foreground"
        >
          Terms of Service
        </Link>{' '}
        and{' '}
        <Link
          href="/privacy"
          className="underline underline-offset-2 transition-colors hover:text-foreground"
        >
          Privacy Policy
        </Link>
        .
      </p>
    </form>
  );
}
