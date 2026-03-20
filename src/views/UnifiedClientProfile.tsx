'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Client, CheckIn, WorkoutPlan, WorkoutCompletion, ExerciseFlag, Message, WorkoutDay, Exercise, WorkoutWeek } from '@/types';
import { useClientProfile } from '@/hooks/api/useClientProfile';
import { usePlanDetail } from '@/hooks/api/usePlanDetail';
import { useMessages } from '@/hooks/api/useMessages';
import { useCoachPlans } from '@/hooks/api/useCoachPlans';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { createCheckInForClient, useCheckIn } from '@/hooks/api/useCheckIn';
import { apiFetch } from '@/lib/api-client';
import {
  apiPlanToWorkoutPlan,
  apiCheckInToCheckIn,
  apiMessagesToMessages,
  apiClientDetailToWorkoutCompletions,
  apiClientDetailToClient,
} from '@/lib/adapters/api';
import { cn } from '@/lib/utils';
import { InlineCheckInReview } from '@/components/coach/workspace/InlineCheckInReview';
import { CheckInHistoryPanel } from '@/components/coach/workspace/CheckInHistoryPanel';
import { InlinePlanEditor } from '@/components/coach/workspace/InlinePlanEditor';
import { InteractiveWeeklyStrip } from '@/components/coach/workspace/InteractiveWeeklyStrip';
import { PlanEditorDrawer } from '@/components/coach/workspace/PlanEditorDrawer';
import { ChatView } from '@/components/chat/ChatView';
import { PlanSetupModal } from '@/components/coach/PlanSetupModal';
import { AssignPlanModal } from '@/components/coach/AssignPlanModal';
import { CoachNav } from '@/components/coach/CoachNav';
import { PageHeader } from '@/components/coach/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getClientStatus } from '@/lib/client-status';


