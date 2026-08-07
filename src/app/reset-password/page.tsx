'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, Loader2, KeyRound } from 'lucide-react';
import { AuthShell, AuthDivider, AuthFieldLabel } from '@/components/auth/AuthShell';
import { PasswordRules } from '@/components/auth/PasswordRules';
import { FormError } from '@/components/ui/form-error';
import { passwordSchema } from '@/lib/validations/schemas';

function ResetPasswordForm() {
  // The token rides in the query string straight from the email link. No
  // token at all gets the same dead-link screen as an expired one.
  const token = useSearchParams().get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // The server enforces the same schema but answers with a generic
    // "Validation failed" — checking here keeps the message specific.
    const passwordCheck = passwordSchema.safeParse(password);
    if (!passwordCheck.success) {
      setError(passwordCheck.error.issues[0].message);
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/password-reset/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      if (res.ok) {
        setDone(true);
        return;
      }
      const body = await res.json().catch(() => null);
      setError(body?.error ?? 'Something went wrong. Please try again.');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-xl border border-border p-4">
          <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm leading-relaxed text-muted-foreground antialiased">
            This reset link is missing its token — it may have been cut short
            by your email client. Request a fresh one and try again.
          </p>
        </div>
        <Link
          href="/forgot-password"
          className="inline-flex items-center gap-2 text-sm font-medium antialiased transition-colors hover:text-muted-foreground"
        >
          Request a new link
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-xl border border-border p-4">
          <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
          <p className="text-sm leading-relaxed text-muted-foreground antialiased">
            Your password is updated. Sign in with the new one to pick up
            where you left off.
          </p>
        </div>
        <Button
          asChild
          className="h-12 w-full rounded-lg bg-brand text-sm font-bold uppercase tracking-wider text-brand-foreground transition-transform duration-150 hover:bg-brand/90 active:scale-[0.98]"
        >
          <Link href="/login">
            Sign in
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <AuthFieldLabel htmlFor="password">New password</AuthFieldLabel>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Make it a strong one"
          autoComplete="new-password"
          className="h-12 rounded-lg border-border/60 bg-secondary/50 px-3.5 transition-colors focus-visible:bg-background"
          required
          maxLength={72}
        />
        {/* Live checklist replaces the native minLength bubble — the
            schema check in handleSubmit still backstops it */}
        <PasswordRules password={password} />
      </div>
      <div className="space-y-2">
        <AuthFieldLabel htmlFor="confirm">Confirm password</AuthFieldLabel>
        <Input
          id="confirm"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Same password again"
          autoComplete="new-password"
          className="h-12 rounded-lg border-border/60 bg-secondary/50 px-3.5 transition-colors focus-visible:bg-background"
          required
          maxLength={72}
        />
      </div>
      {error && (
        <FormError>
          {error}
          {error.includes('invalid or expired') && (
            <>
              {' '}
              <Link href="/forgot-password" className="font-medium underline underline-offset-2">
                Request a new link
              </Link>
            </>
          )}
        </FormError>
      )}
      <Button
        type="submit"
        className="h-12 w-full rounded-lg bg-brand text-sm font-bold uppercase tracking-wider text-brand-foreground transition-transform duration-150 hover:bg-brand/90 active:scale-[0.98]"
        disabled={loading}
      >
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Set new password
        {!loading && <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell mode="login">
      <div>
        <p className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground antialiased">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />
          Account recovery
        </p>
        <h1 className="text-4xl font-black uppercase tracking-tight leading-[0.95] text-balance antialiased">
          New password
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground antialiased">
          Choose a new password for your account.
        </p>
      </div>

      <AuthDivider />

      {/* useSearchParams requires a Suspense boundary in the app router */}
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
