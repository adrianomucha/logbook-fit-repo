'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Client, CheckIn, WorkoutPlan, WorkoutCompletion, Message } from '@/types';
import { getCurrentWeekNumber, getWeekDays, getTodayWorkout } from '@/lib/workout-week-helpers';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useClientWeekOverview } from '@/hooks/api/useClientWeekOverview';
import { useClientProgress } from '@/hooks/api/useClientProgress';
import { useClientCheckIns } from '@/hooks/api/useClientCheckIns';
import { useMessages } from '@/hooks/api/useMessages';
import { useClientPlan } from '@/hooks/api/useClientPlan';
import type { PlanDetail } from '@/hooks/api/usePlanDetail';
import { apiFetch } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { WeeklyOverview } from '@/components/client/weekly/WeeklyOverview';
import { TodayFocusView } from '@/components/client/today/TodayFocusView';
import { ChatView } from '@/components/chat/ChatView';
import { ProgressHistory } from '@/components/client/ProgressHistory';
import { CoachFeedbackCard } from '@/components/client/CoachFeedbackCard';
import { CheckInDetailModal } from '@/components/client/CheckInDetailModal';
import { ClientNav } from '@/components/client/ClientNav';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle } from 'lucide-react';

// ---- Data Adapters ----

function apiPlanToWorkoutPlan(plan: PlanDetail): WorkoutPlan {
  return {
    id: plan.id,
    name: plan.name,
    description: plan.description ?? undefined,
    durationWeeks: plan.durationWeeks,
    weeks: plan.weeks.map((w) => ({
      id: w.id,
      weekNumber: w.weekNumber,
      days: w.days.map((d) => ({
        id: d.id,
        dayNumber: d.dayNumber,
        name: d.name ?? `Day ${d.dayNumber}`,
        description: d.description ?? undefined,
        isRestDay: d.isRestDay,
        exercises: d.exercises.map((e) => ({
          id: e.id,
          name: e.exercise.name,
          category: e.exercise.category ?? undefined,
          sets: e.sets,
          reps: e.reps ?? undefined,
          weight: e.weight ?? undefined,
          notes: e.coachNotes ?? undefined,
        })),
      })),
    })),
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  };
}

function apiCheckInToLocalCheckIn(
  ci: { id: string; status: string; createdAt: string; effortRating: string | null; painBlockers: string | null; clientFeeling: string | null; clientRespondedAt: string | null; coachFeedback: string | null; planAdjustment: boolean | null; completedAt: string | null },
  clientProfileId: string,
  coachUserId: string
): CheckIn {
  return {
    id: ci.id,
    clientId: clientProfileId,
    coachId: coachUserId,
    date: ci.createdAt,
    status: ci.status === 'PENDING' ? 'pending' : ci.status === 'CLIENT_RESPONDED' ? 'responded' : 'completed',
    workoutFeeling: (ci.effortRating as CheckIn['workoutFeeling']) ?? undefined,
    bodyFeeling: (ci.clientFeeling as CheckIn['bodyFeeling']) ?? undefined,
    clientNotes: ci.painBlockers ?? undefined,
    clientRespondedAt: ci.clientRespondedAt ?? undefined,
    coachResponse: ci.coachFeedback ?? undefined,
    planAdjustment: ci.planAdjustment || undefined,
    completedAt: ci.completedAt ?? undefined,
  };
}

// ---- Component ----

type View = 'workout' | 'chat' | 'progress';
type WorkoutViewMode = 'today' | 'weekly';

