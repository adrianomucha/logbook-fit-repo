import { UserAvatar } from '@/components/UserAvatar';
import { useState, useMemo, useRef, useEffect, ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCoachClientProfile } from '@/hooks/api/useCoachClientProfile';
import { useCheckIn, createCheckInForClient } from '@/hooks/api/useCheckIn';
import { usePlanDetail } from '@/hooks/api/usePlanDetail';
import { apiFetch } from '@/lib/api-client';
import type { ClientDetail } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Check, ChevronDown, ClipboardCheck, Flag, Loader2 } from 'lucide-react';
import { CoachNav } from '@/components/coach/CoachNav';
import { PageHeader } from '@/components/coach/PageHeader';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { FEELING_DISPLAY } from '@/lib/feeling-display';
import { getWorkoutDeviations, formatDeviation } from '@/lib/workout-deviations';
import { format, formatDistanceToNow, differenceInHours, subDays, startOfWeek, addWeeks, differenceInCalendarWeeks } from 'date-fns';

/* ── Brand surface helpers — same vocabulary as the client profile ── */

// Section label: mono eyebrow outside the card; real <h2> for the outline.
function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-1 pb-2.5">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground font-medium antialiased">
        {children}
      </h2>
    </div>
  );
}

// Card surface: shadows over borders, 12px outer radius.
function SectionCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn(
      'bg-card rounded-xl overflow-hidden p-4 sm:p-5',
      'shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.03),0_0_0_1px_rgba(0,0,0,0.04)]',
      className
    )}>
      {children}
    </div>
  );
}

