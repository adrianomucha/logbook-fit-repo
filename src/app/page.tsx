import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Check,
  ClipboardList,
  Dumbbell,
  LayoutDashboard,
  Library,
  Link2,
  LineChart,
  MessageCircle,
  Sun,
  X,
} from 'lucide-react';
import { Logo, LogoMark } from '@/components/brand/LogoMark';
import { WaitlistForm } from '@/components/landing/WaitlistForm';
import { ImageSlot } from '@/components/landing/ImageSlot';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, absoluteUrl } from '@/lib/seo';

// Title/description/OG for this route come from the root layout — the landing
// page *is* the site root, so duplicating them here would only create two
// places to keep in sync. The canonical, though, lives here rather than in the
// layout: layout metadata is inherited by every child route, and a canonical
// of '/' on /privacy or /login marks those pages as duplicates of the homepage.
export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

/**
 * Structured data for the waitlist page. Tells Google what Logbook.fit is
 * (a product, not a blog), which entity owns the domain, and what to show in
 * the knowledge panel / sitelinks — none of which is inferable from a hero
 * that leads with a point of view rather than a product category.
 */
const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: absoluteUrl('/icon-512.png'),
        width: 512,
        height: 512,
      },
      description: SITE_DESCRIPTION,
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      publisher: { '@id': `${SITE_URL}/#organization` },
      inLanguage: 'en-US',
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${SITE_URL}/#software`,
      name: SITE_NAME,
      url: SITE_URL,
      applicationCategory: 'BusinessApplication',
      applicationSubCategory: 'Personal training and coaching software',
      operatingSystem: 'Web browser, iOS, Android',
      description: SITE_DESCRIPTION,
      publisher: { '@id': `${SITE_URL}/#organization` },
      // No aggregateRating: the product is pre-launch and has no reviews.
      // Inventing one is exactly what Google's spam policies penalise.
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        description: 'Free during the private beta.',
        availability: 'https://schema.org/PreOrder',
      },
      featureList: [
        'Multi-week workout plan builder',
        'Structured client check-in loop',
        'Urgency-sorted coach dashboard',
        'Custom exercise library',
        'Invite-based client onboarding',
        'Progress and completion tracking',
      ],
    },
  ],
};

const MARQUEE_ITEMS = [
  'Catch the fade before the refund',
  'For independent coaches',
  'Plan · Train · Check in',
  'Private beta · onboarding in small batches',
];

