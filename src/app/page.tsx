import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import {
  ClipboardList,
  Dumbbell,
  LayoutDashboard,
  Library,
  Link2,
  LineChart,
  MessageCircle,
  Sun,
} from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { Logo, LogoMark } from '@/components/brand/LogoMark';
import { WaitlistForm } from '@/components/landing/WaitlistForm';

export const metadata: Metadata = {
  title: 'Logbook.fit — The coaching platform that puts your clients first',
  description:
    'Plan workouts, track progress, and stay connected to every client through a structured check-in loop. Join the waitlist for early access.',
};

const CHECK_IN_LOOP = [
  {
    step: '01',
    title: 'Coach sends a check-in',
    body: 'One tap opens a structured check-in for the client — no chasing, no copy-pasted questions.',
  },
  {
    step: '02',
    title: 'Client responds',
    body: 'Effort rating, how their body feels, and notes — captured in seconds, right after training.',
  },
  {
    step: '03',
    title: 'Coach reviews in context',
    body: 'The response lands next to flagged exercises from the past week, so nothing gets read in isolation.',
  },
  {
    step: '04',
    title: 'Coach replies & adjusts',
    body: 'Send feedback and mark “I’ll adjust the plan” — the loop closes where the plan lives.',
  },
];

const COACH_FEATURES = [
  {
    icon: LayoutDashboard,
    title: 'Urgency-sorted dashboard',
    body: 'Clients ranked by who needs attention most — at-risk, check-in due, awaiting response, on track.',
  },
  {
    icon: ClipboardList,
    title: 'Workout plan builder',
    body: 'Multi-week plans with a visual week/day sidebar. Duplicate, reorder, and copy across days.',
  },
  {
    icon: Library,
    title: 'Exercise library',
    body: 'Your own library with categories, default prescriptions, and coaching notes.',
  },
  {
    icon: Link2,
    title: 'Invite-based onboarding',
    body: 'Send a link, client signs up, you’re connected. No manual pairing.',
  },
];

const CLIENT_FEATURES = [
  {
    icon: Sun,
    title: 'Today focus view',
    body: 'Exactly what’s scheduled today, with the coach’s notes front and center.',
  },
  {
    icon: Dumbbell,
    title: 'Live workout execution',
    body: 'Tap through sets, override weight and reps on the fly, and flag what doesn’t feel right.',
  },
  {
    icon: MessageCircle,
    title: 'A direct line to the coach',
    body: 'Flags and check-ins turn into focused conversations — not another group chat.',
  },
  {
    icon: LineChart,
    title: 'Progress at a glance',
    body: 'Completion history and weekly progress without digging through spreadsheets.',
  },
];

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session) {
    const role = (session.user as { role?: string })?.role;
    redirect(role === 'COACH' ? '/coach' : role === 'CLIENT' ? '/client' : '/login');
  }

  return (
    <div className="min-h-dvh bg-background">
      {/* Nav */}
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <Logo markSize={24} />
        <Link
          href="/login"
          className="rounded-lg border border-border/70 px-4 py-2 text-sm font-medium antialiased transition-colors hover:bg-accent"
        >
          Sign in
        </Link>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-5xl px-4 pb-16 pt-12 sm:px-6 sm:pb-24 sm:pt-20">
          <div className="max-w-2xl animate-enter">
            <p className="mb-4 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground antialiased">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />
              Private beta — coming soon
            </p>
            <h1 className="text-4xl font-bold tracking-tight antialiased sm:text-5xl">
              The coaching platform that puts your clients first.
            </h1>
            <p className="mt-4 max-w-xl text-base text-muted-foreground antialiased sm:text-lg">
              Logbook.fit is built around the coach–client relationship: you build the
              plans, your clients execute them, and a structured check-in loop keeps you
              both in sync. No spreadsheets. No scattered chat threads.
            </p>
            <div id="waitlist" className="mt-8 max-w-md scroll-mt-24">
              <WaitlistForm />
              <p className="mt-3 text-sm text-muted-foreground antialiased">
                Free during the beta. No spam — just an invite when it&rsquo;s ready.
              </p>
            </div>
          </div>
        </section>

        {/* Check-in loop */}
        <section className="border-t border-border/70">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground antialiased">
              The north star
            </p>
            <h2 className="max-w-xl text-2xl font-bold tracking-tight antialiased sm:text-3xl">
              A check-in loop that replaces the scattered group chat.
            </h2>
            <p className="mt-3 max-w-xl text-muted-foreground antialiased">
              A focused, contextual conversation that lives right inside the client
              workspace — not buried in WhatsApp.
            </p>
            <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {CHECK_IN_LOOP.map((item) => (
                <li
                  key={item.step}
                  className="rounded-xl border border-border/70 bg-card p-5"
                >
                  <span className="inline-block rounded bg-brand px-1.5 py-0.5 font-mono text-sm font-bold tabular-nums text-brand-foreground antialiased">
                    {item.step}
                  </span>
                  <h3 className="mt-4 text-sm font-semibold antialiased">{item.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground antialiased">
                    {item.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Features */}
        <section className="border-t border-border/70">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-border/70 bg-card p-6 sm:p-8">
                <p className="mb-6 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground antialiased">
                  For coaches
                </p>
                <ul className="space-y-6">
                  {COACH_FEATURES.map((feature) => (
                    <li key={feature.title} className="flex gap-3.5">
                      <feature.icon
                        className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <div>
                        <h3 className="text-sm font-semibold antialiased">
                          {feature.title}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground antialiased">
                          {feature.body}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-border/70 bg-card p-6 sm:p-8">
                <p className="mb-6 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground antialiased">
                  For clients
                </p>
                <ul className="space-y-6">
                  {CLIENT_FEATURES.map((feature) => (
                    <li key={feature.title} className="flex gap-3.5">
                      <feature.icon
                        className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <div>
                        <h3 className="text-sm font-semibold antialiased">
                          {feature.title}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground antialiased">
                          {feature.body}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t border-border/70 bg-foreground text-background">
          <div className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6 sm:py-20">
            <div className="mb-5 flex justify-center">
              <LogoMark
                size={40}
                className="[&_rect]:fill-background [&_path:not(.stroke-brand)]:stroke-foreground"
              />
            </div>
            <h2 className="mx-auto max-w-lg text-2xl font-bold tracking-tight antialiased sm:text-3xl">
              Be first in line when Logbook.fit opens up.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-background/70 antialiased">
              We&rsquo;re onboarding coaches in small batches. Grab a spot and we&rsquo;ll
              send your invite.
            </p>
            <a
              href="#waitlist"
              className="mt-8 inline-flex h-11 items-center rounded-md bg-brand px-8 text-sm font-bold uppercase tracking-wider text-brand-foreground transition-transform duration-150 hover:bg-brand/90 active:scale-[0.97]"
            >
              Join the waitlist
            </a>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/70">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-4 py-8 sm:flex-row sm:px-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground antialiased">
            © 2026 Logbook.fit — All rights reserved
          </p>
          <Link
            href="/login"
            className="text-sm text-muted-foreground antialiased transition-colors hover:text-foreground"
          >
            Sign in
          </Link>
        </div>
      </footer>
    </div>
  );
}
