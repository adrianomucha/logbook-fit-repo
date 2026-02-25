import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppState, ExerciseFlag } from '@/types';
import { getActiveCheckIn, completeCheckIn, createCheckIn, getRecentWorkouts } from '@/lib/checkin-helpers';
import { WeekSummaryCard } from '@/components/coach/checkin/WeekSummaryCard';
import { PreviousCheckIns } from '@/components/coach/checkin/PreviousCheckIns';
import { RecentContextPanel, RecentContextPanelMobile } from '@/components/coach/checkin/RecentContextPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Clock, CheckCircle2, ClipboardCheck, AlertTriangle, Dumbbell, Send, Flag } from 'lucide-react';
import { format, formatDistanceToNow, subDays } from 'date-fns';

interface ClientCheckInProps {
  appState: AppState;
  onUpdateState: (updater: (state: AppState) => AppState) => void;
}

const WORKOUT_FEELING_DISPLAY: Record<string, { label: string; emoji: string }> = {
  TOO_EASY: { label: 'Too Easy', emoji: '😴' },
  ABOUT_RIGHT: { label: 'About Right', emoji: '💪' },
  TOO_HARD: { label: 'Too Hard', emoji: '😰' },
};

const BODY_FEELING_DISPLAY: Record<string, { label: string; emoji: string }> = {
  FRESH: { label: 'Fresh', emoji: '✨' },
  NORMAL: { label: 'Normal', emoji: '👍' },
  TIRED: { label: 'Tired', emoji: '😓' },
  RUN_DOWN: { label: 'Run Down', emoji: '🥴' },
};

