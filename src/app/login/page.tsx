'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserCog, User, Loader2 } from 'lucide-react';

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
    <div className="min-h-screen bg-background p-4 flex items-center justify-center">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">LogBook.fit</h1>
          <p className="text-muted-foreground">Sign in to continue</p>
        </div>

        {/* Manual login form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sign In</CardTitle>
            <CardDescription>Enter your email and password</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">Email</label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="coach@logbook.fit"
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">Password</label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="demo1234"
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading === 'form'}>
                {loading === 'form' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Sign In
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Quick demo login buttons */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Demo Login</CardTitle>
            <CardDescription>Try the app with demo accounts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(DEMO_ACCOUNTS).map(([key, account]) => {
              const Icon = account.icon;
              return (
                <Button
                  key={key}
                  variant="outline"
                  className="w-full justify-start"
                  disabled={loading !== null}
                  onClick={() => handleLogin(account.email, account.password, key)}
                >
                  {loading === key ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Icon className="w-4 h-4 mr-2" />
                  )}
                  {account.label}
                  <span className="ml-auto text-xs text-muted-foreground">{account.email}</span>
                </Button>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
