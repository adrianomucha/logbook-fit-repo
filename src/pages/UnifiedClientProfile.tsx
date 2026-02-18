import { useState, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppState, Message, PlanSetupFormData, ExerciseFlag, CheckIn, WorkoutPlan } from '@/types';
import { getClientStatus } from '@/lib/client-status';
import { getActiveCheckIn } from '@/lib/checkin-helpers';
import { ContextualStatusHeader } from '@/components/coach/workspace/ContextualStatusHeader';
import { InlineCheckInReview } from '@/components/coach/workspace/InlineCheckInReview';
import { CheckInHistoryPanel } from '@/components/coach/workspace/CheckInHistoryPanel';
import { InlinePlanEditor } from '@/components/coach/workspace/InlinePlanEditor';
import { InteractiveWeeklyStrip } from '@/components/coach/workspace/InteractiveWeeklyStrip';
import { PlanEditorDrawer } from '@/components/coach/workspace/PlanEditorDrawer';
import { ChatView } from '@/components/coach/ChatView';
import { PlanSetupModal } from '@/components/coach/PlanSetupModal';
import { AssignPlanModal } from '@/components/coach/AssignPlanModal';
import { CoachNav } from '@/components/coach/CoachNav';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { generatePlanStructure, deepCopyPlan } from '@/lib/plan-generator';

interface UnifiedClientProfileProps {
  appState: AppState;
  onUpdateState: (updater: (state: AppState) => AppState) => void;
}

