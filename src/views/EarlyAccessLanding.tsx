'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Logo, LogoMark } from '@/components/brand/LogoMark';
import { cn } from '@/lib/utils';
import {
  ArrowRight,
  Check,
  Dumbbell,
  Loader2,
  MessageSquare,
  TrendingUp,
} from 'lucide-react';

// ---- Signup form ----

function EarlyAccessForm({ className }: { className?: string }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStatus('loading');

    try {
      const res = await fetch('/api/early-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setStatus('success');
        return;
      }

      setStatus('idle');
      if (res.status === 429) {
        setError('Too many attempts — please try again in a few minutes.');
      } else if (res.status === 400) {
        setError('That doesn’t look like a valid email address.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } catch {
      setStatus('idle');
      setError('Something went wrong. Please check your connection and try again.');
    }
  };

  if (status === 'success') {
    return (
      <div
        className={cn(
          'flex items-center gap-3 rounded-xl border border-border/70 bg-card px-4 py-3.5 animate-bounce-once',
          className
        )}
        role="status"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand">
          <Check className="h-5 w-5 text-brand-foreground" strokeWidth={3} />
        </span>
        <div>
          <p className="text-sm font-semibold antialiased">You’re on the list</p>
          <p className="text-sm text-muted-foreground antialiased">
            We’ll email you when your spot opens up.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={className} noValidate>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required
          aria-label="Email address"
          className="h-12 rounded-full px-5 sm:flex-1"
        />
        <Button
          type="submit"
          disabled={status === 'loading'}
          className="h-12 rounded-full px-6 text-base font-semibold sm:text-sm"
        >
          {status === 'loading' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Get early access
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
      {error ? (
        <p className="mt-2 text-sm text-destructive antialiased" role="alert">
          {error}
        </p>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground antialiased">
          No spam — one email when it’s your turn.
        </p>
      )}
    </form>
  );
}

// ---- Phone mockup (client "Today" view, distilled) ----

function SetPips({ done, total }: { done: number; total: number }) {
  return (
    <span className="flex items-center gap-1">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            i < done ? 'bg-brand' : 'bg-muted-foreground/20'
          )}
        />
      ))}
    </span>
  );
}

function ExerciseRow({
  name,
  scheme,
  done,
  total,
}: {
  name: string;
  scheme: string;
  done: number;
  total: number;
}) {
  const complete = done === total;
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/70 bg-card px-3 py-2.5">
      <span
        className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
          complete ? 'bg-brand' : 'border border-border bg-background'
        )}
      >
        {complete && <Check className="h-3.5 w-3.5 text-brand-foreground" strokeWidth={3} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold leading-tight antialiased">{name}</p>
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {scheme}
        </p>
      </div>
      <SetPips done={done} total={total} />
    </div>
  );
}

function PhoneMockup() {
  return (
    <div
      aria-hidden="true"
      className="mx-auto w-full max-w-[340px] rounded-[2.5rem] border border-border bg-background p-3 shadow-[0_24px_60px_-24px_hsl(var(--foreground)/0.25)]"
    >
      <div className="space-y-4 rounded-[1.9rem] border border-border/70 bg-secondary/40 p-4 pt-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              Tue · Week 3
            </p>
            <p className="text-lg font-bold tracking-tight antialiased">Push Day A</p>
          </div>
          <LogoMark size={28} />
        </div>

        {/* Session progress */}
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Session
            </span>
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider">
              7/12 sets
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted-foreground/15">
            <div className="h-full w-[58%] rounded-full bg-brand" />
          </div>
        </div>

        {/* Exercises */}
        <div className="space-y-2">
          <ExerciseRow name="Barbell Bench Press" scheme="4 × 8 · 80 kg" done={4} total={4} />
          <ExerciseRow name="Incline DB Press" scheme="3 × 10 · 26 kg" done={3} total={3} />
          <ExerciseRow name="Cable Fly" scheme="3 × 12" done={0} total={3} />
          <ExerciseRow name="Triceps Pushdown" scheme="2 × 15" done={0} total={2} />
        </div>

        {/* Coach note */}
        <div className="flex items-start gap-2.5 rounded-lg border border-border/70 bg-card px-3 py-2.5">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground font-mono text-[9px] font-bold uppercase text-background">
            MC
          </span>
          <p className="text-[12px] leading-snug text-muted-foreground antialiased">
            Bench looked strong last week — add 2.5&nbsp;kg on your top set today.
          </p>
        </div>
      </div>
    </div>
  );
}

