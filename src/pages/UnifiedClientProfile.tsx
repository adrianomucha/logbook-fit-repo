import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { AppState, Message, Measurement, PlanSetupFormData, WorkoutPlan } from '@/types';
import { getClientStatus } from '@/lib/client-status';
import { generatePlanStructure } from '@/lib/plan-generator';
import { ClientOverviewTab } from '@/components/coach/profile/ClientOverviewTab';
import { ClientProgressTab } from '@/components/coach/profile/ClientProgressTab';
import { ClientMessagesTab } from '@/components/coach/profile/ClientMessagesTab';
import { ClientPlanTab } from '@/components/coach/profile/ClientPlanTab';
import { PlanSetupModal } from '@/components/coach/PlanSetupModal';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ClipboardCheck, AlertCircle } from 'lucide-react';

interface UnifiedClientProfileProps {
  appState: AppState;
  onUpdateState: (updater: (state: AppState) => AppState) => void;
}

type TabType = 'overview' | 'progress' | 'messages' | 'plan';

export function UnifiedClientProfile({ appState, onUpdateState }: UnifiedClientProfileProps) {
  const { clientId } = useParams<{ clientId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showPlanSetupModal, setShowPlanSetupModal] = useState(false);

  // Sync tab with URL query param
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'overview' || tab === 'progress' || tab === 'messages' || tab === 'plan') {
      setActiveTab(tab);
    } else {
      // Default to overview if no valid tab in URL
      setSearchParams({ tab: 'overview' });
    }
  }, [searchParams, setSearchParams]);

  // Update URL on tab change
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Derived state from AppState
  const client = useMemo(
    () => appState.clients.find((c) => c.id === clientId),
    [appState.clients, clientId]
  );

  const plan = useMemo(
    () => appState.plans.find((p) => p.id === client?.currentPlanId),
    [appState.plans, client?.currentPlanId]
  );

  const clientMessages = useMemo(
    () => appState.messages.filter(
      (m) => m.senderId === clientId || (m as any).recipientId === clientId
    ),
    [appState.messages, clientId]
  );

  const clientMeasurements = useMemo(
    () => appState.measurements.filter((m) => m.clientId === clientId),
    [appState.measurements, clientId]
  );

  const status = useMemo(
    () => client ? getClientStatus(client, appState.messages, appState.checkIns) : null,
    [client, appState.messages, appState.checkIns]
  );

  const unreadCount = useMemo(
    () => appState.messages.filter((m) => m.senderId === clientId && !m.read).length,
    [appState.messages, clientId]
  );

  // Handlers
  const handleBack = () => {
    navigate('/coach');
  };

  const handleStartCheckIn = () => {
    if (clientId) {
      navigate(`/coach/client/${clientId}/check-in`);
    }
  };

  const handleCreateNewPlan = () => {
    setShowPlanSetupModal(true);
  };

  const handlePlanCreated = (formData: PlanSetupFormData) => {
    const newPlan = generatePlanStructure(formData);

    onUpdateState((state) => ({
      ...state,
      plans: [...state.plans, newPlan],
      clients: state.clients.map((c) =>
        c.id === clientId ? { ...c, currentPlanId: newPlan.id } : c
      )
    }));

    setShowPlanSetupModal(false);
  };

  const handleUpdatePlan = (updatedPlan: WorkoutPlan) => {
    onUpdateState((state) => ({
      ...state,
      plans: state.plans.map((p) => (p.id === updatedPlan.id ? updatedPlan : p))
    }));
  };

  const handleAssignPlan = (planId: string) => {
    onUpdateState((state) => ({
      ...state,
      clients: state.clients.map((c) =>
        c.id === clientId ? { ...c, currentPlanId: planId } : c
      )
    }));
  };

  const handleUnassignPlan = () => {
    onUpdateState((state) => ({
      ...state,
      clients: state.clients.map((c) =>
        c.id === clientId ? { ...c, currentPlanId: undefined } : c
      )
    }));
  };

  const handleSendMessage = (content: string) => {
    const currentCoach = appState.coaches.find((c) => c.id === appState.currentUserId);
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

  // Client not found error state
  if (!client) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-12">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-bold mb-2">Client Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The client you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={handleBack}>Back to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4">
      <div className="max-w-7xl mx-auto space-y-3 sm:space-y-4">
        {/* Client Profile Header */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Left: Back + Client info + Status badge */}
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <Button variant="ghost" size="icon" onClick={handleBack} className="shrink-0">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div className="text-3xl sm:text-4xl shrink-0">{client.avatar || '👤'}</div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-bold truncate">{client.name}</h1>
                    {status && (
                      <Badge className={`${status.color} ${status.bgColor} ${status.borderColor} shrink-0`}>
                        <status.icon className="w-3 h-3 mr-1" />
                        {status.label}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{client.email}</p>
                </div>
              </div>

              {/* Right: Quick actions */}
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleStartCheckIn}>
                  <ClipboardCheck className="w-4 h-4 mr-2" />
                  Start Check-in
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tab Navigation */}
        <Card>
          <CardContent className="py-2">
            <div className="flex gap-1 overflow-x-auto scrollbar-hide -mx-2 px-2">
              <Button
                variant={activeTab === 'overview' ? 'default' : 'ghost'}
                onClick={() => handleTabChange('overview')}
                size="sm"
                className="shrink-0"
              >
                Overview
              </Button>
              <Button
                variant={activeTab === 'progress' ? 'default' : 'ghost'}
                onClick={() => handleTabChange('progress')}
                size="sm"
                className="shrink-0"
              >
                Progress
              </Button>
              <Button
                variant={activeTab === 'plan' ? 'default' : 'ghost'}
                onClick={() => handleTabChange('plan')}
                size="sm"
                className="shrink-0"
              >
                Plan
              </Button>
              <Button
                variant={activeTab === 'messages' ? 'default' : 'ghost'}
                onClick={() => handleTabChange('messages')}
                className="relative shrink-0"
                size="sm"
              >
                Messages
                {unreadCount > 0 && (
                  <Badge className="ml-2 px-1.5 py-0 h-5 text-xs" variant="destructive">
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tab Content Area - Full Width */}
        <div className="w-full">
          {activeTab === 'overview' && (
            <ClientOverviewTab
              client={client}
              plan={plan}
              measurements={clientMeasurements}
              completedWorkouts={appState.completedWorkouts}
              messages={clientMessages}
              checkIns={appState.checkIns}
              status={status!}
              currentUserId={appState.currentUserId}
              onSwitchToProgress={() => handleTabChange('progress')}
              onSwitchToMessages={() => handleTabChange('messages')}
              onSwitchToPlan={() => handleTabChange('plan')}
              onStartCheckIn={handleStartCheckIn}
            />
          )}
          {activeTab === 'progress' && (
            <ClientProgressTab
              client={client}
              measurements={appState.measurements}
              onAddMeasurement={handleAddMeasurement}
            />
          )}
          {activeTab === 'plan' && (
            <ClientPlanTab
              client={client}
              plan={plan}
              onUpdatePlan={handleUpdatePlan}
              onCreatePlan={handleCreateNewPlan}
              onAssignPlan={handleAssignPlan}
              onUnassignPlan={handleUnassignPlan}
              appState={appState}
            />
          )}
          {activeTab === 'messages' && (
            <ClientMessagesTab
              client={client}
              messages={appState.messages}
              currentUserId={appState.currentUserId}
              currentUserName={appState.coaches.find((c) => c.id === appState.currentUserId)?.name || 'Coach'}
              onSendMessage={handleSendMessage}
            />
          )}
        </div>

        {/* Plan Setup Modal */}
        <PlanSetupModal
          isOpen={showPlanSetupModal}
          onSubmit={handlePlanCreated}
          onClose={() => setShowPlanSetupModal(false)}
        />
      </div>
    </div>
  );
}
