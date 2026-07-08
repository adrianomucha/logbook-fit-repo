'use client';

import { useId, useState } from 'react';
import { Loader2, ArrowRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

type Role = 'COACH' | 'CLIENT';
type Status = 'idle' | 'submitting' | 'success' | 'error';

interface EarlyAccessFormProps {
  /** Where on the page this instance lives — sent as attribution. */
  location: string;
  className?: string;
  /** Larger hero treatment vs. the compact footer/CTA treatment. */
  size?: 'lg' | 'md';
}

const ROLES: { value: Role; label: string }[] = [
  { value: 'COACH', label: 'Coach' },
  { value: 'CLIENT', label: 'Client' },
];

export function EarlyAccessForm({ location, className, size = 'lg' }: EarlyAccessFormProps) {
  const uid = useId();
  const emailId = `ea-email-${uid}`;
  const hintId = `ea-hint-${uid}`;

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('COACH');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [alreadyOnList, setAlreadyOnList] = useState(false);

  const submitting = status === 'submitting';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const trimmed = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
      setStatus('error');
      setMessage('Please enter a valid email address.');
      return;
    }

    setStatus('submitting');
    setMessage('');

    try {
      const referrer =
        typeof document !== 'undefined'
          ? `${location} · ${document.referrer || 'direct'}`.slice(0, 500)
          : location;

      const res = await fetch('/api/early-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, role, referrer }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setStatus('error');
        setMessage(data.error || 'Something went wrong. Please try again.');
        return;
      }

      const data = await res.json().catch(() => ({ ok: true }));
      setAlreadyOnList(Boolean(data.alreadyOnList));
      setStatus('success');
    } catch {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  }

  if (status === 'success') {
    return (
      <div className={cn('w-full', className)}>
        <div
          role="status"
          aria-live="polite"
          className="flex items-start gap-3 rounded-xl border border-brand/40 bg-brand/[0.07] px-4 py-4 animate-fade-in-up"
        >
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-brand-foreground">
            <Check className="h-4 w-4" strokeWidth={3} />
          </span>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              {alreadyOnList ? "You're already on the list." : "You're on the list."}
            </p>
            <p className="text-sm text-muted-foreground">
              {alreadyOnList
                ? "Sit tight — we'll email you the moment your early-access seat opens."
                : "We'll email you the moment your early-access seat opens. Nothing else, no spam."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const inputBase =
    'w-full flex-1 rounded-lg bg-transparent px-4 text-foreground placeholder:text-muted-foreground/70 focus:outline-none';

  return (
    <form onSubmit={handleSubmit} noValidate className={cn('w-full', className)}>
      {/* Role segment — pre-selected, low-friction, useful signal */}
      <div
        role="radiogroup"
        aria-label="I am a"
        className="mb-3 inline-flex items-center gap-1 rounded-full border border-border bg-secondary/50 p-1"
      >
        <span className="px-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
          I&apos;m a
        </span>
        {ROLES.map((r) => {
          const selected = role === r.value;
          return (
            <button
              key={r.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setRole(r.value)}
              className={cn(
                'rounded-full px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                selected
                  ? 'bg-brand text-brand-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {r.label}
            </button>
          );
        })}
      </div>

      <label htmlFor={emailId} className="sr-only">
        Email address
      </label>
      <div
        className={cn(
          'flex flex-col gap-2 rounded-2xl border border-border bg-card/60 p-1.5 backdrop-blur sm:flex-row sm:items-center',
          status === 'error' && 'border-destructive/60'
        )}
      >
        <input
          id={emailId}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status === 'error') setStatus('idle');
          }}
          aria-describedby={hintId}
          aria-invalid={status === 'error'}
          placeholder="you@yourcoaching.com"
          className={cn(inputBase, size === 'lg' ? 'h-12 text-base' : 'h-11 text-sm')}
        />
        <button
          type="submit"
          disabled={submitting}
          className={cn(
            'group inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-brand font-semibold text-brand-foreground transition-[background-color,transform,box-shadow] hover:bg-brand/90 hover:shadow-[0_0_0_3px_hsl(var(--brand)/0.18)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-70',
            size === 'lg' ? 'h-12 px-6 text-[15px]' : 'h-11 px-5 text-sm'
          )}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Joining…
            </>
          ) : (
            <>
              Request early access
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </div>

      <p id={hintId} className="mt-2.5 text-xs text-muted-foreground">
        {status === 'error' ? (
          <span role="alert" className="text-destructive">
            {message}
          </span>
        ) : (
          "No credit card. Early-access waitlist — we'll email you when your seat opens."
        )}
      </p>
    </form>
  );
}
