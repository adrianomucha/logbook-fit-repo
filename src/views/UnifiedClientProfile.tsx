import { useState, useMemo, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppState, Message, PlanSetupFormData, ExerciseFlag, CheckIn, WorkoutPlan } from '@/types';
import { getClientStatus } from '@/lib/client-status';
import { getActiveCheckIn } from '@/lib/checkin-helpers';
import { getScheduleForClient, upsertSchedule } from '@/lib/checkin-schedule-helpers';
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
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { generatePlanStructure, deepCopyPlan } from '@/lib/plan-generator';

interface UnifiedClientProfileProps {
  appState: AppState;
  onUpdateState: (updater: (state: AppState) => AppState) => void;
}

export function UnifiedClientProfile({ appState, onUpdateState }: UnifiedClientProfileProps) {
  const params = useParams<{ clientId: string }>();
  const clientId = params?.clientId;
  const router = useRouter();
  const [showPlanSetupModal, setShowPlanSetupModal] = useState(false);
  const [showAssignPlanModal, setShowAssignPlanModal] = useState(false);
  const [showPlanDrawer, setShowPlanDrawer] = useState(false);
  const [chatPrefill, setChatPrefill] = useState<string | undefined>(undefined);
  const [justSentCheckIn, setJustSentCheckIn] = useState(false);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [clientId]);

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

  // Get check-in schedule for this client
  const clientSchedule = useMemo(
    () => clientId ? getScheduleForClient(clientId, appState.checkInSchedules || []) : undefined,
    [appState.checkInSchedules, clientId]
  );

  // Auto-mark client messages as read when coach views their profile
  useEffect(() => {
    if (!clientId) return;
    const hasUnread = appState.messages.some(
      (m) => m.senderId === clientId && !m.read
    );
    if (hasUnread) {
      onUpdateState((state) => ({
        ...state,
        messages: state.messages.map((m) =>
          m.senderId === clientId && !m.read ? { ...m, read: true } : m
        ),
      }));
    }
  }, [clientId]); // Only run when navigating to a new client profile

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
      checkInSchedules: (state.checkInSchedules || []).map((s) =>
        s.clientId === clientId
          ? { ...s, status: 'INACTIVE' as const, updatedAt: new Date().toISOString() }
          : s
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
    const now = new Date().toISOString();

    onUpdateState((state) => ({
      ...state,
      // Add both the template and the instance
      plans: [...state.plans, newTemplate, clientInstance],
      // Assign the instance (not the template) to the client
      clients: state.clients.map((c) =>
        c.id === clientId
          ? { ...c, currentPlanId: clientInstance.id, planStartDate: now }
          : c
      ),
      // Auto-enroll: upsert ACTIVE check-in schedule
      checkInSchedules: upsertSchedule(
        state.checkInSchedules || [],
        clientId!,
        state.currentUserId,
        'ACTIVE',
        now
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
    const now = new Date().toISOString();

    onUpdateState((state) => ({
      ...state,
      // Add the new instance to plans array
      plans: [...state.plans, clientInstance],
      // Assign the instance (not the template) to the client
      clients: state.clients.map((c) =>
        c.id === clientId
          ? { ...c, currentPlanId: clientInstance.id, planStartDate: now }
          : c
      ),
      // Auto-enroll: upsert ACTIVE check-in schedule
      checkInSchedules: upsertSchedule(
        state.checkInSchedules || [],
        clientId!,
        state.currentUserId,
        'ACTIVE',
        now
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

  const handleToggleCheckInSchedule = (enabled: boolean) => {
    if (!clientId) return;
    const now = new Date().toISOString();

    if (enabled) {
      // Re-activate: set ACTIVE with anchorDate = now
      onUpdateState((state) => ({
        ...state,
        checkInSchedules: upsertSchedule(
          state.checkInSchedules || [],
          clientId,
          state.currentUserId,
          'ACTIVE',
          now
        ),
      }));
    } else {
      // Pause: set PAUSED
      onUpdateState((state) => ({
        ...state,
        checkInSchedules: (state.checkInSchedules || []).map((s) =>
          s.clientId === clientId
            ? { ...s, status: 'PAUSED' as const, updatedAt: now }
            : s
        ),
      }));
    }
  };

  const handleScrollToPlanEditor = (dayId: string) => {
    planEditorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Could also set the selected day in the editor here if we add that prop
  };

  // Client not found error state
  if (!client) {
    return (
      <div className="min-h-screen bg-background p-3 sm:p-4 pb-24 sm:pb-4">
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
          <CoachNav activeTab="clients" unreadCount={totalUnreadMessages} />
          <Card className="max-w-md mx-auto">
            <CardContent className="text-center py-12">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-bold mb-2">Client Not Found</h2>
              <p className="text-muted-foreground mb-4">
                The client you're looking for doesn't exist or has been removed.
              </p>
              <Button onClick={() => router.push('/coach/clients')}>Back to Clients</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 pb-24 sm:pb-4">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Top Navigation */}
        <CoachNav
          activeTab="clients"
          unreadCount={totalUnreadMessages}
        />

        {/* Page title — back arrow + client avatar + name */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/coach/clients')}
            className="h-8 w-8 p-0 shrink-0"
            aria-label="Back to Clients"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          {client.avatar && (
            <span className="text-2xl leading-none shrink-0" aria-hidden="true">
              {client.avatar}
            </span>
          )}
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">
            {client.name}
          </h1>
        </div>

        {/* Contextual Status Header - Hidden when status is 'ok' (Mode B) or 'pending-checkin' (Fix 17) */}
        {/* For pending-checkin, the InlineCheckInReview below already shows the check-in context */}
        {status && !(priorityMode === 'B' && status.type === 'ok') && status.type !== 'pending-checkin' && (
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

        {/* Main Workspace Layout
             Full-width primary card on top, 2-col grid (chat + secondary) below.
             Mobile: single column stacking. */}

        {/* Primary card — full width */}
        {priorityMode === 'A' ? (
          <div ref={checkInRef} className="animate-fade-in-up">
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
        ) : (
          <div ref={planEditorRef} className="animate-fade-in-up">
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
        )}

        {/* Bottom row: Chat + Secondary content — matched heights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Chat */}
          <div ref={chatRef} className="flex flex-col h-[450px] md:h-[500px]">
            <ChatView
              client={client}
              messages={appState.messages}
              currentUserId={appState.currentUserId}
              currentUserName={currentCoach?.name || 'Coach'}
              onSendMessage={handleSendMessage}
              initialPrefill={chatPrefill}
              heightClass="h-full"
            />
          </div>

          {/* Secondary content — same height as chat, scrollable */}
          <div className="flex flex-col gap-4 md:h-[500px] md:overflow-y-auto">
            {priorityMode === 'A' && (
              <Card ref={planEditorRef} className="p-3 sm:p-4">
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
                  variant="flat"
                />
              </Card>
            )}

            <Card className="p-3 sm:p-4">
              <CheckInHistoryPanel
                checkIns={appState.checkIns}
                clientId={client.id}
                clientName={client.name}
                initialCount={3}
                schedule={clientSchedule}
                hasPlan={!!plan}
                onToggleSchedule={handleToggleCheckInSchedule}
              />
            </Card>
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
