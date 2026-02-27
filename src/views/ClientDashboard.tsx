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
import { usePlanDetail } from '@/hooks/api/usePlanDetail';
import type { PlanDetail } from '@/hooks/api/usePlanDetail';
import { apiFetch } from '@/lib/api-client';
import { WeeklyOverview } from '@/components/client/weekly/WeeklyOverview';
import { TodayFocusView } from '@/components/client/today/TodayFocusView';
import { ChatView } from '@/components/coach/ChatView';
import { ProgressHistory } from '@/components/client/ProgressHistory';
import { CoachFeedbackCard } from '@/components/client/CoachFeedbackCard';
import { CheckInDetailModal } from '@/components/client/CheckInDetailModal';
import { ClientNav } from '@/components/client/ClientNav';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClipboardCheck, Loader2 } from 'lucide-react';

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
        name: d.name ?? `Day ${d.dayNumber}`,
        isRestDay: d.isRestDay,
        exercises: d.exercises.map((e) => ({
          id: e.id,
          name: e.exercise.name,
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

  // ---- API Hooks ----
  const { user, coach, isLoading: isLoadingUser } = useCurrentUser();
  const { weekOverview, isLoading: isLoadingWeek } = useClientWeekOverview();
  const { progress } = useClientProgress();
  const { checkIns: apiCheckIns } = useClientCheckIns();
  const coachUserId = coach?.user.id ?? null;
  const { messages: apiMessages, sendMessage } = useMessages(coachUserId);

  // Fetch full plan detail for sub-components that need the full plan structure
  const planId = weekOverview?.plan.id ?? null;
  const { plan: planDetail } = usePlanDetail(planId);

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
        exercisesDone: 0,
        exercisesTotal: d.exerciseCount,
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
    await sendMessage(content);
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
    try {
      await apiFetch(`/api/client/workout/${todayCompletion.id}/finish`, {
        method: 'POST',
        body: JSON.stringify({ effortRating: rating }),
      });
    } catch {
      // Feedback save failed silently
    }
    if (notes) {
      await handleSendMessage(`Workout feedback: ${rating.toLowerCase()}. ${notes}`);
    }
  };

  const handleMessageCoach = () => {
    setCurrentView('chat');
  };

  // ---- Loading/Empty States ----
  if (isLoadingUser || isLoadingWeek) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
    <div className="min-h-screen bg-background p-3 sm:p-4 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] sm:pb-4">
      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
        <ClientNav
          activeTab={currentView}
          onTabChange={(tab) => setCurrentView(tab)}
        />

        {/* Check-in prompt banner */}
        {pendingCheckIn && (
          <section aria-label="Pending check-in">
            <Card className="border-info/20 bg-info/5">
              <CardContent className="py-3 sm:py-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <ClipboardCheck className="w-5 h-5 sm:w-6 sm:h-6 text-info shrink-0" />
                    <div>
                      <p className="font-medium text-foreground">Check-in waiting for you</p>
                      <p className="text-sm text-muted-foreground">Your coach wants to hear how training is going</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => router.push(`/client/checkin/${pendingCheckIn.id}`)}
                    className="w-full sm:w-auto"
                  >
                    Complete Check-in
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Coach feedback card (shows if coach responded to this week's check-in) */}
        {thisWeekCheckIn && currentView === 'workout' && workoutViewMode === 'weekly' && (
          <CoachFeedbackCard
            checkIn={thisWeekCheckIn}
            onViewDetails={() => setShowCheckInModal(true)}
          />
        )}

        {/* Workout Views */}
        {currentView === 'workout' && workoutViewMode === 'today' && (
          <TodayFocusView
            client={client}
            plan={plan}
            todayWorkout={todayWorkout}
            todayCompletion={todayCompletion}
            coachNote={todayCoachNote}
            coachName={coach?.user.name ?? undefined}
            coachAvatar={undefined}
            feedbackSubmitted={!!todayCompletion?.effortRating}
            onStartWorkout={handleStartWorkout}
            onResumeWorkout={handleResumeWorkout}
            onSendFeedback={handleSendFeedback}
            onMessageCoach={handleMessageCoach}
            onViewWeekly={() => setWorkoutViewMode('weekly')}
          />
        )}

        {currentView === 'workout' && workoutViewMode === 'weekly' && (
          <>
            <div className="flex items-center justify-between">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">My Workouts</h1>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setWorkoutViewMode('today')}
                className="text-muted-foreground hover:text-foreground"
              >
                ← Back to today
              </Button>
            </div>
            <WeeklyOverview
              client={client}
              plan={plan}
              completions={clientWorkoutCompletions}
            />
          </>
        )}

        {currentView === 'chat' && coachUserId && (
          <>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">My Chat</h1>
            <ChatView
              client={client}
              messages={messages}
              currentUserId={user?.id ?? ''}
              currentUserName={client.name}
              onSendMessage={handleSendMessage}
              heightClass="h-[calc(100vh-14rem)] sm:h-[600px]"
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
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">My Progress</h1>
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
