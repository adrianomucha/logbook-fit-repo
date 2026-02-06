import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppState, Message } from '@/types';
import { getThisWeekCompletedCheckIn } from '@/lib/checkin-context-helpers';
import { WeeklyOverview } from '@/components/client/weekly/WeeklyOverview';
import { ClientChat } from '@/components/client/ClientChat';
import { ProgressHistory } from '@/components/client/ProgressHistory';
import { CoachFeedbackCard } from '@/components/client/CoachFeedbackCard';
import { CheckInDetailModal } from '@/components/client/CheckInDetailModal';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dumbbell, MessageSquare, TrendingUp, ClipboardCheck } from 'lucide-react';

interface ClientDashboardProps {
  appState: AppState;
  onUpdateState: (updater: (state: AppState) => AppState) => void;
}

type View = 'workout' | 'chat' | 'progress';

export function ClientDashboard({ appState, onUpdateState }: ClientDashboardProps) {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<View>('workout');
  const [showCheckInModal, setShowCheckInModal] = useState(false);

  const currentClient = appState.clients.find((c) => c.id === appState.currentUserId);
  const currentPlan = currentClient
    ? appState.plans.find((p) => p.id === currentClient.currentPlanId)
    : undefined;

  const coach = appState.coaches.find((c) => c.clients.includes(appState.currentUserId));

  const clientMessages = appState.messages.filter(
    (msg) => msg.senderId === appState.currentUserId || msg.senderId === coach?.id
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

  const handleSendMessage = (content: string) => {
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      senderId: appState.currentUserId,
      senderName: currentClient?.name || 'Client',
      content,
      timestamp: new Date().toISOString(),
      read: false
    };

    onUpdateState((state) => ({
      ...state,
      messages: [...state.messages, newMessage]
    }));
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

  return (
    <div className="min-h-screen bg-background p-4">
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
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant={currentView === 'workout' ? 'default' : 'outline'}
              onClick={() => setCurrentView('workout')}
              className="flex-1 sm:flex-none"
              size="sm"
            >
              <Dumbbell className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Workout</span>
            </Button>
            <Button
              variant={currentView === 'chat' ? 'default' : 'outline'}
              onClick={() => setCurrentView('chat')}
              className="flex-1 sm:flex-none"
              size="sm"
            >
              <MessageSquare className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Chat</span>
            </Button>
            <Button
              variant={currentView === 'progress' ? 'default' : 'outline'}
              onClick={() => setCurrentView('progress')}
              className="flex-1 sm:flex-none"
              size="sm"
            >
              <TrendingUp className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Progress</span>
            </Button>
          </div>
        </div>

        {/* Coach feedback card (shows if coach responded to this week's check-in) */}
        {thisWeekCheckIn && currentView === 'workout' && (
          <CoachFeedbackCard
            checkIn={thisWeekCheckIn}
            onViewDetails={() => setShowCheckInModal(true)}
          />
        )}

        {currentView === 'workout' && (
          <WeeklyOverview
            client={currentClient}
            plan={currentPlan}
            completions={clientWorkoutCompletions}
          />
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
          <ProgressHistory completedWorkouts={clientWorkouts} plans={appState.plans} />
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
