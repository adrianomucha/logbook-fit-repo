import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCoachClientProfile } from '@/hooks/api/useCoachClientProfile';
import { useCheckIn, createCheckInForClient } from '@/hooks/api/useCheckIn';
import { apiFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Check, Clock, ClipboardCheck, Send, Loader2,
} from 'lucide-react';
import { CoachNav } from '@/components/coach/CoachNav';
import { FieldLabel, FieldShell, StatusLine } from '@/components/coach/shared/formSurfaces';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { FEELING_DISPLAY } from '@/lib/feeling-display';
import { format, formatDistanceToNow } from 'date-fns';

const RESPONSE_MAX_LENGTH = 1000;

export function ClientCheckIn() {
  const params = useParams<{ clientId: string }>();
  const clientId = params?.clientId ?? null;
  const router = useRouter();

  const { client, isLoading: isClientLoading, refresh: refreshClient } = useCoachClientProfile(clientId);

  // Find the active (non-completed) check-in for this client
  const activeCheckInId = useMemo(() => {
    if (!client) return null;
    const active = client.checkIns.find(
      (c) => c.status === 'PENDING' || c.status === 'CLIENT_RESPONDED'
    );
    return active?.id ?? null;
  }, [client]);

  const {
    checkIn: activeCheckIn,
    isLoading: isCheckInLoading,
    submitCoachResponse,
  } = useCheckIn(activeCheckInId);

  const [coachResponse, setCoachResponse] = useState('');
  const [planAdjustment, setPlanAdjustment] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  // Stamped client-side when the server accepts the response, so the
  // confirmation can say when it happened rather than just that it did
  const [sentAt, setSentAt] = useState<Date | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const isLoading = isClientLoading || (activeCheckInId && isCheckInLoading);

  const clientName = client?.user.name ?? client?.user.email ?? 'Client';

  const handleBack = () => {
    router.push(`/coach/clients/${clientId}?tab=overview`);
  };

  const handleStartNewCheckIn = async () => {
    if (!clientId) return;
    setIsCreating(true);
    try {
      await createCheckInForClient(clientId);
      await refreshClient();
    } catch {
      toast.error('Failed to send check-in. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const handleWithdrawCheckIn = async () => {
    if (!activeCheckInId || isWithdrawing) return;
    setIsWithdrawing(true);
    try {
      await apiFetch(`/api/check-ins/${activeCheckInId}`, { method: 'DELETE' });
      toast.success('Check-in withdrawn');
      await refreshClient();
    } catch {
      toast.error('Couldn’t withdraw the check-in. They may have just responded.');
      await refreshClient();
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleCompleteCheckIn = async () => {
    if (!activeCheckIn || !coachResponse.trim()) return;
    setIsSubmitting(true);
    try {
      await submitCoachResponse({
        coachFeedback: coachResponse.trim(),
        planAdjustment,
      });
      setSentAt(new Date());
      setShowSuccess(true);
    } catch {
      toast.error('Failed to submit your response. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading
  if (isLoading) {
    return (
      <div className="min-h-dvh bg-background p-3 sm:p-4 flex items-center justify-center animate-enter">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Client not found
  if (!client) {
    return (
      <PageShell>
        <Panel className="max-w-md mx-auto text-center py-12">
          <div className="text-4xl select-none mb-4 animate-bounce-once">🔍</div>
          <h2 className="text-xl font-bold mb-2 tracking-tight antialiased">Can&apos;t find this client</h2>
          <p className="text-sm text-muted-foreground mb-5 antialiased">
            They may have been removed, or the link might be outdated.
          </p>
          <Button onClick={() => router.push('/coach/clients')} className="active:scale-[0.96] transition-transform duration-150">
            Back to Clients
          </Button>
        </Panel>
      </PageShell>
    );
  }

  // Success screen — a receipt, not a dead end. Same header and panel as the
  // review it just replaced, showing the words that were actually sent.
  if (showSuccess) {
    return (
      <PageShell>
        {/* The outcome is the headline here, not the client's name — this
            screen exists to say the thing went through */}
        <CheckInHeader
          clientName={clientName}
          title="Response sent"
          status={<StatusLine>Check-in · closed</StatusLine>}
        />

        <section className="rounded-2xl border border-border bg-muted/40 px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pb-5 border-b border-border/60">
            <span
              className="w-9 h-9 shrink-0 rounded-full bg-brand flex items-center justify-center animate-bounce-once"
              aria-hidden="true"
            >
              <Check className="w-5 h-5 text-brand-foreground" strokeWidth={3} />
            </span>
            <p className="text-base antialiased">
              <span className="font-bold tracking-tight">Delivered to {clientName}</span>
              {/* Coach feedback surfaces on the client's dashboard, not in chat */}
              <span className="text-muted-foreground"> · it&apos;s on their dashboard now</span>
            </p>
            {sentAt && (
              <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground tabular-nums antialiased">
                {format(sentAt, 'MMM d · h:mm a')}
              </span>
            )}
          </div>

          <FieldLabel className="mt-5">What you sent</FieldLabel>
          <blockquote className="mt-2 border-l-2 border-brand pl-4 sm:pl-5">
            <p className="max-w-[52ch] text-lg sm:text-xl font-medium leading-relaxed tracking-tight text-pretty antialiased">
              {coachResponse.trim()}
            </p>
          </blockquote>

          {planAdjustment && (
            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground antialiased">
              Flagged · you&apos;re adjusting the plan
            </p>
          )}
        </section>

        <div className="flex flex-wrap gap-3">
          <Button onClick={handleBack} className="h-11 rounded-xl px-5">
            Back to {clientName}&apos;s profile
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/coach')}
            className="h-11 rounded-xl px-5"
          >
            Dashboard
          </Button>
        </div>
      </PageShell>
    );
  }

  // Previous completed check-ins (from client detail). Passed whole — the
  // strip decides how many fit and reports what it left out.
  const completedCheckIns = client.checkIns.filter((c) => c.status === 'COMPLETED');

  // State C: No active check-in
  if (!activeCheckIn && !activeCheckInId) {
    return (
      <PageShell>
        <CheckInHeader
          clientName={clientName}
          status={<StatusLine tone="idle">No open check-in</StatusLine>}
        />
        <Panel className="text-center py-12">
          <ClipboardCheck className="w-10 h-10 mx-auto mb-4 text-muted-foreground/60" />
          <h2 className="text-xl font-bold tracking-tight mb-2 antialiased">Nothing to review yet</h2>
          <p className="text-sm text-muted-foreground mb-6 antialiased text-pretty max-w-sm mx-auto">
            Send a check-in to hear how {clientName} is training, then answer it here.
          </p>
          <Button onClick={handleStartNewCheckIn} disabled={isCreating} className="h-11 rounded-xl">
            {isCreating ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <ClipboardCheck className="w-4 h-4 mr-2" />
            )}
            Send check-in
          </Button>
        </Panel>
        <PreviousCheckInsRow checkIns={completedCheckIns} />
      </PageShell>
    );
  }

  // State A: Pending (waiting for client)
  if (activeCheckIn?.status === 'PENDING') {
    const sentAgo = formatDistanceToNow(new Date(activeCheckIn.createdAt), { addSuffix: true });

    return (
      <PageShell>
        <CheckInHeader
          clientName={clientName}
          status={<StatusLine tone="idle" pulse>Check-in · waiting on their answer</StatusLine>}
        />
        <Panel className="text-center py-12">
          <Clock className="w-10 h-10 mx-auto mb-4 text-muted-foreground/60" />
          <h2 className="text-xl font-bold tracking-tight mb-2 antialiased">
            Sent {sentAgo}
          </h2>
          <p className="text-sm text-muted-foreground antialiased text-pretty max-w-sm mx-auto">
            {clientName} hasn&apos;t answered yet. You&apos;ll see their response here the moment
            they do.
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-5 text-muted-foreground hover:text-destructive"
            disabled={isWithdrawing}
            onClick={handleWithdrawCheckIn}
          >
            {isWithdrawing ? 'Withdrawing…' : 'Withdraw check-in'}
          </Button>
        </Panel>
        <WorkoutStrip completions={client.completions} />
        <PreviousCheckInsRow checkIns={completedCheckIns} />
      </PageShell>
    );
  }

  // State B: Client responded — coach needs to review
  const effortDisplay = activeCheckIn?.effortRating
    ? FEELING_DISPLAY[activeCheckIn.effortRating]
    : null;
  const feelingDisplay = activeCheckIn?.clientFeeling
    ? FEELING_DISPLAY[activeCheckIn.clientFeeling]
    : null;
  const submittedAgo = activeCheckIn?.clientRespondedAt
    ? formatDistanceToNow(new Date(activeCheckIn.clientRespondedAt), { addSuffix: true })
    : 'recently';
  const hasResponse = !!coachResponse.trim();
  const canSend = hasResponse && !isSubmitting;

  return (
    <PageShell>
      <CheckInHeader
        clientName={clientName}
        status={<StatusLine>Check-in · answered {submittedAgo}</StatusLine>}
      />

      {/* One column, read top to bottom: what they said, what they did, what
          you say back. Context runs across as a strip rather than down a rail,
          so there are no two columns to end level with each other */}
      <div className="space-y-5 sm:space-y-6">
        {/* Their answer — the reason the page exists, so it gets the room */}
        <section className="rounded-2xl border border-border bg-muted/40 px-5 py-5 sm:px-7 sm:py-6">
          {/* Side by side at a fixed distance, not halves of the panel — at
              full width a two-column grid throws them 600px apart */}
          <div className="flex flex-col gap-4 sm:flex-row sm:gap-14 pb-5 border-b border-border/60">
            {effortDisplay && (
              <SignalTile label="Workouts felt" display={effortDisplay} />
            )}
            {feelingDisplay && (
              <SignalTile label="Body feels" display={feelingDisplay} />
            )}
          </div>

          {activeCheckIn?.painBlockers ? (
            <blockquote className="mt-5 border-l-2 border-brand pl-4 sm:pl-5">
              {/* The panel takes the full width; the sentence does not. At 52
                  characters the note breaks on sentence boundaries instead of
                  running long and leaving a two-word stub on the last line —
                  text-pretty then handles single-word orphans in longer notes. */}
              <p className="max-w-[52ch] text-lg sm:text-xl font-medium leading-relaxed tracking-tight text-pretty antialiased">
                {activeCheckIn.painBlockers}
              </p>
              <footer className="mt-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground antialiased">
                {clientName}
              </footer>
            </blockquote>
          ) : (
            <p className="mt-5 text-sm text-muted-foreground antialiased">
              No notes this time — just the ratings above.
            </p>
          )}
        </section>

        {/* Training context — a strip of tiles, so five sessions cost one row
            instead of a column of near-identical list items */}
        <WorkoutStrip completions={activeCheckIn?.client.completions ?? client.completions} />
        <PreviousCheckInsRow checkIns={completedCheckIns} />

        {/* Your reply */}
        <div className="space-y-3">
          <FieldShell
            label="Your response"
            htmlFor="coach-response"
            trailing={
              coachResponse.length >= RESPONSE_MAX_LENGTH - 200 ? (
                <span className="font-mono text-[10px] tabular-nums text-muted-foreground/50">
                  {coachResponse.length}/{RESPONSE_MAX_LENGTH}
                </span>
              ) : null
            }
          >
            <Textarea
              id="coach-response"
              placeholder={`Write back to ${clientName}…`}
              value={coachResponse}
              onChange={(e) => setCoachResponse(e.target.value.slice(0, RESPONSE_MAX_LENGTH))}
              rows={5}
              maxLength={RESPONSE_MAX_LENGTH}
              className="min-h-[120px] resize-none border-0 bg-transparent px-4 pb-3.5 pt-2 text-base sm:text-[15px] leading-relaxed focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </FieldShell>

          <label className="flex items-center gap-2.5 cursor-pointer w-fit">
            <Checkbox
              checked={planAdjustment}
              onCheckedChange={setPlanAdjustment}
            />
            <span className="text-sm text-muted-foreground antialiased">
              I&apos;ll adjust the plan based on this
            </span>
          </label>

          <div className="pt-1">
            <Button
              onClick={handleCompleteCheckIn}
              disabled={!canSend}
              className={cn(
                'w-full h-12 rounded-xl gap-2 text-sm font-bold uppercase tracking-wider transition-[background-color,transform] duration-150',
                // Volt is the reward for having written something — until then the
                // button sits quiet instead of looming as a dead coloured slab
                hasResponse
                  ? 'bg-brand text-brand-foreground hover:bg-brand/90 active:scale-[0.99]'
                  : 'bg-muted text-muted-foreground/70 hover:bg-muted disabled:opacity-100'
              )}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="w-4 h-4" aria-hidden="true" />
              )}
              {isSubmitting ? 'Sending' : 'Send and close'}
            </Button>
            {!coachResponse.trim() && (
              <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60 antialiased">
                Write a response to close this check-in
              </p>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}

/* ── Page furniture ───────────────────────────────────────── */

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background pb-8 sm:pb-4">
      <CoachNav activeTab="clients" />
      {/* Same container as CoachNav and every other coach page, so the page
          starts on the logotype's line and fills the frame. Only the prose
          inside caps its measure — the layout itself uses the full width. */}
      <div className="max-w-7xl mx-auto space-y-5 sm:space-y-6 px-3 pt-4 sm:px-4 sm:pt-7">
        {children}
      </div>
    </div>
  );
}

/** Plain bordered surface — used for the states that are a single message */
function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('rounded-2xl border border-border bg-card px-5 py-6 sm:px-7', className)}>
      {children}
    </div>
  );
}

/**
 * Section heading for the context strips — label left, tally right. When the
 * strip is showing fewer than exist, the tally says so rather than quietly
 * passing off five of seven as the whole story.
 */
function StripHeading({
  title,
  shown,
  total,
}: {
  title: string;
  shown: number;
  total: number;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2 mb-2 px-0.5">
      <FieldLabel>{title}</FieldLabel>
      <span className="font-mono text-[10px] tabular-nums text-muted-foreground/50">
        {shown < total ? `${shown} of ${total}` : total}
      </span>
    </div>
  );
}

function CheckInHeader({
  clientName,
  title,
  status,
}: {
  clientName: string;
  /** Overrides the h1 when the page's subject is an outcome, not the client */
  title?: string;
  status: React.ReactNode;
}) {
  return (
    <header className="min-w-0">
      {status}
      <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-none antialiased truncate mt-1">
        {title ?? clientName}
      </h1>
    </header>
  );
}

/* ── Inline sub-components ────────────────────────────────── */

/**
 * One of the two ratings. A readout, not a choice — so it is label and value,
 * with none of the box that would suggest there is something here to pick.
 */
function SignalTile({
  label,
  display,
}: {
  label: string;
  display: { label: string; emoji: string; text: string };
}) {
  return (
    <div className="min-w-0">
      <FieldLabel>{label}</FieldLabel>
      <p className={cn('mt-1 text-lg font-bold tracking-tight antialiased', display.text)}>
        <span className="mr-1.5" aria-hidden="true">{display.emoji}</span>
        {display.label}
      </p>
    </div>
  );
}

/**
 * Ruled columns, no boxes. Context here is read, never chosen — a card or a
 * pill would offer a tap that does nothing, so these are hairlines and type.
 */
const LEDGER =
  'flex flex-col divide-y divide-border/60 border-y border-border/60 sm:flex-row sm:divide-y-0 sm:divide-x';

/** What fits across this measure before entries start wrapping */
const MAX_WORKOUT_COLUMNS = 5;
const MAX_CHECKIN_COLUMNS = 3;

function WorkoutStrip({ completions }: {
  completions: {
    id: string;
    completedAt: string | null;
    completionPct: number | null;
    effortRating: string | null;
    day: { name: string | null } | null;
  }[];
}) {
  // This strip is finished-workouts context only; in-progress rows from the
  // client detail payload have no completion date to show. The client route
  // hands back up to ten, so cap the row at five and let the heading own up
  // to the ones it isn't showing.
  const finished = completions.filter((c) => c.completedAt);
  const shown = finished.slice(0, MAX_WORKOUT_COLUMNS);
  if (shown.length === 0) return null;

  return (
    <section>
      <StripHeading title="Recent workouts" shown={shown.length} total={finished.length} />
      <ul className={LEDGER}>
        {shown.map((c) => {
          const effort = c.effortRating ? FEELING_DISPLAY[c.effortRating] : null;
          // A finished session is the norm; only a short one is worth a callout
          const shortfall = c.completionPct != null && c.completionPct < 100
            ? Math.round(c.completionPct)
            : null;
          return (
            <li key={c.id} className="min-w-0 flex-1 py-2.5 sm:px-4 sm:first:pl-0 sm:last:pr-0">
              {/* Date and effort mark sit together rather than at opposite
                  edges, so a lone session doesn't strand them across the page */}
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground tabular-nums">
                  {c.completedAt ? format(new Date(c.completedAt), 'MMM d') : '—'}
                </span>
                {effort && (
                  <span className="text-sm shrink-0" title={effort.label} aria-label={effort.label}>
                    {effort.emoji}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm font-medium leading-snug antialiased line-clamp-2">
                {c.day?.name ?? 'Workout'}
              </p>
              {shortfall != null && (
                <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70 tabular-nums">
                  {shortfall}% done
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function PreviousCheckInsRow({ checkIns }: {
  checkIns: {
    id: string;
    status: string;
    effortRating: string | null;
    createdAt: string;
    completedAt: string | null;
  }[];
}) {
  const shown = checkIns.slice(0, MAX_CHECKIN_COLUMNS);
  if (shown.length === 0) return null;

  return (
    <section>
      <StripHeading title="Previous check-ins" shown={shown.length} total={checkIns.length} />
      <ul className={LEDGER}>
        {shown.map((checkIn) => {
          const effort = checkIn.effortRating ? FEELING_DISPLAY[checkIn.effortRating] : null;
          return (
            <li
              key={checkIn.id}
              className="min-w-0 flex items-center gap-2 py-2.5 sm:px-4 sm:first:pl-0 sm:last:pr-0"
            >
              {effort ? (
                <>
                  <span aria-hidden="true">{effort.emoji}</span>
                  <span className={cn('text-sm font-medium antialiased', effort.text)}>
                    {effort.label}
                  </span>
                </>
              ) : (
                <span className="text-sm text-muted-foreground antialiased">No rating</span>
              )}
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70 tabular-nums ml-auto sm:ml-1">
                {format(new Date(checkIn.completedAt || checkIn.createdAt), 'MMM d')}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
