'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, AlertCircle } from 'lucide-react';

interface InviteInfo {
  valid: boolean;
  email?: string | null;
  coachName?: string;
  expiresAt?: string;
  reason?: 'not_found' | 'used' | 'expired';
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <SignupContent />
    </Suspense>
  );
}

function SignupContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const inviteToken = searchParams?.get('invite') ?? null;

  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [isValidating, setIsValidating] = useState(true);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate invite token on mount
  useEffect(() => {
    if (!inviteToken) {
      setInviteInfo({ valid: false, reason: 'not_found' });
      setIsValidating(false);
      return;
    }

    const validate = async () => {
      try {
        const res = await fetch(`/api/invites/${inviteToken}`);
        const data: InviteInfo = await res.json();
        setInviteInfo(data);
        if (data.valid && data.email) {
          setEmail(data.email);
        }
      } catch {
        setInviteInfo({ valid: false, reason: 'not_found' });
      } finally {
        setIsValidating(false);
      }
    };

    validate();
  }, [inviteToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError('');
    setIsSubmitting(true);

    try {
      // Create account
      const signupRes = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          name: name.trim(),
          inviteToken,
        }),
      });

      if (!signupRes.ok) {
        const data = await signupRes.json();
        setError(data.error || 'Something went wrong. Please try again.');
        setIsSubmitting(false);
        return;
      }

      // Auto-login
      const loginResult = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (loginResult?.error) {
        // Account created but login failed — redirect to login
        router.push('/login');
        return;
      }

      // Redirect to client dashboard
      router.push('/client');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state while validating token
  if (isValidating) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Invalid or expired invite
  if (!inviteInfo?.valid) {
    const errorContent = inviteInfo?.reason === 'expired'
      ? { emoji: '😅', title: 'Link expired', message: 'This invite is past its 7-day window. Ask your coach to send a fresh one — it only takes them a second.' }
      : inviteInfo?.reason === 'used'
        ? { emoji: '🎉', title: 'Already used', message: 'Looks like you\'re already signed up! Try signing in instead.' }
        : { emoji: '🔗', title: 'Link not found', message: 'This invite link doesn\'t look right. Double-check the URL or ask your coach for a new one.' };

    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-2">LogBook.fit</h1>
          </div>
          <Card>
            <CardContent className="pt-8 pb-8 text-center space-y-3">
              <span className="text-4xl select-none block">{errorContent.emoji}</span>
              <p className="font-semibold">{errorContent.title}</p>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-[300px] mx-auto">
                {errorContent.message}
              </p>
              <div className="pt-2">
                <Button variant="outline" onClick={() => router.push('/login')}>
                  Go to sign in
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Valid invite — show signup form
  return (
    <div className="min-h-screen bg-background p-4 flex items-center justify-center">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-4xl font-bold">LogBook.fit</h1>
          <p className="text-muted-foreground">
            <strong>{inviteInfo.coachName}</strong> invited you to train together
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Let's get you started</CardTitle>
            <CardDescription>
              Create your account and you're in — takes 30 seconds.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">Name</label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">Email</label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  readOnly={!!inviteInfo.email}
                  className={inviteInfo.email ? 'bg-muted' : ''}
                />
                {inviteInfo.email && (
                  <p className="text-xs text-muted-foreground">
                    Email is pre-set by your coach
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">Password</label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  "Let's go"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Already have an account?{' '}
          <button
            onClick={() => router.push('/login')}
            className="underline hover:text-foreground transition-colors"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
