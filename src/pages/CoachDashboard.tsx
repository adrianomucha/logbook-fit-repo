import { useState } from 'react';
import { AppState, Message, WorkoutPlan, Measurement } from '@/types';
import { ClientList } from '@/components/coach/ClientList';
import { PlanBuilder } from '@/components/coach/PlanBuilder';
import { ChatView } from '@/components/coach/ChatView';
import { MeasurementsView } from '@/components/coach/MeasurementsView';
import { Button } from '@/components/ui/button';
import { Users, Dumbbell, MessageSquare, Plus, Ruler } from 'lucide-react';

interface CoachDashboardProps {
  appState: AppState;
  onUpdateState: (updater: (state: AppState) => AppState) => void;
}

type View = 'clients' | 'plans' | 'measurements' | 'chat';

export function CoachDashboard({ appState, onUpdateState }: CoachDashboardProps) {
  const [currentView, setCurrentView] = useState<View>('clients');
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>(
    appState.clients[0]?.id
  );

  const selectedClient = appState.clients.find((c) => c.id === selectedClientId);
  const selectedPlan = selectedClient
    ? appState.plans.find((p) => p.id === selectedClient.currentPlanId)
    : undefined;

  const currentCoach = appState.coaches.find((c) => c.id === appState.currentUserId);

  const handleSendMessage = (content: string) => {
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      senderId: appState.currentUserId,
      senderName: currentCoach?.name || 'Coach',
      content,
      timestamp: new Date().toISOString(),
      read: false
    };

    onUpdateState((state) => ({
      ...state,
      messages: [...state.messages, newMessage]
    }));
  };

  const handleUpdatePlan = (updatedPlan: any) => {
    onUpdateState((state) => ({
      ...state,
      plans: state.plans.map((p) => (p.id === updatedPlan.id ? updatedPlan : p))
    }));
  };

  const handleCreateNewPlan = () => {
    if (!selectedClient) return;

    const newPlan: WorkoutPlan = {
      id: `plan-${Date.now()}`,
      name: 'New Workout Plan',
      description: 'Click to edit description',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      weeks: [
        {
          id: `week-${Date.now()}`,
          weekNumber: 1,
          days: [
            {
              id: `day-${Date.now()}`,
              name: 'Day 1',
              exercises: []
            }
          ]
        }
      ]
    };

    onUpdateState((state) => ({
      ...state,
      plans: [...state.plans, newPlan],
      clients: state.clients.map((c) =>
        c.id === selectedClientId ? { ...c, currentPlanId: newPlan.id } : c
      )
    }));
  };

  const handleAddMeasurement = (measurement: Omit<Measurement, 'id'>) => {
    const newMeasurement: Measurement = {
      ...measurement,
      id: `measure-${Date.now()}`
    };

    onUpdateState((state) => ({
      ...state,
      measurements: [...state.measurements, newMeasurement]
    }));
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Coach Dashboard</h1>
          <div className="flex gap-2">
            <Button
              variant={currentView === 'clients' ? 'default' : 'outline'}
              onClick={() => setCurrentView('clients')}
            >
              <Users className="w-4 h-4 mr-2" />
              Clients
            </Button>
            <Button
              variant={currentView === 'plans' ? 'default' : 'outline'}
              onClick={() => setCurrentView('plans')}
              disabled={!selectedClient}
            >
              <Dumbbell className="w-4 h-4 mr-2" />
              Plans
            </Button>
            <Button
              variant={currentView === 'measurements' ? 'default' : 'outline'}
              onClick={() => setCurrentView('measurements')}
              disabled={!selectedClient}
            >
              <Ruler className="w-4 h-4 mr-2" />
              Progress
            </Button>
            <Button
              variant={currentView === 'chat' ? 'default' : 'outline'}
              onClick={() => setCurrentView('chat')}
              disabled={!selectedClient}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Chat
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1">
            <ClientList
              clients={appState.clients}
              onSelectClient={setSelectedClientId}
              selectedClientId={selectedClientId}
            />
          </div>

          <div className="lg:col-span-2">
            {currentView === 'clients' && selectedClient && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Client Overview</h2>
                <p className="text-muted-foreground">
                  View detailed client information, progress, and adherence here.
                </p>
              </div>
            )}

            {currentView === 'plans' && selectedClient && (
              <div className="space-y-4">
                {selectedPlan ? (
                  <PlanBuilder plan={selectedPlan} onUpdatePlan={handleUpdatePlan} />
                ) : (
                  <div className="text-center py-12 space-y-4">
                    <p className="text-muted-foreground">
                      No workout plan assigned to this client yet.
                    </p>
                    <Button onClick={handleCreateNewPlan}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create New Plan
                    </Button>
                  </div>
                )}
              </div>
            )}

            {currentView === 'measurements' && selectedClient && (
              <MeasurementsView
                client={selectedClient}
                measurements={appState.measurements}
                onAddMeasurement={handleAddMeasurement}
              />
            )}

            {currentView === 'chat' && selectedClient && (
              <ChatView
                client={selectedClient}
                messages={appState.messages}
                currentUserId={appState.currentUserId}
                currentUserName={currentCoach?.name || 'Coach'}
                onSendMessage={handleSendMessage}
              />
            )}

            {!selectedClient && (
              <div className="text-center py-12 text-muted-foreground">
                Select a client to view details
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
