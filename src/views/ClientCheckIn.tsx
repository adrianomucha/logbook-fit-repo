import { useState, useMemo, ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCoachClientProfile } from '@/hooks/api/useCoachClientProfile';
import { useCheckIn, createCheckInForClient } from '@/hooks/api/useCheckIn';
import { apiFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Check, ClipboardCheck, Loader2 } from 'lucide-react';
import { CoachNav } from '@/components/coach/CoachNav';
import { PageHeader } from '@/components/coach/PageHeader';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { FEELING_DISPLAY } from '@/lib/feeling-display';
import { format, formatDistanceToNow } from 'date-fns';

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
            <h2 className="text-2xl font-bold tracking-tight mb-1.5">Check-in complete</h2>
            <p className="text-sm text-muted-foreground mb-7">
              Your response is on its way to {clientName}.
            </p>
            <div className="space-y-2">
              <Button onClick={handleBack} className="w-full active:scale-[0.97] transition-transform duration-150">
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
          <SectionCard className="text-center py-12">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <ClipboardCheck className="w-6 h-6 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold tracking-tight mb-1.5">No active check-in</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Start a new check-in to hear how {firstName} is doing.
            </p>
            <Button
              onClick={handleStartNewCheckIn}
              disabled={isCreating}
              className="h-11 px-6 text-sm font-bold uppercase tracking-wider bg-brand text-brand-foreground hover:bg-brand/90 active:scale-[0.97] transition-[background-color,transform] duration-150"
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
    const sentAgo = formatDistanceToNow(new Date(activeCheckIn.createdAt), { addSuffix: true });

    return (
      <PageShell
        clientName={clientName}
        subtitle={`Sent ${sentAgo}`}
        onBack={handleBack}
      >
        <div className="animate-enter" style={{ animationDelay: '100ms' }}>
          <SectionCard className="text-center py-10">
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 bg-warning/10 text-warning font-mono text-[10px] uppercase tracking-[0.12em] font-medium antialiased">
              <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" aria-hidden="true" />
              Awaiting response
            </span>
            <h2 className="text-xl font-bold tracking-tight mt-4 mb-1.5">Waiting for {firstName}</h2>
            <p className="text-sm text-muted-foreground">
              Check-in sent {sentAgo}. {firstName} hasn&apos;t responded yet.
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
          </SectionCard>
        </div>

        <div className="animate-enter" style={{ animationDelay: '200ms' }}>
          <RecentCompletionsList completions={client.completions} />
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
    ? formatDistanceToNow(new Date(activeCheckIn.clientRespondedAt), { addSuffix: true })
    : 'recently';

  return (
    <PageShell
      clientName={clientName}
      subtitle={`Submitted ${submittedAgo}`}
      onBack={handleBack}
    >
      {/* Two-column layout on desktop */}
      <div className="flex flex-col lg:flex-row lg:gap-6 space-y-6 sm:space-y-8 lg:space-y-0">
        {/* Main content column */}
        <div className="flex-1 space-y-6 sm:space-y-8">
          {/* Client response */}
          <section className="animate-enter" style={{ animationDelay: '100ms' }}>
            <SectionLabel>{firstName}&apos;s response</SectionLabel>
            <SectionCard className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {effortDisplay && (
                  <div className="rounded-lg bg-muted/40 px-3 py-2.5">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium antialiased mb-1.5">
                      Workouts felt
                    </p>
                    <p className={cn('text-sm font-bold tracking-tight', effortDisplay.text)}>
                      <span className="mr-1.5 select-none" aria-hidden="true">{effortDisplay.emoji}</span>
                      {effortDisplay.label}
                    </p>
                  </div>
                )}
                {feelingDisplay && (
                  <div className="rounded-lg bg-muted/40 px-3 py-2.5">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium antialiased mb-1.5">
                      Body feels
                    </p>
                    <p className={cn('text-sm font-bold tracking-tight', feelingDisplay.text)}>
                      <span className="mr-1.5 select-none" aria-hidden="true">{feelingDisplay.emoji}</span>
                      {feelingDisplay.label}
                    </p>
                  </div>
                )}
              </div>

              {/* Client notes read as a quote — the brand's coach-note treatment */}
              {activeCheckIn?.painBlockers && (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium antialiased mb-1.5">
                    Notes from {firstName}
                  </p>
                  <p className="border-l-2 border-brand/60 pl-3 text-sm leading-relaxed text-foreground/90">
                    {activeCheckIn.painBlockers}
                  </p>
                </div>
              )}
            </SectionCard>
          </section>

          {/* Recent workouts */}
          <div className="animate-enter" style={{ animationDelay: '200ms' }}>
            <RecentCompletionsList
              completions={activeCheckIn?.client.completions ?? client.completions}
            />
          </div>

          {/* Previous check-ins (mobile) */}
          {completedCheckIns.length > 0 && (
            <div className="lg:hidden animate-enter" style={{ animationDelay: '250ms' }}>
              <PreviousCheckInsList checkIns={completedCheckIns} />
            </div>
          )}

          {/* Coach response */}
          <section className="animate-enter" style={{ animationDelay: '300ms' }}>
            <SectionLabel>Your response</SectionLabel>
            <SectionCard className="space-y-4">
              <div>
                <Textarea
                  placeholder={`Write your response to ${firstName}…`}
                  value={coachResponse}
                  onChange={(e) => setCoachResponse(e.target.value.slice(0, 1000))}
                  rows={5}
                />
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-medium mt-1.5 text-right tabular-nums">
                  {coachResponse.length}/1000
                </p>
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <Checkbox
                  checked={planAdjustment}
                  onCheckedChange={setPlanAdjustment}
                />
                <span className="text-sm">I&apos;ll adjust the plan based on this feedback</span>
              </label>
            </SectionCard>

            {/* Submit — the page's one volt moment */}
            <Button
              onClick={handleCompleteCheckIn}
              disabled={!coachResponse.trim() || isSubmitting}
              className="w-full h-12 sm:h-14 mt-4 text-sm font-bold uppercase tracking-wider bg-brand text-brand-foreground hover:bg-brand/90 active:scale-[0.97] transition-[background-color,transform] duration-150"
              size="lg"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Complete check-in
            </Button>
          </section>
        </div>

        {/* Right sidebar: Previous check-ins (desktop only) */}
        <div className="hidden lg:block lg:w-80 lg:shrink-0">
          <div className="sticky top-4 animate-enter" style={{ animationDelay: '200ms' }}>
            {completedCheckIns.length > 0 && (
              <PreviousCheckInsList checkIns={completedCheckIns} />
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}

/* ── Inline sub-components ────────────────────────────────── */

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
    <section>
      <SectionLabel>Recent workouts · {finished.length}</SectionLabel>
      <SectionCard className="space-y-1.5">
        {finished.map((c) => (
          <div key={c.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/40">
            <span className="w-2 h-2 rounded-full bg-success shrink-0" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold tracking-tight truncate">{c.day?.name ?? 'Workout'}</p>
              {c.completedAt && (
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-medium">
                  {format(new Date(c.completedAt), 'EEE, MMM d')}
                </p>
              )}
            </div>
            {c.completionPct != null && (
              <p className="font-mono text-sm font-semibold tabular-nums shrink-0">
                {Math.round(c.completionPct)}%
              </p>
            )}
          </div>
        ))}
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
                <p className={cn('text-sm font-semibold', effort.text)}>
                  <span className="mr-1 select-none" aria-hidden="true">{effort.emoji}</span>
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
