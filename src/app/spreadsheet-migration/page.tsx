import Link from 'next/link';
import { Check, NotebookPen } from 'lucide-react';
import { WaitlistForm } from '@/components/landing/WaitlistForm';
import { SheetToPlan } from '@/components/landing/SheetToPlan';
import { JoinListSection, LandingFooter, LandingHeader } from '@/components/landing/LandingChrome';
import { FaqSection, faqJsonLd, type FaqItem } from '@/components/landing/FaqSection';
import { FOUNDING_PRICE, FORM_PROMISES } from '@/lib/landing-copy';
import { SITE_URL, absoluteUrl, pageMetadata } from '@/lib/seo';

const PATH = '/spreadsheet-migration';

/** Tags waitlist signups from this page, see WaitlistForm. */
const CAMPAIGN = 'spreadsheet-migration';

// Bare title: the root layout's template appends "· Logbook.fit". Leads with
// the words a coach searches for, not the product's name for the feature.
export const metadata = pageMetadata({
  title: 'Import workout programs from Excel or Google Sheets',
  description:
    'Move your coaching programs out of spreadsheets. Upload the Excel or CSV file you coach from, check every week and exercise, then assign it to a client.',
  path: PATH,
});

const STEPS = [
  {
    step: '01',
    title: 'Upload the file you coach from',
    body: 'Excel (.xlsx) or a CSV exported from Google Sheets. Use our template, or keep your own layout: one row per exercise, a column per week, a tab per week.',
  },
  {
    step: '02',
    title: 'Check your plan',
    body: 'Every week, day and exercise is shown before anything is saved. If your sheet left a value open, you pick it right under that exercise.',
  },
  {
    step: '03',
    title: 'Assign it to a client',
    body: 'It lands in your plans like one you built by hand. Edit anything, then send it. Your client trains from the app and checks in with you.',
  },
];

// Mirrors IMPORT_COLUMNS in src/lib/plan-import.ts. Keep in step with it:
// every line here is a promise about what the importer does.
const CARRIES_OVER = [
  'Weeks and days, with your day names',
  'Exercises, added to your library if they’re new',
  'Sets and reps, or a time for timed work',
  'Weight, read in kg or lb and shown in your unit',
  'Rest between sets',
  'Supersets',
  'Your notes for each exercise',
];

const STAYS_A_NOTE = ['RPE and RIR', 'Percentages of 1RM', 'Tempo', 'Cues and per-side work'];

// Mirrors IMPORT_LIMITS in src/lib/plan-import.ts.
const LIMITS = '12 weeks, 7 training days a week and 20 exercises a day';

const FAQ: FaqItem[] = [
  {
    q: 'Can I import a workout program from Google Sheets?',
    a: 'Yes. In Google Sheets choose File, then Download, then Microsoft Excel (.xlsx) or CSV, and upload that file. Logbook.fit reads Excel and CSV files.',
  },
  {
    q: 'Does my spreadsheet need a special layout?',
    a: 'No. A file laid out like our template is read column by column. Any other layout (a column per week, a tab per week, prescriptions like “3×5 100kg” in one cell) is read automatically, and you check the result against your sheet before the plan is created.',
  },
  {
    q: 'What happens to RPE, tempo and percentages?',
    a: 'Sets, reps, weight and rest go into their own fields. RPE, RIR, %1RM, tempo, cues and anything else you wrote stay with the exercise as notes instead of being forced into a number. You see them on the review step before the plan is created.',
  },
  {
    q: 'How big can an imported plan be?',
    a: `Up to ${LIMITS}. Longer programs can be split into blocks and imported one block at a time.`,
  },
  {
    q: 'Does it import my clients’ past workout logs?',
    a: 'No. It imports the program: the plan your client follows. Their training history starts in Logbook.fit from the first session they log.',
  },
  {
    q: 'Who sees my spreadsheet?',
    a: 'Files in the template layout are read on our servers. Any other layout is read by Anthropic’s AI to work out the plan, so remove client names and health details before you upload.',
    link: { href: '/privacy', label: 'Privacy Policy' },
  },
  {
    q: 'What if my file doesn’t come across cleanly?',
    a: 'Every coach in the beta gets a setup call. Bring the file and we’ll get your first program in with you, and use what tripped it up to improve the importer.',
  },
  {
    q: 'What does it cost?',
    a: FOUNDING_PRICE,
  },
];

/**
 * FAQPage describes the visible questions below, word for word. It's here
 * because the page's job is answering "can I import my spreadsheet?", which
 * is exactly the question an answer engine is asked.
 */
const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': `${absoluteUrl(PATH)}#webpage`,
      url: absoluteUrl(PATH),
      name: metadata.title,
      description: metadata.description,
      isPartOf: { '@id': `${SITE_URL}/#website` },
      about: { '@id': `${SITE_URL}/#software` },
      inLanguage: 'en-US',
    },
    faqJsonLd(FAQ, `${absoluteUrl(PATH)}#faq`),
  ],
};

