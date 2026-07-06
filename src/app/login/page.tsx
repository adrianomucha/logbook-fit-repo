'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserCog, User, Loader2 } from 'lucide-react';
import { LogoMark } from '@/components/brand/LogoMark';

const DEMO_ACCOUNTS = {
  coach: { email: 'coach@logbook.fit', password: 'demo1234', label: 'Coach', icon: UserCog },
  client: { email: 'client@logbook.fit', password: 'demo1234', label: 'Client', icon: User },
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
    // The login screen commits to the dark brand canvas regardless of theme —
    // the `dark` class flips all tokens for everything inside.
    <div className="dark relative min-h-dvh overflow-hidden bg-background text-foreground flex items-center justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      {/* Ruled logbook lines */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background-image:repeating-linear-gradient(to_bottom,transparent_0px,transparent_31px,hsl(var(--foreground)/0.05)_31px,hsl(var(--foreground)/0.05)_32px)]"
      />
      {/* Volt glow behind the header */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-44 left-1/2 h-96 w-[38rem] -translate-x-1/2 rounded-full bg-brand/10 blur-3xl"
      />

      <div className="relative w-full max-w-sm space-y-7">
        <div className="text-center animate-enter">
          <div className="mb-5 flex justify-center">
            <LogoMark size={52} />
          </div>
          <p className="mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.35em] text-muted-foreground">
            Train · Log · Progress
          </p>
          <h1 className="text-4xl font-bold tracking-tight">
            Welcome back<span className="text-brand">.</span>
          </h1>
        </div>

        {/* Manual login form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-border bg-white/[0.03] p-5 sm:p-6 animate-enter [animation-delay:80ms]"
        >
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground"
            >
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@logbook.fit"
              autoComplete="email"
              className="h-11 bg-background/60"
              required
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="password"
              className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground"
            >
              Password
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className="h-11 bg-background/60"
              required
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button
            type="submit"
            className="h-11 w-full bg-brand font-semibold text-brand-foreground hover:bg-brand/90"
            disabled={loading === 'form'}
          >
            {loading === 'form' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign in
          </Button>
        </form>

        {/* Quick demo login */}
        <div className="space-y-3 animate-enter [animation-delay:160ms]">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              Demo access
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(DEMO_ACCOUNTS).map(([key, account]) => {
              const Icon = account.icon;
              return (
                <button
                  key={key}
                  type="button"
                  disabled={loading !== null}
                  onClick={() => handleLogin(account.email, account.password, key)}
                  className="group rounded-xl border border-border bg-white/[0.02] p-3.5 text-left transition-colors hover:border-brand/60 hover:bg-brand/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                >
                  {loading === key ? (
                    <Loader2 className="mb-2 h-4 w-4 animate-spin text-brand" />
                  ) : (
                    <Icon className="mb-2 h-4 w-4 text-brand" />
                  )}
                  <div className="text-sm font-medium">{account.label}</div>
                  <div className="truncate font-mono text-[10px] text-muted-foreground">
                    {account.email}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <p className="text-center font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60 animate-enter [animation-delay:240ms]">
          Every rep counts
        </p>
      </div>
    </div>
  );
}
