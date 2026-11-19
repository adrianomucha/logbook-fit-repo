import type { Metadata, Viewport } from 'next';
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
import { OfferCta } from '@/components/landing/OfferCta';
import { ImageSlot } from '@/components/landing/ImageSlot';
import { SheetToPlan } from '@/components/landing/SheetToPlan';
import { RosterPreview } from '@/components/landing/RosterPreview';
import { RevealScope } from '@/components/landing/RevealScope';
import { JoinListSection, LandingFooter, LandingHeader } from '@/components/landing/LandingChrome';
import { FaqSection, faqJsonLd, type FaqItem } from '@/components/landing/FaqSection';
import { clientNeeds, getOffer } from '@/lib/offer';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, absoluteUrl } from '@/lib/seo';

// Title/description/OG for this route come from the root layout: the landing
// page *is* the site root, so duplicating them here would only create two
// places to keep in sync. The canonical, though, lives here rather than in the
// layout: layout metadata is inherited by every child route, and a canonical
// of '/' on /privacy or /login marks those pages as duplicates of the homepage.
export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

// The page opens on a near-black hero, but the document body is white. With
// no theme colour a phone's browser bar takes the body's white and sits as a
// pale strip on top of the dark hero. This is the hero's background.
export const viewport: Viewport = {
  themeColor: '#0a0a0a',
};

// Waitlist or open signup, and whether the iPhone app is in the store. Read
// once from the environment: the page is still static.
const OFFER = getOffer();

/**
 * The objections a coach has before handing over their email: who it's for,
 * why not the big platforms, switching, the client side, price, timing and
 * data. Plain-text answers, so the FAQPage JSON-LD below carries the same
 * words and an answer engine can quote them.
 */
const FAQ: FaqItem[] = [
  {
    q: 'Who is Logbook.fit for?',
    a: 'Independent coaches who write their own programs and run their own check-ins, whether that’s five clients or thirty. It isn’t a workout log for people training on their own.',
  },
  {
    q: 'How is it different from Trainerize or TrueCoach?',
    a: 'It’s built around one question: which client needs you today? Your roster is ranked by who’s at risk, whose check-in is due and who’s waiting on your reply, so a quiet client shows up before they cancel. It doesn’t track nutrition or take payments, so if you need those, a bigger platform is the better fit.',
  },
  {
    q: 'Can I bring my programs from a spreadsheet?',
    a: 'Yes. Upload the Excel or CSV file you coach from. Logbook.fit reads your layout and shows you every week before anything is saved, so you don’t retype a thing.',
    link: { href: '/spreadsheet-migration', label: 'How importing works' },
  },
  {
    q: 'What do my clients need?',
    a: clientNeeds(!!OFFER.appStoreUrl),
    ...(OFFER.appStoreUrl ? { link: { href: OFFER.appStoreUrl, label: 'Logbook.fit on the App Store' } } : {}),
  },
  {
    q: 'What does it cost?',
    a: OFFER.copy.price,
  },
  OFFER.copy.nextStep,
  {
    q: 'Who can see my clients’ data?',
    a: 'You and the clients you coach, and nobody else. We don’t sell data or run ad trackers.',
    link: { href: '/privacy', label: 'Privacy Policy' },
  },
];

/**
 * Structured data for the homepage. Tells Google what Logbook.fit is
 * (a product, not a blog), which entity owns the domain, and what to show in
 * the knowledge panel / sitelinks, none of which is inferable from a hero
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
        description: OFFER.copy.structured.description,
        availability: OFFER.copy.structured.availability,
      },
      featureList: [
        'Multi-week workout plan builder',
        'Workout plan import from Excel and CSV',
        'Structured client check-in loop',
        'Urgency-sorted coach dashboard',
        'Custom exercise library',
        'Invite-based client onboarding',
        'Progress and completion tracking',
      ],
    },
    faqJsonLd(FAQ, `${SITE_URL}/#faq`),
  ],
};

const MARQUEE_ITEMS = [
  'Catch the fade before the refund',
  'For independent coaches',
  'Plan · Train · Check in',
  OFFER.copy.marquee,
];

// The filter, as two lists. Every line is short enough to scan in one pass:
// the point lands from the shape of the section before any of it is read.
/**
 * The two sides of the filter. Row N on the left and row N on the right are a
 * pair (a real roster vs training alone, writing plans vs logging workouts,
 * outgrowing the spreadsheet vs happy in it), so the table aligns them. Keep
 * each line about as long as its partner: if one side wraps and the other
 * doesn't, the halves stop looking like a matched pair.
 */
