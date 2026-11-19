'use client';

import type { ReactNode } from 'react';
import { formatCallTime } from '@/lib/setup-call';
import { SETUP_CALL_PREP } from '@/lib/landing-copy';

export interface SetupCallBooking {
  /** ISO start time */
  startTime: string;
}

/**
 * The confirmation card once the setup call is booked: when it is, that the
 * invite is on its way, and what to do before the call (create the account
 * and import their program with the in-app importer).
 */
export function SetupCallBooked({
  header,
  email,
  booking,
}: {
  header: ReactNode;
  email: string;
  booking: SetupCallBooking;
}) {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const when = formatCallTime(new Date(booking.startTime), timeZone);

  return (
    <div
      role="status"
      className="overflow-hidden rounded-2xl bg-brand text-left text-brand-foreground animate-fade-in-up"
    >
      <div className="p-6 sm:p-7">
        {header}
        <p className="mt-4 text-sm leading-relaxed text-brand-foreground/80 antialiased">
          Your setup call is on{' '}
          <strong className="font-semibold text-brand-foreground">{when}</strong>. Your
          invite is on its way to {email}.
        </p>
        <p className="mt-3 text-sm font-medium leading-relaxed antialiased">
          {SETUP_CALL_PREP}
        </p>
      </div>
      <p className="bg-brand-foreground px-6 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-brand antialiased sm:px-7">
        Invite sent · See you on the call
      </p>
    </div>
  );
}
