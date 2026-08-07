'use client';

import { AlertTriangle } from 'lucide-react';

/**
 * The one way form errors look: a tinted card with an icon instead of a bare
 * red line, so failures read as part of the interface rather than a browser
 * accident. Children may include inline links (e.g. "sign in instead").
 */
export function FormError({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3.5 animate-fade-in-up"
    >
      <AlertTriangle
        className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
        aria-hidden="true"
      />
      <p className="text-sm leading-relaxed text-destructive antialiased">
        {children}
      </p>
    </div>
  );
}
