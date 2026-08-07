'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, UserCog, User, Loader2 } from 'lucide-react';
import { AuthShell, AuthDivider, AuthFieldLabel } from '@/components/auth/AuthShell';
import { isDemoModeEnabled } from '@/lib/demo';
import { LOGIN_ERROR_DEMO_LOCKED, LOGIN_ERROR_RATE_LIMITED } from '@/lib/auth-errors';

const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  [LOGIN_ERROR_RATE_LIMITED]:
    'Too many sign-in attempts. Wait 15 minutes and try again — or reset your password below.',
  [LOGIN_ERROR_DEMO_LOCKED]: 'Demo access is switched off on this deployment.',
};

/**
 * The deep link to return to after sign-in, from ?callbackUrl (written by the
 * middleware when it bounces an unauthenticated visitor). Only same-origin
 * paths survive — anything else (absolute URLs to other hosts, protocol-
 * relative //evil.com) is discarded so login can't be an open redirect.
 */
function callbackPathFromLocation(): string | null {
  const raw = new URLSearchParams(window.location.search).get('callbackUrl');
  if (!raw) return null;
  try {
    const url = new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    // "/" just re-enters the role bounce in the middleware — let the
    // role-based redirect below pick the right home instead.
    if (url.pathname === '/') return null;
    return url.pathname + url.search;
  } catch {
    return null;
  }
}

const DEMO_ACCOUNTS = {
  coach: { email: 'coach@logbook.fit', password: 'demo1234', label: 'Demo Coach', icon: UserCog },
  client: { email: 'client@logbook.fit', password: 'demo1234', label: 'Demo Client', icon: User },
} as const;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState<string | null>(null);

  const handleLogin = async (loginEmail: string, loginPassword: string, loadingKey: string) => {
    setError('');
    setLoading(loadingKey);

    const result = await signIn('credentials', {
      email: loginEmail,
      password: loginPassword,
      redirect: false,
    });

    setLoading(null);

    if (result?.error) {
      setError(LOGIN_ERROR_MESSAGES[result.error] ?? 'Invalid email or password');
      return;
    }

    // Return to the page that bounced us here, if any. A wrong-role deep
    // link is harmless — the middleware bounces it to the right app home.
    const callbackPath = callbackPathFromLocation();
    if (callbackPath) {
      router.push(callbackPath);
      return;
    }

    // Fetch the user's role to redirect correctly
    const meRes = await fetch('/api/me');
    if (meRes.ok) {
      const user = await meRes.json();
      router.push(user.role === 'COACH' ? '/coach' : '/client');
    } else {
      router.push('/');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLogin(email, password, 'form');
  };

  return (
    <AuthShell mode="login">
      <div>
        <p className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground antialiased">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />
          Welcome back
        </p>
        <h1 className="text-4xl font-black uppercase tracking-tight leading-[0.95] text-balance antialiased">
          Sign in
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground antialiased">
          Pick up where you left off.
        </p>
      </div>

      <AuthDivider />

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
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <AuthFieldLabel htmlFor="password">Password</AuthFieldLabel>
            <Link
              href="/forgot-password"
              className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground antialiased transition-colors hover:text-foreground"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            autoComplete="current-password"
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
          disabled={loading === 'form'}
        >
          {loading === 'form' ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Sign in
          {loading !== 'form' && <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />}
        </Button>
      </form>

      {/* Quick demo login — locked server-side too (see src/lib/demo.ts) */}
      {isDemoModeEnabled() && (
        <div className="mt-9 rounded-xl border border-dashed border-border p-4">
          <p className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground antialiased">
            <span className="h-1.5 w-1.5 rounded-full bg-brand ring-2 ring-brand/25" aria-hidden="true" />
            Demo access
          </p>
          <div className="space-y-2">
            {Object.entries(DEMO_ACCOUNTS).map(([key, account]) => {
              const Icon = account.icon;
              return (
                <button
                  key={key}
                  type="button"
                  disabled={loading !== null}
                  onClick={() => handleLogin(account.email, account.password, key)}
                  className="flex h-11 w-full items-center gap-2.5 rounded-lg border border-border/70 bg-background px-3 text-sm font-medium antialiased transition-[background-color,transform] duration-150 touch-manipulation hover:bg-accent active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                >
                  {loading === key ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  )}
                  {account.label}
                  <span className="ml-auto font-mono text-[10px] tabular-nums text-muted-foreground">
                    {account.email}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </AuthShell>
  );
}
