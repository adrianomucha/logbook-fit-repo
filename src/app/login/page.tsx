'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, UserCog, User, Loader2 } from 'lucide-react';
import { Logo } from '@/components/brand/LogoMark';
import { isDemoModeEnabled } from '@/lib/demo';

const DEMO_ACCOUNTS = {
  coach: { email: 'coach@logbook.fit', password: 'demo1234', label: 'Demo Coach', icon: UserCog },
  client: { email: 'client@logbook.fit', password: 'demo1234', label: 'Demo Client', icon: User },
} as const;

/** Uppercase tracked mono label — the product's data voice */
function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block font-mono text-[10px] uppercase tracking-[0.14em] font-medium text-muted-foreground antialiased"
    >
      {children}
    </label>
  );
}

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
      setError('Invalid email or password');
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
    <div className="min-h-dvh bg-background flex flex-col">
      {/* The app's own chrome — same frame as /signup */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex h-12 items-center justify-between">
          <Logo markSize={20} />
          <button
            onClick={() => router.push('/signup')}
            className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Create account
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-md mx-auto px-5 sm:px-6 py-9 sm:py-12 pb-[calc(2.25rem+env(safe-area-inset-bottom))] animate-enter">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-1.5">
            Welcome back
          </p>
          <h1 className="text-3xl font-black tracking-tight leading-tight text-balance">
            Sign in
          </h1>
        </div>

        <div className="my-7 sm:my-8 border-t border-border" aria-hidden="true" />

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="h-11"
              required
            />
          </div>
          <div className="space-y-2">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              autoComplete="current-password"
              className="h-11"
              required
            />
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button
            type="submit"
            className="w-full h-12 text-sm font-bold uppercase tracking-wider bg-foreground text-background hover:bg-foreground/90 active:scale-[0.98] transition-transform duration-150"
            disabled={loading === 'form'}
          >
            {loading === 'form' ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            Sign in
            {loading !== 'form' && <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />}
          </Button>
        </form>

        {/* Quick demo login — locked server-side too (see src/lib/demo.ts) */}
        {isDemoModeEnabled() && (
          <div className="mt-9">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-3 antialiased flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-brand ring-2 ring-brand/25" aria-hidden="true" />
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
                    className="w-full h-11 px-3 rounded-lg border border-border/70 flex items-center gap-2.5 text-sm font-medium antialiased hover:bg-accent active:scale-[0.98] transition-[background-color,transform] duration-150 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                  >
                    {loading === key ? (
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    ) : (
                      <Icon className="w-4 h-4 text-muted-foreground" />
                    )}
                    {account.label}
                    <span className="ml-auto font-mono text-[10px] text-muted-foreground tabular-nums">
                      {account.email}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