// The filter, as two lists. Every line is short enough to scan in one pass —
// the point lands from the shape of the section before any of it is read.
const AUDIENCE = [
  {
    title: 'Built for',
    icon: Check,
    iconClass: 'text-brand',
    items: [
      'Independent coaches with a real roster',
      'You write the plans and run the check-ins yourself',
      'Today it lives in spreadsheets and WhatsApp',
    ],
  },
  {
    title: 'Not for',
    icon: X,
    iconClass: 'text-muted-foreground',
    items: [
      'Lifters training on their own',
      'Anyone who just wants a workout log',
      'Coaches happy with their spreadsheet',
    ],
  },
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

export default function HomePage() {
  // The "signed-in visitors go straight to /coach" bounce lives in middleware
  // (see src/middleware.ts). Reading cookies() here opted the page into dynamic
  // rendering, so every crawler hit — and every real visitor — paid a server
  // round trip for markup that never changes. Statically prerendered, it now
  // ships from the CDN edge, which is the single biggest TTFB/LCP win available
  // to this page.
  //
  // This is also why the proof line below quotes the batch size rather than a
  // live signup count: counting rows would need a query per render and drag
  // the page back off the CDN. Revisit with `revalidate` once the number is
  // big enough to be worth showing.
  return (
    <div className="bg-background">
      <script
        type="application/ld+json"
        // Serialised from a literal defined in this file — no user input reaches it.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      {/* One <main> around every content section, so the h1 and the primary
          waitlist CTA sit inside the document's main landmark rather than
          floating outside it. */}
      <main>
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

        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
          <div className="animate-enter flex flex-col items-center">
            <p className="mb-8 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground antialiased">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />
              Private beta · for independent coaches
            </p>
            {/* Sized so "Your quietest client" holds one line on desktop:
                the three-line break is the rhythm of the sentence. */}
            <h1 className="text-[clamp(2.5rem,7vw,4.75rem)] font-bold uppercase leading-[0.9] tracking-tight antialiased">
              Your quietest client
              <br />
              is your next
              <br />
              <span className="text-brand">cancellation.</span>
              {/* The display h1 states a problem, which is what earns the read,
                  but it still names no product or category. This completes it
                  for a crawler and for a screen reader landing cold, without
                  touching the visual composition. */}
              <span className="sr-only">
                {' '}
                Logbook.fit, retention-first coaching software for independent
                coaches.
              </span>
            </h1>
            <p className="mt-8 max-w-xl text-balance text-base text-muted-foreground antialiased sm:text-lg">
              Clients go quiet weeks before they quit. Logbook.fit ranks your
              roster by who needs you today.
            </p>
            <div id="waitlist" className="mt-10 w-full max-w-md scroll-mt-24">
              <WaitlistForm />
              <div className="mt-4 flex flex-col items-center gap-1.5 text-sm text-muted-foreground antialiased">
                <p>Free during the beta. No spam, just your invite.</p>
                <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
                  <span className="font-medium text-foreground">
                    We onboard in batches of 10
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>every coach gets a setup call</span>
                </p>
              </div>
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

        {/* Who it's for — the filter. Naming who this isn't for is what makes
            the right coach feel it was built for them specifically. Two columns
            rather than prose: the section is *about* a line between two groups,
            so it should be shaped like one instead of describing it. */}
        <section className="border-b border-border/70">
          <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="text-center">
              <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground antialiased">
                Who it&rsquo;s for
              </p>
              <h2 className="text-balance text-3xl font-bold uppercase leading-[0.95] tracking-tight antialiased sm:text-5xl">
                Deliberately not
                <br />
                for everyone.
              </h2>
            </div>

            <div className="mt-12 grid gap-8 sm:grid-cols-2 sm:gap-12">
              {AUDIENCE.map((group) => (
                <div key={group.title}>
                  <h3 className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground antialiased">
                    {group.title}
                  </h3>
                  <ul className="mt-4 space-y-3">
                    {group.items.map((item) => (
                      <li key={item} className="flex gap-3">
                        <group.icon
                          className={`mt-0.5 h-4 w-4 shrink-0 ${group.iconClass}`}
                          strokeWidth={3}
                          aria-hidden="true"
                        />
                        <span className="text-pretty text-base antialiased">
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Check-in loop.

            Every image/text section keeps the ImageSlot FIRST in source order
            and reorders with lg:order-*, never the other way round. Stacked at
            mobile width the source order is the only order, so leading with the
            image in the markup is what makes each section read image → text all
            the way down the page; the desktop zigzag is then purely a
            large-screen concern. */}
        <section>
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2 lg:gap-14">
            {/* Stretch to the list's exact height on desktop so both columns
                end on the same line; the 4:5 ratio stays for stacked mobile */}
            {/* A client answering her weekly check-in from the bench, phone in
                hand, the rack still loaded behind her. The point of the shot:
                the check-in happens in the room, in the moment, not in a group
                chat later that night. */}
            <ImageSlot
              label="The check-in, done from the bench"
              src="/landing/checkin-gym.webp"
              alt="A client sitting on a bench in a gym, answering her weekly check-in on her phone"
              className="aspect-[4/5] rounded-xl lg:order-2 lg:aspect-auto lg:h-full"
              objectPosition="center 35%"
            />
            <div className="lg:order-1">
              <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground antialiased">
                The north star
              </p>
              <h2 className="text-balance text-4xl font-bold uppercase leading-[0.95] tracking-tight antialiased sm:text-6xl">
                A loop, not a group chat.
              </h2>
              <p className="mt-4 max-w-lg text-pretty text-muted-foreground antialiased sm:text-lg">
                A focused, contextual conversation that lives right inside the
                client workspace, not buried in WhatsApp.
              </p>

              <ol className="mt-8">
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
            </div>
          </div>
        </section>

        {/* For coaches */}
        <section className="border-t border-border/70">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2 lg:items-center lg:gap-14">
            {/* The single most important image on the page: it's the proof of
                the headline. A coach at a desk on the gym floor, the dashboard
                open on his laptop with the roster ranked by who needs him. */}
            <ImageSlot
              label="In the product: who needs you today"
              src="/landing/coach-dashboard.webp"
              alt="A coach at a desk in a gym, reviewing his client dashboard on a laptop with clients ranked by who needs attention"
              className="aspect-[4/5] rounded-xl"
              objectPosition="center 45%"
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
              {/* A client on the bench between sets, phone in hand, with the
                  exercise card from the Today view over the photo: two sets
                  logged, the third about to be, the coach's cue right there.
                  The card runs to the bottom edge, so the caption is off. */}
              <ImageSlot
                label="Between sets"
                src="/landing/client-between-sets.webp"
                alt="A client sitting on a gym bench between sets, logging a set on her phone: the Dumbbell Goblet Squat card shows two of three sets done and the coach's cue to keep the chest tall"
                className="aspect-[4/5] rounded-xl"
                hideCaption
              />
            </div>
            <div className="lg:order-1">
              <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground antialiased">
                Their side
              </p>
              <h2 className="text-balance text-4xl font-bold uppercase leading-[0.95] tracking-tight antialiased sm:text-6xl">
                They&rsquo;ll actually use it.
              </h2>
              <p className="mt-4 max-w-lg text-pretty text-muted-foreground antialiased sm:text-lg">
                An early warning only works if the data arrives. Your clients get
                an app worth opening.
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
                Ten coaches at a time. Every one gets a setup call where we import
                your roster with you.
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
          <nav className="flex items-center gap-5 text-sm text-muted-foreground antialiased">
            <Link href="/privacy" className="transition-colors hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-foreground">
              Terms
            </Link>
            <Link href="/login" className="transition-colors hover:text-foreground">
              Sign in
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
