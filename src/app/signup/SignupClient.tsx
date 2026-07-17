'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, Loader2 } from 'lucide-react';
import { Logo } from '@/components/brand/LogoMark';
import { avatarColor } from '@/lib/avatar-colors';
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

/** The app's own chrome: hairline header with the brand lockup, sign-in on the right */
function PageFrame({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex h-12 items-center justify-between">
          <Logo markSize={20} />
          <button
            onClick={() => router.push('/login')}
            className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Sign in
          </button>
        </div>
      </header>
      <main className="flex-1 w-full max-w-md mx-auto px-5 sm:px-6 py-9 sm:py-12 pb-[calc(2.25rem+env(safe-area-inset-bottom))]">
        {children}
      </main>
    </div>
  );
}

export default function SignupClient() {
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
            <h1 className="text-3xl font-black tracking-tight leading-tight text-balance">
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
            Get started
          </p>
          <h1 className="text-3xl font-black tracking-tight leading-tight text-balance">
            Create your coach account
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed mt-3 text-pretty">
            Know who needs you today, before they go quiet.
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
            <h1 className="text-3xl font-black tracking-tight leading-tight text-balance">
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

      <div className="my-7 sm:my-8 border-t border-border" aria-hidden="true" />

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
            className="h-11"
            required
          />
          {inviteInfo?.email && (
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
            placeholder="At least 8 characters"
            className="h-11"
            required
            minLength={8}
          />
        </div>

        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

        <div className="space-y-3 pt-1">
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

          <p className="text-center text-xs text-muted-foreground text-pretty">
            {isCoachSignup
              ? 'Your workspace comes ready with a starter exercise library.'
              : `Takes 30 seconds. ${hasRealCoachName ? coachFirstName : 'your coach'} handles the rest.`}
          </p>
        </div>
      </form>
    </PageFrame>
  );
}
