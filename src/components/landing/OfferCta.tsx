import Link from 'next/link';
import { Check } from 'lucide-react';
import { WaitlistForm } from '@/components/landing/WaitlistForm';
import type { Offer } from '@/lib/offer';

/**
 * The public pages' call to action, whichever the offer is: the waitlist
 * form while coach signup is invite-only, a way straight into signup once it
 * is open. Same footprint either way, so the pages around it do not change.
 */
export function OfferCta({
  offer,
  campaign,
  showPromises = false,
}: {
  offer: Offer;
  /** Tags waitlist signups from this page, see WaitlistForm */
  campaign?: string;
  /** The hero shows the reassurances; the closing section does not */
  showPromises?: boolean;
}) {
  const promises = showPromises ? offer.copy.promises : undefined;

  if (offer.mode === 'waitlist') {
    return <WaitlistForm campaign={campaign} promises={promises} />;
  }

  return (
    <div className="space-y-2 text-center">
      <Link
        href="/signup"
        className="flex h-11 w-full items-center justify-center rounded-md bg-brand px-6 text-sm font-bold uppercase tracking-wider text-brand-foreground antialiased transition-[background-color,transform] duration-150 ease-out-strong hover:bg-brand/90 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        Create your coach account
      </Link>
      {promises && (
        <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 pt-2 text-sm text-muted-foreground antialiased">
          {promises.map((promise) => (
            <li key={promise} className="flex items-center gap-1.5 whitespace-nowrap">
              <Check className="h-3.5 w-3.5 shrink-0 text-brand" strokeWidth={3} aria-hidden="true" />
              {promise}
            </li>
          ))}
        </ul>
      )}
      <p className="text-balance text-xs text-muted-foreground/80 antialiased">
        Already coaching here?{' '}
        <Link href="/login" className="underline underline-offset-2 transition-colors hover:text-foreground">
          Sign in
        </Link>
        . Training with a coach? Use the invite link they sent you.
      </p>
    </div>
  );
}
