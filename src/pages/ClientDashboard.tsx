import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppState, Message } from '@/types';
import { getThisWeekCompletedCheckIn } from '@/lib/checkin-context-helpers';
import { getCurrentWeekNumber, getWeekDays, getTodayWorkout } from '@/lib/workout-week-helpers';
import { WeeklyOverview } from '@/components/client/weekly/WeeklyOverview';
import { TodayFocusView } from '@/components/client/today/TodayFocusView';
import { ClientChat } from '@/components/client/ClientChat';
import { ProgressHistory } from '@/components/client/ProgressHistory';
import { CoachFeedbackCard } from '@/components/client/CoachFeedbackCard';
import { CheckInDetailModal } from '@/components/client/CheckInDetailModal';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MobileBottomNav } from '@/components/ui/mobile-bottom-nav';
import { Dumbbell, MessageSquare, TrendingUp, ClipboardCheck } from 'lucide-react';

interface ClientDashboardProps {
  appState: AppState;
  onUpdateState: (updater: (state: AppState) => AppState) => void;
}

type View = 'workout' | 'chat' | 'progress';

type WorkoutViewMode = 'today' | 'weekly';

export function ClientDashboard({ appState, onUpdateState }: ClientDashboardProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentView, setCurrentView] = useState<View>('workout');
  const [workoutViewMode, setWorkoutViewMode] = useState<WorkoutViewMode>('today');
  const [showCheckInModal, setShowCheckInModal] = useState(false);

  // Handle URL tab parameter
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'chat') setCurrentView('chat');
    else if (tab === 'progress') setCurrentView('progress');
    else if (tab === 'workout') setCurrentView('workout');
  }, [searchParams]);

  const currentClient = appState.clients.find((c) => c.id === appState.currentUserId);
  const currentPlan = currentClient
    ? appState.plans.find((p) => p.id === currentClient.currentPlanId)
    : undefined;

  const coach = appState.coaches.find((c) => c.clients.includes(appState.currentUserId));

  // Filter messages for this client only (using clientId for proper data isolation)
  const clientMessages = appState.messages.filter(
    (msg) => msg.clientId === appState.currentUserId
  );

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
  const { todayWorkout, todayCompletion, latestCoachMessage, currentWeek } = useMemo(() => {
    if (!currentClient?.planStartDate || !currentPlan) {
      return { todayWorkout: null, todayCompletion: null, latestCoachMessage: undefined, currentWeek: null };
    }

    const durationWeeks = currentPlan.durationWeeks || currentPlan.weeks.length;
    const weekNumber = getCurrentWeekNumber(currentClient.planStartDate, durationWeeks);
    const currentWeek = currentPlan.weeks.find((w) => w.weekNumber === weekNumber);

    if (!currentWeek) {
      return { todayWorkout: null, todayCompletion: null, latestCoachMessage: undefined, currentWeek: null };
    }

    const weekDays = getWeekDays(
      currentClient.planStartDate,
      currentWeek,
      clientWorkoutCompletions,
      currentClient.id
    );

    const today = getTodayWorkout(weekDays);
    const completion = today?.completion || null;

    // Get latest coach message (messages from coach to this client)
    const coachMessages = clientMessages
      .filter((m) => m.senderId === coach?.id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const latestMessage = coachMessages[0];

    return {
      todayWorkout: today,
      todayCompletion: completion,
      latestCoachMessage: latestMessage,
      currentWeek,
    };
  }, [currentClient, currentPlan, clientWorkoutCompletions, clientMessages, coach]);

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
      navigate(`/client/workout/${currentWeek.id}/${todayWorkout.workoutDay.id}`);
    }
  };

  const handleResumeWorkout = () => {
    if (todayWorkout?.workoutDay && currentWeek) {
      navigate(`/client/workout/${currentWeek.id}/${todayWorkout.workoutDay.id}`);
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
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">No Workout Plan Assigned</h1>
          <p className="text-muted-foreground">
            Contact your coach to get started with a workout plan.
          </p>
        </div>
      </div>
    );
  }

  // Mobile bottom nav items
  const mobileNavItems = [
    { id: 'workout' as const, label: 'Workout', icon: Dumbbell },
    { id: 'chat' as const, label: 'Chat', icon: MessageSquare },
    { id: 'progress' as const, label: 'Progress', icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-background p-4 pb-24 sm:pb-4">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Check-in prompt banner */}
        {pendingCheckIn && (
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
            <CardContent className="py-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <ClipboardCheck className="w-6 h-6 text-blue-600 shrink-0" />
                  <div>
                    <p className="font-medium text-blue-900 dark:text-blue-100">Check-in waiting for you</p>
                    <p className="text-sm text-blue-700 dark:text-blue-200">Your coach wants to hear how training is going</p>
                  </div>
                </div>
                <Button
                  onClick={() => navigate(`/client/checkin/${pendingCheckIn.id}`)}
                  className="w-full sm:w-auto"
                >
                  Complete Check-in
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">My Workouts</h1>
            <p className="text-muted-foreground text-sm">Welcome back, {currentClient.name}</p>
          </div>
          {/* Desktop navigation tabs - hidden on mobile */}
          <div className="hidden sm:flex gap-2">
            <Button
              variant={currentView === 'workout' ? 'default' : 'outline'}
              onClick={() => setCurrentView('workout')}
              size="sm"
            >
              <Dumbbell className="w-4 h-4 mr-2" />
              Workout
            </Button>
            <Button
              variant={currentView === 'chat' ? 'default' : 'outline'}
              onClick={() => setCurrentView('chat')}
              size="sm"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Chat
            </Button>
            <Button
              variant={currentView === 'progress' ? 'default' : 'outline'}
              onClick={() => setCurrentView('progress')}
              size="sm"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Progress
            </Button>
          </div>
        </div>

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
            latestCoachMessage={latestCoachMessage}
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
            <div className="flex items-center justify-between mb-2">
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
          <ClientChat
            messages={clientMessages}
            currentUserId={appState.currentUserId}
            currentUserName={currentClient.name}
            coachName={coach.name}
            onSendMessage={handleSendMessage}
          />
        )}

        {currentView === 'progress' && (
          <ProgressHistory
            completedWorkouts={clientWorkouts}
            plans={appState.plans}
            client={currentClient}
            plan={currentPlan}
            workoutCompletions={clientWorkoutCompletions}
            measurements={appState.measurements.filter((m) => m.clientId === currentClient.id)}
          />
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

      {/* Mobile bottom navigation */}
      <MobileBottomNav
        items={mobileNavItems}
        activeId={currentView}
        onSelect={(id) => setCurrentView(id as View)}
      />
    </div>
  );
}
