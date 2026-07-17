import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
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
import { Logo, LogoMark } from '@/components/brand/LogoMark';
import { WaitlistForm } from '@/components/landing/WaitlistForm';
import { ImageSlot } from '@/components/landing/ImageSlot';

export const metadata: Metadata = {
  title: 'Logbook.fit · The coaching platform that puts your clients first',
  description:
    'Plan workouts, track progress, and stay connected to every client through a structured check-in loop. Join the waitlist for early access.',
};

const MARQUEE_ITEMS = [
  'Coach-first training platform',
  'Private beta',
  'Plan · Train · Check in',
  'Join the waitlist',
];

const CHECK_IN_LOOP = [
  {
    step: '01',
    title: 'Coach sends a check-in',
    body: 'One tap opens a structured check-in for the client. No chasing, no copy-pasted questions.',
  },
  {
    step: '02',
    title: 'Client responds',
    body: 'Effort rating, how their body feels, and notes, captured in seconds, right after training.',
  },
  {
    step: '03',
    title: 'Coach reviews in context',
    body: 'The response lands next to flagged exercises from the past week, so nothing gets read in isolation.',
  },
  {
    step: '04',
    title: 'Coach replies & adjusts',
    body: 'Send feedback and mark “I’ll adjust the plan.” The loop closes where the plan lives.',
  },
];

const COACH_FEATURES = [
  {
    icon: LayoutDashboard,
    title: 'Urgency-sorted dashboard',
    body: 'Clients ranked by who needs attention most: at-risk, check-in due, awaiting response, on track.',
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
    body: 'Send a link with a personal note. They sign up already connected, your words waiting in chat.',
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
    body: 'Flags and check-ins turn into focused conversations, not another group chat.',
  },
  {
    icon: LineChart,
    title: 'Progress at a glance',
    body: 'Completion history and weekly progress without digging through spreadsheets.',
  },
];

