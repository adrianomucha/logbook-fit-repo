'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Client, CheckIn, WorkoutPlan, WorkoutCompletion, ExerciseFlag, Message, WorkoutDay, Exercise, WorkoutWeek } from '@/types';
import { useClientProfile } from '@/hooks/api/useClientProfile';
import { usePlanDetail } from '@/hooks/api/usePlanDetail';
import type { PlanDetail } from '@/hooks/api/usePlanDetail';
import { useMessages } from '@/hooks/api/useMessages';
import { useCoachPlans } from '@/hooks/api/useCoachPlans';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { createCheckInForClient, useCheckIn } from '@/hooks/api/useCheckIn';
import { apiFetch } from '@/lib/api-client';
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
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { getClientStatus } from '@/lib/client-status';

// ---- Data Adapters ----
// Map API responses → localStorage types for existing sub-components

function apiClientToClient(
  detail: NonNullable<ReturnType<typeof useClientProfile>['client']>
): Client {
  return {
    id: detail.id,
    name: detail.user.name ?? 'Unknown',
    email: detail.user.email,
    currentPlanId: detail.activePlan?.id,
    status: detail.relationshipStatus === 'ACTIVE' ? 'active' : 'inactive',
    avatar: undefined,
    planStartDate: detail.planStartDate ?? undefined,
    lastCheckInDate: detail.checkIns[0]?.completedAt ?? undefined,
  };
}

function apiCheckInsToCheckIns(
  checkIns: NonNullable<ReturnType<typeof useClientProfile>['client']>['checkIns'],
  clientProfileId: string,
  coachUserId: string
): CheckIn[] {
  return checkIns.map((ci) => ({
    id: ci.id,
    clientId: clientProfileId,
    coachId: coachUserId,
    date: ci.createdAt,
    status: ci.status === 'PENDING'
      ? 'pending' as const
      : ci.status === 'CLIENT_RESPONDED'
        ? 'responded' as const
        : 'completed' as const,
    completedAt: ci.completedAt ?? undefined,
    effortRating: ci.effortRating ?? undefined,
  }));
}

function apiPlanToPlan(detail: PlanDetail): WorkoutPlan {
  return {
    id: detail.id,
    name: detail.name,
    description: detail.description ?? undefined,
    durationWeeks: detail.durationWeeks,
    weeks: detail.weeks.map((w): WorkoutWeek => ({
      id: w.id,
      weekNumber: w.weekNumber,
      days: w.days.map((d): WorkoutDay => ({
        id: d.id,
        name: d.name ?? `Day ${d.dayNumber}`,
        isRestDay: d.isRestDay,
        exercises: d.exercises.map((we): Exercise => ({
          id: we.id, // workoutExercise.id as the Exercise id (sub-components use this)
          name: we.exercise.name,
          sets: we.sets,
          reps: we.reps ?? undefined,
          weight: we.weight ?? undefined,
          notes: we.coachNotes ?? undefined,
        })),
      })),
    })),
    createdAt: detail.createdAt,
    updatedAt: detail.updatedAt,
  };
}

function apiCompletionsToWorkoutCompletions(
  completions: NonNullable<ReturnType<typeof useClientProfile>['client']>['completions'],
  clientProfileId: string,
  planId: string
): WorkoutCompletion[] {
  return completions.map((c) => ({
    id: c.id,
    clientId: clientProfileId,
    planId,
    weekId: '', // Not available from API, but not critical for display
    dayId: c.dayId,
    status: 'COMPLETED' as const,
    completedAt: c.completedAt ?? undefined,
    completionPct: (c.completionPct ?? 0) * 100,
    exercisesDone: 0,
    exercisesTotal: 0,
    durationSec: c.durationSec ?? undefined,
    effortRating: (c.effortRating as WorkoutCompletion['effortRating']) ?? undefined,
  }));
}

function apiMessagesToMessages(
  messages: ReturnType<typeof useMessages>['messages'],
  clientProfileId: string
): Message[] {
  return messages.map((m) => ({
    id: m.id,
    senderId: m.senderId,
    senderName: m.sender.name ?? 'Unknown',
    content: m.content,
    timestamp: m.createdAt,
    read: m.readAt !== null,
    clientId: clientProfileId,
  })).reverse(); // API returns newest first, localStorage expects oldest first
}

