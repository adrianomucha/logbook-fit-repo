'use client';

import { useState } from 'react';
import { Check, Copy, FlaskConical, Loader2, Plus, UserPlus, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QUICK_START_EXERCISES } from '@/lib/quick-start-exercises';
import type { CoachInvite } from '@/types/api';

interface GettingStartedCardProps {
  /** Time-of-day greeting — doubles as the brand kicker on this screen */
  greeting: string;
  /** Coach has uploaded a profile photo */
  hasPhoto: boolean;
  /** Coach has written a bio */
  hasBio: boolean;
  /** Coach has at least one plan template */
  hasPlan: boolean;
  /** Name of the first plan, shown in the done state */
  planName?: string;
  /** Latest still-shareable invite, if any */
  pendingInvite: CoachInvite | null;
  /** Latest invite expired without being used (and none pending) */
  lastInviteExpired: boolean;
  onSetUpProfile: () => void;
  onCreatePlan: () => void;
  onInviteClient: () => void;
  onAddSampleClient: () => void;
  isAddingSample: boolean;
}

function daysUntil(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
}

/**
 * First-session guide shown on the coach dashboard while the roster is empty.
 * Walks the coach from a stocked library, past the profile their invite
 * leads with, to a sent invite — the activation moment when Logbook starts
 * working for them.
 *
 * Laid out as two rails rather than one tall card: the brand statement on the
 * left, the checklist on the right. That keeps the whole screen inside the
 * viewport on a laptop (no scroll to reach the last step) and fills the space
 * a single centred column left empty.
 */