// Page chrome shared by every state: nav, container, path-style header
// ("‹ Client / Check-in") where the crumb is the way back to the profile.
// The avatar rides the action slot as the page's identity anchor.
function PageShell({ clientName, clientAvatar, subtitle, onBack, children }: {
  clientName: string;
  clientAvatar?: string | null;
  subtitle?: ReactNode;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-background pb-24 sm:pb-4">
      <CoachNav activeTab="clients" />
      <div className="max-w-7xl mx-auto px-4 pt-5 sm:px-6 sm:pt-10 lg:px-8">
        <main className="space-y-6 sm:space-y-8">
          <div className="animate-enter">
            <PageHeader
              title="Check-in"
              subtitle={subtitle}
              breadcrumb={{ label: clientName, onClick: onBack }}
              action={
                <UserAvatar
                  name={clientName}
                  avatarUrl={clientAvatar}
                  className="hidden sm:flex w-10 h-10 text-sm"
                />
              }
            />
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

export function ClientCheckIn() {
  const params = useParams<{ clientId: string }>();
  const clientId = params?.clientId ?? null;
  const router = useRouter();

  const { client, isLoading: isClientLoading, refresh: refreshClient } = useCoachClientProfile(clientId);

  // Plan detail resolves flagged workoutExerciseIds to exercise names —
  // flags key by the client's plan copy, which is exactly activePlan
  const { plan } = usePlanDetail(client?.activePlan?.id ?? null);
  const exerciseNames = useMemo(() => {
    const map = new Map<string, string>();
    plan?.weeks.forEach((w) =>
      w.days.forEach((d) =>
        d.exercises.forEach((e) => map.set(e.id, e.exercise.name))
      )
    );
    return map;
  }, [plan]);

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
  const [responseError, setResponseError] = useState('');
  const [planAdjustment, setPlanAdjustment] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // The success screen replaces the whole page — move focus to its heading
  // so the confirmation is announced instead of landing on nothing
  const responseRef = useRef<HTMLTextAreaElement>(null);
  const successHeadingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!showSuccess) return;
    // Focus announces the confirmation; preventScroll stops the browser
    // from scrolling the heading up under the sticky header (which hid the
    // check icon on phones). The page top shows the whole card.
    window.scrollTo({ top: 0 });
    successHeadingRef.current?.focus({ preventScroll: true });
  }, [showSuccess]);

  const isLoading = isClientLoading || (activeCheckInId && isCheckInLoading);

  const clientName = client?.user.name ?? client?.user.email ?? 'Client';
  const firstName = clientName.split(' ')[0];

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

  // Unsend is two-step (ask, then confirm) — it deletes the check-in outright,
  // so a single stray click must never be enough.
  const [confirmingUnsend, setConfirmingUnsend] = useState(false);
  const [isUnsending, setIsUnsending] = useState(false);

  const handleUnsendCheckIn = async () => {
    if (!activeCheckInId || isUnsending) return;
    setIsUnsending(true);
    try {
      await apiFetch(`/api/check-ins/${activeCheckInId}`, { method: 'DELETE' });
      toast.success('Check-in unsent');
    } catch {
      toast.error(`Couldn’t unsend the check-in. ${firstName} may have just responded.`);
    } finally {
      setConfirmingUnsend(false);
      setIsUnsending(false);
      await refreshClient();
    }
  };

  // Submit stays enabled until the request starts — disabling it while the
  // form is empty hides the reason and drops it from the tab order. An empty
  // submit explains itself inline instead.
  const handleCompleteCheckIn = async () => {
    if (!activeCheckIn || isSubmitting) return;
    if (!coachResponse.trim()) {
      setResponseError(`Write a response to ${firstName} before completing the check-in.`);
      responseRef.current?.focus();
      return;
    }
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
      <div
        className="min-h-dvh bg-background p-3 sm:p-4 flex items-center justify-center animate-enter"
        role="status"
      >
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" aria-hidden="true" />
        <span className="sr-only">Loading…</span>
      </div>
    );
  }

  // Client not found
  if (!client) {
    return (
      <div className="min-h-dvh bg-background pb-24 sm:pb-4">
        <CoachNav activeTab="clients" />
        <div className="max-w-7xl mx-auto px-4 pt-5 sm:px-6 sm:pt-10 lg:px-8">
          <SectionCard className="max-w-md mx-auto text-center py-12 animate-enter">
            <div className="text-4xl select-none mb-4 animate-bounce-once">🔍</div>
            <h2 className="text-xl font-bold mb-2 tracking-tight antialiased">Can’t find this client</h2>
            <p className="text-sm text-muted-foreground mb-5 antialiased">They may have been removed, or the link might be outdated.</p>
            <Button onClick={() => router.push('/coach/clients')} className="active:scale-[0.96] transition-transform duration-150">Back to Clients</Button>
          </SectionCard>
        </div>
      </div>
    );
  }

  // Success screen — volt confirmation, same language as a finished workout
  if (showSuccess) {
    return (
      <div className="min-h-dvh bg-background pb-24 sm:pb-4">
        <CoachNav activeTab="clients" />
        <div className="max-w-7xl mx-auto px-4 pt-5 sm:px-6 sm:pt-10 lg:px-8">
          <SectionCard className="max-w-md mx-auto text-center py-12 animate-enter">
            <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-brand flex items-center justify-center animate-bounce-once">
              <Check className="w-8 h-8 text-brand-foreground" strokeWidth={3} />
            </div>
            <h2
              ref={successHeadingRef}
              tabIndex={-1}
              className="text-2xl font-bold tracking-tight mb-1.5 focus:outline-none text-balance"
            >
              Check-in complete
            </h2>
            <p className="text-sm text-muted-foreground mb-7">
              Your response is on its way to {clientName}.
            </p>
            <div className="space-y-2">
              <Button onClick={handleBack} className="w-full active:scale-[0.96] transition-transform duration-150">
                Back to {firstName}’s profile
              </Button>
              <Button variant="ghost" onClick={() => router.push('/coach')} className="w-full text-muted-foreground">
                Back to dashboard
              </Button>
            </div>
          </SectionCard>
        </div>
      </div>
    );
  }

  // Previous completed check-ins (from client detail)
  const completedCheckIns = client.checkIns
    .filter((c) => c.status === 'COMPLETED')
    .slice(0, 3);

  // State C: No active check-in
  if (!activeCheckIn && !activeCheckInId) {
    return (
      <PageShell clientName={clientName} clientAvatar={client?.user.avatarUrl ?? null} subtitle="No active check-in" onBack={handleBack}>
        <div className="animate-enter" style={{ animationDelay: '100ms' }}>
          <SectionCard className="max-w-2xl text-center py-12">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <ClipboardCheck className="w-6 h-6 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold tracking-tight mb-1.5 text-balance">No active check-in</h2>
            <p className="text-sm text-muted-foreground mb-6 text-pretty">
              Start a new check-in to hear how {firstName} is doing.
            </p>
            <Button
              onClick={handleStartNewCheckIn}
              disabled={isCreating}
              className="h-11 px-6 text-sm font-bold uppercase tracking-wider bg-brand text-brand-foreground hover:bg-brand/90 active:scale-[0.96] transition-[background-color,transform] duration-150"
            >
              {isCreating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Send check-in
            </Button>
          </SectionCard>
        </div>

        {completedCheckIns.length > 0 && (
          <div className="animate-enter" style={{ animationDelay: '200ms' }}>
            <PreviousCheckInsList checkIns={completedCheckIns} />
          </div>
        )}
      </PageShell>
    );
  }

  // State A: Pending (waiting for client)
  if (activeCheckIn?.status === 'PENDING') {
    const sentAgo = formatDistanceToNow(new Date(activeCheckIn.createdAt), { addSuffix: true }).replace(/^about /, '');

    return (
      <PageShell
        clientName={clientName} clientAvatar={client?.user.avatarUrl ?? null}
        subtitle={`Sent ${sentAgo}`}
        onBack={handleBack}
      >
        <div className="animate-enter" style={{ animationDelay: '100ms' }}>
          <SectionCard className="max-w-2xl text-center py-10">
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 bg-warning/10 text-warning-text font-mono text-[10px] uppercase tracking-[0.12em] font-medium antialiased">
              <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" aria-hidden="true" />
              Awaiting response
            </span>
            {confirmingUnsend ? (
              <>
                <h2 className="text-xl font-bold tracking-tight mt-4 mb-1.5 text-balance">Unsend this check-in?</h2>
                <p className="text-sm text-muted-foreground text-pretty">
                  {firstName} won’t see it. You can send a new one any time.
                </p>
                <div className="flex items-center justify-center gap-2 mt-5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="tap-target"
                    disabled={isUnsending}
                    onClick={() => setConfirmingUnsend(false)}
                  >
                    Keep
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="tap-target"
                    disabled={isUnsending}
                    onClick={handleUnsendCheckIn}
                  >
                    {isUnsending ? 'Unsending…' : 'Unsend'}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold tracking-tight mt-4 mb-1.5 text-balance">Waiting for {firstName}</h2>
                <p className="text-sm text-muted-foreground text-pretty">
                  Check-in sent {sentAgo}. {firstName} hasn’t responded yet.
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-5 text-muted-foreground tap-target"
                  onClick={() => setConfirmingUnsend(true)}
                >
                  Unsend check-in
                </Button>
              </>
            )}
          </SectionCard>
        </div>

        <div className="animate-enter" style={{ animationDelay: '200ms' }}>
          <CheckInWorkouts client={client} exerciseNames={exerciseNames} weeklyTarget={plan?.workoutsPerWeek ?? null} />
        </div>

        {completedCheckIns.length > 0 && (
          <div className="animate-enter" style={{ animationDelay: '300ms' }}>
            <PreviousCheckInsList checkIns={completedCheckIns} />
          </div>
        )}
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
    ? formatDistanceToNow(new Date(activeCheckIn.clientRespondedAt), { addSuffix: true }).replace(/^about /, '')
    : 'recently';

  return (
    <PageShell
      clientName={clientName} clientAvatar={client?.user.avatarUrl ?? null}
      subtitle={`Submitted ${submittedAgo}`}
      onBack={handleBack}
    >
      {/* Review desk: a reading column of evidence beside a sticky composer,
          so the coach writes with the client's words still on screen.
          Mobile stacks read-first: response → workouts → composer → history. */}
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-8 lg:items-start space-y-6 sm:space-y-8 lg:space-y-0">
        {/* Evidence column */}
        <div className="space-y-6 sm:space-y-8 min-w-0">
          {/* Client response — the page's headline data: bare mono-labelled
              vitals, no box-in-box */}
          <section className="animate-enter" style={{ animationDelay: '100ms' }}>
            <SectionLabel>{firstName}’s response</SectionLabel>
            <SectionCard>
              {/* Answers in the brand's instrument-readout voice — mono caps,
                  like the profile's vitals; the emoji is the client's own pick
                  from the check-in form, carried over as content */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                {effortDisplay && (
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium antialiased mb-2">
                      Workouts felt
                    </p>
                    <p className={cn(
                      'font-mono text-sm font-bold uppercase tracking-[0.08em] antialiased',
                      'flex items-center gap-2 leading-none',
                      effortDisplay.text
                    )}>
                      <span className="text-lg leading-none select-none" aria-hidden="true">{effortDisplay.emoji}</span>
                      {effortDisplay.label}
                    </p>
                  </div>
                )}
                {feelingDisplay && (
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium antialiased mb-2">
                      Body feels
                    </p>
                    <p className={cn(
                      'font-mono text-sm font-bold uppercase tracking-[0.08em] antialiased',
                      'flex items-center gap-2 leading-none',
                      feelingDisplay.text
                    )}>
                      <span className="text-lg leading-none select-none" aria-hidden="true">{feelingDisplay.emoji}</span>
                      {feelingDisplay.label}
                    </p>
                  </div>
                )}
              </div>

              {/* Client notes read as a quote — the brand's coach-note treatment.
                  max-w-prose keeps the measure at ~65ch in the wide column */}
              {activeCheckIn?.painBlockers && (
                <div className="mt-6">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium antialiased mb-1.5">
                    Notes from {firstName}
                  </p>
                  <p className="border-l-2 border-brand/60 pl-3 text-[15px] leading-relaxed text-foreground/90 max-w-prose text-pretty">
                    {activeCheckIn.painBlockers}
                  </p>
                </div>
              )}
            </SectionCard>
          </section>

          {/* Recent workouts — the client-profile payload carries the review
              context the check-in payload lacks: abandoned sessions, mid-workout
              exercise flags, and prescription deviations */}
          <div className="animate-enter" style={{ animationDelay: '175ms' }}>
            <CheckInWorkouts client={client} exerciseNames={exerciseNames} weeklyTarget={plan?.workoutsPerWeek ?? null} />
          </div>

          {/* Previous check-ins close the reading column (desktop) */}
          {completedCheckIns.length > 0 && (
            <div className="hidden lg:block animate-enter" style={{ animationDelay: '250ms' }}>
              <PreviousCheckInsList checkIns={completedCheckIns} />
            </div>
          )}
        </div>

        {/* Action column — composer and CTA as one unit, pinned on desktop */}
        <section className="lg:sticky lg:top-6 animate-enter" style={{ animationDelay: '150ms' }}>
          <SectionLabel>Your response</SectionLabel>
          <SectionCard>
            <div>
              <Textarea
                ref={responseRef}
                aria-label={`Your response to ${firstName}`}
                aria-invalid={!!responseError || undefined}
                aria-describedby={responseError ? 'coach-response-error' : undefined}
                placeholder={`Write your response to ${firstName}…`}
                value={coachResponse}
                onChange={(e) => {
                  setCoachResponse(e.target.value.slice(0, 1000));
                  if (responseError) setResponseError('');
                }}
                rows={6}
              />
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-medium mt-1.5 text-right tabular-nums">
                {coachResponse.length}/1000
              </p>
              {/* Stable live region so repeat empty submits re-announce */}
              <div role="alert" aria-live="assertive">
                {responseError && (
                  <p id="coach-response-error" className="text-sm text-destructive mt-1">
                    {responseError}
                  </p>
                )}
              </div>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer select-none mt-2.5 min-h-11">
              <Checkbox
                checked={planAdjustment}
                onCheckedChange={setPlanAdjustment}
              />
              <span className="text-sm">I’ll adjust the plan based on this feedback</span>
            </label>

            {/* Submit — the page's one volt moment */}
            <Button
              onClick={handleCompleteCheckIn}
              disabled={isSubmitting}
              className="w-full h-12 mt-5 text-sm font-bold uppercase tracking-wider bg-brand text-brand-foreground hover:bg-brand/90 active:scale-[0.96] transition-[background-color,transform] duration-150"
              size="lg"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Complete check-in
            </Button>
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground text-center mt-2.5 antialiased">
              Closes this check-in · saved to {firstName}’s history
            </p>
          </SectionCard>
        </section>

        {/* Previous check-ins after the action on mobile */}
        {completedCheckIns.length > 0 && (
          <div className="lg:hidden animate-enter" style={{ animationDelay: '250ms' }}>
            <PreviousCheckInsList checkIns={completedCheckIns} />
          </div>
        )}
      </div>
    </PageShell>
  );
}

/* ── Inline sub-components ────────────────────────────────── */

type Completion = ClientDetail['completions'][number];

/** Where the review window opens: the last closed check-in, else plan start, else two weeks back */
function reviewWindow(client: ClientDetail): { since: Date; label: string } {
  const lastClosed = client.checkIns.find((c) => c.status === 'COMPLETED');
  if (lastClosed) {
    const since = new Date(lastClosed.completedAt ?? lastClosed.createdAt);
    return { since, label: `Since last check-in · ${format(since, 'MMM d')}` };
  }
  if (client.planStartDate) {
    const since = new Date(client.planStartDate);
    return { since, label: `Since plan start · ${format(since, 'MMM d')}` };
  }
  return { since: subDays(new Date(), 14), label: 'Last 14 days' };
}

/**
 * The review's evidence, scoped to this check-in's window rather than the
 * client's whole history: a readout of the period, a strip of every session,
 * the few that need a look up front, and the rest one tap away.
 */
function CheckInWorkouts({ client, exerciseNames, weeklyTarget }: {
  client: ClientDetail;
  exerciseNames: Map<string, string>;
  /** Plan's sessions per week — null until the plan loads, or with no plan */
  weeklyTarget: number | null;
}) {
  const [showAll, setShowAll] = useState(false);
  const { since, label } = reviewWindow(client);
  const firstName = (client.user.name ?? 'Client').split(' ')[0];

  // Completed workouts plus started-but-never-finished ones — abandonment
  // (and a flag raised mid-session) is exactly the signal to review
  const rows = client.completions
    .filter((c) => c.completedAt || (c.status === 'IN_PROGRESS' && c.startedAt))
    .filter((c) => new Date((c.completedAt ?? c.startedAt) as string) >= since);

  const isAbandoned = (c: Completion) =>
    c.status === 'IN_PROGRESS' &&
    differenceInHours(new Date(), new Date(c.startedAt as string)) >= 6;
  const needsLook = (c: Completion) =>
    (c.flags?.length ?? 0) > 0 ||
    isAbandoned(c) ||
    (c.status === 'COMPLETED' && c.completionPct != null && c.completionPct < 100);

  const completed = rows.filter((c) => c.status === 'COMPLETED');
  const pcts = completed.map((c) => c.completionPct).filter((p): p is number => p != null);
  const avgPct = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null;
  const flagCount = rows.reduce((n, c) => n + (c.flags?.length ?? 0), 0);

  const weeks = buildWeeks(client.completions, since, weeklyTarget, client.planStartDate);
  const missed = weeks.reduce((n, w) => n + w.missed, 0);

  const attention = rows.filter(needsLook);
  const rest = rows.filter((c) => !needsLook(c));

  const stats = [
    // With a target, count the same whole weeks the chart shows so they agree
    weeklyTarget != null
      ? { label: 'Workouts', value: String(weeks.reduce((n, w) => n + w.completed, 0)), warn: false }
      : { label: 'Workouts', value: String(completed.length), warn: false },
    { label: 'Missed', value: weeklyTarget != null ? String(missed) : '—', warn: missed > 0 },
    { label: 'Avg done', value: avgPct != null ? `${avgPct}%` : '—', warn: avgPct != null && avgPct < 90 },
    { label: 'Flags', value: String(flagCount), warn: flagCount > 0 },
  ];

  return (
    <section>
      <SectionLabel>{label}</SectionLabel>
      <div className={cn(
        'bg-card rounded-xl overflow-hidden',
        'shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.03),0_0_0_1px_rgba(0,0,0,0.04)]'
      )}>
        {rows.length === 0 && weeklyTarget == null ? (
          <p className="px-4 sm:px-5 py-6 text-sm text-warning-text antialiased">
            No workouts logged since {format(since, 'MMM d')}.
          </p>
        ) : (
          <>
            {/* Period readout — instrument voice, like the profile vitals */}
            <div className="grid grid-cols-4 divide-x divide-border border-b border-border">
              {stats.map((s) => (
                <div key={s.label} className="min-w-0 px-3 sm:px-5 py-3">
                  <p className="flex items-center gap-1.5 font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium antialiased truncate">
                    {s.warn && <span className="w-1.5 h-1.5 rounded-full bg-chart-short shrink-0" aria-hidden="true" />}
                    {s.label}
                    {s.warn && <span className="sr-only"> (needs attention)</span>}
                  </p>
                  <p className="text-xl sm:text-2xl font-black tracking-tight mt-0.5">
                    {s.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Week by week against the plan's target */}
            <WeeklyAdherence weeks={weeks} isAbandoned={isAbandoned} />

            {/* What to read before replying */}
            {attention.length > 0 ? (
              <div className="border-t border-border">
                <p className="px-4 sm:px-5 pt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-warning-text font-medium antialiased">
                  Needs a look · {attention.length}
                </p>
                <div className="divide-y divide-border">
                  {attention.map((c) => (
                    <WorkoutRow key={c.id} c={c} abandoned={isAbandoned(c)} exerciseNames={exerciseNames} />
                  ))}
                </div>
              </div>
            ) : rows.length === 0 ? (
              <p className="border-t border-border px-4 sm:px-5 py-3 text-[13px] text-warning-text antialiased">
                No workouts logged since {format(since, 'MMM d')}.
              </p>
            ) : (
              <p className="border-t border-border px-4 sm:px-5 py-3 text-[13px] text-muted-foreground antialiased">
                Every session finished as written — no flags from {firstName}.
              </p>
            )}

            {/* Clean sessions stay folded */}
            {rest.length > 0 && (
              <div className="border-t border-border">
                <button
                  onClick={() => setShowAll(!showAll)}
                  aria-expanded={showAll}
                  className="w-full flex items-center justify-between gap-2 px-4 sm:px-5 py-3 text-start hover:bg-muted/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium antialiased">
                    {showAll ? 'Hide' : 'Show'} {rest.length} completed {rest.length === 1 ? 'workout' : 'workouts'}
                  </span>
                  <ChevronDown
                    className={cn('w-4 h-4 text-muted-foreground transition-transform duration-150', showAll && 'rotate-180')}
                    aria-hidden="true"
                  />
                </button>
                {showAll && (
                  <div className="divide-y divide-border border-t border-border">
                    {rest.map((c) => (
                      <WorkoutRow key={c.id} c={c} abandoned={false} exerciseNames={exerciseNames} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

interface WeekRow {
  start: Date;
  planWeek: number | null;
  sessions: Completion[];
  completed: number;
  target: number | null;
  missed: number;
  upcoming: number;
  isCurrent: boolean;
}

/**
 * Bucket sessions into the app's Monday-start training weeks, from the week
 * the review window opens through this week, and compare each to the plan's
 * weekly target. Weeks are counted whole — a check-in that lands mid-week
 * still judges that week against its full target.
 */
function buildWeeks(
  completions: Completion[],
  since: Date,
  target: number | null,
  planStartDate: string | null,
): WeekRow[] {
  const thisWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
  const planWeek1 = planStartDate ? startOfWeek(new Date(planStartDate), { weekStartsOn: 1 }) : null;
  const weeks: WeekRow[] = [];
  for (let w = startOfWeek(since, { weekStartsOn: 1 }); w <= thisWeek; w = addWeeks(w, 1)) {
    const end = addWeeks(w, 1);
    const sessions = completions
      .filter((c) => c.completedAt || (c.status === 'IN_PROGRESS' && c.startedAt))
      .filter((c) => {
        const t = new Date((c.completedAt ?? c.startedAt) as string);
        return t >= w && t < end;
      })
      .reverse(); // oldest first, left to right
    const isCurrent = w.getTime() === thisWeek.getTime();
    const open = target != null ? Math.max(0, target - sessions.length) : 0;
    weeks.push({
      start: w,
      planWeek: planWeek1 ? differenceInCalendarWeeks(w, planWeek1, { weekStartsOn: 1 }) + 1 : null,
      sessions,
      completed: sessions.filter((c) => c.status === 'COMPLETED').length,
      target,
      // This week's open slots are still ahead of the client, not missed
      missed: isCurrent ? 0 : open,
      upcoming: isCurrent ? open : 0,
      isCurrent,
    });
  }
  return weeks;
}

/**
 * One row per training week: a slot for every planned session — filled when
 * done, amber when short or abandoned, hollow when missed, dashed while the
 * week is still open. Answers "did they train as planned?" at a glance.
 */
function WeeklyAdherence({ weeks, isAbandoned }: {
  weeks: WeekRow[];
  isAbandoned: (c: Completion) => boolean;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);

  // Meter fill: how much of the session got done. Unfinished sessions use
  // exercises logged when known, else a sliver so the slot never reads empty
  const fillPct = (c: Completion) => {
    if (c.status === 'COMPLETED') return Math.max(12, c.completionPct ?? 100);
    const done = c.exercisesDone ?? 0;
    const total = c.exercisesTotal ?? 0;
    return Math.max(12, total > 0 ? (done / total) * 100 : 0);
  };
  const all = weeks.flatMap((w) => w.sessions);
  const hasFull = all.some((c) => fillPct(c) >= 100);
  const hasPartial = all.some((c) => fillPct(c) < 100);
  const hasMissed = weeks.some((w) => w.missed > 0);
  const hasUpcoming = weeks.some((w) => w.upcoming > 0);
  const hasFlags = all.some((c) => (c.flags?.length ?? 0) > 0);

  const slot = 'w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-[3px] shrink-0';

  return (
    <div className="px-4 sm:px-5 py-4">
      <ul className="space-y-2" onPointerLeave={() => setActiveId(null)}>
        {weeks.map((w) => {
          const summary = w.target != null
            ? `${w.completed} of ${w.target} sessions${w.missed ? `, ${w.missed} missed` : ''}${w.isCurrent ? ', week in progress' : ''}`
            : `${w.completed} ${w.completed === 1 ? 'session' : 'sessions'}`;
          return (
            <li
              key={w.start.toISOString()}
              className="flex items-center gap-2.5 sm:gap-3"
              aria-label={`Week of ${format(w.start, 'MMM d')}: ${summary}`}
            >
              {/* Week label — plan week number when known, and its Monday */}
              <p className="w-[118px] shrink-0 font-mono text-[10px] uppercase tracking-[0.08em] tabular-nums antialiased whitespace-nowrap">
                <span className="text-foreground font-medium">
                  {w.isCurrent ? 'This wk' : w.planWeek != null && w.planWeek > 0 ? `Wk ${w.planWeek}` : 'Wk'}
                </span>
                <span className="text-muted-foreground"> · {format(w.start, 'MMM d')}</span>
              </p>

              <div className="min-w-0 flex flex-wrap items-center gap-1">
                {w.sessions.map((c) => {
                  const live = c.status === 'IN_PROGRESS' && !isAbandoned(c);
                  const flags = c.flags ?? [];
                  const date = format(new Date((c.completedAt ?? c.startedAt) as string), 'EEE, MMM d');
                  const value = c.status === 'IN_PROGRESS'
                    ? live ? 'In progress' : 'Not finished'
                    : `${Math.round(c.completionPct ?? 100)}% done`;
                  const isActive = activeId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      aria-label={`${c.day?.name ?? 'Workout'}, ${date}: ${value}${flags.length ? `, ${flags.length} flagged` : ''}`}
                      onPointerEnter={() => setActiveId(c.id)}
                      onFocus={() => setActiveId(c.id)}
                      onBlur={() => setActiveId(null)}
                      className={cn(
                        slot, 'relative cursor-default transition-opacity duration-150',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
                        activeId && !isActive && 'opacity-50'
                      )}
                    >
                      {/* Volt meter: lighter step of the brand ramp as the
                          track, brand fill rising with the share done */}
                      <span className="absolute inset-0 rounded-[3px] overflow-hidden bg-brand/25 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]" aria-hidden="true">
                        <span className="absolute inset-x-0 bottom-0 bg-brand" style={{ height: `${fillPct(c)}%` }} />
                      </span>
                      {flags.length > 0 && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-foreground ring-2 ring-card" aria-hidden="true" />
                      )}
                      {/* Tooltip — value leads, label follows */}
                      {isActive && (
                        <span
                          role="tooltip"
                          className={cn(
                            'pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10',
                            'w-max max-w-[220px] rounded-lg bg-popover text-popover-foreground px-3 py-2 text-left',
                            'shadow-[0_4px_16px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.06)]'
                          )}
                        >
                          <span className="block text-sm font-bold">{value}</span>
                          <span className="block text-xs text-muted-foreground truncate">{c.day?.name ?? 'Workout'}</span>
                          <span className="block font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground mt-0.5">{date}</span>
                          {flags.length > 0 && (
                            <span className="flex items-center gap-1 text-xs font-semibold mt-1">
                              <Flag className="w-3 h-3 shrink-0" aria-hidden="true" />
                              {flags.length} flagged
                            </span>
                          )}
                        </span>
                      )}
                    </button>
                  );
                })}
                {Array.from({ length: w.missed }, (_, i) => (
                  <span key={`m${i}`} className={cn(slot, 'shadow-[inset_0_0_0_1.5px_hsl(var(--muted-foreground)/0.45)]')} aria-hidden="true" />
                ))}
                {Array.from({ length: w.upcoming }, (_, i) => (
                  <span key={`u${i}`} className={cn(slot, 'border border-dashed border-muted-foreground/40')} aria-hidden="true" />
                ))}
              </div>

              {/* Done vs. planned — the row's answer, in ink */}
              <p className="shrink-0 ml-1 font-mono text-[11px] tabular-nums antialiased" aria-hidden="true">
                <span className="font-bold text-foreground">{w.completed}</span>
                {w.target != null && <span className="text-muted-foreground"> / {w.target}</span>}
              </p>

              {/* Plain-language verdict fills the row on wider screens */}
              {w.target != null && (
                <p className="hidden sm:block flex-1 text-right text-xs text-muted-foreground antialiased" aria-hidden="true">
                  {w.isCurrent
                    ? w.upcoming > 0 ? `${w.upcoming} to go` : 'Target hit'
                    : w.missed > 0
                      ? <><span className="inline-block w-1.5 h-1.5 rounded-full bg-chart-short mr-1.5 align-middle" />{w.missed} missed</>
                      : 'On target'}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {/* Legend — identity never rides on color alone */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3.5 text-[11px] text-muted-foreground antialiased" aria-hidden="true">
        {hasFull && (
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[2px] bg-brand shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]" />Done</span>
        )}
        {hasPartial && (
          <span className="flex items-center gap-1.5">
            <span className="relative w-2.5 h-2.5 rounded-[2px] overflow-hidden bg-brand/25 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]">
              <span className="absolute inset-x-0 bottom-0 h-1/2 bg-brand" />
            </span>
            Partly done
          </span>
        )}
        {hasMissed && (
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[2px] shadow-[inset_0_0_0_1.5px_hsl(var(--muted-foreground)/0.45)]" />Missed</span>
        )}
        {hasUpcoming && (
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[2px] border border-dashed border-muted-foreground/40" />Still to do</span>
        )}
        {hasFlags && (
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-foreground" />Flagged</span>
        )}
      </div>
    </div>
  );
}

function WorkoutRow({ c, abandoned, exerciseNames }: {
  c: Completion;
  abandoned: boolean;
  exerciseNames: Map<string, string>;
}) {
  const isUnfinished = c.status === 'IN_PROGRESS';
  const timestamp = new Date((c.completedAt ?? c.startedAt) as string);
  const deviations = getWorkoutDeviations(c.sets ?? []);
  const flags = c.flags ?? [];
  // Flags on exercises no longer in the plan (or before plan detail
  // loads) fall back to the names carried on deviated sets
  const flagName = (workoutExerciseId: string) =>
    exerciseNames.get(workoutExerciseId) ??
    c.sets?.find((s) => s.workoutExerciseId === workoutExerciseId)
      ?.workoutExercise.exercise.name ??
    'Exercise';

  return (
    <div className="px-4 sm:px-5 py-3">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold tracking-tight truncate">
            {!isUnfinished && <span className="sr-only">Completed: </span>}
            {c.day?.name ?? 'Workout'}
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-medium tabular-nums">
            {isUnfinished && 'Started '}
            {format(timestamp, 'EEE, MMM d')}
          </p>
        </div>
        <p className={cn(
          'font-mono text-xs font-semibold tabular-nums shrink-0',
          isUnfinished
            ? cn('text-[10px] uppercase tracking-[0.12em]', abandoned ? 'text-warning-text' : 'text-info')
            : c.completionPct != null && c.completionPct < 100 && 'text-warning-text'
        )}>
          {isUnfinished
            ? abandoned ? 'Not finished' : 'In progress'
            : c.completionPct != null ? `${Math.round(c.completionPct)}%` : ''}
        </p>
      </div>

      {/* What the client changed vs. the prescription */}
      {deviations.length > 0 && (
        <p
          className="text-[11px] text-muted-foreground mt-1 truncate antialiased"
          title={deviations.map(formatDeviation).join(' · ')}
        >
          Adjusted: {deviations.slice(0, 2).map(formatDeviation).join(' · ')}
          {deviations.length > 2 && ` +${deviations.length - 2} more`}
        </p>
      )}

      {/* Exercises flagged mid-workout — "help me" signals, quoted */}
      {flags.map((f) => (
        <p key={f.id} className="mt-1.5 flex items-start gap-1.5 text-xs leading-relaxed">
          <Flag className="w-3 h-3 mt-[3px] shrink-0 text-warning-text" aria-hidden="true" />
          <span>
            <span className="sr-only">Flagged: </span>
            <span className="font-bold text-warning-text">{flagName(f.workoutExerciseId)}</span>
            {f.note && <span className="text-foreground/80"> — &ldquo;{f.note}&rdquo;</span>}
          </span>
        </p>
      ))}
    </div>
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
  return (
    <section>
      <SectionLabel>Previous check-ins · {checkIns.length}</SectionLabel>
      <div className={cn(
        'bg-card rounded-xl divide-y divide-border overflow-hidden',
        'shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.03),0_0_0_1px_rgba(0,0,0,0.04)]'
      )}>
        {checkIns.map((checkIn) => {
          const effort = checkIn.effortRating
            ? FEELING_DISPLAY[checkIn.effortRating]
            : null;
          return (
            <div key={checkIn.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <p className="font-mono text-xs tabular-nums text-muted-foreground antialiased">
                {format(new Date(checkIn.completedAt || checkIn.createdAt), 'MMM d, yyyy')}
              </p>
              {effort && (
                <p className={cn(
                  'font-mono text-[11px] font-bold uppercase tracking-[0.08em] antialiased',
                  'flex items-center gap-1.5 leading-none',
                  effort.text
                )}>
                  <span className="text-sm leading-none select-none" aria-hidden="true">{effort.emoji}</span>
                  {effort.label}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