export function UnifiedClientProfile({ appState, onUpdateState }: UnifiedClientProfileProps) {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const [showPlanSetupModal, setShowPlanSetupModal] = useState(false);
  const [showAssignPlanModal, setShowAssignPlanModal] = useState(false);
  const [showPlanDrawer, setShowPlanDrawer] = useState(false);
  const [chatPrefill, setChatPrefill] = useState<string | undefined>(undefined);
  const [justSentCheckIn, setJustSentCheckIn] = useState(false);

  // Refs for scrolling
  const checkInRef = useRef<HTMLDivElement>(null);
  const planEditorRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  // Derived state from AppState
  const client = useMemo(
    () => appState.clients.find((c) => c.id === clientId),
    [appState.clients, clientId]
  );

  // Calculate total unread messages from all clients (needed for nav badge)
  const totalUnreadMessages = useMemo(() => {
    const coachClientIds = appState.clients.map((c) => c.id);
    return appState.messages.filter(
      (m) => coachClientIds.includes(m.senderId) && !m.read
    ).length;
  }, [appState.clients, appState.messages]);

  const plan = useMemo(
    () => appState.plans.find((p) => p.id === client?.currentPlanId),
    [appState.plans, client?.currentPlanId]
  );

  const status = useMemo(
    () => client ? getClientStatus(client, appState.messages, appState.checkIns) : null,
    [client, appState.messages, appState.checkIns]
  );

  // Get active check-in (pending or responded)
  const activeCheckIn = useMemo(() => {
    if (!clientId) return null;
    return getActiveCheckIn(clientId, appState.checkIns) || null;
  }, [appState.checkIns, clientId]);

  // Priority Mode: A = check-in active (coach should respond), B = no check-in (routine visit)
  const priorityMode: 'A' | 'B' = activeCheckIn ? 'A' : 'B';

  // Get last completed check-in for status header
  const lastCompletedCheckIn = useMemo(() => {
    if (!clientId) return null;
    return appState.checkIns
      .filter((c) => c.clientId === clientId && c.status === 'completed')
      .sort((a, b) =>
        new Date(b.completedAt || b.date).getTime() -
        new Date(a.completedAt || a.date).getTime()
      )[0] || null;
  }, [appState.checkIns, clientId]);

  // Get responded check-in (for status header context)
  const respondedCheckIn = useMemo(() => {
    if (!clientId) return null;
    return appState.checkIns
      .filter((c) => c.clientId === clientId && c.status === 'responded')
      .sort((a, b) =>
        new Date(b.clientRespondedAt || b.date).getTime() -
        new Date(a.clientRespondedAt || a.date).getTime()
      )[0] || null;
  }, [appState.checkIns, clientId]);

  // Get client's exercise flags
  const clientFlags = useMemo(() => {
    if (!clientId) return [];
    const clientCompletionIds = appState.workoutCompletions
      .filter((wc) => wc.clientId === clientId)
      .map((wc) => wc.id);
    return appState.exerciseFlags.filter((flag) =>
      clientCompletionIds.includes(flag.workoutCompletionId)
    );
  }, [appState.exerciseFlags, appState.workoutCompletions, clientId]);

  // Get coach info
  const currentCoach = useMemo(
    () => appState.coaches.find((c) => c.id === appState.currentUserId),
    [appState.coaches, appState.currentUserId]
  );

  // Handlers
  const handleScrollToCheckIn = () => {
    checkInRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleStartCheckIn = () => {
    // If no active check-in, create one
    if (!activeCheckIn) {
      const newCheckIn: CheckIn = {
        id: `checkin-${Date.now()}`,
        clientId: client?.id || '',
        coachId: appState.currentUserId,
        date: new Date().toISOString(),
        status: 'pending',
      };
      onUpdateState((state) => ({
        ...state,
        checkIns: [...state.checkIns, newCheckIn],
      }));
      // Show "just sent" confirmation
      setJustSentCheckIn(true);
      setTimeout(() => setJustSentCheckIn(false), 5000);
    }
    // Scroll to the check-in section
    handleScrollToCheckIn();
  };

  const handleCompleteCheckIn = (completedCheckIn: CheckIn) => {
    onUpdateState((state) => ({
      ...state,
      checkIns: state.checkIns.map((c) =>
        c.id === completedCheckIn.id ? completedCheckIn : c
      ),
      clients: state.clients.map((c) =>
        c.id === clientId
          ? { ...c, lastCheckInDate: new Date().toISOString() }
          : c
      ),
    }));
  };

  const handleCreateCheckIn = (newCheckIn: CheckIn) => {
    onUpdateState((state) => ({
      ...state,
      checkIns: [...state.checkIns, newCheckIn],
    }));
  };

  const handleCreateNewPlan = () => {
    setShowPlanSetupModal(true);
  };

  const handleChangePlan = () => {
    setShowAssignPlanModal(true);
  };

  const handleEditPlan = () => {
    setShowPlanDrawer(true);
  };

  const handleUnassignPlan = () => {
    onUpdateState((state) => ({
      ...state,
      clients: state.clients.map((c) =>
        c.id === clientId
          ? { ...c, currentPlanId: undefined, planStartDate: undefined }
          : c
      ),
    }));
  };

  const handleUpdatePlan = (updatedPlan: WorkoutPlan) => {
    onUpdateState((state) => ({
      ...state,
      plans: state.plans.map((p) => (p.id === updatedPlan.id ? updatedPlan : p)),
    }));
  };

  const handlePlanCreated = (formData: PlanSetupFormData) => {
    // Create the template
    const newTemplate = generatePlanStructure(formData);

    // Fork it into a client instance
    const clientInstance = deepCopyPlan(newTemplate, { makeInstance: true });

    onUpdateState((state) => ({
      ...state,
      // Add both the template and the instance
      plans: [...state.plans, newTemplate, clientInstance],
      // Assign the instance (not the template) to the client
      clients: state.clients.map((c) =>
        c.id === clientId
          ? { ...c, currentPlanId: clientInstance.id, planStartDate: new Date().toISOString() }
          : c
      ),
    }));

    setShowPlanSetupModal(false);
  };

  const handleAssignPlan = (templateId: string) => {
    // Find the template
    const template = appState.plans.find((p) => p.id === templateId);
    if (!template) return;

    // Fork the template into a client instance
    const clientInstance = deepCopyPlan(template, { makeInstance: true });

    onUpdateState((state) => ({
      ...state,
      // Add the new instance to plans array
      plans: [...state.plans, clientInstance],
      // Assign the instance (not the template) to the client
      clients: state.clients.map((c) =>
        c.id === clientId
          ? { ...c, currentPlanId: clientInstance.id, planStartDate: new Date().toISOString() }
          : c
      ),
    }));
    setShowAssignPlanModal(false);
  };

  const handleSendMessage = (content: string) => {
    if (!client) return;  // Guard for TypeScript

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      senderId: appState.currentUserId,
      senderName: currentCoach?.name || 'Coach',
      content,
      timestamp: new Date().toISOString(),
      read: false,
      clientId: client.id,  // Add clientId for proper data isolation
    };

    onUpdateState((state) => ({
      ...state,
      messages: [...state.messages, newMessage],
    }));

    // Clear prefill after sending
    setChatPrefill(undefined);
  };

  const handleMessageAboutFlag = (flag: ExerciseFlag, exerciseName: string) => {
    const prefillMessage = `Regarding ${exerciseName}${flag.note ? `: "${flag.note}"` : ''} - `;
    setChatPrefill(prefillMessage);
    chatRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleScrollToPlanEditor = (dayId: string) => {
    planEditorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Could also set the selected day in the editor here if we add that prop
  };

  // Client not found error state
  if (!client) {
    return (
      <div className="min-h-screen bg-background p-3 sm:p-4 pb-24 sm:pb-4">
        <div className="max-w-7xl mx-auto space-y-4">
          <CoachNav activeTab="clients" unreadCount={totalUnreadMessages} />
          <Card className="max-w-md mx-auto">
            <CardContent className="text-center py-12">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-bold mb-2">Client Not Found</h2>
              <p className="text-muted-foreground mb-4">
                The client you're looking for doesn't exist or has been removed.
              </p>
              <Button onClick={() => navigate('/coach/clients')}>Back to Clients</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 pb-24 sm:pb-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Top Navigation */}
        <CoachNav
          activeTab="clients"
          unreadCount={totalUnreadMessages}
          backTo={{ label: 'Back to Clients', path: '/coach/clients' }}
          clientInfo={{ name: client.name, avatar: client.avatar }}
        />

        {/* Contextual Status Header - Hidden in Mode B when status is 'ok' */}
        {status && !(priorityMode === 'B' && status.type === 'ok') && (
          <ContextualStatusHeader
            client={client}
            status={status}
            lastCheckIn={lastCompletedCheckIn}
            respondedCheckIn={respondedCheckIn}
            activeCheckIn={activeCheckIn}
            onScrollToCheckIn={handleScrollToCheckIn}
            onStartCheckIn={handleStartCheckIn}
          />
        )}

        {/* Compact Weekly Strip - Moved to top for quick orientation */}
        <InteractiveWeeklyStrip
          client={client}
          plan={plan}
          planStartDate={client.planStartDate}
          workoutCompletions={appState.workoutCompletions}
          onScrollToPlanEditor={handleScrollToPlanEditor}
          compact
        />

        {/* Main Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
          {/* Left Column - Mode-dependent content */}
          <div className="flex flex-col gap-4">
            {priorityMode === 'A' ? (
              <>
                {/* Mode A: Check-in prominent */}
                <div ref={checkInRef}>
                  <InlineCheckInReview
                    client={client}
                    activeCheckIn={activeCheckIn}
                    plan={plan}
                    workoutCompletions={appState.workoutCompletions}
                    exerciseFlags={clientFlags}
                    currentUserId={appState.currentUserId}
                    onCompleteCheckIn={handleCompleteCheckIn}
                    onCreateCheckIn={handleCreateCheckIn}
                    onMessageAboutFlag={handleMessageAboutFlag}
                    justSentFromParent={justSentCheckIn}
                    hideTitle={activeCheckIn?.status === 'responded'}
                  />
                </div>

                {/* Plan collapsed in Mode A */}
                <div ref={planEditorRef}>
                  <InlinePlanEditor
                    client={client}
                    plan={plan}
                    planStartDate={client.planStartDate}
                    onUpdatePlan={handleUpdatePlan}
                    onEditPlan={handleEditPlan}
                    onChangePlan={handleChangePlan}
                    onCreatePlan={handleCreateNewPlan}
                    onUnassignPlan={handleUnassignPlan}
                    exercisesCollapsed={true}
                  />
                </div>

                {/* History - grows to fill remaining space */}
                <div className="flex-1 min-h-0">
                  <CheckInHistoryPanel
                    checkIns={appState.checkIns}
                    clientId={client.id}
                    clientName={client.name}
                    initialCount={3}
                    defaultCollapsed={false}
                  />
                </div>
              </>
            ) : (
              <>
                {/* Mode B: Plan prominent, check-in hidden */}
                <div ref={planEditorRef}>
                  <InlinePlanEditor
                    client={client}
                    plan={plan}
                    planStartDate={client.planStartDate}
                    onUpdatePlan={handleUpdatePlan}
                    onEditPlan={handleEditPlan}
                    onChangePlan={handleChangePlan}
                    onCreatePlan={handleCreateNewPlan}
                    onUnassignPlan={handleUnassignPlan}
                    exercisesCollapsed={false}
                  />
                </div>

                {/* History - grows to fill remaining space */}
                <div className="flex-1 min-h-0">
                  <CheckInHistoryPanel
                    checkIns={appState.checkIns}
                    clientId={client.id}
                    clientName={client.name}
                    initialCount={3}
                    defaultCollapsed={false}
                  />
                </div>
              </>
            )}
          </div>

          {/* Right Column - Chat */}
          <div ref={chatRef} className="flex flex-col min-h-[400px] sm:min-h-[500px]">
            <ChatView
              client={client}
              messages={appState.messages}
              currentUserId={appState.currentUserId}
              currentUserName={currentCoach?.name || 'Coach'}
              onSendMessage={handleSendMessage}
              initialPrefill={chatPrefill}
              heightClass="flex-1"
            />
          </div>
        </div>

        {/* Plan Setup Modal (for creating new plan) */}
        <PlanSetupModal
          isOpen={showPlanSetupModal}
          onSubmit={handlePlanCreated}
          onClose={() => setShowPlanSetupModal(false)}
        />

        {/* Assign Plan Modal (for selecting existing plan) */}
        <AssignPlanModal
          isOpen={showAssignPlanModal}
          onClose={() => setShowAssignPlanModal(false)}
          onAssign={handleAssignPlan}
          plans={appState.plans}
          currentPlanId={plan?.id}
        />

        {/* Plan Editor Drawer */}
        {plan && (
          <PlanEditorDrawer
            open={showPlanDrawer}
            onOpenChange={setShowPlanDrawer}
            plan={plan}
            onUpdatePlan={handleUpdatePlan}
            appState={appState}
          />
        )}
      </div>
    </div>
  );
}
