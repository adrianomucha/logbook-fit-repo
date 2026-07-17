'use client';

import { useState } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';

type FormState = 'idle' | 'submitting' | 'success' | 'error';

export function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<FormState>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState('submitting');

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setState(res.ok ? 'success' : 'error');
    } catch {
      setState('error');
    }
  };

  if (state === 'success') {
    return (
      <div className="animate-fade-in-up" role="status">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-brand flex items-center gap-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-brand ring-2 ring-brand/25" aria-hidden="true" />
          You&rsquo;re on the list
        </p>
        <p className="mt-2.5 text-sm text-muted-foreground">
          We&rsquo;ll email you when your invite is up. First invites go out in order.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate={false}>
      <div className="flex flex-col sm:flex-row gap-3">
        <label htmlFor="waitlist-email" className="sr-only">
          Email address
        </label>
        <input
          id="waitlist-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required
          className="flex-1 h-12 px-4 rounded-lg bg-background border border-input text-sm text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:border-transparent transition-shadow"
        />
        <button
          type="submit"
          disabled={state === 'submitting'}
          className="h-12 px-6 rounded-lg bg-brand text-brand-foreground font-mono text-xs font-bold uppercase tracking-[0.14em] inline-flex items-center justify-center gap-2 hover:bg-brand/90 active:scale-[0.98] transition-[background-color,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-60 whitespace-nowrap"
        >
          {state === 'submitting' ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          ) : null}
          Get early access
          {state !== 'submitting' && <ArrowRight className="w-4 h-4" aria-hidden="true" />}
        </button>
      </div>
      <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        Takes 10 seconds. First invites go out in order.
      </p>
      {state === 'error' && (
        <p role="alert" className="mt-3 text-sm text-red-400">
          Something went wrong. Please try again.
        </p>
      )}
    </form>
  );
}
