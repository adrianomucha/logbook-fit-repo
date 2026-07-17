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

export default function WaitlistPage() {
  return (
    <div className="min-h-dvh bg-background flex flex-col">
      {/* The app's own chrome — same frame as /login and /signup */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex h-12 items-center justify-between">
          <Logo markSize={20} />
          <Link
            href="/login"
            className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="flex-1 w-full max-w-md mx-auto px-5 sm:px-6 py-9 sm:py-12 pb-[calc(2.25rem+env(safe-area-inset-bottom))] animate-enter">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-1.5">
            For independent coaches
          </p>
          <h1 className="text-3xl font-black tracking-tight leading-tight text-balance">
            Know who needs you today, before they go quiet.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Logbook is coaching software with the software removed. Your client
            opens one screen and knows exactly what to do. You open one screen
            and know exactly who needs you. Everything else, we deleted on
            purpose.
          </p>
        </div>

        <div className="my-7 sm:my-8 border-t border-border" aria-hidden="true" />

        <WaitlistForm />

        <div className="mt-9">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-3 antialiased flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand ring-2 ring-brand/25" aria-hidden="true" />
            Why Logbook
          </p>
          <ul className="space-y-4">
            {PROOF_LINES.map((line) => (
              <li key={line.lead} className="text-sm leading-relaxed text-muted-foreground">
                <strong className="font-bold text-foreground">{line.lead}</strong>{' '}
                {line.rest}
              </li>
            ))}
          </ul>
        </div>

        <div className="my-7 sm:my-8 border-t border-border" aria-hidden="true" />

        <p className="text-sm leading-relaxed text-muted-foreground">
          The first thing your client ever sees is your name and your words:{' '}
          <strong className="font-bold text-foreground">
            &ldquo;{'{You}'} is expecting you.&rdquo;
          </strong>{' '}
          That&rsquo;s the whole product philosophy in one screen.
        </p>
      </main>

      <footer className="border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] leading-relaxed text-muted-foreground">
            Built for coaches with 5 to 30 clients who&rsquo;d rather coach than
            administrate.
          </p>
        </div>
      </footer>
    </div>
  );
}
