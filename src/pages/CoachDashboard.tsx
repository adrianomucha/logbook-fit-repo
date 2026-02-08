import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppState, PlanSetupFormData } from '@/types';
import { PlanBuilder } from '@/components/coach/PlanBuilder';
import { WeeklyConfidenceStrip } from '@/components/coach/WeeklyConfidenceStrip';
import { ClientsRequiringAction } from '@/components/coach/ClientsRequiringAction';
import { PlanSetupModal } from '@/components/coach/PlanSetupModal';
import { AssignClientModal } from '@/components/coach/AssignClientModal';
import { ConfirmationModal } from '@/components/coach/ConfirmationModal';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dumbbell, Plus, CheckCircle, X, UserPlus } from 'lucide-react';
import { CoachNav, CoachNavTab } from '@/components/coach/CoachNav';
import { generatePlanStructure } from '@/lib/plan-generator';

interface CoachDashboardProps {
  appState: AppState;
  onUpdateState: (updater: (state: AppState) => AppState) => void;
}

type View = 'dashboard' | 'plans';

// Map View to CoachNavTab (clients is separate page)
const viewToNavTab = (view: View): CoachNavTab => view;

export function CoachDashboard({ appState, onUpdateState }: CoachDashboardProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedPlanId, setSelectedPlanId] = useState<string | undefined>(
    appState.plans[0]?.id
  );
  const [showPlanSetupModal, setShowPlanSetupModal] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showAssignClientModal, setShowAssignClientModal] = useState(false);
  const [clientToUnassign, setClientToUnassign] = useState<string | null>(null);

  const selectedPlan = appState.plans.find((p) => p.id === selectedPlanId);

  const assignedClients = useMemo(
    () => appState.clients.filter((c) => c.currentPlanId === selectedPlanId),
    [appState.clients, selectedPlanId]
  );

  const clientToUnassignName = useMemo(
    () => appState.clients.find((c) => c.id === clientToUnassign)?.name || '',
    [appState.clients, clientToUnassign]
  );

  // Calculate total unread messages from all clients
  const totalUnreadMessages = useMemo(() => {
    const coachClientIds = appState.clients.map((c) => c.id);
    return appState.messages.filter(
      (m) => coachClientIds.includes(m.senderId) && !m.read
    ).length;
  }, [appState.clients, appState.messages]);

  // Handle view query parameter
  useEffect(() => {
    const view = searchParams.get('view');
    if (view === 'plans') {
      setCurrentView('plans');
    }
  }, [searchParams]);

  // Ensure a plan is selected when switching to Plans view
  useEffect(() => {
    if (currentView === 'plans' && !selectedPlanId && appState.plans.length > 0) {
      setSelectedPlanId(appState.plans[0].id);
    }
  }, [currentView, selectedPlanId, appState.plans]);

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
    const newPlan = generatePlanStructure(formData);

    onUpdateState((state) => ({
      ...state,
      plans: [...state.plans, newPlan],
    }));

    setSelectedPlanId(newPlan.id);
    setShowPlanSetupModal(false);

    // Show success toast
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  };

  const handleAssignClientToPlan = (clientId: string) => {
    if (!selectedPlanId) return;
    onUpdateState((state) => ({
      ...state,
      clients: state.clients.map((c) =>
        c.id === clientId ? { ...c, currentPlanId: selectedPlanId } : c
      )
    }));
    setShowAssignClientModal(false);
  };

  const handleUnassignClientFromPlan = () => {
    if (!clientToUnassign) return;
    onUpdateState((state) => ({
      ...state,
      clients: state.clients.map((c) =>
        c.id === clientToUnassign ? { ...c, currentPlanId: undefined } : c
      )
    }));
    setClientToUnassign(null);
  };

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4">
      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 sm:px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-top">
          <CheckCircle className="h-5 w-5 shrink-0" />
          <span className="font-medium text-sm sm:text-base">Plan created!</span>
        </div>
      )}

      {/* Plan Setup Modal */}
      <PlanSetupModal
        isOpen={showPlanSetupModal}
        onClose={() => setShowPlanSetupModal(false)}
        onSubmit={handlePlanCreated}
      />

      {/* Assign Client Modal */}
      {selectedPlanId && (
        <AssignClientModal
          isOpen={showAssignClientModal}
          onClose={() => setShowAssignClientModal(false)}
          onAssign={handleAssignClientToPlan}
          clients={appState.clients}
          plans={appState.plans}
          currentPlanId={selectedPlanId}
        />
      )}

      {/* Unassign Client Confirmation */}
      <ConfirmationModal
        isOpen={!!clientToUnassign}
        onClose={() => setClientToUnassign(null)}
        onConfirm={handleUnassignClientFromPlan}
        title="Remove Client from Plan"
        message={`Remove ${clientToUnassignName} from this plan?`}
        warningMessage="The client will no longer have an assigned workout plan."
        confirmLabel="Remove"
        confirmVariant="destructive"
      />

      <div className="max-w-7xl mx-auto space-y-3 sm:space-y-4">
        <CoachNav
          activeTab={viewToNavTab(currentView)}
          unreadCount={totalUnreadMessages}
          onTabChange={(tab) => {
            if (tab === 'clients') {
              navigate('/coach/clients');
            } else {
              setCurrentView(tab as View);
            }
          }}
        />

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
              completedWorkouts={appState.completedWorkouts}
              plans={appState.plans}
              onSelectClient={() => {}}
            />
          </div>
        )}

        {currentView === 'plans' && (
          <div className="space-y-4">
            {appState.plans.length > 0 ? (
              <>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                  <Select
                    value={selectedPlanId || ''}
                    onValueChange={setSelectedPlanId}
                  >
                    <SelectTrigger className="w-full sm:w-[320px]">
                      <SelectValue placeholder="Select a plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {appState.plans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.emoji} {plan.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button onClick={handleCreateNewPlan} className="shrink-0" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    New Plan
                  </Button>
                </div>

                {selectedPlan && (
                  <>
                    {/* Plan Assignments */}
                    <Card>
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold">Assigned Clients</h3>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowAssignClientModal(true)}
                          >
                            <UserPlus className="w-4 h-4 mr-2" />
                            Assign Client
                          </Button>
                        </div>
                        {assignedClients.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No clients assigned to this plan yet.
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {assignedClients.map((client) => (
                              <Badge
                                key={client.id}
                                variant="secondary"
                                className="pl-2 pr-1 py-1 flex items-center gap-1"
                              >
                                <span>{client.avatar || '👤'}</span>
                                <span>{client.name}</span>
                                <button
                                  onClick={() => setClientToUnassign(client.id)}
                                  className="ml-1 rounded-full p-0.5 hover:bg-gray-300 transition-colors"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <PlanBuilder plan={selectedPlan} onUpdatePlan={handleUpdatePlan} appState={appState} />
                  </>
                )}
              </>
            ) : (
              <div className="text-center py-16 space-y-4 border rounded-lg bg-white">
                <Dumbbell className="w-12 h-12 mx-auto text-muted-foreground" />
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold">No plans yet</h2>
                  <p className="text-muted-foreground max-w-sm mx-auto">
                    Create your first workout plan template. You can assign it to clients later.
                  </p>
                </div>
                <Button onClick={handleCreateNewPlan} size="lg">
                  <Plus className="w-5 h-5 mr-2" />
                  Create Your First Plan
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
