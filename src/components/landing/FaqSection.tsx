import Link from 'next/link';
import { Plus } from 'lucide-react';

export interface FaqItem {
  q: string;
  /** Plain text, so the same words can go into the page's FAQPage JSON-LD */
  a: string;
  /** Optional link shown after the answer (kept out of the JSON-LD text) */
  link?: { href: string; label: string };
}

/** FAQPage structured data for `items`, word for word what the page shows. */
export function faqJsonLd(items: FaqItem[], id: string) {
  return {
    '@type': 'FAQPage',
    '@id': id,
    mainEntity: items.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
}

/** Fade-up on scroll, picked up by RevealScope where the page has one. */
function reveal(delay = 0) {
  return {
    'data-reveal': '',
    style: { '--reveal-delay': `${delay}ms` } as React.CSSProperties,
  };
}

/**
 * Questions answered on the page itself. Native <details>, so every answer
 * is in the HTML for crawlers and answer engines, and works without JS.
 *
 * Laid out like the page's other content sections: the full content width,
 * heading on the left (it stays put while the list scrolls past on wide
 * screens), the questions as numbered rows in one bordered card on the right.
 * The first answer starts open so the section shows what an answer looks
 * like instead of reading as a bare list of links.
 */
export function FaqSection({
  eyebrow = 'Questions',
  title,
  intro,
  items,
}: {
  eyebrow?: string;
  title: string;
  /** A line under the heading */
  intro?: string;
  items: FaqItem[];
}) {
  return (
    <section className="border-t border-border/70">
      <div className="mx-auto grid max-w-6xl gap-x-14 gap-y-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div {...reveal()} className="lg:sticky lg:top-12 lg:self-start">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground antialiased">
            {eyebrow}
          </p>
          <h2 className="text-balance text-4xl font-bold uppercase leading-[0.95] tracking-tight antialiased sm:text-6xl">
            {title}
          </h2>
          {intro && (
            <p className="mt-4 max-w-sm text-pretty text-muted-foreground antialiased sm:text-lg">{intro}</p>
          )}
          <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground antialiased">
            {String(items.length).padStart(2, '0')} questions
          </p>
        </div>

        <div
          {...reveal(70)}
          className="divide-y divide-border/70 overflow-hidden rounded-xl border border-border/70 bg-card"
        >
          {items.map(({ q, a, link }, i) => (
            // faq-item: the answer's height animates open where the browser can
            // do it (see globals.css). The padding is on the summary, not the
            // row, so the whole band is the tap target.
            <details key={q} open={i === 0} className="faq-item group">
              <summary className="grid cursor-pointer touch-manipulation list-none grid-cols-[2rem_minmax(0,1fr)_auto] items-start gap-x-3 px-5 py-5 transition-colors duration-150 marker:hidden hover:bg-muted/50 sm:grid-cols-[2.75rem_minmax(0,1fr)_auto] sm:gap-x-4 sm:px-7 sm:py-6 [&::-webkit-details-marker]:hidden">
                <span
                  className="pt-1 font-mono text-xs tabular-nums text-muted-foreground antialiased transition-colors duration-200 group-open:text-foreground sm:pt-1.5 sm:text-sm"
                  aria-hidden="true"
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="text-pretty text-lg font-semibold leading-snug antialiased sm:text-xl">{q}</h3>
                {/* Plus turns to a cross on lime when the row is open. */}
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-[transform,background-color,border-color,color] duration-200 ease-out-strong group-hover:border-foreground/30 group-hover:text-foreground group-open:rotate-45 group-open:border-brand group-open:bg-brand group-open:text-brand-foreground"
                  aria-hidden="true"
                >
                  <Plus className="h-4 w-4" strokeWidth={2.25} />
                </span>
              </summary>
              <div className="grid grid-cols-[2rem_minmax(0,1fr)_auto] gap-x-3 px-5 pb-6 sm:grid-cols-[2.75rem_minmax(0,1fr)_auto] sm:gap-x-4 sm:px-7 sm:pb-7">
                <p className="col-[2/4] -mt-1 max-w-xl text-pretty sm:col-[2/3] text-muted-foreground antialiased sm:text-lg">
                  {a}
                  {link && (
                    <>
                      {' '}
                      <Link
                        href={link.href}
                        className="font-medium text-foreground underline decoration-foreground/30 underline-offset-4 transition-colors hover:decoration-foreground active:decoration-foreground"
                      >
                        {link.label}
                      </Link>
                    </>
                  )}
                </p>
                {/* From sm up, keeps the answer clear of the toggle's column. On a
                    phone the answer takes that width back. */}
                <span className="hidden w-8 sm:block" aria-hidden="true" />
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
