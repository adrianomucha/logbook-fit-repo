import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppState, Message } from '@/types';
import { getThisWeekCompletedCheckIn } from '@/lib/checkin-context-helpers';
import { getCurrentWeekNumber, getWeekDays, getTodayWorkout } from '@/lib/workout-week-helpers';
import { WeeklyOverview } from '@/components/client/weekly/WeeklyOverview';
import { TodayFocusView } from '@/components/client/today/TodayFocusView';
import { ChatView } from '@/components/coach/ChatView';
import { ProgressHistory } from '@/components/client/ProgressHistory';
import { CoachFeedbackCard } from '@/components/client/CoachFeedbackCard';
import { CheckInDetailModal } from '@/components/client/CheckInDetailModal';
import { ClientNav } from '@/components/client/ClientNav';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClipboardCheck } from 'lucide-react';

interface ClientDashboardProps {
  appState: AppState;
  onUpdateState: (updater: (state: AppState) => AppState) => void;
}

type View = 'workout' | 'chat' | 'progress';

type WorkoutViewMode = 'today' | 'weekly';

export function ClientDashboard({ appState, onUpdateState }: ClientDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentView, setCurrentView] = useState<View>('workout');
  const [workoutViewMode, setWorkoutViewMode] = useState<WorkoutViewMode>('today');
  const [showCheckInModal, setShowCheckInModal] = useState(false);

  // Handle URL tab parameter
  useEffect(() => {
    const tab = searchParams?.get('tab');
    if (tab === 'chat') setCurrentView('chat');
    else if (tab === 'progress') setCurrentView('progress');
    else if (tab === 'workout') setCurrentView('workout');
  }, [searchParams]);

  const currentClient = appState.clients.find((c) => c.id === appState.currentUserId);
  const currentPlan = currentClient
    ? appState.plans.find((p) => p.id === currentClient.currentPlanId)
    : undefined;

  const coach = appState.coaches.find((c) => c.clients.includes(appState.currentUserId));

  const clientWorkouts = appState.completedWorkouts.filter(
    (w) => w.clientId === appState.currentUserId
  );

  // Get workout completions for this client (new granular tracking)
  const clientWorkoutCompletions = useMemo(
    () => appState.workoutCompletions.filter((w) => w.clientId === appState.currentUserId),
    [appState.workoutCompletions, appState.currentUserId]
  );

  const pendingCheckIn = useMemo(
    () => appState.checkIns.find(c => c.clientId === appState.currentUserId && c.status === 'pending'),
    [appState.checkIns, appState.currentUserId]
  );

  // Get the most recent completed check-in from this week (for coach feedback card)
  const thisWeekCheckIn = useMemo(
    () => getThisWeekCompletedCheckIn(appState.currentUserId, appState.checkIns),
    [appState.checkIns, appState.currentUserId]
  );

  // Get today's workout data for Clarity Mode
  const { todayWorkout, todayCompletion, todayCoachNote, currentWeek } = useMemo(() => {
    if (!currentClient?.planStartDate || !currentPlan) {
      return { todayWorkout: null, todayCompletion: null, todayCoachNote: undefined, currentWeek: null };
    }

    const durationWeeks = currentPlan.durationWeeks || currentPlan.weeks.length;
    const weekNumber = getCurrentWeekNumber(currentClient.planStartDate, durationWeeks);
    const currentWeek = currentPlan.weeks.find((w) => w.weekNumber === weekNumber);

    if (!currentWeek) {
      return { todayWorkout: null, todayCompletion: null, todayCoachNote: undefined, currentWeek: null };
    }

    const weekDays = getWeekDays(
      currentClient.planStartDate,
      currentWeek,
      clientWorkoutCompletions,
      currentClient.id
    );

    const today = getTodayWorkout(weekDays);
    const completion = today?.completion || null;

    // Get first non-empty coach note from today's workout exercises
    // This is forward-looking instruction, not backward-looking chat
    const exercises = today?.workoutDay?.exercises || [];
    const firstNote = exercises.find((e) => e.notes?.trim())?.notes;

    return {
      todayWorkout: today,
      todayCompletion: completion,
      todayCoachNote: firstNote,
      currentWeek,
    };
  }, [currentClient, currentPlan, clientWorkoutCompletions]);

  const handleSendMessage = (content: string) => {
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      senderId: appState.currentUserId,
      senderName: currentClient?.name || 'Client',
      content,
      timestamp: new Date().toISOString(),
      read: false,
      clientId: appState.currentUserId  // Add clientId for proper data isolation
    };

    onUpdateState((state) => ({
      ...state,
      messages: [...state.messages, newMessage]
    }));
  };

  // Handlers for TodayFocusView
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

  const handleSendFeedback = (rating: 'EASY' | 'MEDIUM' | 'HARD', notes?: string) => {
    if (!todayCompletion) return;

    onUpdateState((state) => ({
      ...state,
      workoutCompletions: state.workoutCompletions.map((c) =>
        c.id === todayCompletion.id
          ? { ...c, effortRating: rating }
          : c
      ),
    }));

    // Optionally send a message to coach with the feedback
    if (notes) {
      handleSendMessage(`Workout feedback: ${rating.toLowerCase()}. ${notes}`);
    }
  };

  const handleMessageCoach = () => {
    setCurrentView('chat');
  };

  if (!currentClient || !currentPlan) {
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
            client={currentClient}
            plan={currentPlan}
            todayWorkout={todayWorkout}
            todayCompletion={todayCompletion}
            coachNote={todayCoachNote}
            coachName={coach?.name}
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
              client={currentClient}
              plan={currentPlan}
              completions={clientWorkoutCompletions}
            />
          </>
        )}

        {currentView === 'chat' && coach && (
          <>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">My Chat</h1>
            <ChatView
              client={currentClient}
              messages={appState.messages}
              currentUserId={appState.currentUserId}
              currentUserName={currentClient.name}
              onSendMessage={handleSendMessage}
              heightClass="h-[calc(100vh-14rem)] sm:h-[600px]"
              peerName={coach.name}
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
              completedWorkouts={clientWorkouts}
              plans={appState.plans}
              client={currentClient}
              plan={currentPlan}
              workoutCompletions={clientWorkoutCompletions}
              measurements={appState.measurements.filter((m) => m.clientId === currentClient.id)}
            />
          </>
        )}
      </div>

      {/* Check-in detail modal */}
      <CheckInDetailModal
        isOpen={showCheckInModal}
        onClose={() => setShowCheckInModal(false)}
        checkIn={thisWeekCheckIn}
        completedWorkouts={clientWorkouts}
        plan={currentPlan}
      />

    </div>
  );
}