export function UnifiedClientProfile() {
  const params = useParams<{ clientId: string }>();
  const clientId = params?.clientId ?? null;
  const router = useRouter();
  const { user } = useCurrentUser();

  // API hooks
  const { client: apiClient, isLoading: isLoadingClient, refresh: refreshClient } = useClientProfile(clientId);
  const { plan: apiPlan, refresh: refreshPlan } = usePlanDetail(apiClient?.activePlan?.id ?? null);
  const { messages: apiMessages, sendMessage } = useMessages(apiClient?.user.id ?? null);
  const { plans: coachPlans, createPlan, refresh: refreshCoachPlans } = useCoachPlans();

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
  const [isSendingCheckIn, setIsSendingCheckIn] = useState(false);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [clientId]);

  // Refs for scrolling
  const checkInRef = useRef<HTMLDivElement>(null);
  const planEditorRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  // Timer ref for cleanup
  const sentTimerRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    return () => clearTimeout(sentTimerRef.current);
  }, []);

  // ---- Adapted data for sub-components ----
  const client: Client | null = useMemo(
    () => (apiClient ? apiClientDetailToClient(apiClient) : null),
    [apiClient]
  );

  const checkIns: CheckIn[] = useMemo(
    () =>
      apiClient && user
        ? apiClient.checkIns.map((ci) => apiCheckInToCheckIn(ci, apiClient.id, user.id))
        : [],
    [apiClient, user]
  );

  const plan: WorkoutPlan | undefined = useMemo(
    () => (apiPlan ? apiPlanToWorkoutPlan(apiPlan) : undefined),
    [apiPlan]
  );

  const workoutCompletions: WorkoutCompletion[] = useMemo(
    () =>
      apiClient
        ? apiClientDetailToWorkoutCompletions(
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
        emoji: p.emoji,
        durationWeeks: p.durationWeeks,
        workoutsPerWeek: p.workoutsPerWeek,
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
    if (!clientId || activeCheckIn || isSendingCheckIn) return;
    setIsSendingCheckIn(true);
    try {
      await createCheckInForClient(clientId);
      refreshClient();
      setJustSentCheckIn(true);
      clearTimeout(sentTimerRef.current);
      sentTimerRef.current = setTimeout(() => setJustSentCheckIn(false), 5000);
      handleScrollToCheckIn();
    } catch {
      toast.error('Failed to send check-in. Please try again.');
    } finally {
      setIsSendingCheckIn(false);
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
      toast.error('Failed to submit your response. Please try again.');
    }
  };

  const handleCreateCheckIn = async () => {
    if (!clientId) return;
    try {
      await createCheckInForClient(clientId);
      refreshClient();
    } catch {
      toast.error('Failed to create check-in. Please try again.');
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

  const handlePlanCreated = async (formData: import('@/types').PlanSetupFormData) => {
    if (!clientId) return;
    try {
      const newPlan = await createPlan({
        name: formData.name,
        description: formData.description,
        emoji: formData.emoji,
        durationWeeks: formData.durationWeeks,
        workoutsPerWeek: formData.workoutsPerWeek,
      });
      // Auto-assign the new plan to this client
      await apiFetch(`/api/plans/${newPlan.id}/assign`, {
        method: 'POST',
        body: JSON.stringify({ clientProfileId: clientId }),
      });
      setShowPlanSetupModal(false);
      refreshClient();
      refreshPlan();
      refreshCoachPlans();
    } catch {
      toast.error('Failed to create and assign plan. Please try again.');
    }
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
      toast.error('Failed to assign plan. Please try again.');
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

  // Safe first-name extraction — never returns empty string
  const firstName = client.name?.split(' ')[0] || client.name || 'Client';

  // Derive inline status info
  // Suppress urgent badges when coach already sent a check-in — "Waiting for X" section is the real status
  const hasActiveCheckIn = !!activeCheckIn;
  const rawUrgent = status && (status.type === 'overdue' || status.type === 'at-risk');
  const showStatusBanner = status
    && !(priorityMode === 'B' && status.type === 'ok')
    && status.type !== 'pending-checkin'
    && !(rawUrgent && hasActiveCheckIn);
  const statusLabel = showStatusBanner ? status!.label : null;
  const statusColor = showStatusBanner ? status!.color : null;
  const StatusIcon = showStatusBanner ? status!.icon : null;
  const statusIsUrgent = showStatusBanner && (status!.type === 'overdue' || status!.type === 'at-risk');

  // Status action — only show when actionable (not already sent)
  const statusAction = statusIsUrgent ? {
    label: isSendingCheckIn ? 'Sending…' : 'Send Check-In',
    onClick: handleStartCheckIn,
    disabled: isSendingCheckIn,
  } : status?.type === 'unread' ? {
    label: 'View Messages',
    onClick: handleScrollToCheckIn,
    disabled: false,
  } : null;

  // Build subtitle from status or plan
  const headerSubtitle = statusLabel
    ?? (plan ? `${plan.emoji} ${plan.name}` : undefined);

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 pb-24 sm:pb-4">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        <CoachNav activeTab="clients" />

        {/* Back link */}
        <button
          onClick={() => router.push('/coach/clients')}
          className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.15em] text-muted-foreground font-medium hover:text-foreground transition-colors group"
          aria-label="Back to Clients"
        >
          <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Clients
        </button>

        {/* Page header — matches Dashboard/Clients/Plans pattern */}
        <PageHeader
          title={client.name}
          subtitle={headerSubtitle}
          action={statusAction ? (
            <Button
              variant={statusIsUrgent ? 'default' : 'outline'}
              size="sm"
              onClick={statusAction.onClick}
              disabled={statusAction.disabled}
            >
              {statusAction.label}
            </Button>
          ) : undefined}
        />

        {/* Status alert strip — only when urgent */}
        {showStatusBanner && statusIsUrgent && StatusIcon && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-warning/10 text-warning text-xs font-medium">
            <StatusIcon className="w-3.5 h-3.5 shrink-0" />
            <span>
              {status!.type === 'overdue' && client.lastCheckInDate && (() => {
                const days = Math.max(1, Math.floor((Date.now() - new Date(client.lastCheckInDate).getTime()) / (1000 * 60 * 60 * 24)));
                return `${days}d since last check-in`;
              })()}
              {status!.type === 'at-risk' && client.lastCheckInDate && (() => {
                const days = Math.max(1, 7 - Math.floor((Date.now() - new Date(client.lastCheckInDate).getTime()) / (1000 * 60 * 60 * 24)));
                return `${days}d until overdue`;
              })()}
            </span>
          </div>
        )}

        {/* This Week — compact progress strip */}
        <InteractiveWeeklyStrip
          client={client}
          plan={plan}
          planStartDate={client.planStartDate}
          workoutCompletions={workoutCompletions}
          onScrollToPlanEditor={handleScrollToPlanEditor}
          compact
        />

        {/* ── Sections ── */}

        {/* Primary: Check-in or Plan */}
        {priorityMode === 'A' ? (
          <section ref={checkInRef}>
            <div className="px-1 pb-2">
              <span className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground font-medium">
                Check-in
              </span>
            </div>
            <div className="bg-card rounded-xl border overflow-hidden p-3 sm:p-4">
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
                variant="flat"
              />
            </div>
          </section>
        ) : (
          <section ref={planEditorRef}>
            <div className="px-1 pb-2">
              <span className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground font-medium">
                Training Plan
              </span>
            </div>
            <div className="bg-card rounded-xl border overflow-hidden p-3 sm:p-4">
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
                variant="flat"
              />
            </div>
          </section>
        )}

        {/* Two-column: Chat + Secondary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Messages */}
          <section>
            <div className="px-1 pb-2">
              <span className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground font-medium">
                Messages
              </span>
            </div>
            <div ref={chatRef} className="bg-card rounded-xl border overflow-hidden h-[400px] md:h-[480px]">
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
          </section>

          {/* Secondary: Plan (if check-in is primary) + History */}
          <section className="space-y-4 sm:space-y-6">
            {priorityMode === 'A' && (
              <div>
                <div className="px-1 pb-2">
                  <span className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground font-medium">
                    Training Plan
                  </span>
                </div>
                <div ref={planEditorRef} className="bg-card rounded-xl border overflow-hidden p-3 sm:p-4">
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
                </div>
              </div>
            )}

            <div>
              <div className="px-1 pb-2">
                <span className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground font-medium">
                  Check-in History
                </span>
              </div>
              <div className="bg-card rounded-xl border overflow-hidden p-3 sm:p-4">
                <CheckInHistoryPanel
                  checkIns={checkIns}
                  clientId={client.id}
                  clientName={client.name}
                  initialCount={3}
                  hasPlan={!!plan}
                  onToggleSchedule={handleToggleCheckInSchedule}
                />
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Modals & Drawers */}
      <PlanSetupModal
        isOpen={showPlanSetupModal}
        onSubmit={handlePlanCreated}
        onClose={() => setShowPlanSetupModal(false)}
      />
      <AssignPlanModal
        isOpen={showAssignPlanModal}
        onClose={() => setShowAssignPlanModal(false)}
        onAssign={handleAssignPlan}
        plans={plansList}
        currentPlanId={plan?.id}
      />
      <PlanEditorDrawer
        open={showPlanDrawer}
        onOpenChange={setShowPlanDrawer}
        plan={plan ?? null}
        onUpdatePlan={handleUpdatePlan}
        onRefresh={() => { refreshPlan(); refreshCoachPlans(); }}
      />
    </div>
  );
}
