'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, ArrowLeft, Loader2, MailCheck } from 'lucide-react';
import { AuthShell, AuthDivider, AuthFieldLabel } from '@/components/auth/AuthShell';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (res.status === 429) {
        setError('Too many reset requests. Please try again later.');
        return;
      }
      if (!res.ok) {
        setError('Something went wrong. Please try again.');
        return;
      }
      setSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell mode="login">
      <div>
        <p className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground antialiased">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />
          Account recovery
        </p>
        <h1 className="text-4xl font-black uppercase tracking-tight leading-[0.95] text-balance antialiased">
          Forgot password
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground antialiased">
          Enter your email and we&rsquo;ll send you a link to set a new one.
        </p>
      </div>

      <AuthDivider />

      {sent ? (
        // Same message whether or not the account exists — the API is
        // deliberately silent about that, and so is this screen.
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-xl border border-border p-4">
            <MailCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
            <p className="text-sm leading-relaxed text-muted-foreground antialiased">
              If an account exists for{' '}
              <span className="font-medium text-foreground">{email}</span>, a
              reset link is on its way. It works for 30 minutes — check spam if
              it doesn&rsquo;t land.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-medium antialiased transition-colors hover:text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <AuthFieldLabel htmlFor="email">Email</AuthFieldLabel>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="h-12 rounded-lg border-border/60 bg-secondary/50 px-3.5 transition-colors focus-visible:bg-background"
              required
            />
          </div>
          {error && (
            <p role="alert" className="border-l-2 border-destructive pl-3 text-sm text-destructive">
              {error}
            </p>
          )}
          <Button
            type="submit"
            className="h-12 w-full rounded-lg bg-brand text-sm font-bold uppercase tracking-wider text-brand-foreground transition-transform duration-150 hover:bg-brand/90 active:scale-[0.98]"
            disabled={loading}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Send reset link
            {!loading && <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />}
          </Button>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-medium antialiased transition-colors hover:text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to sign in
          </Link>
        </form>
      )}
    </AuthShell>
  );
}