// ---- Page ----

const FEATURES = [
  {
    icon: Dumbbell,
    title: 'Log sets in seconds',
    body: 'Your coach’s plan, one day at a time. Tap through sets, reps, and weight without breaking your rest timer.',
  },
  {
    icon: MessageSquare,
    title: 'Your coach in your corner',
    body: 'Weekly check-ins and chat built in — flag an exercise mid-workout and get an answer before the next session.',
  },
  {
    icon: TrendingUp,
    title: 'Progress you can see',
    body: 'Every rep you log builds your history. Watch the volume climb and the PRs stack up, week over week.',
  },
];

const STEPS = [
  {
    number: '01',
    title: 'Join the list',
    body: 'Drop your email below. We’re opening spots gradually so every new athlete gets a smooth start.',
  },
  {
    number: '02',
    title: 'Get your invite',
    body: 'When your spot opens, you’ll get one email with your personal invite link. That’s the only email we’ll send.',
  },
  {
    number: '03',
    title: 'Start training',
    body: 'Connect with your coach, open today’s session, and log your first set. It takes about a minute.',
  },
];

export function EarlyAccessLanding() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
          >
            Log in
          </Link>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section id="early-access" className="mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-6 sm:pt-16 lg:pb-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="animate-enter">
              <p className="mb-4 inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-brand" />
                Early access · Limited spots
              </p>
              <h1 className="text-4xl font-bold tracking-tight antialiased sm:text-5xl lg:text-6xl">
                Your coach’s plan.
                <br />
                Every rep counted.
              </h1>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground antialiased sm:text-lg">
                Logbook puts your coach’s programming in your pocket — today’s
                session, set-by-set logging, and weekly check-ins in one place.
                We’re letting athletes in gradually.
              </p>
              <EarlyAccessForm className="mt-8 max-w-md" />
            </div>
            <div className="animate-fade-in-up">
              <PhoneMockup />
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-t border-border/70 bg-secondary/30">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
            <p className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              Why Logbook
            </p>
            <h2 className="max-w-xl text-2xl font-bold tracking-tight antialiased sm:text-3xl">
              Built for the work between you and your coach
            </h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, body }) => (
                <div
                  key={title}
                  className="rounded-xl border border-border/70 bg-card p-5"
                >
                  <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-foreground">
                    <Icon className="h-5 w-5 text-brand" />
                  </span>
                  <h3 className="text-base font-semibold antialiased">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground antialiased">
                    {body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <p className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            How it works
          </p>
          <h2 className="max-w-xl text-2xl font-bold tracking-tight antialiased sm:text-3xl">
            From the waitlist to your first logged set
          </h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {STEPS.map(({ number, title, body }) => (
              <div key={number}>
                <p className="font-mono text-sm font-bold text-muted-foreground/60">{number}</p>
                <h3 className="mt-2 text-base font-semibold antialiased">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground antialiased">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="bg-foreground text-background">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-16 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:py-20">
            <div>
              <p className="mb-3 inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-background/60">
                <span className="h-2 w-2 rounded-full bg-brand" />
                Spots open in waves
              </p>
              <h2 className="text-3xl font-bold tracking-tight antialiased sm:text-4xl">
                Don’t let the next block
                <br className="hidden sm:block" /> start without you.
              </h2>
            </div>
            <a
              href="#early-access"
              className={cn(
                buttonVariants({ size: 'lg' }),
                'h-12 rounded-full bg-brand px-7 text-base font-semibold text-brand-foreground hover:bg-brand/90'
              )}
            >
              Get early access
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/70">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 sm:flex-row sm:px-6">
          <Logo markSize={16} />
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground/60">
            © {new Date().getFullYear()} Logbook.fit
          </p>
        </div>
      </footer>
    </div>
  );
}
