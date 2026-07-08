'use client';

import { useId, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, Loader2 } from 'lucide-react';

/**
 * Email capture for the public landing page. Posts to /api/waitlist
 * and collapses into a confirmation once the email is accepted.
 */
export function WaitlistForm() {
  const inputId = useId();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStatus('loading');

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(
          res.status === 429
            ? 'Too many attempts — please try again in a bit.'
            : body?.error === 'Validation failed'
              ? 'That doesn’t look like a valid email address.'
              : 'Something went wrong. Please try again.'
        );
        setStatus('idle');
        return;
      }

      setStatus('done');
    } catch {
      setError('Something went wrong. Please try again.');
      setStatus('idle');
    }
  };

  if (status === 'done') {
    return (
      <div
        role="status"
        className="flex items-center gap-3 rounded-xl border border-border/70 bg-card px-4 py-3.5 animate-fade-in-up"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand">
          <Check className="h-4 w-4 text-brand-foreground" strokeWidth={3} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold antialiased">You&rsquo;re on the list.</p>
          <p className="text-sm text-muted-foreground antialiased">
            We&rsquo;ll email you when your invite is ready.
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
          className="h-11 shrink-0 bg-brand px-6 text-sm font-bold uppercase tracking-wider text-brand-foreground hover:bg-brand/90 active:scale-[0.97] transition-transform duration-150"
        >
          {status === 'loading' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Join the waitlist
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
