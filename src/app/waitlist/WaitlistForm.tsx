'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground antialiased flex items-center gap-2">
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
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <label
          htmlFor="waitlist-email"
          className="block font-mono text-[10px] uppercase tracking-[0.14em] font-medium text-muted-foreground antialiased"
        >
          Email
        </label>
        <Input
          id="waitlist-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          className="h-11"
          required
        />
      </div>
      {state === 'error' && (
        <p role="alert" className="text-sm text-destructive">
          Something went wrong. Please try again.
        </p>
      )}
      <div className="space-y-3">
        <Button
          type="submit"
          className="w-full h-12 text-sm font-bold uppercase tracking-wider bg-foreground text-background hover:bg-foreground/90 active:scale-[0.98] transition-transform duration-150"
          disabled={state === 'submitting'}
        >
          {state === 'submitting' ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : null}
          Get early access
          {state !== 'submitting' && <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />}
        </Button>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Takes 10 seconds. First invites go out in order.
        </p>
      </div>
    </form>
  );
}