const AUDIENCE = [
  {
    title: 'Built for',
    icon: Check,
    items: [
      'Independent coaches with a real roster',
      'You write the plans and run the check\u2011ins',
      'Outgrowing spreadsheets and WhatsApp',
    ],
  },
  {
    title: 'Not for',
    icon: X,
    items: [
      'Lifters training on their own',
      'Anyone who just wants a workout log',
      'Coaches happy with their spreadsheet',
    ],
  },
] as const;

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

// Spreadsheet import is left out: it has a whole section of its own below.
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

/**
 * Feature icon on a lime tile. Lime is the page's thread (headline, button,
 * ticker, step numerals, checks), and a grey icon let it drop out for two
 * whole sections. The tile is a fill with a dark glyph, since lime can't be
 * small text on white.
 */
function IconTile({ icon: Icon }: { icon: (typeof COACH_FEATURES)[number]['icon'] }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand/30">
      <Icon className="h-4 w-4 text-brand-foreground" aria-hidden="true" />
    </span>
  );
}

/**
 * Stagger for scroll reveals: marks an element and delays it against its
 * neighbours. The steps shrink as they go, so a group lands as one motion
 * and not as a metronome.
 */
const STAGGER = [0, 70, 120, 160, 190];
function reveal(order = 0) {
  return {
    'data-reveal': '',
    style: { '--reveal-delay': `${STAGGER[Math.min(order, STAGGER.length - 1)]}ms` } as React.CSSProperties,
  };
}

