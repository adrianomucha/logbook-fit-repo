'use client';

import { AlertTriangle } from 'lucide-react';

/**
 * The one way form errors look: a tinted card with an icon instead of a bare
 * red line, so failures read as part of the interface rather than a browser
 * accident. Children may include inline links (e.g. "sign in instead").
 *
 * The dark: overrides matter: --destructive in dark scopes is a 30%-lightness
 * red tuned for button FILLS, unreadable as text on black. Inside a `dark`
 * section (landing CTA, AuthShell panel) the card swaps to a light red that
 * clears WCAG AA on near-black.
 */
export function FormError({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3.5 animate-fade-in-up dark:border-red-400/30 dark:bg-red-500/10"
    >
      <AlertTriangle
        className="mt-0.5 h-4 w-4 shrink-0 text-destructive dark:text-red-300"
        aria-hidden="true"
      />
      <p className="text-sm leading-relaxed text-destructive antialiased dark:text-red-300">
        {children}
      </p>
    </div>
  );
}