export function ClientCheckIn({ appState, onUpdateState }: ClientCheckInProps) {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();

  const [coachResponse, setCoachResponse] = useState('');
  const [planAdjustment, setPlanAdjustment] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const client = useMemo(
    () => appState.clients.find(c => c.id === clientId),
    [appState.clients, clientId]
  );

  const activeCheckIn = useMemo(
    () => clientId ? getActiveCheckIn(clientId, appState.checkIns) : undefined,
    [clientId, appState.checkIns]
  );

  const plan = useMemo(
    () => client ? appState.plans.find(p => p.id === client.currentPlanId) : undefined,
    [appState.plans, client]
  );

  // Get the flagged workout details if any
  const flaggedWorkout = useMemo(() => {
    if (!activeCheckIn?.flaggedWorkoutId) return null;
    return appState.completedWorkouts.find(w => w.id === activeCheckIn.flaggedWorkoutId);
  }, [activeCheckIn, appState.completedWorkouts]);

  // Get flagged exercises from recent workouts (past 7 days)
  const flaggedExercisesFromWeek = useMemo(() => {
    if (!clientId) return [];

    const sevenDaysAgo = subDays(new Date(), 7);

    // Get workout completions from the past week for this client
    const recentCompletions = appState.workoutCompletions.filter(
      (wc) =>
        wc.clientId === clientId &&
        wc.status === 'COMPLETED' &&
        wc.completedAt &&
        new Date(wc.completedAt) >= sevenDaysAgo
    );

    const recentCompletionIds = new Set(recentCompletions.map((wc) => wc.id));

    // Filter exercise flags to those workout completions
    return appState.exerciseFlags.filter(
      (ef) => recentCompletionIds.has(ef.workoutCompletionId)
    );
  }, [clientId, appState.workoutCompletions, appState.exerciseFlags]);

  // Helper to get exercise name from exercise ID
  const getExerciseNameById = (exerciseId: string): string => {
    if (!plan) return 'Exercise';
    for (const week of plan.weeks) {
      for (const day of week.days) {
        const exercise = day.exercises.find((e) => e.id === exerciseId);
        if (exercise) return exercise.name;
      }
    }
    return 'Exercise';
  };

  // Helper to get workout name from workoutCompletionId
  const getWorkoutNameByCompletionId = (workoutCompletionId: string): string => {
    const completion = appState.workoutCompletions.find((wc) => wc.id === workoutCompletionId);
    if (!completion) return 'Workout';
    return getWorkoutName(completion.dayId);
  };

  const getWorkoutName = (dayId: string): string => {
    if (!plan) return 'Workout';
    for (const week of plan.weeks) {
      const day = week.days.find(d => d.id === dayId);
      if (day) return day.name;
    }
    return 'Workout';
  };

  const handleBack = () => {
    navigate(`/coach/clients/${clientId}?tab=overview`);
  };

  const handleStartNewCheckIn = () => {
    if (!clientId) return;
    const newCheckIn = createCheckIn(clientId, appState.currentUserId);
    onUpdateState((state) => ({
      ...state,
      checkIns: [...state.checkIns, newCheckIn],
    }));
  };

  const handleCompleteCheckIn = () => {
    if (!activeCheckIn || !coachResponse.trim()) return;

    const completed = completeCheckIn(activeCheckIn, {
      coachResponse: coachResponse.trim(),
      planAdjustment,
    });

    onUpdateState((state) => ({
      ...state,
      checkIns: state.checkIns.map(c => c.id === activeCheckIn.id ? completed : c),
      // Update client's lastCheckInDate
      clients: state.clients.map(c =>
        c.id === clientId
          ? { ...c, lastCheckInDate: new Date().toISOString() }
          : c
      ),
    }));

    setShowSuccess(true);
  };

  // Client not found
  if (!client) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-12">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-bold mb-2">Client Not Found</h2>
            <p className="text-muted-foreground mb-4">This client doesn't exist.</p>
            <Button onClick={() => navigate('/coach')}>Back to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success screen
  if (showSuccess) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-12">
            <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-600" />
            <h2 className="text-2xl font-bold mb-2">Check-in Complete!</h2>
            <p className="text-muted-foreground mb-6">
              Your response has been recorded for {client.name}.
            </p>
            <div className="space-y-2">
              <Button onClick={handleBack} className="w-full">
                Back to {client.name}'s Profile
              </Button>
              <Button variant="outline" onClick={() => navigate('/coach')} className="w-full">
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // State C: No active check-in
  if (!activeCheckIn) {
    return (
      <div className="min-h-screen bg-background p-3 sm:p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <div>
            <Button variant="ghost" onClick={handleBack} className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Profile
            </Button>
            <h1 className="text-2xl sm:text-3xl font-bold">Check-in for {client.name}</h1>
          </div>

          <Card>
            <CardContent className="text-center py-12">
              <ClipboardCheck className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-bold mb-2">No Active Check-in</h2>
              <p className="text-muted-foreground mb-6">
                Start a new check-in to hear how {client.name} is doing.
              </p>
              <Button onClick={handleStartNewCheckIn}>
                <ClipboardCheck className="w-4 h-4 mr-2" />
                Send Check-in
              </Button>
            </CardContent>
          </Card>

          {/* Previous check-ins */}
          <PreviousCheckIns checkIns={appState.checkIns} clientId={client.id} />
        </div>
      </div>
    );
  }

  // State A: Pending (waiting for client)
  if (activeCheckIn.status === 'pending') {
    const sentAgo = formatDistanceToNow(new Date(activeCheckIn.date), { addSuffix: true });

    return (
      <div className="min-h-screen bg-background p-3 sm:p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <div>
            <Button variant="ghost" onClick={handleBack} className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Profile
            </Button>
            <h1 className="text-2xl sm:text-3xl font-bold">Check-in for {client.name}</h1>
          </div>

          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
            <CardContent className="py-8">
              <div className="text-center">
                <Clock className="w-12 h-12 mx-auto mb-4 text-amber-600" />
                <h2 className="text-xl font-bold mb-2">Waiting for {client.name}</h2>
                <p className="text-muted-foreground">
                  Check-in sent {sentAgo}. {client.name} hasn't responded yet.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Week summary while waiting */}
          <WeekSummaryCard
            clientId={client.id}
            completedWorkouts={appState.completedWorkouts}
            plan={plan}
          />

          {/* Previous check-ins */}
          <PreviousCheckIns checkIns={appState.checkIns} clientId={client.id} />
        </div>
      </div>
    );
  }

  // State B: Responded (coach needs to review)
  const workoutFeeling = activeCheckIn.workoutFeeling
    ? WORKOUT_FEELING_DISPLAY[activeCheckIn.workoutFeeling]
    : null;
  const bodyFeeling = activeCheckIn.bodyFeeling
    ? BODY_FEELING_DISPLAY[activeCheckIn.bodyFeeling]
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
          <h1 className="text-2xl sm:text-3xl font-bold">Check-in for {client.name}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Submitted {activeCheckIn.clientRespondedAt
              ? formatDistanceToNow(new Date(activeCheckIn.clientRespondedAt), { addSuffix: true })
              : 'recently'}
          </p>
        </div>

        {/* Two-column layout on desktop */}
        <div className="flex flex-col lg:flex-row lg:gap-6">
          {/* Main content column */}
          <div className="flex-1 space-y-4">
            {/* Client Response Card */}
            <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/10">
              <CardHeader>
                <CardTitle className="text-base">
                  {client.avatar} {client.name}'s Response
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Feeling indicators */}
                <div className="grid grid-cols-2 gap-3">
                  {workoutFeeling && (
                    <div className="bg-background rounded-lg p-3 border">
                      <p className="text-xs text-muted-foreground mb-1">Workouts felt</p>
                      <p className="text-sm font-medium">
                        {workoutFeeling.emoji} {workoutFeeling.label}
                      </p>
                    </div>
                  )}
                  {bodyFeeling && (
                    <div className="bg-background rounded-lg p-3 border">
                      <p className="text-xs text-muted-foreground mb-1">Body feels</p>
                      <p className="text-sm font-medium">
                        {bodyFeeling.emoji} {bodyFeeling.label}
                      </p>
                    </div>
                  )}
                </div>

                {/* Client notes */}
                {activeCheckIn.clientNotes && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Notes from {client.name}</p>
                    <p className="text-sm bg-background rounded-lg p-3 border">
                      {activeCheckIn.clientNotes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Flagged Workout Card */}
            {activeCheckIn.flaggedWorkoutId && flaggedWorkout && (
              <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/10">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Flagged Workout
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="bg-background rounded-lg p-3 border">
                    <p className="font-medium text-sm">{getWorkoutName(flaggedWorkout.dayId)}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(flaggedWorkout.completedAt), 'EEEE, MMM d')}
                    </p>
                    <div className="mt-2 space-y-1">
                      {flaggedWorkout.exercises.map((ex) => (
                        <p key={ex.id} className="text-xs text-muted-foreground">
                          {ex.name} — {ex.sets} sets × {ex.reps || ex.time} {ex.weight ? `@ ${ex.weight}` : ''}
                        </p>
                      ))}
                    </div>
                  </div>
                  {activeCheckIn.flaggedWorkoutNote && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{client.name}'s note</p>
                      <p className="text-sm bg-background rounded-lg p-3 border">
                        {activeCheckIn.flaggedWorkoutNote}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Flagged Exercises from Recent Workouts */}
            {flaggedExercisesFromWeek.length > 0 && (
              <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/10">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Flag className="w-4 h-4 text-amber-600" />
                    Flagged Exercises This Week ({flaggedExercisesFromWeek.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {flaggedExercisesFromWeek.map((flag) => (
                    <div key={flag.id} className="bg-background rounded-lg p-3 border">
                      <div className="flex items-center gap-2">
                        <Dumbbell className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-sm">
                          {getExerciseNameById(flag.exerciseId)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {getWorkoutNameByCompletionId(flag.workoutCompletionId)} ·{' '}
                        {format(new Date(flag.flaggedAt), 'MMM d')}
                      </p>
                      {flag.note && (
                        <p className="text-sm mt-2 p-2 bg-muted rounded italic">
                          "{flag.note}"
                        </p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Week Summary */}
            <WeekSummaryCard
              clientId={client.id}
              completedWorkouts={appState.completedWorkouts}
              plan={plan}
            />

            {/* Mobile: Collapsible context panel */}
            <RecentContextPanelMobile
              clientId={client.id}
              clientName={client.name}
              checkIns={appState.checkIns}
              completedWorkouts={appState.completedWorkouts}
              currentCheckInId={activeCheckIn.id}
              workoutsPerWeek={plan?.workoutsPerWeek}
            />

            {/* Coach Response */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Your Response</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Textarea
                    placeholder={`Write your response to ${client.name}...`}
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
              disabled={!coachResponse.trim()}
              className="w-full"
              size="lg"
            >
              <Send className="w-4 h-4 mr-2" />
              Complete Check-in
            </Button>
          </div>

          {/* Right sidebar: Recent Context (desktop only) */}
          <div className="hidden lg:block lg:w-80 lg:shrink-0">
            <div className="sticky top-4">
              <RecentContextPanel
                clientId={client.id}
                clientName={client.name}
                checkIns={appState.checkIns}
                completedWorkouts={appState.completedWorkouts}
                currentCheckInId={activeCheckIn.id}
                workoutsPerWeek={plan?.workoutsPerWeek}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
