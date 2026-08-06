import Link from 'next/link';
import { Logo } from '@/components/brand/LogoMark';

/**
 * Shared frame + typography for the public legal pages (/privacy, /terms).
 * No typography plugin in this project, so the prose rhythm is set here once
 * instead of being re-specified per page.
 */

/**
 * Anchor id for a section title. Shared by the ToC links and LegalSection ids
 * so a page's `toc` array only has to repeat the visible titles.
 */
function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

export function LegalPage({
  kicker,
  title,
  updated,
  toc,
  children,
}: {
  kicker: string;
  title: string;
  /** Human-readable "Last updated" date, e.g. "August 6, 2026". */
  updated: string;
  /** Section titles, in order — must match the LegalSection titles below. */
  toc?: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border/70">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-5 sm:px-6">
          <Link
            href="/"
            className="flex rounded-sm transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Logo markSize={22} />
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium antialiased transition-colors hover:bg-accent"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        <Link
          href="/legal"
          className="mb-3 flex w-fit items-center gap-1.5 rounded-sm font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground antialiased transition-colors hover:text-foreground"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />
          {kicker}
        </Link>
        <h1 className="text-balance text-4xl font-bold uppercase leading-[0.95] tracking-tight antialiased sm:text-5xl">
          {title}
        </h1>
        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground antialiased">
          Last updated: {updated}
        </p>

        <div className="mt-10 lg:grid lg:grid-cols-[minmax(0,1fr)_13rem] lg:gap-12">
          {/* On-this-page nav — the Google/Stripe convention. Mobile gets a
              jump list before the prose; desktop moves it into a sticky rail
              (first in source order, so `order-2` puts the prose back on the
              left without reordering for screen readers). */}
          {toc && toc.length > 0 && (
            <nav
              aria-label="On this page"
              className="mb-10 border-l-2 border-brand pl-4 lg:order-2 lg:mb-0 lg:self-start lg:border-l lg:border-border lg:pl-5 lg:sticky lg:top-10"
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground antialiased">
                On this page
              </p>
              <ul className="mt-3 space-y-2">
                {toc.map((section) => (
                  <li key={section}>
                    <a
                      href={`#${slugify(section)}`}
                      className="text-sm text-muted-foreground antialiased transition-colors hover:text-foreground"
                    >
                      {section}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <div className="space-y-10 lg:order-1">{children}</div>
        </div>
      </main>

      <footer className="border-t border-border/70">
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center justify-between gap-3 px-4 py-8 sm:flex-row sm:px-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground antialiased">
            © 2026 Logbook.fit · All rights reserved
          </p>
          <nav className="flex items-center gap-5 text-sm text-muted-foreground antialiased">
            <Link href="/legal" className="transition-colors hover:text-foreground">
              Legal
            </Link>
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

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={slugify(title)} className="scroll-mt-8">
      <h2 className="text-xl font-bold uppercase tracking-tight antialiased">
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-pretty text-[15px] leading-relaxed text-muted-foreground antialiased">
        {children}
      </div>
    </section>
  );
}

/** Bulleted list matching the body rhythm — volt tick instead of a browser disc. */
export function LegalList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span
            className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full bg-brand"
            aria-hidden="true"
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** Inline emphasis that reads in the foreground color against the muted body. */
export function Strong({ children }: { children: React.ReactNode }) {
  return <strong className="font-semibold text-foreground">{children}</strong>;
}
