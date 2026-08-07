import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Logo } from '@/components/brand/LogoMark';
import { pageMetadata } from '@/lib/seo';

// Bare title: the root layout's template appends "· Logbook.fit".
export const metadata = pageMetadata({
  title: 'Legal',
  description:
    'Every Logbook.fit legal document in one place: the privacy policy and the terms of service.',
  path: '/legal',
});

/**
 * Legal hub — the stripe.com/legal pattern: one index every legal document
 * hangs off, so a link to "Legal" is always enough and new documents (DPA,
 * cookie policy) get a home without touching every footer. Add new documents
 * here and to the sitemap together.
 */
const DOCUMENTS = [
  {
    href: '/privacy',
    title: 'Privacy Policy',
    description:
      'What we collect, why we collect it, who can see it, and how to reach us about your data.',
    updated: 'August 6, 2026',
  },
  {
    href: '/terms',
    title: 'Terms of Service',
    description:
      'The rules of the private beta, in plain English — including what we are (software) and what we are not (medical advice).',
    updated: 'August 6, 2026',
  },
];

export default function LegalPage() {
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
        <p className="mb-3 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground antialiased">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />
          Legal
        </p>
        <h1 className="text-balance text-4xl font-bold uppercase leading-[0.95] tracking-tight antialiased sm:text-5xl">
          The fine print.
        </h1>
        <p className="mt-4 max-w-xl text-pretty text-[15px] leading-relaxed text-muted-foreground antialiased">
          Every legal document for Logbook.fit, written to be read. Questions
          about any of it:{' '}
          <a
            href="mailto:hello@logbook.fit"
            className="font-medium text-foreground underline underline-offset-4 hover:text-brand"
          >
            hello@logbook.fit
          </a>
          .
        </p>

        <ul className="mt-10 space-y-4">
          {DOCUMENTS.map((doc) => (
            <li key={doc.href}>
              <Link
                href={doc.href}
                className="group flex items-start justify-between gap-4 rounded-xl border border-border/70 p-5 transition-colors hover:border-foreground/30 hover:bg-accent/50 sm:p-6"
              >
                <div>
                  <h2 className="text-lg font-bold uppercase tracking-tight antialiased">
                    {doc.title}
                  </h2>
                  <p className="mt-1.5 text-pretty text-sm leading-relaxed text-muted-foreground antialiased">
                    {doc.description}
                  </p>
                  <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground antialiased">
                    Last updated: {doc.updated}
                  </p>
                </div>
                <ArrowRight
                  className="mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-brand"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
      </main>

      <footer className="border-t border-border/70">
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center justify-between gap-3 px-4 py-8 sm:flex-row sm:px-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground antialiased">
            © 2026 Logbook.fit · All rights reserved
          </p>
          <nav className="flex items-center gap-5 text-sm text-muted-foreground antialiased">
            <Link href="/" className="transition-colors hover:text-foreground">
              Home
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
