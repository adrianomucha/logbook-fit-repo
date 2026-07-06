'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserCog, User, Loader2 } from 'lucide-react';
import { LogoMark } from '@/components/brand/LogoMark';

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
    <div className="min-h-dvh bg-background p-4 flex items-center justify-center pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="max-w-sm w-full space-y-5 animate-enter">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <LogoMark size={44} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight antialiased mb-1">
            Logbook<span className="text-muted-foreground/60">.fit</span>
          </h1>
          <p className="text-sm text-muted-foreground antialiased">Sign in to continue</p>
        </div>

        {/* Manual login form */}
        <div className="rounded-xl border border-border/70 bg-card px-4 py-4 sm:px-5 sm:py-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium antialiased">Email</label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium antialiased">Password</label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                autoComplete="current-password"
                required
              />
            </div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button
              type="submit"
              className="w-full h-11 text-sm font-bold uppercase tracking-wider bg-foreground text-background hover:bg-foreground/90 active:scale-[0.97] transition-transform duration-150"
              disabled={loading === 'form'}
            >
              {loading === 'form' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Sign In
            </Button>
          </form>
        </div>

        {/* Quick demo login */}
        <div className="rounded-xl border border-border/70 bg-card px-4 py-4 sm:px-5 sm:py-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-3 antialiased flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-brand" aria-hidden="true" />
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
      </div>
    </div>
  );
}