function FeatureList({ features }: { features: typeof COACH_FEATURES }) {
  return (
    <ul className="divide-y divide-border/70 border-t border-border/70">
      {features.map((feature) => (
        <li key={feature.title} className="flex gap-4 py-5">
          <IconTile icon={feature.icon} />
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
  // rendering, so every crawler hit (and every real visitor) paid a server
  // round trip for markup that never changes. Statically prerendered, it now
  // ships from the CDN edge, which is the single biggest TTFB/LCP win available
  // to this page.
  //
  // This is also why the proof line below quotes the batch size rather than a
  // live signup count: counting rows would need a query per render and drag
  // the page back off the CDN. Revisit with `revalidate` once the number is
  // big enough to be worth showing.
  return (
    <RevealScope className="bg-background">
      <script
        type="application/ld+json"
        // Serialised from a literal defined in this file, no user input reaches it.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      {/* One <main> around every content section, so the h1 and the primary
          call to action sit inside the document's main landmark rather than
          floating outside it. */}
      <main>
      {/* Hero: dark brand canvas, centered display type, then the product.
          The headline promises a ranked roster, so the roster is the next
          thing on the page rather than something four sections down. The
          form stays above it: on a phone the ask has to land before the
          scroll. */}
      <section className="dark flex flex-col bg-background text-foreground">
        <LandingHeader />

        <div className="mx-auto flex w-full max-w-5xl flex-col items-center px-4 pt-10 text-center sm:px-6 sm:pt-12">
          {/* Each piece arrives a beat after the one above it, and the roster
              below follows them in. The page's one first-view moment, so it
              can afford the stagger. */}
          <div className="flex flex-col items-center">
            <p className="animate-enter mb-8 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground antialiased">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />
              {OFFER.copy.heroEyebrow}
            </p>
            {/* Sized so "Your quietest client" holds one line on desktop:
                the three-line break is the rhythm of the sentence. */}
            <h1
              className="animate-enter text-[clamp(2.5rem,7vw,4.75rem)] font-bold uppercase leading-[0.9] tracking-tight antialiased"
              style={{ animationDelay: '50ms' }}
            >
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
            <p
              className="animate-enter mt-8 max-w-xl text-balance text-base text-muted-foreground antialiased sm:text-lg"
              style={{ animationDelay: '110ms' }}
            >
              Clients go quiet weeks before they quit. Logbook.fit ranks your
              roster by who needs you today.
            </p>
            <div
              id="waitlist"
              className="animate-enter mt-10 w-full max-w-md scroll-mt-24"
              style={{ animationDelay: '180ms' }}
            >
              <OfferCta offer={OFFER} showPromises />
            </div>
          </div>
        </div>
      </section>

      {/* The roster, still visually part of the hero. It sits outside the
          `dark` section on purpose: the panel is the app's own light UI, the
          brightest thing under the headline, so the eye drops from the lime
          button straight onto it and then on into the white page below. A
          `dark` ancestor would switch every chip and avatar in it to its
          dark variant, so the canvas colour is set literally here instead
          (neutral-950 is the dark theme's background). */}
      <div className="bg-neutral-950 px-4 pb-12 pt-14 sm:px-6 sm:pb-16 sm:pt-16">
        {/* Last in the hero's stagger, so the eye lands on the promise first
            and the proof second. */}
        <RosterPreview className="animate-enter mx-auto max-w-3xl [animation-delay:250ms]" />
      </div>

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

        {/* The tour: loop, client side, coach toolkit. Three sections with no
            rules between them and less air than a full section break, so they
            read as one run from the roster down to the dark band.

            Check-in loop: how the ranking above gets its signal.

            The two photo sections share one grid shape: heading, photo, list
            as three children. Stacked on a phone that is the reading order
            (what the section is, the picture, the detail). On desktop the
            photo takes a column of its own and spans both text rows, so the
            zigzag is purely a large-screen concern. */}
        <section>
          <div className="mx-auto grid max-w-6xl gap-x-14 gap-y-8 px-4 pb-10 pt-16 sm:px-6 sm:pb-14 sm:pt-24 lg:grid-cols-2 lg:grid-rows-[auto_1fr]">
            <div {...reveal()}>
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
            </div>

            {/* A coach reading a client's check-in on his phone between
                sessions, with the review card over the photo: her notes and the
                exercise she flagged that week, sitting right beside each other.
                That context is exactly what a group chat never gives you.
                On desktop the slot stretches to the text's height, narrower
                than 4:5, so the crop is anchored near the left edge: the card
                and the coach stay whole and the towel shelves take the trim. */}
            <ImageSlot
              label="The check-in review"
              src="/landing/checkin-gym.webp"
              alt="A coach in a gym reading a client's check-in on his phone: her notes about heavy Romanian deadlifts and a tight lower back, with the exercise she flagged that week beside them"
              className="aspect-[4/5] rounded-xl lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:aspect-auto lg:h-full"
              objectPosition="8% center"
              hideCaption
              reveal
            />

            <div>
              <ol>
                {CHECK_IN_LOOP.map((item, i) => (
                  <li
                    key={item.step}
                    {...reveal(i)}
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

        {/* For clients: the same grid, mirrored. The photo keeps its 4:5 so
            the exercise card over it is never cropped; the two text blocks
            pull together so they sit centered beside it. */}
        <section>
          <div className="mx-auto grid max-w-6xl gap-x-14 gap-y-8 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-2">
            <div {...reveal(1)} className="lg:col-start-2 lg:row-start-1 lg:self-end">
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
            </div>

            {/* A client on the bench between sets, phone in hand, with the
                exercise card from the Today view over the photo: two sets
                logged, the third about to be, the coach's cue right there.
                Captions are off on every slot; the photos carry it. */}
            <ImageSlot
              label="Between sets"
              src="/landing/client-between-sets.webp"
              alt="A client sitting on a gym bench between sets, logging a set on her phone: the Dumbbell Goblet Squat card shows two of three sets done and the coach's cue to keep the chest tall"
              className="aspect-[4/5] rounded-xl lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:self-center"
              hideCaption
              reveal
            />

            <div {...reveal(2)} className="lg:col-start-2 lg:row-start-2 lg:self-start">
              <FeatureList features={CLIENT_FEATURES} />
            </div>
          </div>
        </section>

        {/* For coaches: the rest of the toolkit. No photo here on purpose.
            The roster already opened the page, and a third photo-and-list
            section in a row made all three read as the same weight. */}
        <section>
          <div className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pb-24 sm:pt-14">
            <div {...reveal()} className="max-w-2xl">
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
            </div>
            {/* Hairlines come from the 1px gap over a border-coloured grid, so
                they stay single-width at every column count. */}
            <ul className="mt-10 grid gap-px overflow-hidden rounded-xl border border-border/70 bg-border/70 sm:mt-14 sm:grid-cols-2 lg:grid-cols-4">
              {COACH_FEATURES.map((feature, i) => (
                // The reveal is on the card's contents, not the card: a
                // hidden card would show the grid's hairline colour through.
                <li key={feature.title} className="bg-background p-6">
                  <div {...reveal(i)}>
                    <IconTile icon={feature.icon} />
                    <h3 className="mt-5 text-base font-semibold antialiased">{feature.title}</h3>
                    <p className="mt-1.5 text-pretty text-sm text-muted-foreground antialiased">
                      {feature.body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Who it's for: the filter. Naming who this isn't for is what makes
            the right coach feel it was built for them specifically. Two columns
            rather than prose: the section is *about* a line between two groups,
            so it should be shaped like one instead of describing it.

            It sits after the tour, dark, as the page's mid-point beat: by now
            the coach knows what the product is, so "is this me?" is the live
            question, and the invite button is the answer for the left column. */}
        <section className="dark bg-background text-foreground">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <div {...reveal()} className="text-center">
              <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground antialiased">
                Who it&rsquo;s for
              </p>
              <h2 className="text-balance text-4xl font-bold uppercase leading-[0.95] tracking-tight antialiased sm:text-6xl">
                Deliberately not
                <br />
                for everyone.
              </h2>
            </div>

            {/* One table, two halves. Below lg the halves stack: side by side
                any narrower, most lines wrap. From lg up each half is a
                subgrid of the parent's first four rows (header, three items),
                so paired rows share a height and the hairlines run straight
                across. */}
            <div className="mt-12 grid overflow-hidden rounded-2xl border border-border/70 sm:mt-16 lg:grid-cols-2 lg:grid-rows-[repeat(4,auto)]">
              {AUDIENCE.map((group, g) => {
                const built = g === 0;
                return (
                  <div
                    key={group.title}
                    {...reveal(g + 1)}
                    className={
                      built
                        ? 'bg-brand/[0.06] lg:row-span-4 lg:grid lg:grid-rows-subgrid'
                        : 'border-t border-border/70 lg:row-span-4 lg:grid lg:grid-rows-subgrid lg:border-l lg:border-t-0'
                    }
                  >
                    <div className="flex items-center gap-3 px-6 py-5 sm:px-8">
                      <span
                        className={`grid h-7 w-7 place-items-center rounded-full ${
                          built ? 'bg-brand text-brand-foreground' : 'border border-border text-muted-foreground'
                        }`}
                      >
                        <group.icon className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
                      </span>
                      <h3
                        className={`font-mono text-xs font-semibold uppercase tracking-[0.16em] antialiased ${
                          built ? 'text-brand' : 'text-muted-foreground'
                        }`}
                      >
                        {group.title}
                      </h3>
                    </div>

                    <ul className="lg:row-span-3 lg:grid lg:grid-rows-subgrid">
                      {group.items.map((item, i) => (
                        <li
                          key={item}
                          className="flex items-baseline gap-5 border-t border-border/70 px-6 py-5 sm:px-8 sm:py-6"
                        >
                          <span
                            className={`font-mono text-xs tabular-nums antialiased ${
                              built ? 'text-brand' : 'text-muted-foreground/60'
                            }`}
                          >
                            0{i + 1}
                          </span>
                          <span
                            className={`text-pretty text-lg leading-snug antialiased sm:text-xl ${
                              built
                                ? 'font-medium text-foreground'
                                : 'text-muted-foreground line-through decoration-muted-foreground/40 decoration-1'
                            }`}
                          >
                            {item}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
              {/* The invite closes the table instead of floating under it:
                  a full-width last row, so it reads as the answer to the
                  whole comparison. */}
              <div className="flex flex-col items-start gap-4 border-t border-border/70 px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:col-span-2">
                <p className="text-lg font-semibold antialiased sm:text-xl">
                  Sound like you?
                </p>
                <Link
                  href={OFFER.copy.midCta.href}
                  className="inline-flex h-11 items-center rounded-md bg-brand px-6 text-sm font-bold uppercase tracking-wider text-brand-foreground antialiased transition-[background-color,transform] duration-150 ease-out-strong hover:bg-brand/90 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {OFFER.copy.midCta.label}
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Spreadsheet import: answers the audience list's "outgrowing
            spreadsheets" the moment it's read. Switching cost is the reason a
            coach who agrees with everything above still doesn't move, so it's
            the last thing settled before the questions and the ask. */}
        <section>
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <div {...reveal()} className="mx-auto max-w-2xl text-center">
              <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground antialiased">
                Already in a spreadsheet?
              </p>
              <h2 className="text-balance text-3xl font-bold uppercase leading-[0.95] tracking-tight antialiased sm:text-5xl">
                Bring it with you.
              </h2>
              <p className="mt-4 text-pretty text-muted-foreground antialiased sm:text-lg">
                Upload the Excel or CSV you coach from. Logbook.fit reads your
                layout and shows you every week before it saves, so a client can
                train from your program the same day.
              </p>
            </div>
            <div {...reveal(1)} className="mt-12">
              <SheetToPlan />
            </div>
            <div className="mt-8 flex justify-center">
              <Link
                href="/spreadsheet-migration"
                className="inline-flex min-h-11 items-center rounded-lg border border-border px-4 text-sm font-medium antialiased transition-[background-color,transform] duration-150 ease-out-strong hover:bg-accent active:scale-[0.97] active:bg-accent"
              >
                How importing works
              </Link>
            </div>
          </div>
        </section>

        <FaqSection
          eyebrow="Questions"
          title="Before you join."
          intro="Straight answers to what coaches ask before they hand over an email."
          items={FAQ}
        />

        <JoinListSection offer={OFFER}>{OFFER.copy.closingBody.home}</JoinListSection>
      </main>

      <LandingFooter appStoreUrl={OFFER.appStoreUrl} />
    </RevealScope>
  );
}
