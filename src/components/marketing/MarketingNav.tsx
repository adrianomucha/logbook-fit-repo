'use client';

import Link from 'next/link';
import { LogoMark } from '@/components/brand/LogoMark';

const LINKS = [
  { href: '#problem', label: 'How it works' },
  { href: '#loop', label: 'The loop' },
  { href: '#features', label: 'For coaches' },
  { href: '#faq', label: 'FAQ' },
];

export function MarketingNav() {
  function scrollTo(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    const id = href.replace('#', '');
    const el = document.getElementById(id);
    if (!el) return; // let the browser fall back to the hash
    e.preventDefault();
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    history.replaceState(null, '', href);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <nav
        aria-label="Primary"
        className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8"
      >
        <a
          href="#top"
          onClick={(e) => scrollTo(e, '#top')}
          className="flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <LogoMark size={26} />
          <span className="font-heading text-lg font-bold tracking-tight text-foreground">
            Logbook<span className="text-muted-foreground/60">.fit</span>
          </span>
        </a>

        <div className="hidden items-center gap-7 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={(e) => scrollTo(e, l.href)}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline"
          >
            Sign in
          </Link>
          <a
            href="#top"
            onClick={(e) => scrollTo(e, '#top')}
            className="tap-target inline-flex h-9 items-center justify-center rounded-full bg-brand px-4 text-sm font-semibold text-brand-foreground transition-[background-color,transform] hover:bg-brand/90 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <span className="sm:hidden">Early access</span>
            <span className="hidden sm:inline">Request early access</span>
          </a>
        </div>
      </nav>
    </header>
  );
}
