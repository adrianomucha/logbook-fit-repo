import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCoachClientProfile } from '@/hooks/api/useCoachClientProfile';
import { useCheckIn, createCheckInForClient } from '@/hooks/api/useCheckIn';
import { apiFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ArrowLeft, Clock, CheckCircle2, ClipboardCheck, Send, Loader2,
} from 'lucide-react';
import { CoachNav } from '@/components/coach/CoachNav';
import { FieldLabel, FieldShell, StatusLine } from '@/components/coach/shared/formSurfaces';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { FEELING_DISPLAY } from '@/lib/feeling-display';
import { avatarColor } from '@/lib/avatar-colors';
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

  // Success screen
  if (showSuccess) {
    return (
      <PageShell>
        <Panel className="max-w-md mx-auto text-center py-12">
          <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-brand flex items-center justify-center animate-bounce-once">
            <CheckCircle2 className="w-8 h-8 text-brand-foreground" strokeWidth={2.5} />
          </div>
          <h2 className="text-2xl font-black tracking-tight mb-2 antialiased">Check-in closed</h2>
          <p className="text-sm text-muted-foreground mb-6 antialiased text-pretty">
            {clientName} has your response. It lands in their chat right away.
          </p>
          <div className="space-y-2">
            <Button onClick={handleBack} className="w-full h-11 rounded-xl">
              Back to {clientName}&apos;s profile
            </Button>
            <Button variant="outline" onClick={() => router.push('/coach')} className="w-full h-11 rounded-xl">
              Back to dashboard
            </Button>
          </div>
        </Panel>
      </PageShell>
    );
  }

  // Previous completed check-ins (from client detail)
  const completedCheckIns = client.checkIns
    .filter((c) => c.status === 'COMPLETED')
    .slice(0, 3);

  // State C: No active check-in
  if (!activeCheckIn && !activeCheckInId) {
    return (
      <PageShell>
        <CheckInHeader
          clientName={clientName}
          onBack={handleBack}
          status={<StatusLine tone="idle">No open check-in</StatusLine>}
        />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6 items-start">
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
          <Rail>
            <PreviousCheckInsList checkIns={completedCheckIns} />
          </Rail>
        </div>
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
          onBack={handleBack}
          status={<StatusLine tone="idle" pulse>Check-in · waiting on their answer</StatusLine>}
        />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6 items-start">
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
          <Rail>
            <RecentCompletionsList completions={client.completions} />
            <PreviousCheckInsList checkIns={completedCheckIns} />
          </Rail>
        </div>
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
        onBack={handleBack}
        status={<StatusLine>Check-in · answered {submittedAgo}</StatusLine>}
      />

      {/* Explicit placement keeps the reading order right in both directions:
          stacked, context sits between their words and the reply box; on
          desktop it moves to the rail and the reply stays under their words */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6 items-start">
        {/* Their answer — the reason the page exists, so it gets the room */}
        <section className="lg:col-start-1 rounded-2xl border border-border bg-muted/40 px-5 py-5 sm:px-7 sm:py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {effortDisplay && (
              <SignalTile label="Workouts felt" display={effortDisplay} />
            )}
            {feelingDisplay && (
              <SignalTile label="Body feels" display={feelingDisplay} />
            )}
          </div>

          {activeCheckIn?.painBlockers ? (
            <blockquote className="mt-5 border-l-2 border-brand pl-4 sm:pl-5">
              <p className="text-lg sm:text-xl font-medium leading-relaxed tracking-tight text-pretty antialiased">
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

        {/* Training context — reference material, so it sits in the rail */}
        <Rail className="lg:col-start-2 lg:row-start-1 lg:row-span-2">
          <RecentCompletionsList
            completions={activeCheckIn?.client.completions ?? client.completions}
          />
          <PreviousCheckInsList checkIns={completedCheckIns} />
        </Rail>

        {/* Your reply */}
        <div className="lg:col-start-1 space-y-3">
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
              className="min-h-[148px] resize-none border-0 bg-transparent px-4 pb-3.5 pt-2 text-base sm:text-[15px] leading-relaxed focus-visible:ring-0 focus-visible:ring-offset-0"
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
      <div className="max-w-6xl mx-auto space-y-5 sm:space-y-6 px-3 pt-4 sm:px-4 sm:pt-7">
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

/** Reference column: full-width when stacked, sticky rail on desktop */
function Rail({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <aside className={cn('space-y-4 lg:self-start lg:sticky lg:top-4', className)}>
      {children}
    </aside>
  );
}

function CheckInHeader({
  clientName,
  onBack,
  status,
}: {
  clientName: string;
  onBack: () => void;
  status: React.ReactNode;
}) {
  return (
    <header className="flex items-center gap-3">
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="h-9 w-9 p-0 shrink-0 -ml-1.5"
        aria-label="Back to profile"
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <div
        className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 select-none',
          avatarColor(clientName)
        )}
        aria-hidden="true"
      >
        {clientName.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0">
        {status}
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-none antialiased truncate mt-1">
          {clientName}
        </h1>
      </div>
    </header>
  );
}

/* ── Inline sub-components ────────────────────────────────── */

/** One of the two ratings, sized to be scanned before the note is read */
function SignalTile({
  label,
  display,
}: {
  label: string;
  display: { label: string; emoji: string; text: string };
}) {
  return (
    <div className="rounded-xl border border-border bg-background px-4 py-3">
      <FieldLabel>{label}</FieldLabel>
      <p className={cn('mt-1.5 text-base font-bold tracking-tight antialiased', display.text)}>
        <span className="mr-1.5 text-lg" aria-hidden="true">{display.emoji}</span>
        {display.label}
      </p>
    </div>
  );
}

/** Rail card wrapper — quieter than the main column by design */
function RailCard({ title, count, children }: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/70 bg-card px-4 py-4 sm:px-5">
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <FieldLabel>{title}</FieldLabel>
        {count != null && (
          <span className="font-mono text-[10px] tabular-nums text-muted-foreground/50">
            {count}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

function RecentCompletionsList({ completions }: {
  completions: {
    id: string;
    completedAt: string | null;
    completionPct: number | null;
    effortRating: string | null;
    day: { name: string | null } | null;
  }[];
}) {
  // This list is finished-workouts context only; in-progress rows from the
  // client detail payload have no completion date to show
  const finished = completions.filter((c) => c.completedAt);
  if (finished.length === 0) return null;

  return (
    <RailCard title="Recent workouts" count={finished.length}>
      <ul className="divide-y divide-border/60">
        {finished.map((c) => {
          const effort = c.effortRating ? FEELING_DISPLAY[c.effortRating] : null;
          // A finished session is the norm; only a short one is worth a callout
          const shortfall = c.completionPct != null && c.completionPct < 100
            ? Math.round(c.completionPct)
            : null;
          return (
            <li key={c.id} className="flex items-center gap-3 py-2.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-brand shrink-0" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate antialiased">
                  {c.day?.name ?? 'Workout'}
                </p>
                {shortfall != null && (
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70 tabular-nums">
                    {shortfall}% done
                  </p>
                )}
              </div>
              {effort && (
                <span className="shrink-0 text-sm" title={effort.label} aria-label={effort.label}>
                  {effort.emoji}
                </span>
              )}
              {c.completedAt && (
                <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground tabular-nums">
                  {format(new Date(c.completedAt), 'MMM d')}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </RailCard>
  );
}

function PreviousCheckInsList({ checkIns }: {
  checkIns: {
    id: string;
    status: string;
    effortRating: string | null;
    createdAt: string;
    completedAt: string | null;
  }[];
}) {
  if (checkIns.length === 0) return null;

  return (
    <RailCard title="Previous check-ins" count={checkIns.length}>
      <ul className="divide-y divide-border/60">
        {checkIns.map((checkIn) => {
          const effort = checkIn.effortRating ? FEELING_DISPLAY[checkIn.effortRating] : null;
          return (
            <li key={checkIn.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                {effort ? (
                  <p className={cn('text-sm font-medium truncate antialiased', effort.text)}>
                    <span className="mr-1.5" aria-hidden="true">{effort.emoji}</span>
                    {effort.label}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground antialiased">No rating</p>
                )}
              </div>
              <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground tabular-nums">
                {format(new Date(checkIn.completedAt || checkIn.createdAt), 'MMM d')}
              </span>
            </li>
          );
        })}
      </ul>
    </RailCard>
  );
}
