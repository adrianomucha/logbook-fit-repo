import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useClientProfile } from '@/hooks/api/useClientProfile';
import { useCheckIn, createCheckInForClient } from '@/hooks/api/useCheckIn';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft, Clock, CheckCircle2, ClipboardCheck, AlertTriangle,
  Dumbbell, Send, Loader2,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

const EFFORT_DISPLAY: Record<string, { label: string; emoji: string }> = {
  TOO_EASY: { label: 'Too Easy', emoji: '😴' },
  ABOUT_RIGHT: { label: 'About Right', emoji: '💪' },
  TOO_HARD: { label: 'Too Hard', emoji: '😰' },
};

const FEELING_DISPLAY: Record<string, { label: string; emoji: string }> = {
  FRESH: { label: 'Fresh', emoji: '✨' },
  NORMAL: { label: 'Normal', emoji: '👍' },
  TIRED: { label: 'Tired', emoji: '😓' },
  RUN_DOWN: { label: 'Run Down', emoji: '🥴' },
};

export function ClientCheckIn() {
  const params = useParams<{ clientId: string }>();
  const clientId = params?.clientId ?? null;
  const router = useRouter();

  const { client, isLoading: isClientLoading, refresh: refreshClient } = useClientProfile(clientId);

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
      // Could show an error toast
    } finally {
      setIsCreating(false);
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
      // Could show an error toast
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-3 sm:p-4 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Client not found
  if (!client) {
    return (
      <div className="min-h-screen bg-background p-3 sm:p-4 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-12">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-bold mb-2">Client Not Found</h2>
            <p className="text-muted-foreground mb-4">This client doesn't exist.</p>
            <Button onClick={() => router.push('/coach')}>Back to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success screen
  if (showSuccess) {
    return (
      <div className="min-h-screen bg-background p-3 sm:p-4 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-12">
            <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-success" />
            <h2 className="text-2xl font-bold mb-2">Check-in Complete!</h2>
            <p className="text-muted-foreground mb-6">
              Your response has been recorded for {clientName}.
            </p>
            <div className="space-y-2">
              <Button onClick={handleBack} className="w-full">
                Back to {clientName}'s Profile
              </Button>
              <Button variant="outline" onClick={() => router.push('/coach')} className="w-full">
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
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
      <div className="min-h-screen bg-background p-3 sm:p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <div>
            <Button variant="ghost" onClick={handleBack} className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Profile
            </Button>
            <h1 className="text-2xl sm:text-3xl font-bold">Check-in for {clientName}</h1>
          </div>

          <Card>
            <CardContent className="text-center py-12">
              <ClipboardCheck className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-bold mb-2">No Active Check-in</h2>
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
      <div className="min-h-screen bg-background p-3 sm:p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <div>
            <Button variant="ghost" onClick={handleBack} className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Profile
            </Button>
            <h1 className="text-2xl sm:text-3xl font-bold">Check-in for {clientName}</h1>
          </div>

          <Card className="border-warning/20 bg-warning/5">
            <CardContent className="py-8">
              <div className="text-center">
                <Clock className="w-12 h-12 mx-auto mb-4 text-warning" />
                <h2 className="text-xl font-bold mb-2">Waiting for {clientName}</h2>
                <p className="text-muted-foreground">
                  Check-in sent {sentAgo}. {clientName} hasn't responded yet.
                </p>
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
    ? EFFORT_DISPLAY[activeCheckIn.effortRating]
    : null;
  const feelingDisplay = activeCheckIn?.clientFeeling
    ? FEELING_DISPLAY[activeCheckIn.clientFeeling]
    : null;

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-4">
          <Button variant="ghost" onClick={handleBack} className="mb-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Profile
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold">Check-in for {clientName}</h1>
          <p className="text-muted-foreground text-sm mt-1">
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
                  {clientName}'s Response
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Feeling indicators */}
                <div className="grid grid-cols-2 gap-3">
                  {effortDisplay && (
                    <div className="bg-background rounded-lg p-3 border">
                      <p className="text-xs text-muted-foreground mb-1">Workouts felt</p>
                      <p className="text-sm font-medium">
                        {effortDisplay.emoji} {effortDisplay.label}
                      </p>
                    </div>
                  )}
                  {feelingDisplay && (
                    <div className="bg-background rounded-lg p-3 border">
                      <p className="text-xs text-muted-foreground mb-1">Body feels</p>
                      <p className="text-sm font-medium">
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
                <CardTitle className="text-base">Your Response</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Textarea
                    placeholder={`Write your response to ${clientName}...`}
                    value={coachResponse}
                    onChange={(e) => setCoachResponse(e.target.value.slice(0, 1000))}
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground mt-1 text-right">
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
                  <span className="text-sm">I'll adjust the plan based on this feedback</span>
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
  if (completions.length === 0) return null;

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
          {completions.map((c) => (
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
            ? EFFORT_DISPLAY[checkIn.effortRating]
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
                <p className="text-muted-foreground">
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
