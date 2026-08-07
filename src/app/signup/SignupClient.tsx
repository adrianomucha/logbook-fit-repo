'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, Loader2 } from 'lucide-react';
import { AuthShell, AuthDivider } from '@/components/auth/AuthShell';
import { PasswordRules } from '@/components/auth/PasswordRules';
import { avatarColor } from '@/lib/avatar-colors';
import { passwordSchema } from '@/lib/validations/schemas';
import { cn } from '@/lib/utils';

interface InviteInfo {
  valid: boolean;
  email?: string | null;
  note?: string | null;
  coachName?: string;
  coachAvatar?: string | null;
  expiresAt?: string;
  reason?: 'not_found' | 'used' | 'expired';
}

interface BetaInviteInfo {
  valid: boolean;
  email?: string | null;
  reason?: 'not_found' | 'used';
}

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

/** The app's own chrome — the split auth canvas shared with /login */
function PageFrame({ children }: { children: React.ReactNode }) {
  return <AuthShell mode="signup">{children}</AuthShell>;
}

export default function SignupClient({
  coachSignupOpen,
}: {
  coachSignupOpen: boolean;
}) {
  return (
    <Suspense fallback={
      <div className="min-h-dvh bg-background p-4 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <SignupContent coachSignupOpen={coachSignupOpen} />
    </Suspense>
  );
}

function SignupContent({ coachSignupOpen }: { coachSignupOpen: boolean }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const inviteToken = searchParams?.get('invite') ?? null;
  // Waitlist beta invite — the coach-side counterpart of the client invite
  const betaToken = searchParams?.get('beta') ?? null;

  // No client-invite token → coach signup. With one → invited-client signup.
  const isCoachSignup = !inviteToken;

  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [betaInfo, setBetaInfo] = useState<BetaInviteInfo | null>(null);
  const [isValidating, setIsValidating] = useState(
    Boolean(inviteToken || betaToken)
  );

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate whichever token is present on mount (client invite wins if both)
  useEffect(() => {
    if (!inviteToken && !betaToken) {
      setIsValidating(false);
      return;
    }

    const validate = async () => {
      try {
        if (inviteToken) {
          const res = await fetch(`/api/invites/${inviteToken}`);
          const data: InviteInfo = await res.json();
          setInviteInfo(data);
          if (data.valid && data.email) {
            setEmail(data.email);
          }
        } else {
          const res = await fetch(
            `/api/waitlist/invites/${encodeURIComponent(betaToken!)}`
          );
          const data: BetaInviteInfo = await res.json();
          setBetaInfo(data);
          if (data.valid && data.email) {
            setEmail(data.email);
          }
        }
      } catch {
        if (inviteToken) {
          setInviteInfo({ valid: false, reason: 'not_found' });
        } else {
          setBetaInfo({ valid: false, reason: 'not_found' });
        }
      } finally {
        setIsValidating(false);
      }
    };

    validate();
  }, [inviteToken, betaToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError('');

    // The server enforces the same schema but answers with a generic
    // "Validation failed" — checking here keeps the message specific.
    const passwordCheck = passwordSchema.safeParse(password);
    if (!passwordCheck.success) {
      setError(passwordCheck.error.issues[0].message);
      return;
    }

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
          ...(isCoachSignup
            ? { role: 'COACH', ...(betaToken ? { betaToken } : {}) }
            : { inviteToken }),
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

  // Beta invite that doesn't check out — mirror the client-invite error card
  if (isCoachSignup && betaToken && !betaInfo?.valid) {
    const errorContent =
      betaInfo?.reason === 'used'
        ? {
            title: 'Already used',
            message:
              'This beta invite was already redeemed. If that was you, sign in instead.',
          }
        : {
            title: 'Link not found',
            message:
              'This invite link doesn’t look right. Double-check the URL from your email — a re-sent invite also replaces the old link.',
          };

    return (
      <PageFrame>
        <div className="space-y-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-1.5">
              Beta invite
            </p>
            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight leading-[0.95] text-balance antialiased">
              {errorContent.title}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed text-pretty">
            {errorContent.message}
          </p>
          <div className="pt-2">
            <Button variant="outline" onClick={() => router.push('/login')}>
              Go to sign in
            </Button>
          </div>
        </div>
      </PageFrame>
    );
  }

  // No beta invite while the beta is closed — point at the waitlist instead
  // of a form that would only be refused server-side
  if (isCoachSignup && !betaToken && !coachSignupOpen) {
    return (
      <PageFrame>
        <div className="space-y-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-1.5">
              Private beta
            </p>
            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight leading-[0.95] text-balance antialiased">
              Invite-only for now
            </h1>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed text-pretty">
            We&rsquo;re onboarding coaches in small batches. Grab a spot on the
            waitlist and we&rsquo;ll email your invite the moment one opens.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              onClick={() => router.push('/#waitlist')}
              className="bg-brand text-brand-foreground hover:bg-brand/90 font-bold uppercase tracking-wider"
            >
              Join the waitlist
            </Button>
            <Button variant="outline" onClick={() => router.push('/login')}>
              Go to sign in
            </Button>
          </div>
        </div>
      </PageFrame>
    );
  }

  // Invalid or expired invite (coach signup has no client token to validate)
  if (!isCoachSignup && !inviteInfo?.valid) {
    const errorContent = inviteInfo?.reason === 'expired'
      ? { title: 'Link expired', message: 'This invite is past its 7-day window. Ask your coach to send a fresh one. It only takes them a second.' }
      : inviteInfo?.reason === 'used'
        ? { title: 'Already used', message: 'Looks like you\'re already signed up! Try signing in instead.' }
        : { title: 'Link not found', message: 'This invite link doesn\'t look right. Double-check the URL or ask your coach for a new one.' };

    return (
      <PageFrame>
        <div className="space-y-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-1.5">
              Invite link
            </p>
            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight leading-[0.95] text-balance antialiased">
              {errorContent.title}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed text-pretty">
            {errorContent.message}
          </p>
          <div className="pt-2">
            <Button variant="outline" onClick={() => router.push('/login')}>
              Go to sign in
            </Button>
          </div>
        </div>
      </PageFrame>
    );
  }

  const coachName = inviteInfo?.coachName ?? 'Your coach';
  const coachFirstName = coachName.split(' ')[0];
  // 'Your coach' is the API's fallback when the coach has no display name —
  // "Train with Your" would read broken, so fall back to a neutral CTA
  const hasRealCoachName = coachName !== 'Your coach';

  // Coach signup or valid invite — show signup form
  return (
    <PageFrame>
      {isCoachSignup ? (
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-1.5">
            {betaToken ? (
              <>
                <span className="text-brand" aria-hidden="true">
                  &#9679;
                </span>{' '}
                Invite accepted
              </>
            ) : (
              'Get started'
            )}
          </p>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight leading-[0.95] text-balance antialiased">
            Create your coach account
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed mt-3 text-pretty">
            {betaToken
              ? 'Your spot in the private beta is ready. This link works once, and it’s yours.'
              : 'Know who needs you today, before they go quiet.'}
          </p>
        </div>
      ) : (
        // Invited client: the coach is the page — their name in the headline,
        // their words on the volt rail, in the product's own voice
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center shrink-0 overflow-hidden',
                  inviteInfo?.coachAvatar ? 'bg-muted' : avatarColor(coachName)
                )}
              >
                {inviteInfo?.coachAvatar ? (
                  // Avatar URLs can point at arbitrary remote hosts, which
                  // next/image rejects without a remotePatterns allowlist.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={inviteInfo.coachAvatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] font-bold uppercase">
                    {coachName.charAt(0)}
                  </span>
                )}
              </div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Your coach
              </p>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight leading-[0.95] text-balance antialiased">
              {coachName} is expecting you
            </h1>
          </div>

          {inviteInfo?.note && (
            <div className="pl-3.5 border-l-2 border-brand">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-0.5">
                A note from {coachFirstName}
              </p>
              <p className="text-sm text-foreground/80 leading-relaxed text-pretty">
                {inviteInfo.note}
              </p>
            </div>
          )}
        </div>
      )}

      <AuthDivider />

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="h-12 rounded-lg border-border/60 bg-secondary/50 px-3.5 transition-colors focus-visible:bg-background"
            required
            autoFocus={isCoachSignup}
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
            className="h-12 rounded-lg border-border/60 bg-secondary/50 px-3.5 transition-colors focus-visible:bg-background"
            required
          />
          {Boolean(inviteInfo?.email || betaInfo?.email) && (
            <p className="text-xs text-muted-foreground text-pretty">
              Pre-filled from your invite. Change it if it&apos;s not right
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
            placeholder="Make it a strong one"
            className="h-12 rounded-lg border-border/60 bg-secondary/50 px-3.5 transition-colors focus-visible:bg-background"
            required
            maxLength={72}
          />
          {/* Live checklist replaces the native minLength bubble — the
              schema check in handleSubmit still backstops it */}
          <PasswordRules password={password} />
        </div>

        {error && (
          <p role="alert" className="border-l-2 border-destructive pl-3 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="space-y-3 pt-1">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-12 w-full rounded-lg bg-brand text-sm font-bold uppercase tracking-wider text-brand-foreground transition-transform duration-150 hover:bg-brand/90 active:scale-[0.98]"
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

          <p className="text-center text-xs text-muted-foreground text-pretty">
            {isCoachSignup
              ? 'Your workspace comes ready with a starter exercise library.'
              : `Takes 30 seconds. ${hasRealCoachName ? coachFirstName : 'your coach'} handles the rest.`}
          </p>

          <p className="text-center text-xs text-muted-foreground text-pretty">
            By creating an account you agree to the{' '}
            <Link
              href="/terms"
              className="underline underline-offset-2 transition-colors hover:text-foreground"
            >
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link
              href="/privacy"
              className="underline underline-offset-2 transition-colors hover:text-foreground"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </form>
    </PageFrame>
  );
}
