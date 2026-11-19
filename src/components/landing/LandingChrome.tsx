import Link from 'next/link';
import { Logo, LogoMark } from '@/components/brand/LogoMark';
import { OfferCta } from '@/components/landing/OfferCta';
import type { Offer } from '@/lib/offer';

/**
 * The frame shared by the public marketing pages (the homepage and the pages
 * that link into it): the header, the closing call to action and the footer.
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
        className="inline-flex min-h-11 items-center rounded-lg border border-border px-4 text-sm font-medium antialiased transition-[background-color,transform] duration-150 ease-out-strong hover:bg-accent active:scale-[0.97] active:bg-accent"
      >
        Sign in
      </Link>
    </header>
  );
}

/**
 * The closing section, dark, with the page's second call to action: "Get on
 * the list." with the waitlist form, or "Start today." with the way into
 * signup, depending on the offer.
 */
export function JoinListSection({
  children,
  offer,
  campaign,
}: {
  /** The line under the heading */
  children: React.ReactNode;
  offer: Offer;
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
            {offer.copy.closingTitle[0]}
            <br />
            {offer.copy.closingTitle[1]}
            <span className="text-brand">.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-md text-balance text-muted-foreground antialiased sm:text-lg">
            {children}
          </p>
          <div className="mx-auto mt-9 max-w-md text-left">
            <OfferCta offer={offer} campaign={campaign} />
          </div>
        </div>
      </div>
    </section>
  );
}

// 44px tall so each is a fair target on a phone, and lit while pressed:
// hover never fires on touch.
const FOOTER_LINK =
  'inline-flex min-h-11 items-center text-base text-muted-foreground antialiased transition-colors hover:text-foreground active:text-foreground';

const FOOTER_HEADING =
  'mb-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground/70 antialiased';

/**
 * Built like the page's other sections rather than as a thin strip: the
 * content width, the brand and where things stand on the left, links grouped
 * into columns, and the name set large to close the page in the same heavy
 * uppercase as the headings above it.
 */
export function LandingFooter({ offer }: { offer: Offer }) {
  return (
    <footer className="dark overflow-hidden border-t border-border/70 bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-4 pt-14 sm:px-6 sm:pt-20">
        <div className="grid grid-cols-2 gap-x-8 gap-y-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div className="col-span-2 lg:col-span-1">
            <Logo markSize={28} />
            <p className="mt-5 max-w-sm text-pretty text-muted-foreground antialiased sm:text-lg">
              Coaching software for independent coaches. Your roster, ranked by who needs you
              today.
            </p>
            <p className="mt-6 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground antialiased">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />
              {offer.copy.heroEyebrow}
            </p>
          </div>

          <nav aria-label="Product">
            <p className={FOOTER_HEADING}>Product</p>
            <ul>
              <li>
                <Link href="/spreadsheet-migration" className={FOOTER_LINK}>
                  Spreadsheet import
                </Link>
              </li>
              {offer.appStoreUrl && (
                <li>
                  <a href={offer.appStoreUrl} className={FOOTER_LINK} rel="noopener">
                    iPhone app
                  </a>
                </li>
              )}
              <li>
                <Link href="/login" className={FOOTER_LINK}>
                  Sign in
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Legal">
            <p className={FOOTER_HEADING}>Legal</p>
            <ul>
              <li>
                <Link href="/privacy" className={FOOTER_LINK}>
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/terms" className={FOOTER_LINK}>
                  Terms
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-14 border-t border-border/70 py-6 sm:mt-20">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground antialiased">
            © 2026 Logbook.fit · All rights reserved
          </p>
        </div>

        {/* The name, set to the content width and cut off by the page's
            bottom edge, so the page ends on the brand instead of on a row of
            links. Decorative: the logo above already names the site. */}
        <p
          className="-mb-[0.04em] select-none whitespace-nowrap text-[clamp(3rem,18.5vw,14.25rem)] font-bold uppercase leading-[0.9] tracking-tight text-foreground/[0.07] antialiased"
          aria-hidden="true"
        >
          Logbook<span className="text-brand">.</span>
        </p>
      </div>
    </footer>
  );
}
