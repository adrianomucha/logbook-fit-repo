import Link from 'next/link';

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
}: {
  eyebrow?: string;
  title: string;
  items: FaqItem[];
}) {
  return (
    <section className="border-t border-border/70">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground antialiased">
          {eyebrow}
        </p>
        <h2 className="text-balance text-3xl font-bold uppercase leading-[0.95] tracking-tight antialiased sm:text-5xl">
          {title}
        </h2>
        <div className="mt-10 divide-y divide-border/70 border-y border-border/70">
          {items.map(({ q, a, link }) => (
            <details key={q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-base font-semibold antialiased marker:hidden [&::-webkit-details-marker]:hidden sm:text-lg">
                <h3>{q}</h3>
                <span
                  className="mt-1 font-mono text-lg leading-none text-muted-foreground transition-[transform,color] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-open:rotate-45 group-open:text-foreground"
                  aria-hidden="true"
                >
                  +
                </span>
              </summary>
              {/* Opening a <details> flips its content from display:none, which
                  restarts this entrance each time; closing stays instant. */}
              <p className="animate-fade-in-up mt-3 max-w-2xl text-pretty text-muted-foreground antialiased [animation-duration:200ms]">
                {a}
                {link && (
                  <>
                    {' '}
                    <Link
                      href={link.href}
                      className="font-medium text-foreground underline decoration-foreground/30 underline-offset-4 transition-colors hover:decoration-foreground"
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
