import type { Metadata } from 'next';
import Link from 'next/link';
import { Logo } from '@/components/brand/LogoMark';
import { WaitlistForm } from './WaitlistForm';

export const metadata: Metadata = {
  title: 'Logbook — Early access for independent coaches',
  description:
    'Coaching software with the software removed. Know who needs you today, before they go quiet. Get early access.',
};

const PROOF_LINES = [
  {
    lead: 'No charts. Just decisions.',
    rest: 'Your dashboard tells you who’s off track and who went quiet, not how their heart-rate variability trended.',
  },
  {
    lead: 'Your clients, your name, your rates.',
    rest: 'Future proved people pay $199 a month for a coach who notices. Logbook is how you deliver that under your own brand.',
  },
  {
    lead: 'Chat is the heartbeat.',
    rest: 'Plans, check-ins, and workouts all live one tap from the conversation, because coaching is a relationship, not content delivery.',
  },
];

/** Oversized rep-tally glyph — the brand mark blown up into hero atmosphere. */
function TallyBackdrop() {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className="pointer-events-none select-none absolute -top-24 -right-28 w-[34rem] h-[34rem] sm:-right-16 opacity-[0.05] rotate-6"
    >
      <path
        d="M21 8v48M32 8v48M43 8v48"
        strokeWidth="4"
        strokeLinecap="round"
        className="stroke-foreground"
      />
      <path
        d="M10 51 54 13"
        strokeWidth="4.5"
        strokeLinecap="round"
        className="stroke-brand"
      />
    </svg>
  );
}

export default function WaitlistPage() {
  return (
    <div className="dark min-h-dvh bg-background text-foreground flex flex-col overflow-x-clip">
      <header className="border-b border-border relative z-10">
        <div className="max-w-3xl mx-auto px-5 sm:px-6 flex h-14 items-center justify-between">
          <Logo markSize={22} />
          <Link
            href="/login"
            className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="flex-1 relative">
        {/* Hero */}
        <section className="relative">
          <TallyBackdrop />
          <div className="relative max-w-3xl mx-auto px-5 sm:px-6 pt-16 sm:pt-24 pb-14 sm:pb-20">
            <p
              className="font-mono text-[11px] font-medium uppercase tracking-[0.3em] text-brand animate-enter"
              style={{ animationDelay: '0ms' }}
            >
              For independent coaches
            </p>
            <h1
              className="mt-5 text-4xl sm:text-6xl font-black tracking-tight leading-[1.05] text-balance animate-enter"
              style={{ animationDelay: '80ms' }}
            >
              Know who needs you today,{' '}
              <span className="text-muted-foreground">before they go quiet.</span>
            </h1>
            <p
              className="mt-6 max-w-xl text-base sm:text-lg leading-relaxed text-muted-foreground animate-enter"
              style={{ animationDelay: '160ms' }}
            >
              Logbook is coaching software with the software removed. Your client
              opens one screen and knows exactly what to do. You open one screen
              and know exactly who needs you.{' '}
              <span className="text-foreground">
                Everything else, we deleted on purpose.
              </span>
            </p>

            <div
              className="mt-9 max-w-xl animate-enter"
              style={{ animationDelay: '240ms' }}
            >
              <WaitlistForm />
            </div>
          </div>
        </section>

        {/* Proof lines — ruled like a training log */}
        <section
          aria-label="Why Logbook"
          className="max-w-3xl mx-auto px-5 sm:px-6 pb-16 sm:pb-24 animate-enter"
          style={{ animationDelay: '320ms' }}
        >
          <ol className="border-t border-border">
            {PROOF_LINES.map((line, i) => (
              <li
                key={line.lead}
                className="border-b border-border py-7 sm:py-8 sm:grid sm:grid-cols-[3.5rem_1fr] sm:gap-6"
              >
                <span
                  aria-hidden="true"
                  className="font-mono text-[11px] font-medium tracking-[0.2em] text-muted-foreground tabular-nums block mb-3 sm:mb-0 sm:pt-1"
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <p className="text-base sm:text-lg leading-relaxed text-muted-foreground">
                  <strong className="font-bold text-foreground">{line.lead}</strong>{' '}
                  {line.rest}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* Closing — the invite screen, in words */}
        <section className="max-w-3xl mx-auto px-5 sm:px-6 pb-20 sm:pb-28 text-center">
          <p className="text-base sm:text-lg text-muted-foreground text-balance">
            The first thing your client ever sees is your name and your words:
          </p>
          <p className="mt-5 text-2xl sm:text-4xl font-black tracking-tight text-balance">
            &ldquo;<span className="font-mono text-brand">{'{You}'}</span> is
            expecting you.&rdquo;
          </p>
          <p className="mt-5 text-base sm:text-lg text-muted-foreground text-balance">
            That&rsquo;s the whole product philosophy in one screen.
          </p>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="max-w-3xl mx-auto px-5 sm:px-6 py-8 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] leading-relaxed text-muted-foreground">
            Built for coaches with 5 to 30 clients who&rsquo;d rather coach than
            administrate.
          </p>
        </div>
      </footer>
    </div>
  );
}
