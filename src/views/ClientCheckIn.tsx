import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCoachClientProfile } from '@/hooks/api/useCoachClientProfile';
import { useCheckIn, createCheckInForClient } from '@/hooks/api/useCheckIn';
import { apiFetch } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft, Clock, CheckCircle2, ClipboardCheck,
  Dumbbell, Send, Loader2,
} from 'lucide-react';
import { CoachNav } from '@/components/coach/CoachNav';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { FEELING_DISPLAY } from '@/lib/feeling-display';
import { avatarColor } from '@/lib/avatar-colors';
import { format, formatDistanceToNow } from 'date-fns';

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
      <div className="min-h-dvh bg-background pb-8 sm:pb-4">
        <CoachNav activeTab="clients" />
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 px-3 pt-3 sm:px-4 sm:pt-7">
          <Card className="max-w-md mx-auto">
            <CardContent className="text-center py-12">
              <div className="text-4xl select-none mb-4 animate-bounce-once">🔍</div>
              <h2 className="text-xl font-bold mb-2 tracking-tight antialiased">Can&apos;t find this client</h2>
              <p className="text-sm text-muted-foreground mb-5 antialiased">They may have been removed, or the link might be outdated.</p>
              <Button onClick={() => router.push('/coach/clients')} className="active:scale-[0.96] transition-transform duration-150">Back to clients</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Success screen
  if (showSuccess) {
    return (
      <div className="min-h-dvh bg-background pb-8 sm:pb-4">
        <CoachNav activeTab="clients" />
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 px-3 pt-3 sm:px-4 sm:pt-7">
          <Card className="max-w-md mx-auto">
            <CardContent className="text-center py-12">
              <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-success animate-bounce-once" />
              <h2 className="text-2xl font-bold mb-2">Check-in sent</h2>
              <p className="text-muted-foreground mb-6">
                Your response has been recorded for {clientName}.
              </p>
              <div className="space-y-2">
                <Button onClick={handleBack} className="w-full">
                  Back to {clientName}&apos;s profile
                </Button>
                <Button variant="outline" onClick={() => router.push('/coach')} className="w-full">
                  Back to dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
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
      <div className="min-h-dvh bg-background pb-8 sm:pb-4">
        <CoachNav activeTab="clients" />
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 px-3 pt-3 sm:px-4 sm:pt-7">

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="h-8 w-8 p-0 shrink-0"
              aria-label="Back to profile"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 select-none', avatarColor(clientName))}>
              {clientName.charAt(0).toUpperCase()}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">
              Check-in for {clientName}
            </h1>
          </div>

          <Card>
            <CardContent className="text-center py-12">
              <ClipboardCheck className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-bold mb-2">No active check-in</h2>
              <p className="text-muted-foreground mb-6">
                Start a new check-in to hear how {clientName} is doing.
              </p>
              <Button onClick={handleStartNewCheckIn} disabled={isCreating}>
                {isCreating ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <ClipboardCheck className="w-4 h-4 mr-2" />
                )}
                Send Check-in
              </Button>
            </CardContent>
          </Card>

          {/* Previous check-ins summary */}
          {completedCheckIns.length > 0 && (
            <PreviousCheckInsList checkIns={completedCheckIns} />
          )}
        </div>
      </div>
    );
  }

  // State A: Pending (waiting for client)
  if (activeCheckIn?.status === 'PENDING') {
    const sentAgo = formatDistanceToNow(new Date(activeCheckIn.createdAt), { addSuffix: true });

    return (
      <div className="min-h-dvh bg-background pb-8 sm:pb-4">
        <CoachNav activeTab="clients" />
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 px-3 pt-3 sm:px-4 sm:pt-7">

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="h-8 w-8 p-0 shrink-0"
              aria-label="Back to Profile"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 select-none', avatarColor(clientName))}>
              {clientName.charAt(0).toUpperCase()}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">
              Check-in for {clientName}
            </h1>
          </div>

          <Card className="border-warning/20 bg-warning/5">
            <CardContent className="py-8">
              <div className="text-center">
                <Clock className="w-12 h-12 mx-auto mb-4 text-warning" />
                <h2 className="text-xl font-bold mb-2">Waiting for {clientName}</h2>
                <p className="text-muted-foreground">
                  Check-in sent {sentAgo}. {clientName} hasn&apos;t responded yet.
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-4 text-muted-foreground hover:text-destructive"
                  disabled={isWithdrawing}
                  onClick={handleWithdrawCheckIn}
                >
                  {isWithdrawing ? 'Withdrawing…' : 'Withdraw check-in'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent completions while waiting */}
          <RecentCompletionsList completions={client.completions} />

          {/* Previous check-ins */}
          {completedCheckIns.length > 0 && (
            <PreviousCheckInsList checkIns={completedCheckIns} />
          )}
        </div>
      </div>
    );
  }

  // State B: Client responded — coach needs to review
  const effortDisplay = activeCheckIn?.effortRating
    ? FEELING_DISPLAY[activeCheckIn.effortRating]
    : null;
  const feelingDisplay = activeCheckIn?.clientFeeling
    ? FEELING_DISPLAY[activeCheckIn.clientFeeling]
    : null;

  return (
    <div className="min-h-dvh bg-background pb-8 sm:pb-4">
      <CoachNav activeTab="clients" />
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 px-3 pt-3 sm:px-4 sm:pt-7">

        {/* Header */}
        <div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="h-8 w-8 p-0 shrink-0"
              aria-label="Back to Profile"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 select-none', avatarColor(clientName))}>
              {clientName.charAt(0).toUpperCase()}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">
              Check-in for {clientName}
            </h1>
          </div>
          <p className="text-muted-foreground text-sm mt-1 pl-11">
            Submitted {activeCheckIn?.clientRespondedAt
              ? formatDistanceToNow(new Date(activeCheckIn.clientRespondedAt), { addSuffix: true })
              : 'recently'}
          </p>
        </div>

        {/* Two-column layout on desktop */}
        <div className="flex flex-col lg:flex-row lg:gap-6">
          {/* Main content column */}
          <div className="flex-1 space-y-4">
            {/* Client Response Card */}
            <Card className="border-info/20 bg-info/5">
              <CardHeader>
                <CardTitle className="text-base">
                  {clientName}&apos;s Response
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Feeling indicators */}
                <div className="grid grid-cols-2 gap-3">
                  {effortDisplay && (
                    <div className="bg-background rounded-lg p-3 border">
                      <p className="text-xs text-muted-foreground mb-1">Workouts felt</p>
                      <p className={cn('text-sm font-semibold', effortDisplay.text)}>
                        {effortDisplay.emoji} {effortDisplay.label}
                      </p>
                    </div>
                  )}
                  {feelingDisplay && (
                    <div className="bg-background rounded-lg p-3 border">
                      <p className="text-xs text-muted-foreground mb-1">Body feels</p>
                      <p className={cn('text-sm font-semibold', feelingDisplay.text)}>
                        {feelingDisplay.emoji} {feelingDisplay.label}
                      </p>
                    </div>
                  )}
                </div>

                {/* Pain/blockers notes */}
                {activeCheckIn?.painBlockers && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Notes from {clientName}</p>
                    <p className="text-sm bg-background rounded-lg p-3 border">
                      {activeCheckIn.painBlockers}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Completions */}
            <RecentCompletionsList
              completions={activeCheckIn?.client.completions ?? client.completions}
            />

            {/* Previous check-ins (mobile) */}
            {completedCheckIns.length > 0 && (
              <div className="lg:hidden">
                <PreviousCheckInsList checkIns={completedCheckIns} />
              </div>
            )}

            {/* Coach Response */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base" id="coach-response-label">Your response</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Textarea
                    aria-labelledby="coach-response-label"
                    placeholder={`Write your response to ${clientName}…`}
                    value={coachResponse}
                    onChange={(e) => setCoachResponse(e.target.value.slice(0, 1000))}
                    rows={4}
                  />
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-medium mt-1 text-right tabular-nums">
                    {coachResponse.length}/1000
                  </p>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planAdjustment}
                    onChange={(e) => setPlanAdjustment(e.target.checked)}
                    className="rounded border-input"
                  />
                  <span className="text-sm">I&apos;ll adjust the plan based on this feedback</span>
                </label>
              </CardContent>
            </Card>

            {/* Submit */}
            <Button
              onClick={handleCompleteCheckIn}
              disabled={!coachResponse.trim() || isSubmitting}
              className="w-full"
              size="lg"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Complete Check-in
            </Button>
          </div>

          {/* Right sidebar: Previous check-ins (desktop only) */}
          <div className="hidden lg:block lg:w-80 lg:shrink-0">
            <div className="sticky top-4">
              {completedCheckIns.length > 0 && (
                <PreviousCheckInsList checkIns={completedCheckIns} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
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
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Dumbbell className="w-4 h-4" />
          Recent Workouts
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {finished.map((c) => (
            <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
              <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{c.day?.name ?? 'Workout'}</p>
                {c.completedAt && (
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(c.completedAt), 'EEEE, MMM d')}
                  </p>
                )}
              </div>
              {c.completionPct != null && (
                <p className="text-xs text-muted-foreground shrink-0">
                  {Math.round(c.completionPct)}%
                </p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
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
    <Card className="bg-muted/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Previous Check-ins ({checkIns.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {checkIns.map((checkIn, index) => {
          const effort = checkIn.effortRating
            ? FEELING_DISPLAY[checkIn.effortRating]
            : null;
          return (
            <div
              key={checkIn.id}
              className={`text-sm space-y-1 ${
                index < checkIns.length - 1 ? 'pb-3 border-b' : ''
              }`}
            >
              <p className="font-medium text-foreground">
                {format(new Date(checkIn.completedAt || checkIn.createdAt), 'MMM d, yyyy')}
              </p>
              {effort && (
                <p className={cn('font-medium', effort.text)}>
                  <span className="mr-1">{effort.emoji}</span>
                  {effort.label}
                </p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
