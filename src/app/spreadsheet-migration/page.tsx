import Link from 'next/link';
import { ArrowRight, Check, FileSpreadsheet, Info, ListChecks, NotebookPen, Send, Upload } from 'lucide-react';
import { WaitlistForm } from '@/components/landing/WaitlistForm';
import { SheetToPlan } from '@/components/landing/SheetToPlan';
import { RosterPreview } from '@/components/landing/RosterPreview';
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
    icon: Upload,
    title: 'Upload the file you coach from',
    body: 'Excel (.xlsx) or a CSV exported from Google Sheets. Use our template, or keep your own layout: one row per exercise, a column per week, a tab per week.',
  },
  {
    step: '02',
    icon: ListChecks,
    title: 'Check your plan',
    body: 'Every week, day and exercise is shown before anything is saved. If your sheet left a value open, you pick it right under that exercise.',
  },
  {
    step: '03',
    icon: Send,
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

/** What the importer reads, shown under the diagram. Keep in step with the FAQ. */
const FORMATS = ['Excel (.xlsx)', 'CSV', 'Google Sheets, downloaded as .xlsx or .csv', 'Our template or your own layout'];

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
        {/* Hero. The extra bottom padding is the room the diagram below
            overlaps into, so the product shows in the first screen. */}
        <section className="dark bg-background text-foreground">
          <LandingHeader linkHome />
          <div className="mx-auto flex w-full max-w-5xl flex-col items-center px-4 pb-28 pt-12 text-center sm:px-6 sm:pb-40 sm:pt-16">
            <div className="animate-enter flex flex-col items-center">
              <p className="mb-7 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground antialiased">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />
                Spreadsheet import
                <span className="hidden sm:inline">· for independent coaches</span>
              </p>
              <h1 className="text-[clamp(2.5rem,7vw,4.75rem)] font-bold uppercase leading-[0.9] tracking-tight antialiased">
                Bring your
                <br />
                <span className="text-brand">spreadsheet.</span>
              </h1>
              <p className="mt-7 max-w-xl text-balance text-base text-muted-foreground antialiased sm:text-lg">
                Your programs already work. Upload the file you coach from, check
                what came across, and assign it to a client. Nothing is saved until
                you say so.
              </p>
              <div className="mt-9 w-full max-w-md">
                <WaitlistForm campaign={CAMPAIGN} promises={FORM_PROMISES} />
              </div>
            </div>
          </div>
        </section>

        {/* The before and after, framed like a product window and lifted
            into the hero */}
        <section className="border-b border-border/70">
          <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-24">
            <div className="relative -mt-20 rounded-2xl border border-border bg-muted p-2 shadow-2xl shadow-black/10 sm:-mt-28 sm:p-6 lg:p-8">
              <SheetToPlan />
            </div>
            <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-center lg:gap-16">
              <div>
                <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground antialiased">
                  Keep your programming
                </p>
                <h2 className="text-balance text-3xl font-bold uppercase leading-[0.95] tracking-tight antialiased sm:text-5xl">
                  No retyping.
                </h2>
                <p className="mt-4 max-w-md text-pretty text-muted-foreground antialiased sm:text-lg">
                  Logbook.fit reads the layout you already use. You don&rsquo;t rebuild
                  your library or start from a blank plan to try it.
                </p>
              </div>
              <div>
                <h3 className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground antialiased">
                  Reads
                </h3>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {FORMATS.map((format) => (
                    <li
                      key={format}
                      className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 shadow-sm"
                    >
                      <FileSpreadsheet className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
                      <span className="text-pretty text-sm font-medium antialiased sm:text-base">{format}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section>
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="grid gap-4 lg:grid-cols-2 lg:items-end lg:gap-16">
              <div>
                <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground antialiased">
                  How it works
                </p>
                <h2 className="text-balance text-4xl font-bold uppercase leading-[0.95] tracking-tight antialiased sm:text-6xl">
                  Three steps, one client.
                </h2>
              </div>
              <p className="max-w-lg text-pretty text-muted-foreground antialiased sm:text-lg">
                Start with one program and one client for a week. Your spreadsheet
                stays exactly as it is, so there&rsquo;s nothing to undo.
              </p>
            </div>
            <ol className="mt-12 grid gap-4 md:grid-cols-3 md:gap-6">
              {STEPS.map((item) => (
                <li key={item.step} className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-7">
                  <div className="flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-brand-foreground">
                      <item.icon className="h-5 w-5" strokeWidth={2.25} aria-hidden="true" />
                    </span>
                    <span className="font-mono text-sm font-bold tabular-nums text-muted-foreground antialiased">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="mt-6 text-lg font-semibold antialiased">{item.title}</h3>
                  <p className="mt-2 text-pretty text-sm text-muted-foreground antialiased sm:text-base">
                    {item.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* What comes across */}
        <section className="border-t border-border/70 bg-muted/40">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="max-w-2xl">
              <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground antialiased">
                What comes across
              </p>
              <h2 className="text-balance text-3xl font-bold uppercase leading-[0.95] tracking-tight antialiased sm:text-5xl">
                Your notes come with it.
              </h2>
              <p className="mt-4 text-pretty text-muted-foreground antialiased sm:text-lg">
                The numbers a client trains from get their own fields. Everything
                else you wrote stays with the exercise, word for word.
              </p>
            </div>
            <div className="mt-12 grid gap-4 lg:grid-cols-5 lg:gap-6">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8 lg:col-span-3">
                <h3 className="flex items-center gap-2 text-base font-semibold antialiased sm:text-lg">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-brand-foreground">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
                  </span>
                  Becomes part of the plan
                </h3>
                <ul className="mt-6 grid gap-x-8 gap-y-3.5 sm:grid-cols-2">
                  {CARRIES_OVER.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/25">
                        <Check className="h-3 w-3 text-brand-foreground" strokeWidth={3} aria-hidden="true" />
                      </span>
                      <span className="text-pretty text-sm antialiased sm:text-base">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-dashed border-border bg-card/60 p-6 sm:p-8 lg:col-span-2">
                <h3 className="flex items-center gap-2 text-base font-semibold antialiased sm:text-lg">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <NotebookPen className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  Kept with the exercise as a note
                </h3>
                <ul className="mt-6 space-y-3.5">
                  {STAYS_A_NOTE.map((item) => (
                    <li key={item} className="flex gap-3">
                      <NotebookPen className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span className="text-pretty text-sm antialiased sm:text-base">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="mt-6 flex items-start gap-2 text-pretty text-sm text-muted-foreground antialiased">
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>A plan can be up to {LIMITS}.</span>
            </p>
          </div>
        </section>

        {/* Why it's worth the move: the retention thesis, from the homepage */}
        <section className="dark border-t border-border/70 bg-background text-foreground">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2 lg:items-center lg:gap-16">
            <div>
              <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground antialiased">
                After the import
              </p>
              <h2 className="text-balance text-3xl font-bold uppercase leading-[0.95] tracking-tight antialiased sm:text-5xl">
                Your sheet can&rsquo;t tell you who&rsquo;s{' '}
                <span className="text-brand">going quiet.</span>
              </h2>
              <p className="mt-5 max-w-lg text-pretty text-muted-foreground antialiased sm:text-lg">
                Once clients train from the plan, your dashboard ranks them by who
                needs you today: at risk, check-in due, waiting on your reply, plan
                ended, on track. You see the quiet client before they cancel.
              </p>
              <Link
                href="/"
                className="group mt-8 inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium antialiased transition-colors hover:bg-accent"
              >
                See how Logbook.fit works
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </div>
            <RosterPreview />
          </div>
        </section>

        <FaqSection
          title="Before you switch."
          intro="Still not sure your file will come across? Every coach in the beta gets a setup call to bring the first program in together."
          items={FAQ}
          split
        />

        <JoinListSection campaign={CAMPAIGN}>
          Ten coaches at a time. Every one gets a setup call where we bring your
          first program across with you.
        </JoinListSection>
      </main>
      <LandingFooter />
    </div>
  );
}
