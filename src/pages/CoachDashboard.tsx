import { useState } from 'react';
import { AppState, Message, WorkoutPlan, Measurement, PlanSetupFormData } from '@/types';
import { ClientList } from '@/components/coach/ClientList';
import { PlanBuilder } from '@/components/coach/PlanBuilder';
import { ChatView } from '@/components/coach/ChatView';
import { MeasurementsView } from '@/components/coach/MeasurementsView';
import { ClientOverview } from '@/components/coach/ClientOverview';
import { WeeklyConfidenceStrip } from '@/components/coach/WeeklyConfidenceStrip';
import { ClientsRequiringAction } from '@/components/coach/ClientsRequiringAction';
import { PlanSetupModal } from '@/components/coach/PlanSetupModal';
import { WorkoutStructureView } from '@/components/coach/WorkoutStructureView';
import { Button } from '@/components/ui/button';
import { Users, Dumbbell, MessageSquare, Plus, Ruler, Home, CheckCircle } from 'lucide-react';
import { generatePlanStructure } from '@/lib/plan-generator';

interface CoachDashboardProps {
  appState: AppState;
  onUpdateState: (updater: (state: AppState) => AppState) => void;
}

type View = 'dashboard' | 'clients' | 'plans' | 'structure' | 'measurements' | 'chat';

export function CoachDashboard({ appState, onUpdateState }: CoachDashboardProps) {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>(
    appState.clients[0]?.id
  );
  const [showPlanSetupModal, setShowPlanSetupModal] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

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
    setShowPlanSetupModal(true);
  };

  const handlePlanCreated = (formData: PlanSetupFormData) => {
    if (!selectedClient) return;

    const newPlan = generatePlanStructure(formData);

    onUpdateState((state) => ({
      ...state,
      plans: [...state.plans, newPlan],
      clients: state.clients.map((c) =>
        c.id === selectedClientId ? { ...c, currentPlanId: newPlan.id } : c
      )
    }));

    setShowPlanSetupModal(false);

    // Show success toast
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
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
      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-top">
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium">Plan created successfully!</span>
        </div>
      )}

      {/* Plan Setup Modal */}
      <PlanSetupModal
        isOpen={showPlanSetupModal}
        onClose={() => setShowPlanSetupModal(false)}
        onSubmit={handlePlanCreated}
      />

      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Coach Dashboard</h1>
          <div className="flex gap-2">
            <Button
              variant={currentView === 'dashboard' ? 'default' : 'outline'}
              onClick={() => setCurrentView('dashboard')}
            >
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
            <Button
              variant={currentView === 'clients' ? 'default' : 'outline'}
              onClick={() => setCurrentView('clients')}
            >
              <Users className="w-4 h-4 mr-2" />
              All Clients
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

        {currentView === 'dashboard' && (
          <div className="space-y-4">
            <WeeklyConfidenceStrip
              clients={appState.clients}
              checkIns={appState.checkIns}
            />
            <ClientsRequiringAction
              clients={appState.clients}
              messages={appState.messages}
              checkIns={appState.checkIns}
              onSelectClient={(id) => {
                setSelectedClientId(id);
              }}
              onViewChat={() => setCurrentView('chat')}
            />
          </div>
        )}

        {currentView !== 'dashboard' && (
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
                <ClientOverview
                  client={selectedClient}
                  plan={selectedPlan}
                  measurements={appState.measurements}
                  completedWorkouts={appState.completedWorkouts}
                  messages={appState.messages}
                  onViewPlans={() => setCurrentView('plans')}
                  onViewProgress={() => setCurrentView('measurements')}
                  onViewChat={() => setCurrentView('chat')}
                />
              )}

            {currentView === 'plans' && selectedClient && (
              <div className="space-y-4">
                {selectedPlan && (
                  <div className="flex justify-end gap-2 mb-4">
                    <Button
                      onClick={() => setCurrentView('structure')}
                      variant="outline"
                    >
                      Edit Structure
                    </Button>
                    <Button onClick={handleCreateNewPlan} variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      New Plan
                    </Button>
                  </div>
                )}
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

            {currentView === 'structure' && selectedClient && selectedPlan && (
              <WorkoutStructureView
                plan={selectedPlan}
                onUpdatePlan={handleUpdatePlan}
                onBack={() => setCurrentView('plans')}
                onContinue={() => setCurrentView('plans')}
              />
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
        )}
      </div>
    </div>
  );
}
