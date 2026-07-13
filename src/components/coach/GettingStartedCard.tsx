'use client';

import { useState } from 'react';
import { Check, Copy, FlaskConical, Loader2, Plus, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QUICK_START_EXERCISES } from '@/lib/quick-start-exercises';
import type { CoachInvite } from '@/types/api';

interface GettingStartedCardProps {
  /** Coach has at least one plan template */
  hasPlan: boolean;
  /** Name of the first plan, shown in the done state */
  planName?: string;
  planEmoji?: string;
  /** Latest still-shareable invite, if any */
  pendingInvite: CoachInvite | null;
  /** Latest invite expired without being used (and none pending) */
  lastInviteExpired: boolean;
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
 * Walks the coach from a stocked library to a sent invite — the activation
 * moment when Logbook starts working for them.
 */
export function GettingStartedCard({
  hasPlan,
  planName,
  planEmoji,
  pendingInvite,
  lastInviteExpired,
  onCreatePlan,
  onInviteClient,
  onAddSampleClient,
  isAddingSample,
}: GettingStartedCardProps) {
  const [copied, setCopied] = useState(false);

  const inviteSent = !!pendingInvite;
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
      title: 'Your exercise library is stocked',
      body: `${QUICK_START_EXERCISES.length} common movements are loaded and ready to drop into any plan. Add your own anytime.`,
    },
    {
      key: 'plan',
      done: hasPlan,
      title: hasPlan ? (
        <>
          First plan created{planName ? <> — {planEmoji ? `${planEmoji} ` : ''}<span className="text-foreground">{planName}</span></> : ''}
        </>
      ) : (
        'Build your first plan'
      ),
      body: hasPlan
        ? 'Ready to assign the moment a client joins.'
        : 'Design the template once — assign it to every client who needs it.',
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
      body: inviteSent ? (
        <>
          {pendingInvite?.email ? (
            <>Waiting on <span className="text-foreground font-medium">{pendingInvite.email}</span></>
          ) : (
            'Share the link with your client'
          )}
          {' · '}expires in {daysUntil(pendingInvite!.expiresAt)}{' '}
          {daysUntil(pendingInvite!.expiresAt) === 1 ? 'day' : 'days'}. They&apos;ll
          appear right here the moment they sign up.
        </>
      ) : lastInviteExpired ? (
        'Your last invite expired — links last 7 days. Send a fresh one.'
      ) : (
        'Send a link, they sign up, and they’re connected to you instantly.'
      ),
      action: inviteSent ? (
        <div className="flex gap-2">
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

  return (
    <section className="max-w-2xl mx-auto rounded-2xl border border-border/70 bg-card px-5 py-6 sm:px-8 sm:py-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-2 antialiased flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-brand" aria-hidden="true" />
        Getting started
      </p>
      <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-1.5 antialiased">
        Get your first client on your radar
      </h2>
      <p className="text-sm text-muted-foreground mb-6 sm:mb-8 antialiased">
        Logbook ranks your roster by who needs attention — it starts working the
        moment your first client joins.
      </p>

      <ol className="space-y-5 sm:space-y-6">
        {steps.map((step, i) => (
          <li key={step.key} className="flex gap-3.5 sm:gap-4">
            <div
              className={
                step.done
                  ? 'w-7 h-7 shrink-0 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center'
                  : 'w-7 h-7 shrink-0 rounded-full border-2 border-border flex items-center justify-center'
              }
              aria-hidden="true"
            >
              {step.done ? (
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" strokeWidth={3} />
              ) : (
                <span className="text-xs font-bold text-muted-foreground tabular-nums">{i + 1}</span>
              )}
            </div>
            <div className="min-w-0 pt-0.5">
              <p
                className={`text-sm font-semibold antialiased ${
                  step.done ? 'text-muted-foreground' : 'text-foreground'
                }`}
              >
                {step.title}
              </p>
              <p className="text-sm text-muted-foreground/80 mt-0.5 antialiased">
                {step.body}
              </p>
              {step.action && <div className="mt-2.5">{step.action}</div>}
            </div>
          </li>
        ))}
      </ol>

      {/* Sample-client escape hatch — feel the product before anyone joins */}
      <div className="mt-6 sm:mt-8 pt-5 border-t border-border/60 flex flex-col sm:flex-row sm:items-center gap-3">
        <p className="text-sm text-muted-foreground antialiased flex-1">
          Want to see it working first? Add a demo client with a week of
          training and a check-in to review — remove them anytime.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={onAddSampleClient}
          disabled={isAddingSample}
          className="shrink-0 active:scale-[0.96] transition-transform duration-150"
        >
          {isAddingSample ? (
            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
          ) : (
            <FlaskConical className="w-4 h-4 mr-1.5" />
          )}
          {isAddingSample ? 'Setting up…' : 'Try a sample client'}
        </Button>
      </div>
    </section>
  );
}
