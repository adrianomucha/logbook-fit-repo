'use client';

import { useCallback } from 'react';
import { CalendarClock, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCoachSetupCall } from '@/hooks/api/useCoachSetupCall';
import { useSetupCallWidget } from '@/components/landing/useSetupCallWidget';
import type { SetupCallBooking } from '@/components/landing/SetupCallBooked';
import { SETUP_CALL_DASHBOARD, formatCallTime, setupCallLink } from '@/lib/setup-call';

/**
 * The getting-started screen's setup call: "Book your setup call" with the
 * same Cal.com popup as the waitlist, or the booked time once there is one.
 *
 * Mostly for coaches who signed up directly (open signup), who never saw the
 * waitlist's booking step; a beta coach invited by hand without booking sees
 * it too, and one who booked from the waitlist sees their time.
 *
 * Shows nothing when no booking link is configured, while loading (so the
 * column doesn't jump), or once the call is in the past. A cancelled call
 * brings the prompt back.
 */
export function SetupCallPrompt({ email }: { email: string }) {
  const link = setupCallLink();
  const { call, loaded, mutate } = useCoachSetupCall(Boolean(link));

  const startsAt = call?.status === 'BOOKED' ? new Date(call.startsAt) : null;
  const upcoming = startsAt !== null && startsAt.getTime() > Date.now();
  const past = startsAt !== null && !upcoming;

  // Shown straight away; the webhook's record replaces it on the next fetch
  const onBooked = useCallback(
    (booking: SetupCallBooking) => {
      mutate({ call: { status: 'BOOKED', startsAt: booking.startTime } }, { revalidate: false });
    },
    [mutate]
  );
  const openBooking = useSetupCallWidget({
    link,
    email,
    enabled: Boolean(link) && loaded && !upcoming && !past,
    onBooked,
  });

  if (!link || !loaded || past) return null;

  if (upcoming && startsAt) {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return (
      <div className="rounded-xl border border-border bg-card p-3.5 sm:p-4">
        <p className="flex items-center gap-1.5 text-sm font-semibold antialiased">
          <Check className="h-4 w-4 shrink-0 text-brand-foreground/70" strokeWidth={3} aria-hidden="true" />
          {SETUP_CALL_DASHBOARD.bookedTitle}
        </p>
        <p className="mt-1 text-[13px] leading-[1.5] text-muted-foreground antialiased sm:leading-relaxed">
          <span className="font-medium text-foreground">{formatCallTime(startsAt, timeZone)}</span>.{' '}
          {SETUP_CALL_DASHBOARD.bookedBody}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-3.5 sm:p-4">
      <p className="text-sm font-semibold antialiased">{SETUP_CALL_DASHBOARD.title}</p>
      <p className="mt-1 text-[13px] leading-[1.5] text-muted-foreground antialiased sm:leading-relaxed">
        {SETUP_CALL_DASHBOARD.body}
      </p>
      <Button variant="outline" size="sm" onClick={openBooking} className="mt-3">
        <CalendarClock className="mr-1.5 h-4 w-4" />
        {SETUP_CALL_DASHBOARD.cta}
      </Button>
    </div>
  );
}
