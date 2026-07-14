'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, Loader2 } from 'lucide-react';
import { LogoMark } from '@/components/brand/LogoMark';
import { avatarColor } from '@/lib/avatar-colors';
import { cn } from '@/lib/utils';

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

interface InviteInfo {
  valid: boolean;
  email?: string | null;
  note?: string | null;
  coachName?: string;
  coachAvatar?: string | null;
  expiresAt?: string;
  reason?: 'not_found' | 'used' | 'expired';
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh bg-background p-4 flex items-center justify-center">
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

  // No invite token → coach signup. With a token → invited-client signup.
  const isCoachSignup = !inviteToken;

  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [isValidating, setIsValidating] = useState(!isCoachSignup);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate invite token on mount
  useEffect(() => {
    if (!inviteToken) {
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
          ...(isCoachSignup ? { role: 'COACH' } : { inviteToken }),
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

      // Land coaches in their workspace, clients in theirs
      router.push(isCoachSignup ? '/coach' : '/client');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state while validating token
  if (isValidating) {
    return (
      <div className="min-h-dvh bg-background p-4 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Invalid or expired invite (coach signup has no token to validate)
  if (!isCoachSignup && !inviteInfo?.valid) {
    const errorContent = inviteInfo?.reason === 'expired'
      ? { emoji: '😅', title: 'Link expired', message: 'This invite is past its 7-day window. Ask your coach to send a fresh one — it only takes them a second.' }
      : inviteInfo?.reason === 'used'
        ? { emoji: '🎉', title: 'Already used', message: 'Looks like you\'re already signed up! Try signing in instead.' }
        : { emoji: '🔗', title: 'Link not found', message: 'This invite link doesn\'t look right. Double-check the URL or ask your coach for a new one.' };

    return (
      <div className="min-h-dvh bg-background p-4 pt-16 sm:pt-4 flex items-start sm:items-center justify-center pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <LogoMark size={44} />
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              Logbook<span className="text-muted-foreground/60">.fit</span>
            </h1>
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

  const coachName = inviteInfo?.coachName ?? 'Your coach';
  const coachFirstName = coachName.split(' ')[0];
  // 'Your coach' is the API's fallback when the coach has no display name —
  // "Train with Your" would read broken, so fall back to a neutral CTA
  const hasRealCoachName = coachName !== 'Your coach';

  // Coach signup or valid invite — show signup form
  return (
    <div className="min-h-dvh bg-background p-4 pt-12 sm:pt-4 flex items-start sm:items-center justify-center pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-md w-full space-y-6">
        {isCoachSignup ? (
          <div className="text-center space-y-1">
            <div className="flex justify-center mb-3">
              <LogoMark size={44} />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              Logbook<span className="text-muted-foreground/60">.fit</span>
            </h1>
            <p className="text-muted-foreground">
              Know who needs you today — before they go quiet
            </p>
          </div>
        ) : (
          // Invited client: the coach is the page. The person who invited
          // them — face, name, their own words — leads; the product recedes
          // to a small wordmark.
          <div className="space-y-5">
            {/* Full-strength muted-foreground: the /70-faded version failed
                WCAG AA contrast for small text on white */}
            <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
              <LogoMark size={16} />
              <span className="text-xs font-semibold tracking-tight">
                Logbook<span className="font-normal">.fit</span>
              </span>
            </div>

            <div className="text-center space-y-3">
              <div
                className={cn(
                  'w-16 h-16 rounded-full flex items-center justify-center mx-auto overflow-hidden',
                  inviteInfo?.coachAvatar ? 'bg-muted' : avatarColor(coachName)
                )}
              >
                {inviteInfo?.coachAvatar ? (
                  // Avatar URLs can point at arbitrary remote hosts, which
                  // next/image rejects without a remotePatterns allowlist.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={inviteInfo.coachAvatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl font-bold uppercase">
                    {coachName.charAt(0)}
                  </span>
                )}
              </div>
              <div className="space-y-1">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Your coach
                </p>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                  {coachName} is expecting you
                </h1>
              </div>
            </div>

            {inviteInfo?.note && (
              <div className="flex items-start gap-3 pl-3.5 border-l-2 border-brand text-left">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-0.5">
                    A note from {coachFirstName}
                  </p>
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    {inviteInfo.note}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <Card>
          {/* The invited flow needs no card headline — "{Coach} is expecting
              you" already carries the page; a second title is just noise */}
          {isCoachSignup && (
            <CardHeader>
              <CardTitle className="text-lg">Create your coach account</CardTitle>
              <CardDescription>
                Your workspace comes ready with a starter exercise library.
              </CardDescription>
            </CardHeader>
          )}
          <CardContent className={isCoachSignup ? undefined : 'pt-6'}>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <FieldLabel htmlFor="name">Name</FieldLabel>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="h-11"
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-11"
                  required
                />
                {inviteInfo?.email && (
                  <p className="text-xs text-muted-foreground">
                    Pre-filled from your invite — change it if it&apos;s not right
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="h-11"
                  required
                  minLength={8}
                />
              </div>

              {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 text-sm font-bold uppercase tracking-wider bg-foreground text-background hover:bg-foreground/90 active:scale-[0.98] transition-transform duration-150"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Setting up...
                  </>
                ) : isCoachSignup ? (
                  <>
                    Let&apos;s go
                    <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
                  </>
                ) : (
                  <>
                    {hasRealCoachName ? `Train with ${coachFirstName}` : 'Start training'}
                    <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
                  </>
                )}
              </Button>

              {!isCoachSignup && (
                <p className="text-center text-xs text-muted-foreground">
                  Takes 30 seconds — {hasRealCoachName ? coachFirstName : 'your coach'} handles the rest.
                </p>
              )}
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