export function UnifiedClientProfile() {
  const params = useParams<{ clientId: string }>();
  const clientId = params?.clientId ?? null;
  const router = useRouter();
  const { user } = useCurrentUser();

  // API hooks
  const { client: apiClient, isLoading: isLoadingClient, refresh: refreshClient } = useClientProfile(clientId);
  const { plan: apiPlan, refresh: refreshPlan } = usePlanDetail(apiClient?.activePlan?.id ?? null);
  const { messages: apiMessages, sendMessage } = useMessages(apiClient?.user.id ?? null);
  const { plans: coachPlans } = useCoachPlans();

  // Find active check-in from client's check-ins list
  const activeCheckInId = useMemo(() => {
    if (!apiClient) return null;
    const active = apiClient.checkIns.find(
      (ci) => ci.status === 'PENDING' || ci.status === 'CLIENT_RESPONDED'
    );
    return active?.id ?? null;
  }, [apiClient]);

  const { checkIn: activeCheckInDetail } = useCheckIn(activeCheckInId);

  // Local UI state
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

  // ---- Adapted data for sub-components ----
  const client: Client | null = useMemo(
    () => (apiClient ? apiClientToClient(apiClient) : null),
    [apiClient]
  );

  const checkIns: CheckIn[] = useMemo(
    () =>
      apiClient && user
        ? apiCheckInsToCheckIns(apiClient.checkIns, apiClient.id, user.id)
        : [],
    [apiClient, user]
  );

  const plan: WorkoutPlan | undefined = useMemo(
    () => (apiPlan ? apiPlanToPlan(apiPlan) : undefined),
    [apiPlan]
  );

  const workoutCompletions: WorkoutCompletion[] = useMemo(
    () =>
      apiClient
        ? apiCompletionsToWorkoutCompletions(
            apiClient.completions,
            apiClient.id,
            apiClient.activePlan?.id ?? ''
          )
        : [],
    [apiClient]
  );

  const messages: Message[] = useMemo(
    () => (apiClient ? apiMessagesToMessages(apiMessages, apiClient.id) : []),
    [apiMessages, apiClient]
  );

  // Adapted plan list for AssignPlanModal
  const plansList: WorkoutPlan[] = useMemo(
    () =>
      coachPlans.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description ?? undefined,
        durationWeeks: p.durationWeeks,
        weeks: p.weeks.map((w) => ({
          id: w.id,
          weekNumber: w.weekNumber,
          days: [],
        })),
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        isTemplate: true,
      })),
    [coachPlans]
  );

  const activeCheckIn: CheckIn | null = useMemo(() => {
    if (!activeCheckInDetail || !apiClient || !user) return null;
    return {
      id: activeCheckInDetail.id,
      clientId: apiClient.id,
      coachId: user.id,
      date: activeCheckInDetail.createdAt,
      status:
        activeCheckInDetail.status === 'PENDING'
          ? ('pending' as const)
          : activeCheckInDetail.status === 'CLIENT_RESPONDED'
            ? ('responded' as const)
            : ('completed' as const),
      workoutFeeling: (activeCheckInDetail.effortRating as CheckIn['workoutFeeling']) ?? undefined,
      bodyFeeling: (activeCheckInDetail.clientFeeling as CheckIn['bodyFeeling']) ?? undefined,
      clientNotes: activeCheckInDetail.painBlockers ?? undefined,
      clientRespondedAt: activeCheckInDetail.clientRespondedAt ?? undefined,
      coachResponse: activeCheckInDetail.coachFeedback ?? undefined,
      planAdjustment: activeCheckInDetail.planAdjustment || undefined,
      completedAt: activeCheckInDetail.completedAt ?? undefined,
    };
  }, [activeCheckInDetail, apiClient, user]);

  const priorityMode: 'A' | 'B' = activeCheckIn ? 'A' : 'B';

  const lastCompletedCheckIn = useMemo(() => {
    return (
      checkIns
        .filter((c) => c.status === 'completed')
        .sort(
          (a, b) =>
            new Date(b.completedAt || b.date).getTime() -
            new Date(a.completedAt || a.date).getTime()
        )[0] ?? null
    );
  }, [checkIns]);

  const respondedCheckIn = useMemo(() => {
    return (
      checkIns
        .filter((c) => c.status === 'responded')
        .sort(
          (a, b) =>
            new Date(b.clientRespondedAt || b.date).getTime() -
            new Date(a.clientRespondedAt || a.date).getTime()
        )[0] ?? null
    );
  }, [checkIns]);

  // Status computation — uses full getClientStatus for ContextualStatusHeader
  const status = useMemo(() => {
    if (!client) return null;
    return getClientStatus(client, messages, checkIns);
  }, [client, messages, checkIns]);

  // ---- Handlers ----
  const handleScrollToCheckIn = () => {
    checkInRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleStartCheckIn = async () => {
    if (!clientId || activeCheckIn) return;
    try {
      await createCheckInForClient(clientId);
      refreshClient();
      setJustSentCheckIn(true);
      setTimeout(() => setJustSentCheckIn(false), 5000);
      handleScrollToCheckIn();
    } catch {
      // Failed to create check-in
    }
  };

  const handleCompleteCheckIn = async (completedCheckIn: CheckIn) => {
    // Submit coach response via API
    if (!activeCheckInId) return;
    try {
      await apiFetch(`/api/check-ins/${activeCheckInId}/coach-respond`, {
        method: 'PUT',
        body: JSON.stringify({
          coachFeedback: completedCheckIn.coachResponse,
          planAdjustment: completedCheckIn.planAdjustment,
        }),
      });
      refreshClient();
    } catch {
      // Failed to complete check-in
    }
  };

  const handleCreateCheckIn = async () => {
    if (!clientId) return;
    try {
      await createCheckInForClient(clientId);
      refreshClient();
    } catch {
      // Failed to create
    }
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

  const handleUnassignPlan = async () => {
    // TODO: Implement plan unassignment via API when endpoint exists
  };

  const handleUpdatePlan = async (updatedPlan: WorkoutPlan) => {
    // TODO: Implement plan update via API when endpoint exists
    refreshPlan();
  };

  const handlePlanCreated = async () => {
    // TODO: Implement plan creation + assignment via API
    setShowPlanSetupModal(false);
    refreshClient();
  };

  const handleAssignPlan = async (templateId: string) => {
    if (!clientId) return;
    try {
      await apiFetch(`/api/plans/${templateId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ clientProfileId: clientId }),
      });
      refreshClient();
      refreshPlan();
    } catch {
      // Failed to assign
    }
    setShowAssignPlanModal(false);
  };

  const handleSendMessage = async (content: string) => {
    if (!apiClient) return;
    await sendMessage(content);
    setChatPrefill(undefined);
  };

  const handleMessageAboutFlag = (flag: ExerciseFlag, exerciseName: string) => {
    const prefillMessage = `Regarding ${exerciseName}${flag.note ? `: "${flag.note}"` : ''} - `;
    setChatPrefill(prefillMessage);
    chatRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleToggleCheckInSchedule = () => {
    // TODO: Implement schedule toggle via API when endpoint exists
  };

  const handleScrollToPlanEditor = () => {
    planEditorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // ---- Loading State ----
  if (isLoadingClient) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Client not found
  if (!client || !apiClient) {
    return (
      <div className="min-h-screen bg-background p-3 sm:p-4 pb-24 sm:pb-4">
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
          <CoachNav activeTab="clients" />
          <Card className="max-w-md mx-auto">
            <CardContent className="text-center py-12">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-bold mb-2">Client Not Found</h2>
              <p className="text-muted-foreground mb-4">
                The client you&apos;re looking for doesn&apos;t exist or has been removed.
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
        <CoachNav activeTab="clients" />

        {/* Page title */}
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
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">
            {client.name}
          </h1>
        </div>

        {/* Contextual Status Header */}
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

        {/* Compact Weekly Strip */}
        <InteractiveWeeklyStrip
          client={client}
          plan={plan}
          planStartDate={client.planStartDate}
          workoutCompletions={workoutCompletions}
          onScrollToPlanEditor={handleScrollToPlanEditor}
          compact
        />

        {/* Primary card — full width */}
        {priorityMode === 'A' ? (
          <div ref={checkInRef} className="animate-fade-in-up">
            <InlineCheckInReview
              client={client}
              activeCheckIn={activeCheckIn}
              plan={plan}
              workoutCompletions={workoutCompletions}
              exerciseFlags={[]}
              currentUserId={user?.id ?? ''}
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

        {/* Bottom row: Chat + Secondary content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Chat */}
          <div ref={chatRef} className="flex flex-col h-[450px] md:h-[500px]">
            <ChatView
              client={client}
              messages={messages}
              currentUserId={user?.id ?? ''}
              currentUserName={user?.name ?? 'Coach'}
              onSendMessage={handleSendMessage}
              initialPrefill={chatPrefill}
              heightClass="h-full"
            />
          </div>

          {/* Secondary content */}
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
                checkIns={checkIns}
                clientId={client.id}
                clientName={client.name}
                initialCount={3}
                hasPlan={!!plan}
                onToggleSchedule={handleToggleCheckInSchedule}
              />
            </Card>
          </div>
        </div>

        {/* Plan Setup Modal */}
        <PlanSetupModal
          isOpen={showPlanSetupModal}
          onSubmit={handlePlanCreated}
          onClose={() => setShowPlanSetupModal(false)}
        />

        {/* Assign Plan Modal */}
        <AssignPlanModal
          isOpen={showAssignPlanModal}
          onClose={() => setShowAssignPlanModal(false)}
          onAssign={handleAssignPlan}
          plans={plansList}
          currentPlanId={plan?.id}
        />

        {/* Plan Editor Drawer */}
        {plan && (
          <PlanEditorDrawer
            open={showPlanDrawer}
            onOpenChange={setShowPlanDrawer}
            plan={plan}
            onUpdatePlan={handleUpdatePlan}
          />
        )}
      </div>
    </div>
  );
}
