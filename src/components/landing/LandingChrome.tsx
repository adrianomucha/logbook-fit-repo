import Link from 'next/link';
import { Logo, LogoMark } from '@/components/brand/LogoMark';
import { WaitlistForm } from '@/components/landing/WaitlistForm';

/**
 * The frame shared by the public marketing pages (the homepage and the pages
 * that link into it): the header, the closing waitlist CTA and the footer.
 * Kept in one place so a second page can't drift from the first.
 */

/**
 * Sits inside each page's dark hero section, so it inherits that section's
 * dark tokens. The homepage *is* "/", so only other pages link the logo home.
 */
export function LandingHeader({ linkHome = false }: { linkHome?: boolean }) {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
      {linkHome ? (
        <Link
          href="/"
          className="flex rounded-sm transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Logo markSize={24} />
        </Link>
      ) : (
        <Logo markSize={24} />
      )}
      <Link
        href="/login"
        className="rounded-lg border border-border px-4 py-2 text-sm font-medium antialiased transition-colors hover:bg-accent"
      >
        Sign in
      </Link>
    </header>
  );
}

/** The closing "Get on the list." section, dark, with the second waitlist form. */
export function JoinListSection({
  children,
  campaign,
}: {
  /** The line under the heading */
  children: React.ReactNode;
  /** Passed to the form, see WaitlistForm */
  campaign?: string;
}) {
  return (
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
            {children}
          </p>
          <div className="mx-auto mt-9 max-w-md text-left">
            <WaitlistForm campaign={campaign} />
          </div>
        </div>
      </div>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer className="dark border-t border-border bg-background text-foreground">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 sm:flex-row sm:px-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground antialiased">
          © 2026 Logbook.fit · All rights reserved
        </p>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground antialiased">
          <Link href="/spreadsheet-migration" className="transition-colors hover:text-foreground">
            Spreadsheet import
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
  );
}
