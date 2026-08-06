import Link from 'next/link';
import { Logo } from '@/components/brand/LogoMark';

/** The check-in loop, reduced to its four beats — the brand panel's footer. */
const LOOP_STEPS = ['Plan', 'Train', 'Check in', 'Adjust'];

interface AuthShellProps {
  /** Which page this frames — flips the header's escape hatch. */
  mode: 'login' | 'signup';
  children: React.ReactNode;
}

/**
 * Shared frame for the auth pages — a split canvas. The left half is the
 * brand's dark world from the landing hero (logbook grid paper, display
 * type, the rep-tally watermark); the right half is the light form column
 * that hands off into the app. Below `lg` the brand panel collapses to a
 * volt hairline above the app's own chrome, so mobile stays a clean
 * single column.
 */
export function AuthShell({ mode, children }: AuthShellProps) {
  const alt =
    mode === 'login'
      ? { question: 'New to Logbook?', href: '/signup', label: 'Create account' }
      : { question: 'Already have an account?', href: '/login', label: 'Sign in' };

  return (
    <div className="min-h-dvh bg-background lg:grid lg:grid-cols-2">
      {/* Brand panel — desktop only; sticky so long forms scroll beside it */}
      <aside className="dark relative hidden overflow-hidden border-r border-border bg-background p-10 text-foreground lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:justify-between xl:p-14">
        {/* Logbook grid paper, fading out toward the bottom-right */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.05] [mask-image:radial-gradient(120%_100%_at_15%_0%,black_35%,transparent_100%)]"
          style={{
            backgroundImage:
              'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        {/* Volt bloom behind the display type */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 top-1/3 h-[28rem] w-[28rem] rounded-full bg-brand/[0.07] blur-3xl"
        />
        {/* Rep-tally watermark — the mark's geometry without its tile, blown up */}
        <svg
          aria-hidden="true"
          viewBox="0 0 64 64"
          fill="none"
          className="pointer-events-none absolute -bottom-20 -right-14 h-[30rem] w-[30rem] opacity-[0.06]"
        >
          <path
            d="M21 20v24M32 20v24M43 20v24"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M14.5 41.5 49.5 22.5"
            strokeWidth="5.5"
            strokeLinecap="round"
            className="stroke-brand"
          />
        </svg>

        <Link
          href="/#waitlist"
          className="relative flex self-start rounded-sm transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Logo markSize={24} />
        </Link>

        <div className="relative">
          <p className="mb-6 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground antialiased">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />
            Coach-first training platform
          </p>
          <p className="text-[clamp(3.25rem,4.6vw,4.75rem)] font-bold uppercase leading-[0.88] tracking-tight antialiased">
            Plan.
            <br />
            Train.
            <br />
            <span className="text-brand">Check in.</span>
          </p>
          <p className="mt-6 max-w-sm text-pretty text-sm leading-relaxed text-muted-foreground antialiased xl:text-base">
            You build the plans. Your clients execute them. A structured
            check-in loop keeps you both in sync.
          </p>
        </div>

        <div className="relative flex flex-wrap gap-x-8 gap-y-2 font-mono text-[10px] uppercase tracking-[0.18em] antialiased">
          {LOOP_STEPS.map((step, i) => (
            <span key={step} className="flex items-baseline gap-2 text-muted-foreground">
              <span className="font-bold text-brand">{String(i + 1).padStart(2, '0')}</span>
              {step}
            </span>
          ))}
        </div>
      </aside>

      {/* Form column — the app's own light chrome */}
      <div className="flex min-h-dvh flex-col">
        <div className="h-1 shrink-0 bg-brand lg:hidden" aria-hidden="true" />
        {/* Mobile: hairline app bar. Desktop: borderless, with the 24px row
            (lg:h-6) centered on the brand panel's logo line — pt + h/2 equals
            the panel's p-10/xl:p-14 + half the 24px mark — so the button
            mirrors the logo across the seam. */}
        <header className="border-b border-border lg:border-0 lg:pt-10 xl:pt-14">
          <div className="flex h-14 items-center px-5 sm:px-8 lg:h-6 lg:px-10 xl:px-14">
            <Link
              href="/#waitlist"
              className="flex rounded-sm transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:hidden"
            >
              <Logo markSize={20} />
            </Link>
            <span className="ml-auto flex items-center gap-3">
              <span className="hidden font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground antialiased sm:inline">
                {alt.question}
              </span>
              <Link
                href={alt.href}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium antialiased transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {alt.label}
              </Link>
            </span>
          </div>
        </header>

        <main className="flex flex-1 flex-col px-5 sm:px-8">
          {/* my-auto centers when there's room and degrades to normal flow
              (page scroll) when the form is taller than the viewport */}
          <div className="mx-auto my-auto w-full max-w-sm py-10 animate-enter sm:py-14">
            {children}
          </div>
        </main>

        {/* Bottom padding tracks the brand panel's (p-10/xl:p-14) so the ©
            line and the loop-steps ticker share a baseline across the seam */}
        <footer className="flex items-center justify-between gap-3 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-2 sm:px-8 lg:pb-10 xl:pb-14">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground antialiased">
            © 2026 Logbook.fit
          </p>
          <nav className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground antialiased">
            <Link href="/privacy" className="transition-colors hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-foreground">
              Terms
            </Link>
          </nav>
        </footer>
      </div>
    </div>
  );
}

/** Volt-tick divider between an auth page's headline block and its form. */
export function AuthDivider() {
  return (
    <div className="my-7 flex items-center gap-3 sm:my-8" aria-hidden="true">
      <span className="h-0.5 w-8 bg-brand" />
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