function FeatureList({ features }: { features: typeof COACH_FEATURES }) {
  return (
    <ul className="divide-y divide-border/70 border-t border-border/70">
      {features.map((feature) => (
        <li key={feature.title} className="flex gap-4 py-5">
          <feature.icon
            className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <div>
            <h3 className="text-sm font-semibold antialiased">{feature.title}</h3>
            <p className="mt-1 text-pretty text-sm text-muted-foreground antialiased">
              {feature.body}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default async function HomePage() {
  // Signed-in visitors go straight to the app (PWA start_url is "/").
  // Only the cookie's *presence* is checked — no secret, no database —
  // so the landing page renders in any environment. The middleware on
  // /coach verifies the token and bounces clients to /client and
  // stale sessions to /login.
  const cookieStore = await cookies();
  const hasSession =
    cookieStore.has('__Secure-next-auth.session-token') ||
    cookieStore.has('next-auth.session-token');
  if (hasSession) {
    redirect('/coach');
  }

  return (
    <div className="bg-background">
      {/* Hero — dark brand canvas, centered display type */}
      <section className="dark flex min-h-dvh flex-col bg-background text-foreground">
        <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
          <Logo markSize={24} />
          <Link
            href="/login"
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium antialiased transition-colors hover:bg-accent"
          >
            Sign in
          </Link>
        </header>

        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
          <div className="animate-enter flex flex-col items-center">
            <p className="mb-8 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground antialiased">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />
              Private beta · coming soon
            </p>
            <h1 className="text-[clamp(3.25rem,13vw,8rem)] font-bold uppercase leading-[0.88] tracking-tight antialiased">
              Plan. Train.
              <br />
              <span className="text-brand">Check in.</span>
            </h1>
            <p className="mt-8 max-w-2xl text-balance text-base text-muted-foreground antialiased sm:text-lg">
              The coaching platform built around the coach and client: you build the
              plans, your clients execute them, and a structured check-in loop keeps
              you both in sync. No spreadsheets. No scattered chat threads.
            </p>
            <div id="waitlist" className="mt-10 w-full max-w-md scroll-mt-24">
              <WaitlistForm />
              <p className="mt-3 text-sm text-muted-foreground antialiased">
                Free during the beta. No spam, just an invite when it&rsquo;s ready.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Volt ticker */}
      <div className="overflow-hidden border-y border-border/70 bg-brand py-3" aria-hidden="true">
        {/* Two identical halves; the track scrolls by exactly one half (-50%)
            for a seamless loop. Each half repeats the items enough times to
            stay wider than any viewport, so the loop never reveals a gap. */}
        <div className="flex w-max animate-marquee">
          {[0, 1].map((half) => (
            <div
              key={half}
              className="flex shrink-0 items-center font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-brand-foreground antialiased"
            >
              {Array.from({ length: 4 }).flatMap((_, rep) =>
                MARQUEE_ITEMS.map((item, i) => (
                  <span key={`${rep}-${i}`} className="flex items-center">
                    <span className="px-6">{item}</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-foreground/70" />
                  </span>
                ))
              )}
            </div>
          ))}
        </div>
      </div>

      <main>
        {/* Check-in loop */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground antialiased">
            The north star
          </p>
          <h2 className="max-w-3xl text-balance text-4xl font-bold uppercase leading-[0.95] tracking-tight antialiased sm:text-6xl">
            A loop, not a group chat.
          </h2>
          <p className="mt-4 max-w-xl text-pretty text-muted-foreground antialiased sm:text-lg">
            A focused, contextual conversation that lives right inside the client
            workspace, not buried in WhatsApp.
          </p>

          <div className="mt-12 grid gap-10 lg:grid-cols-2 lg:gap-14">
            <ol>
              {CHECK_IN_LOOP.map((item) => (
                <li
                  key={item.step}
                  className="flex gap-6 border-t border-border/70 py-6 sm:gap-8"
                >
                  <span className="font-mono text-3xl font-bold tabular-nums leading-none text-brand antialiased sm:text-4xl">
                    {item.step}
                  </span>
                  <div>
                    <h3 className="text-base font-semibold antialiased sm:text-lg">
                      {item.title}
                    </h3>
                    <p className="mt-1.5 text-pretty text-sm text-muted-foreground antialiased sm:text-base">
                      {item.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            <ImageSlot
              label="Photo: coach reviewing a check-in response"
              className="aspect-[4/5] rounded-xl lg:sticky lg:top-8 lg:h-fit"
            />
          </div>
        </section>

        {/* For coaches */}
        <section className="border-t border-border/70">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2 lg:items-center lg:gap-14">
            <ImageSlot
              label="Photo: coach building a plan at the desk"
              className="aspect-[4/5] rounded-xl"
            />
            <div>
              <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground antialiased">
                For coaches
              </p>
              <h2 className="text-balance text-4xl font-bold uppercase leading-[0.95] tracking-tight antialiased sm:text-6xl">
                Built for coaches.
              </h2>
              <p className="mt-4 max-w-lg text-pretty text-muted-foreground antialiased sm:text-lg">
                No manual triage. A workspace that surfaces the right client at the
                right time.
              </p>
              <div className="mt-8">
                <FeatureList features={COACH_FEATURES} />
              </div>
            </div>
          </div>
        </section>

        {/* For clients — mirrored */}
        <section className="border-t border-border/70">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2 lg:items-center lg:gap-14">
            <div className="lg:order-2">
              <ImageSlot
                label="Photo: client logging a set mid-workout"
                className="aspect-[4/5] rounded-xl"
              />
            </div>
            <div className="lg:order-1">
              <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground antialiased">
                For clients
              </p>
              <h2 className="text-balance text-4xl font-bold uppercase leading-[0.95] tracking-tight antialiased sm:text-6xl">
                Made for clients.
              </h2>
              <p className="mt-4 max-w-lg text-pretty text-muted-foreground antialiased sm:text-lg">
                Open the app, see today&rsquo;s session, train. Everything else gets
                out of the way.
              </p>
              <div className="mt-8">
                <FeatureList features={CLIENT_FEATURES} />
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA — dark */}
        <section className="dark border-t border-border/70 bg-background text-foreground">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
            <div className="mx-auto max-w-2xl text-center">
              <div className="mb-8 flex justify-center">
                <LogoMark size={44} />
              </div>
              <h2 className="text-[clamp(2.75rem,9vw,6rem)] font-bold uppercase leading-[0.9] tracking-tight antialiased">
                Get on
                <br />
                the list<span className="text-brand">.</span>
              </h2>
              <p className="mx-auto mt-5 max-w-md text-balance text-muted-foreground antialiased sm:text-lg">
                We&rsquo;re onboarding coaches in small batches. Grab a spot and
                we&rsquo;ll send your invite.
              </p>
              <div className="mx-auto mt-9 max-w-md text-left">
                <WaitlistForm />
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="dark border-t border-border bg-background text-foreground">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 sm:flex-row sm:px-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground antialiased">
            © 2026 Logbook.fit · All rights reserved
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
