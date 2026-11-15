import Link from 'next/link';
import { cn } from '@/lib/utils';

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

/**
 * Questions answered on the page itself. Native <details>, so every answer
 * is in the HTML for crawlers and answer engines, and works without JS.
 */
export function FaqSection({
  eyebrow = 'Questions',
  title,
  items,
  centered = false,
}: {
  eyebrow?: string;
  title: string;
  items: FaqItem[];
  /** Centre the heading, for a page whose neighbouring sections are centred */
  centered?: boolean;
}) {
  return (
    <section className="border-t border-border/70">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
        <p className={cn('mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground antialiased', centered && 'text-center')}>
          {eyebrow}
        </p>
        <h2 className={cn('text-balance text-3xl font-bold uppercase leading-[0.95] tracking-tight antialiased sm:text-5xl', centered && 'text-center')}>
          {title}
        </h2>
        <div className="mt-10 divide-y divide-border/70 border-y border-border/70">
          {items.map(({ q, a, link }) => (
            // faq-item: the answer's height animates open where the browser can
            // do it (see globals.css). The padding is on the summary, not the
            // row, so the whole band is the tap target.
            <details key={q} className="faq-item group">
              <summary className="flex cursor-pointer touch-manipulation list-none items-start justify-between gap-6 py-5 text-base font-semibold antialiased marker:hidden [&::-webkit-details-marker]:hidden sm:text-lg">
                <h3>{q}</h3>
                <span
                  className="mt-1 font-mono text-lg leading-none text-muted-foreground transition-[transform,color] duration-200 ease-out-strong group-open:rotate-45 group-open:text-foreground"
                  aria-hidden="true"
                >
                  +
                </span>
              </summary>
              <p className="-mt-2 max-w-2xl pb-5 text-pretty text-muted-foreground antialiased">
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
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
