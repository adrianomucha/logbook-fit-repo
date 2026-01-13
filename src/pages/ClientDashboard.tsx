import { useState } from 'react';
import { AppState, Message, CompletedWorkout } from '@/types';
import { WorkoutView } from '@/components/client/WorkoutView';
import { ClientChat } from '@/components/client/ClientChat';
import { ProgressHistory } from '@/components/client/ProgressHistory';
import { Button } from '@/components/ui/button';
import { Dumbbell, MessageSquare, TrendingUp } from 'lucide-react';

interface ClientDashboardProps {
  appState: AppState;
  onUpdateState: (updater: (state: AppState) => AppState) => void;
}

type View = 'workout' | 'chat' | 'progress';

export function ClientDashboard({ appState, onUpdateState }: ClientDashboardProps) {
  const [currentView, setCurrentView] = useState<View>('workout');
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());

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

  const handleCompleteExercise = (
    weekId: string,
    dayId: string,
    exerciseId: string,
    weight?: string
  ) => {
    const newCompleted = new Set(completedExercises);
    if (newCompleted.has(exerciseId)) {
      newCompleted.delete(exerciseId);
    } else {
      newCompleted.add(exerciseId);

      if (!currentPlan) return;
      const week = currentPlan.weeks.find((w) => w.id === weekId);
      const day = week?.days.find((d) => d.id === dayId);
      const exercise = day?.exercises.find((e) => e.id === exerciseId);

      if (exercise) {
        const completedWorkout: CompletedWorkout = {
          id: `completed-${Date.now()}`,
          clientId: appState.currentUserId,
          planId: currentPlan.id,
          weekId,
          dayId,
          completedAt: new Date().toISOString(),
          exercises: [
            {
              ...exercise,
              weight: weight || exercise.weight,
              completed: true
            }
          ]
        };

        onUpdateState((state) => ({
          ...state,
          completedWorkouts: [...state.completedWorkouts, completedWorkout]
        }));
      }
    }
    setCompletedExercises(newCompleted);
  };

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Workouts</h1>
            <p className="text-muted-foreground">Welcome back, {currentClient.name}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={currentView === 'workout' ? 'default' : 'outline'}
              onClick={() => setCurrentView('workout')}
            >
              <Dumbbell className="w-4 h-4 mr-2" />
              Workout
            </Button>
            <Button
              variant={currentView === 'chat' ? 'default' : 'outline'}
              onClick={() => setCurrentView('chat')}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Chat
            </Button>
            <Button
              variant={currentView === 'progress' ? 'default' : 'outline'}
              onClick={() => setCurrentView('progress')}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Progress
            </Button>
          </div>
        </div>

        {currentView === 'workout' && (
          <WorkoutView
            plan={currentPlan}
            onCompleteExercise={handleCompleteExercise}
            completedExercises={completedExercises}
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
    </div>
  );
}