export default function SpreadsheetMigrationPage() {
  return (
    <div className="bg-background">
      <script
        type="application/ld+json"
        // Serialised from literals defined in this file, no user input reaches it.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <main>
        {/* Hero */}
        <section className="dark bg-background text-foreground">
          <LandingHeader linkHome />
          <div className="mx-auto flex w-full max-w-5xl flex-col items-center px-4 pb-20 pt-14 text-center sm:px-6 sm:pb-28 sm:pt-20">
            <div className="animate-enter flex flex-col items-center">
              <p className="mb-8 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground antialiased">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />
                Spreadsheet import · for independent coaches
              </p>
              <h1 className="text-[clamp(2.5rem,7vw,4.75rem)] font-bold uppercase leading-[0.9] tracking-tight antialiased">
                Bring your
                <br />
                <span className="text-brand">spreadsheet.</span>
              </h1>
              <p className="mt-8 max-w-xl text-balance text-base text-muted-foreground antialiased sm:text-lg">
                Your programs already work. Upload the file you coach from, check
                what came across, and assign it to a client. Nothing is saved until
                you say so.
              </p>
              <div className="mt-10 w-full max-w-md">
                <WaitlistForm campaign={CAMPAIGN} promises={FORM_PROMISES} />
              </div>
            </div>
          </div>
        </section>

        {/* The before and after */}
        <section className="border-b border-border/70">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="mx-auto max-w-2xl text-center">
              <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground antialiased">
                Keep your programming
              </p>
              <h2 className="text-balance text-3xl font-bold uppercase leading-[0.95] tracking-tight antialiased sm:text-5xl">
                No retyping.
              </h2>
              <p className="mt-4 text-pretty text-muted-foreground antialiased sm:text-lg">
                Logbook.fit reads the layout you already use. You don&rsquo;t rebuild
                your library or start from a blank plan to try it.
              </p>
            </div>
            <SheetToPlan className="mt-12" />
          </div>
        </section>

        {/* How it works */}
        <section>
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2 lg:gap-14">
            <div>
              <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground antialiased">
                How it works
              </p>
              <h2 className="text-balance text-4xl font-bold uppercase leading-[0.95] tracking-tight antialiased sm:text-6xl">
                Three steps, one client.
              </h2>
              <p className="mt-4 max-w-lg text-pretty text-muted-foreground antialiased sm:text-lg">
                Start with one program and one client for a week. Your spreadsheet
                stays exactly as it is, so there&rsquo;s nothing to undo.
              </p>
            </div>
            <ol>
              {STEPS.map((item) => (
                <li key={item.step} className="flex gap-6 border-t border-border/70 py-6 sm:gap-8">
                  <span className="font-mono text-3xl font-bold tabular-nums leading-none text-brand antialiased sm:text-4xl">
                    {item.step}
                  </span>
                  <div>
                    <h3 className="text-base font-semibold antialiased sm:text-lg">{item.title}</h3>
                    <p className="mt-1.5 text-pretty text-sm text-muted-foreground antialiased sm:text-base">
                      {item.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* What comes across */}
        <section className="border-t border-border/70">
          <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="text-center">
              <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground antialiased">
                What comes across
              </p>
              <h2 className="text-balance text-3xl font-bold uppercase leading-[0.95] tracking-tight antialiased sm:text-5xl">
                Your notes
                <br />
                come with it.
              </h2>
            </div>
            <div className="mt-12 grid gap-8 sm:grid-cols-2 sm:gap-12">
              <div>
                <h3 className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground antialiased">
                  Becomes part of the plan
                </h3>
                <ul className="mt-4 space-y-3">
                  {CARRIES_OVER.map((item) => (
                    <li key={item} className="flex gap-3">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" strokeWidth={3} aria-hidden="true" />
                      <span className="text-pretty text-base antialiased">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground antialiased">
                  Kept with the exercise as a note
                </h3>
                <ul className="mt-4 space-y-3">
                  {STAYS_A_NOTE.map((item) => (
                    <li key={item} className="flex gap-3">
                      <NotebookPen className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span className="text-pretty text-base antialiased">{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-6 text-pretty text-sm text-muted-foreground antialiased">
                  A plan can be up to {LIMITS}.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Why it's worth the move: the retention thesis, from the homepage */}
        <section className="dark border-t border-border/70 bg-background text-foreground">
          <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-24">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground antialiased">
              After the import
            </p>
            <h2 className="text-balance text-3xl font-bold uppercase leading-[0.95] tracking-tight antialiased sm:text-5xl">
              Your sheet can&rsquo;t tell you
              <br />
              who&rsquo;s <span className="text-brand">going quiet.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-pretty text-muted-foreground antialiased sm:text-lg">
              Once clients train from the plan, your dashboard ranks them by who
              needs you today: at risk, check-in due, waiting on your reply, plan
              ended, on track. You see the quiet client before they cancel.
            </p>
            <Link
              href="/"
              className="mt-8 inline-flex rounded-lg border border-border px-4 py-2 text-sm font-medium antialiased transition-colors hover:bg-accent"
            >
              See how Logbook.fit works
            </Link>
          </div>
        </section>

        <FaqSection title="Before you switch." items={FAQ} />

        <JoinListSection campaign={CAMPAIGN}>
          Ten coaches at a time. Every one gets a setup call where we bring your
          first program across with you.
        </JoinListSection>
      </main>
      <LandingFooter />
    </div>
  );
}