export function GettingStartedCard({
  greeting,
  hasPhoto,
  hasBio,
  hasPlan,
  planName,
  pendingInvite,
  lastInviteExpired,
  onSetUpProfile,
  onCreatePlan,
  onInviteClient,
  onAddSampleClient,
  isAddingSample,
}: GettingStartedCardProps) {
  const [copied, setCopied] = useState(false);

  const inviteSent = !!pendingInvite;
  // Either one clears the step: a coach who'd rather not post a photo still
  // gets a full tick for the bio, instead of a nag they can never dismiss
  const profileSet = hasPhoto || hasBio;
  const fullInviteLink =
    pendingInvite?.inviteLink && typeof window !== 'undefined'
      ? `${window.location.origin}${pendingInvite.inviteLink}`
      : '';

  const handleCopy = async () => {
    if (!fullInviteLink) return;
    try {
      await navigator.clipboard.writeText(fullInviteLink);
    } catch {
      const input = document.createElement('input');
      input.value = fullInviteLink;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const steps: {
    key: string;
    done: boolean;
    title: React.ReactNode;
    body: React.ReactNode;
    action?: React.ReactNode;
  }[] = [
    {
      key: 'library',
      done: true,
      title: 'Exercise library stocked',
      body: `${QUICK_START_EXERCISES.length} common movements, ready to drop into any plan. Add your own anytime.`,
    },
    {
      key: 'profile',
      done: profileSet,
      title: profileSet
        ? hasPhoto && hasBio
          ? 'Photo and bio added'
          : hasPhoto
            ? 'Photo added'
            : 'Bio added'
        : 'Add your photo and bio',
      // The invite page leads with the coach — a face and a line about how
      // they coach is what a prospective client reads before they commit
      body: profileSet
        ? 'Invited clients see it before they sign up, and in chat after.'
        : 'Your invite page opens with them. A face and one line about how you coach — under a minute.',
      action: !profileSet && (
        <Button
          variant="outline"
          size="sm"
          onClick={onSetUpProfile}
          className="active:scale-[0.96] transition-transform duration-150"
        >
          <UserRound className="w-4 h-4 mr-1.5" />
          Set up profile
        </Button>
      ),
    },
    {
      key: 'plan',
      done: hasPlan,
      title: hasPlan ? (
        <>
          First plan created{planName ? <>: <span className="text-foreground">{planName}</span></> : ''}
        </>
      ) : (
        'Build your first plan'
      ),
      body: hasPlan
        ? 'Ready to assign the moment a client joins.'
        : 'Design the template once, then assign it to everyone who needs it.',
      action: !hasPlan && (
        <Button
          variant="outline"
          size="sm"
          onClick={onCreatePlan}
          className="active:scale-[0.96] transition-transform duration-150"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Create a plan
        </Button>
      ),
    },
    {
      key: 'invite',
      done: inviteSent,
      title: inviteSent ? 'Invite link ready' : 'Invite your first client',
      // No "share the link with your client" here — the Copy link button
      // directly below already says it, and the line cost the card a whole row
      body: inviteSent ? (
        <>
          {pendingInvite?.email && (
            <>
              Waiting on{' '}
              <span className="font-medium text-foreground">{pendingInvite.email}</span>
              {' · '}
            </>
          )}
          {pendingInvite?.email ? 'expires' : 'Expires'} in{' '}
          {daysUntil(pendingInvite!.expiresAt)}{' '}
          {daysUntil(pendingInvite!.expiresAt) === 1 ? 'day' : 'days'}. They&apos;ll
          appear here the moment they sign up.
        </>
      ) : lastInviteExpired ? (
        'Your last invite expired (links last 7 days). Send a fresh one.'
      ) : (
        'Send a link, they sign up, and they’re connected to you instantly.'
      ),
      action: inviteSent ? (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="active:scale-[0.96] transition-transform duration-150"
          >
            {copied ? <Check className="w-4 h-4 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}
            {copied ? 'Copied!' : 'Copy link'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onInviteClient}
            className="text-muted-foreground"
          >
            New invite
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          onClick={onInviteClient}
          className="active:scale-[0.96] transition-transform duration-150"
        >
          <UserPlus className="w-4 h-4 mr-1.5" />
          Invite client
        </Button>
      ),
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  // The one move that matters right now — filled dark while the rest stay outlined
  const nextIndex = steps.findIndex((s) => !s.done);

  // The subtracted height is the nav (3rem + its 1px hairline) plus this page's
  // own top and bottom padding, so the composition centres in exactly the space
  // left under the header — and the page never gains a scrollbar for one pixel.
  return (
    <section className="lg:flex lg:min-h-[calc(100dvh-6.5rem-1px)] lg:items-center">
      {/* Capped and centred above lg: left to fill a 7xl container the two
          rails drift apart until they read as two unrelated blocks */}
      <div className="grid w-full gap-5 sm:gap-7 lg:mx-auto lg:max-w-[68rem] lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:items-center lg:gap-x-12 lg:gap-y-8 xl:gap-x-16">
        {/* Brand rail — the reason the checklist is worth finishing */}
        <div className="max-w-md lg:col-start-1 lg:row-start-1">
          <p className="mb-3 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground antialiased sm:mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />
            {greeting}
          </p>
          {/* Display type from the marketing site, brought in-app for the one
              screen that is pure first impression. Volt sits behind the payoff
              word as a fill — dark-on-volt, never volt text on white. */}
          <h1 className="text-[clamp(1.7rem,3.4vw,2.75rem)] font-bold uppercase leading-[0.95] tracking-tight antialiased">
            Get your first
            <br />
            client on your{' '}
            <span className="inline-block bg-brand px-1.5 text-brand-foreground">
              radar
            </span>
          </h1>
          <p className="mt-4 text-sm text-muted-foreground antialiased sm:mt-5 sm:text-base">
            Logbook ranks your roster by who needs attention. It starts working
            the moment your first client joins.
          </p>
        </div>

        {/* Checklist rail */}
        <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-16px_rgba(0,0,0,0.16)] sm:p-6 lg:col-start-2 lg:row-start-1 lg:row-span-2">
          {/* Setup progress as a volt rail on the card's top edge */}
          <span className="absolute inset-x-0 top-0 h-[3px] bg-border/70" aria-hidden="true">
            <span
              className="block h-full bg-brand transition-[width] duration-500 ease-out"
              style={{ width: `${(doneCount / steps.length) * 100}%` }}
            />
          </span>

          <div className="mb-4 flex items-baseline justify-between gap-3 sm:mb-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground antialiased">
              Setup
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] tabular-nums text-muted-foreground antialiased">
              {doneCount} / {steps.length} done
            </p>
          </div>

          <ol>
            {steps.map((step, i) => (
              <li key={step.key} className="relative flex gap-3.5 pb-4 last:pb-0 sm:pb-5">
                {/* Spine between markers — volt once the step above is cleared */}
                {i < steps.length - 1 && (
                  <span
                    className={`absolute left-[13.5px] top-8 bottom-1 w-px ${
                      step.done ? 'bg-brand/45' : 'bg-border'
                    }`}
                    aria-hidden="true"
                  />
                )}
                <span
                  className={
                    step.done
                      ? 'z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand'
                      : i === nextIndex
                        ? 'z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground font-mono text-[11px] font-bold tabular-nums text-background'
                        : 'z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-border bg-card font-mono text-[11px] font-bold tabular-nums text-muted-foreground'
                  }
                  aria-hidden="true"
                >
                  {step.done ? (
                    <Check className="h-4 w-4 text-brand-foreground" strokeWidth={3} />
                  ) : (
                    i + 1
                  )}
                </span>
                <div className="min-w-0 pt-0.5">
                  <p
                    className={`text-sm font-semibold antialiased ${
                      step.done ? 'text-muted-foreground' : 'text-foreground'
                    }`}
                  >
                    {/* The tick and the numeral are decorative, so the state
                        they carry has to reach a screen reader some other way */}
                    <span className="sr-only">{step.done ? 'Done: ' : 'To do: '}</span>
                    {step.title}
                  </p>
                  <p className="mt-0.5 text-[13px] leading-[1.5] text-muted-foreground/80 antialiased sm:leading-relaxed">
                    {step.body}
                  </p>
                  {step.action && <div className="mt-2.5">{step.action}</div>}
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Sample-client escape hatch — feel the product before anyone joins */}
        <div className="max-w-md rounded-xl border border-dashed border-border bg-muted/30 p-3.5 sm:p-4 lg:col-start-1 lg:row-start-2">
          <p className="text-[13px] leading-[1.5] text-muted-foreground antialiased sm:leading-relaxed">
            Want to see it working first? Add a demo client with a week of
            training and a check-in to review. Remove them anytime.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={onAddSampleClient}
            disabled={isAddingSample}
            className="mt-3 active:scale-[0.96] transition-transform duration-150"
          >
            {isAddingSample ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <FlaskConical className="w-4 h-4 mr-1.5" />
            )}
            {isAddingSample ? 'Setting up…' : 'Try a sample client'}
          </Button>
        </div>
      </div>
    </section>
  );
}