export function ClientDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentView, setCurrentView] = useState<View>('workout');
  const [workoutViewMode, setWorkoutViewMode] = useState<WorkoutViewMode>('today');
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);

  // ---- API Hooks ----
  const { user, coach, isLoading: isLoadingUser, error: userError } = useCurrentUser();
  const { weekOverview, isLoading: isLoadingWeek, refresh: refreshWeek, error: weekError } = useClientWeekOverview();
  const { progress } = useClientProgress();
  const { checkIns: apiCheckIns } = useClientCheckIns();
  const coachUserId = coach?.user.id ?? null;
  const { messages: apiMessages, sendMessage } = useMessages(coachUserId);

  // Fetch full plan detail for sub-components that need the full plan structure
  const { plan: planDetail, error: planError } = useClientPlan();

  const hasDataError = !!(userError || weekError || planError);

  // Handle URL tab parameter
  useEffect(() => {
    const tab = searchParams?.get('tab');
    if (tab === 'chat') setCurrentView('chat');
    else if (tab === 'progress') setCurrentView('progress');
    else if (tab === 'workout') setCurrentView('workout');
  }, [searchParams]);

  // ---- Adapted Data ----

  const client: Client | null = useMemo(() => {
    if (!user?.clientProfile) return null;
    return {
      id: user.clientProfile.id,
      name: user.name ?? 'Unknown',
      email: user.email,
      currentPlanId: user.clientProfile.activePlanId ?? undefined,
      status: 'active' as const,
      planStartDate: user.clientProfile.planStartDate ?? undefined,
    };
  }, [user]);

  const plan: WorkoutPlan | null = useMemo(
    () => (planDetail ? apiPlanToWorkoutPlan(planDetail) : null),
    [planDetail]
  );

  const checkIns: CheckIn[] = useMemo(
    () =>
      apiCheckIns.map((ci) =>
        apiCheckInToLocalCheckIn(ci, client?.id ?? '', coachUserId ?? '')
      ),
    [apiCheckIns, client, coachUserId]
  );

  const pendingCheckIn = useMemo(
    () => checkIns.find((c) => c.status === 'pending'),
    [checkIns]
  );

  // Most recent completed check-in from this week (for coach feedback card)
  const thisWeekCheckIn = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return (
      checkIns
        .filter((c) => c.status === 'completed' && c.completedAt)
        .filter((c) => new Date(c.completedAt!) >= weekAgo)
        .sort(
          (a, b) =>
            new Date(b.completedAt!).getTime() -
            new Date(a.completedAt!).getTime()
        )[0] ?? null
    );
  }, [checkIns]);

  // Build adapted workout completions from week overview
  const clientWorkoutCompletions: WorkoutCompletion[] = useMemo(() => {
    if (!weekOverview || !client) return [];
    return weekOverview.days
      .filter((d) => d.status !== 'NOT_STARTED')
      .map((d) => ({
        id: d.completionId ?? `wc-${d.dayId}`,
        clientId: client.id,
        planId: weekOverview.plan.id,
        weekId: weekOverview.weekId,
        dayId: d.dayId,
        status: d.status as WorkoutCompletion['status'],
        completionPct: d.completionPct ?? 0,
        exercisesDone: d.exercisesDone ?? 0,
        exercisesTotal: d.exerciseCount,
        startedAt: d.startedAt ?? undefined,
        completedAt: d.completedAt ?? undefined,
        durationSec: d.durationSec ?? undefined,
        effortRating: (d.effortRating as WorkoutCompletion['effortRating']) ?? undefined,
      }));
  }, [weekOverview, client]);

  // Today's workout data for TodayFocusView
  const { todayWorkout, todayCompletion, todayCoachNote, currentWeek } = useMemo(() => {
    if (!client?.planStartDate || !plan || !weekOverview) {
      return { todayWorkout: null, todayCompletion: null, todayCoachNote: undefined, currentWeek: null };
    }

    const durationWeeks = plan.durationWeeks || plan.weeks.length;
    const weekNumber = getCurrentWeekNumber(client.planStartDate, durationWeeks);
    const currentWeek = plan.weeks.find((w) => w.weekNumber === weekNumber);

    if (!currentWeek) {
      return { todayWorkout: null, todayCompletion: null, todayCoachNote: undefined, currentWeek: null };
    }

    const weekDays = getWeekDays(
      client.planStartDate,
      currentWeek,
      clientWorkoutCompletions,
      client.id
    );

    const today = getTodayWorkout(weekDays);
    const completion = today?.completion || null;

    const exercises = today?.workoutDay?.exercises || [];
    const firstNote = exercises.find((e) => e.notes?.trim())?.notes;

    return {
      todayWorkout: today,
      todayCompletion: completion,
      todayCoachNote: firstNote,
      currentWeek,
    };
  }, [client, plan, weekOverview, clientWorkoutCompletions]);

  // Messages adapted for ChatView
  const messages: Message[] = useMemo(
    () =>
      apiMessages.map((m) => ({
        id: m.id,
        senderId: m.senderId,
        senderName: m.sender?.name ?? 'Unknown',
        content: m.content,
        timestamp: m.createdAt,
        read: m.readAt !== null,
        clientId: client?.id ?? '',
      })).reverse(),
    [apiMessages, client]
  );

  // ---- Handlers ----
  const handleSendMessage = async (content: string) => {
    try {
      await sendMessage(content);
    } catch {
      toast.error('Failed to send message. Please try again.');
    }
  };

  const handleStartWorkout = () => {
    if (todayWorkout?.workoutDay && currentWeek) {
      router.push(`/client/workout/${currentWeek.id}/${todayWorkout.workoutDay.id}`);
    }
  };

  const handleResumeWorkout = () => {
    if (todayWorkout?.workoutDay && currentWeek) {
      router.push(`/client/workout/${currentWeek.id}/${todayWorkout.workoutDay.id}`);
    }
  };

  const handleSendFeedback = async (rating: 'EASY' | 'MEDIUM' | 'HARD', notes?: string) => {
    if (!todayCompletion?.id) return;
    setIsSendingFeedback(true);
    try {
      await apiFetch(`/api/client/workout/${todayCompletion.id}/finish`, {
        method: 'POST',
        body: JSON.stringify({ effortRating: rating }),
      });
      if (notes) {
        await handleSendMessage(`Workout feedback: ${rating.toLowerCase()}. ${notes}`);
      }
      setFeedbackSent(true);
      await refreshWeek();
    } catch {
      toast.error('Failed to send feedback. Please try again.');
    } finally {
      setIsSendingFeedback(false);
    }
  };

  const [isRestartingWorkout, setIsRestartingWorkout] = useState(false);

  const handleRestartWorkout = async () => {
    if (!todayCompletion?.id || !todayWorkout?.workoutDay || !currentWeek) return;
    setIsRestartingWorkout(true);
    try {
      await apiFetch(`/api/client/workout/${todayCompletion.id}/restart`, {
        method: 'POST',
      });
      router.push(`/client/workout/${currentWeek.id}/${todayWorkout.workoutDay.id}`);
    } catch {
      toast.error('Failed to restart workout. Please try again.');
      setIsRestartingWorkout(false);
    }
  };

  const handleMessageCoach = () => {
    setCurrentView('chat');
    requestAnimationFrame(() => window.scrollTo(0, 0));
  };

  // ---- Loading/Empty States ----
  if (isLoadingUser || isLoadingWeek) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (hasDataError && !client && !plan) {
    return (
      <div className="min-h-screen bg-background p-3 sm:p-4 flex items-center justify-center">
        <Card>
          <CardContent className="py-8 text-center">
            <AlertCircle className="w-10 h-10 mx-auto text-destructive mb-3" />
            <h2 className="text-lg font-semibold mb-1">Couldn&apos;t load your data</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Check your connection and try again.
            </p>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!client || !plan) {
    return (
      <div className="min-h-screen bg-background p-3 sm:p-4 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">No Workout Plan Assigned</h1>
          <p className="text-muted-foreground">
            Contact your coach to get started with a workout plan.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      'bg-background p-3 sm:p-4',
      currentView === 'chat'
        ? 'fixed inset-0 pb-20 flex flex-col overflow-hidden sm:relative sm:pb-0 sm:min-h-screen'
        : 'min-h-screen pb-24 sm:pb-4'
    )}>
      <div className={cn(
        'max-w-2xl mx-auto',
        currentView === 'chat'
          ? 'flex-1 flex flex-col min-h-0 gap-3 sm:gap-4'
          : 'space-y-4 sm:space-y-6'
      )}>
        <ClientNav
          activeTab={currentView}
          onTabChange={(tab) => {
            setCurrentView(tab);
            window.scrollTo(0, 0);
          }}
        />

        {/* Check-in prompt banner */}
        {pendingCheckIn && (
          <section aria-label="Pending check-in">
            <div className="rounded-lg bg-muted/40 px-4 py-3.5">
              <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-medium mb-2">
                Check-in
              </p>
              <p className="text-sm font-bold tracking-tight mb-1">Your coach wants to hear how training is going</p>
              <Button
                onClick={() => router.push(`/client/checkin/${pendingCheckIn.id}`)}
                className="w-full h-11 text-sm font-bold uppercase tracking-wider bg-foreground text-background hover:bg-foreground/90 mt-2.5"
                size="sm"
              >
                Complete Check-in
              </Button>
            </div>
          </section>
        )}

        {/* Workout Views */}
        {currentView === 'workout' && workoutViewMode === 'today' && (
          <TodayFocusView
            client={client}
            todayWorkout={todayWorkout}
            todayCompletion={todayCompletion}
            coachNote={todayCoachNote}
            coachName={coach?.user.name ?? undefined}
            coachAvatar={undefined}
            feedbackSubmitted={feedbackSent || !!todayCompletion?.effortRating}
            isSendingFeedback={isSendingFeedback}
            onStartWorkout={handleStartWorkout}
            onResumeWorkout={handleResumeWorkout}
            onRestartWorkout={handleRestartWorkout}
            isRestarting={isRestartingWorkout}
            onSendFeedback={handleSendFeedback}
            onMessageCoach={handleMessageCoach}
            onViewWeekly={() => setWorkoutViewMode('weekly')}
          />
        )}

        {currentView === 'workout' && workoutViewMode === 'weekly' && (
          <>
            <div className="flex items-center justify-between">
              <button
                onClick={() => setWorkoutViewMode('today')}
                className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground font-medium hover:text-foreground transition-colors touch-manipulation"
              >
                ← Today
              </button>
            </div>

            <WeeklyOverview
              client={client}
              plan={plan}
              completions={clientWorkoutCompletions}
            />

            {thisWeekCheckIn && (
              <CoachFeedbackCard
                checkIn={thisWeekCheckIn}
                onViewDetails={() => setShowCheckInModal(true)}
              />
            )}
          </>
        )}

        {currentView === 'chat' && coachUserId && (
          <>
            <div className="shrink-0">
              <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-medium mb-1">Messages</p>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{coach?.user.name ?? 'Coach'}</h1>
            </div>
            <ChatView
              client={client}
              messages={messages}
              currentUserId={user?.id ?? ''}
              currentUserName={client.name}
              onSendMessage={handleSendMessage}
              heightClass="flex-1 min-h-0 sm:h-[600px] sm:flex-none"
              peerName={coach?.user.name ?? 'Coach'}
              conversationStarters={[
                'How should I warm up?',
                'Feeling sore today',
                'Can we adjust my plan?',
              ]}
            />
          </>
        )}

        {currentView === 'progress' && (
          <>
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-medium mb-1">History</p>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Progress</h1>
            </div>
            <ProgressHistory
              completedWorkouts={[]}
              plans={plan ? [plan] : []}
              client={client}
              plan={plan}
              workoutCompletions={clientWorkoutCompletions}
              measurements={[]}
            />
          </>
        )}
      </div>

      {/* Check-in detail modal */}
      <CheckInDetailModal
        isOpen={showCheckInModal}
        onClose={() => setShowCheckInModal(false)}
        checkIn={thisWeekCheckIn}
        completedWorkouts={[]}
        plan={plan}
      />
    </div>
  );
}
