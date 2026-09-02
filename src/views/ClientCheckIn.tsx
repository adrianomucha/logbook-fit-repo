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
import { Check, ClipboardCheck, Flag, Loader2 } from 'lucide-react';
import { CoachNav } from '@/components/coach/CoachNav';
import { PageHeader } from '@/components/coach/PageHeader';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { FEELING_DISPLAY } from '@/lib/feeling-display';
import { avatarColor } from '@/lib/avatar-colors';
import { getWorkoutDeviations, formatDeviation } from '@/lib/workout-deviations';
import { format, formatDistanceToNow, differenceInHours } from 'date-fns';

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
function PageShell({ clientName, subtitle, onBack, children }: {
  clientName: string;
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
                <div
                  className={cn(
                    'w-10 h-10 rounded-full hidden sm:flex items-center justify-center',
                    'text-sm font-bold select-none shrink-0',
                    avatarColor(clientName)
                  )}
                  aria-hidden="true"
                >
                  {clientName.charAt(0).toUpperCase()}
                </div>
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
    if (showSuccess) successHeadingRef.current?.focus();
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
            <h2 className="text-xl font-bold mb-2 tracking-tight antialiased">Can&apos;t find this client</h2>
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
                Back to {firstName}&apos;s profile
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
      <PageShell clientName={clientName} subtitle="No active check-in" onBack={handleBack}>
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
        clientName={clientName}
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
                  {firstName} won&apos;t see it. You can send a new one any time.
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
                  Check-in sent {sentAgo}. {firstName} hasn&apos;t responded yet.
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
          <RecentCompletionsList completions={client.completions} exerciseNames={exerciseNames} />
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
      clientName={clientName}
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
            <SectionLabel>{firstName}&apos;s response</SectionLabel>
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
            <RecentCompletionsList completions={client.completions} exerciseNames={exerciseNames} />
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
              <span className="text-sm">I&apos;ll adjust the plan based on this feedback</span>
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
              Closes this check-in · saved to {firstName}&apos;s history
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

function RecentCompletionsList({ completions, exerciseNames }: {
  completions: ClientDetail['completions'];
  exerciseNames: Map<string, string>;
}) {
  // Completed workouts plus started-but-never-finished ones — abandonment
  // (and a flag raised mid-session) is exactly the signal to review
  const rows = completions.filter(
    (c) => c.completedAt || (c.status === 'IN_PROGRESS' && c.startedAt)
  );
  if (rows.length === 0) return null;

  const flagCount = rows.reduce((n, c) => n + (c.flags?.length ?? 0), 0);

  return (
    <section>
      <SectionLabel>
        Recent workouts · {rows.length}
        {flagCount > 0 && (
          <span className="text-warning-text"> · {flagCount} {flagCount === 1 ? 'flag' : 'flags'}</span>
        )}
      </SectionLabel>
      <SectionCard className="space-y-1.5">
        {rows.map((c) => {
          const isUnfinished = c.status === 'IN_PROGRESS';
          const timestamp = new Date((c.completedAt ?? c.startedAt) as string);
          // A session started in the last few hours may still be live;
          // older ones were walked away from
          const abandoned = isUnfinished && differenceInHours(new Date(), timestamp) >= 6;
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
            <div key={c.id} className="px-3 py-2.5 rounded-lg bg-muted/40">
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'w-2 h-2 rounded-full shrink-0',
                    isUnfinished ? (abandoned ? 'bg-warning' : 'bg-info') : 'bg-success'
                  )}
                  aria-hidden="true"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold tracking-tight truncate">
                    {/* The green dot is the only visual "completed" cue — say it */}
                    {!isUnfinished && <span className="sr-only">Completed: </span>}
                    {c.day?.name ?? 'Workout'}
                  </p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-medium">
                    {isUnfinished && 'Started '}
                    {format(timestamp, 'EEE, MMM d')}
                  </p>
                </div>
                {isUnfinished ? (
                  <p className={cn(
                    'font-mono text-[10px] uppercase tracking-[0.12em] font-medium shrink-0',
                    abandoned ? 'text-warning-text' : 'text-info'
                  )}>
                    {abandoned ? 'Not finished' : 'In progress'}
                  </p>
                ) : c.completionPct != null ? (
                  <p className={cn(
                    'font-mono text-sm font-semibold tabular-nums shrink-0',
                    c.completionPct < 100 && 'text-warning-text'
                  )}>
                    {Math.round(c.completionPct)}%
                  </p>
                ) : null}
              </div>

              {/* What the client changed vs. the prescription */}
              {deviations.length > 0 && (
                <p
                  className="text-[11px] text-warning-text mt-1.5 pl-5 truncate antialiased"
                  title={deviations.map(formatDeviation).join(' · ')}
                >
                  Adjusted: {deviations.slice(0, 2).map(formatDeviation).join(' · ')}
                  {deviations.length > 2 && ` +${deviations.length - 2} more`}
                </p>
              )}

              {/* Exercises flagged mid-workout — "help me" signals */}
              {flags.map((f) => (
                <div key={f.id} className="mt-2 ml-5 rounded-md bg-warning/10 px-2.5 py-2">
                  <p className="flex items-center gap-1.5 text-xs font-bold text-warning-text">
                    <Flag className="w-3 h-3 shrink-0" aria-hidden="true" />
                    {/* The icon carries "flagged" only visually — say it */}
                    <span className="sr-only">Flagged: </span>
                    {flagName(f.workoutExerciseId)}
                  </p>
                  {f.note && (
                    <p className="text-xs text-foreground/80 leading-relaxed mt-1">
                      &ldquo;{f.note}&rdquo;
                    </p>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </SectionCard>
    </section>
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
