'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Client, CheckIn, WorkoutPlan, WorkoutCompletion, ExerciseFlag, Message } from '@/types';
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
import { Button } from '@/components/ui/button';
import { ArrowLeftRight, Loader2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { getClientStatus } from '@/lib/client-status';
import { getCurrentWeekNumber, getWeekDays, getWeekProgress } from '@/lib/workout-week-helpers';
import { WORKOUT_FEELING_DISPLAY, BODY_FEELING_DISPLAY } from '@/lib/checkin-display';

// Compact relative-day label for the vitals strip — "Today", "1d ago", …
function daysAgoLabel(iso?: string | Date | null): string | null {
  if (!iso) return null;
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Today';
  return `${days}d ago`;
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
  const [secondaryTab, setSecondaryTab] = useState<'plan' | 'history'>('plan');
  const [justSentCheckIn, setJustSentCheckIn] = useState(false);
  const [isSendingCheckIn, setIsSendingCheckIn] = useState(false);
  // Optimistic override for the weekly check-in schedule switch (null = follow server)
  const [scheduleOverride, setScheduleOverride] = useState<boolean | null>(null);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [clientId]);

  // Refs for scrolling
  const checkInRef = useRef<HTMLDivElement>(null);
  const planEditorRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const secondaryRef = useRef<HTMLDivElement>(null);

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
    if (!clientId) return;
    try {
      await apiFetch(`/api/coach/clients/${clientId}/plan`, { method: 'DELETE' });
      refreshClient();
      refreshPlan();
    } catch {
      toast.error('Failed to remove the plan. Please try again.');
    }
    setShowAssignPlanModal(false);
  };

  const handleUpdatePlan = async () => {
    // Drawer edits persist themselves — just re-fetch so this page reflects them
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

  const handleToggleCheckInSchedule = async (enabled: boolean) => {
    if (!clientId) return;
    setScheduleOverride(enabled);
    try {
      await apiFetch(`/api/coach/clients/${clientId}/check-in-schedule`, {
        method: 'PUT',
        body: JSON.stringify({ enabled }),
      });
      // Enabling may auto-create a due check-in — refetch to show it
      await refreshClient();
    } catch {
      toast.error('Failed to update the check-in schedule. Please try again.');
    } finally {
      setScheduleOverride(null);
    }
  };

  // ---- Loading State ----
  if (isLoadingClient) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center animate-enter">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Client not found
  if (!client || !apiClient) {
    return (
      <div className="min-h-screen bg-background pb-24 sm:pb-4">
        <CoachNav activeTab="clients" />
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 px-3 pt-3 sm:px-4 sm:pt-7">
          <div className="max-w-md mx-auto bg-card rounded-xl overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.03),0_0_0_1px_rgba(0,0,0,0.04)] animate-enter">
            <div className="text-center py-12 px-6">
              <div className="text-4xl select-none mb-4 animate-bounce-once">🔍</div>
              <h2 className="text-lg font-bold mb-1.5 tracking-tight antialiased">Can&apos;t find this client</h2>
              <p className="text-sm text-muted-foreground mb-5 antialiased">
                They may have been removed, or the link might be outdated.
              </p>
              <Button
                onClick={() => router.push('/coach/clients')}
                className="active:scale-[0.96] transition-transform duration-150"
              >
                Back to Clients
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Safe first-name extraction — never returns empty string
  const firstName = client.name?.split(' ')[0] || client.name || 'Client';

  // ---- At-a-glance vitals (plain derivations — we're past all hooks/early returns) ----
  const planTotalWeeks = plan ? (plan.durationWeeks || plan.weeks.length) : 0;
  const currentWeekNum = plan && client.planStartDate
    ? getCurrentWeekNumber(client.planStartDate, planTotalWeeks)
    : null;
  const currentWeek = plan
    ? (plan.weeks.find((w) => w.weekNumber === currentWeekNum) ?? plan.weeks[0])
    : null;
  const weekProgress = currentWeek
    ? getWeekProgress(getWeekDays(currentWeek, workoutCompletions, client.id))
    : null;
  const lastWorkoutAt = workoutCompletions.reduce<Date | null>((latest, wc) => {
    if (wc.status !== 'COMPLETED' || !wc.completedAt) return latest;
    const at = new Date(wc.completedAt);
    return !latest || at > latest ? at : latest;
  }, null);
  const lastCompletedCheckIn = checkIns
    .filter((c) => c.status === 'completed')
    .sort((a, b) => new Date(b.completedAt || b.date).getTime() - new Date(a.completedAt || a.date).getTime())[0] ?? null;
  // lastCheckInDate isn't always populated on the client record — fall back to history
  const lastCheckInAt = client.lastCheckInDate ?? lastCompletedCheckIn?.completedAt ?? lastCompletedCheckIn?.date;

  // Derive inline status info
  // Suppress urgent badges when coach already sent a check-in — "Waiting for X" section is the real status
  const hasActiveCheckIn = !!activeCheckIn;
  const rawUrgent = status && (status.type === 'overdue' || status.type === 'at-risk');
  const showStatusBanner = status
    && !(priorityMode === 'B' && status.type === 'ok')
    && status.type !== 'pending-checkin'
    && !(rawUrgent && hasActiveCheckIn);
  const statusLabel = showStatusBanner ? status!.label : null;
  const StatusIcon = showStatusBanner ? status!.icon : null;
  const statusIsUrgent = showStatusBanner && (status!.type === 'overdue' || status!.type === 'at-risk');

  // Days-since detail for urgent statuses — shown inline in the subtitle
  // instead of a separate alert strip, so "overdue" is said once, in one place.
  const urgentDetail: string | null = (() => {
    if (!statusIsUrgent || !client.lastCheckInDate) return null;
    const days = Math.floor((Date.now() - new Date(client.lastCheckInDate).getTime()) / (1000 * 60 * 60 * 24));
    if (status!.type === 'overdue') return `${Math.max(1, days)}d since last check-in`;
    return `${Math.max(1, 7 - days)}d until overdue`;
  })();

  // Primary action — always give the coach one obvious next move, chosen by the
  // client's state, so the page is never just a passive read-out. `kind` lets
  // other parts of the page avoid repeating the same button.
  const scrollToChat = () =>
    chatRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const primaryAction: { label: string; onClick: () => void; disabled?: boolean; kind: 'assign' | 'review' | 'message' | 'send' } =
    !plan
      ? { label: 'Assign a plan', onClick: handleChangePlan, kind: 'assign' }
      : activeCheckIn?.status === 'responded'
        ? { label: 'Review check-in', onClick: handleScrollToCheckIn, kind: 'review' }
        : activeCheckIn?.status === 'pending'
          ? { label: `Message ${firstName}`, onClick: scrollToChat, kind: 'message' }
          : statusIsUrgent || !status?.hasUnread
            ? { label: isSendingCheckIn ? 'Sending…' : 'Send check-in', onClick: handleStartCheckIn, disabled: isSendingCheckIn, kind: 'send' }
            : { label: `Message ${firstName}`, onClick: scrollToChat, kind: 'message' };

  // Build subtitle from status or plan. Urgent statuses get the warning voice
  // with the days detail folded in; everything else keeps a quiet metadata line.
  const headerSubtitle: React.ReactNode = statusIsUrgent && statusLabel && StatusIcon
    ? (
      <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-warning font-medium antialiased flex items-center gap-1.5">
        <StatusIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        {statusLabel}
        {urgentDetail && <span className="text-warning/70 normal-case tracking-normal tabular-nums">· {urgentDetail}</span>}
      </p>
    )
    : statusLabel
      ?? (plan ? (
        <p className="text-[13px] text-muted-foreground antialiased">
          {plan.emoji} {plan.name}
        </p>
      ) : undefined);

  // Section label helper — consistent uppercase tracking with antialiased rendering.
  // Real <h2> so the page has a navigable heading outline, styled down to a label.
  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <div className="px-1 pb-2.5">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground font-medium antialiased">
        {children}
      </h2>
    </div>
  );

  // Card surface helper — shadows over borders, concentric radii (outer 12px, inner content inherits)
  const SectionCard = ({ children, className: cardClassName }: { children: React.ReactNode; className?: string }) => (
    <div className={cn(
      "bg-card rounded-xl overflow-hidden p-4 sm:p-5",
      "shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.03),0_0_0_1px_rgba(0,0,0,0.04)]",
      "transition-shadow duration-200",
      cardClassName
    )}>
      {children}
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-24 sm:pb-4">
      <CoachNav activeTab="clients" />

      <div className="max-w-7xl mx-auto px-4 pt-5 sm:px-6 sm:pt-10 lg:px-8">
        <main className="space-y-6 sm:space-y-8">
        {/* Page header — path-style title; "Clients /" crumb is the way back */}
        <div className="animate-enter" style={{ animationDelay: '0ms' }}>
          <PageHeader
            title={client.name}
            subtitle={headerSubtitle}
            breadcrumb={{ label: 'Clients', onClick: () => router.push('/coach/clients') }}
            action={
              <Button
                variant="default"
                size="sm"
                onClick={primaryAction.onClick}
                disabled={primaryAction.disabled}
                className="active:scale-[0.96] transition-transform duration-150 tap-target"
              >
                {primaryAction.label}
              </Button>
            }
          />
        </div>

        {/* ── Sections ── */}

        {/* At-a-glance vitals — where the client is in the plan and how active they've been */}
        {plan && weekProgress && (
        <div className="animate-enter" style={{ animationDelay: '100ms' }}>
          <SectionCard>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium antialiased mb-1.5">This week</p>
                <div className="flex items-center gap-3">
                  <p className="font-mono text-lg font-semibold tabular-nums leading-none antialiased">
                    {weekProgress.completed}
                    <span className="text-muted-foreground font-normal">/{weekProgress.total}</span>
                  </p>
                  <div className="flex gap-1 w-full max-w-[72px]" aria-hidden="true">
                    {Array.from({ length: weekProgress.total }, (_, i) => (
                      <div
                        key={i}
                        className={cn(
                          'flex-1 h-1.5 rounded-full',
                          i < weekProgress.completed ? 'bg-success' : 'bg-success/15'
                        )}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium antialiased mb-1.5">Plan week</p>
                <p className="font-mono text-lg font-semibold tabular-nums leading-none antialiased">
                  {currentWeekNum ?? 1} <span className="text-muted-foreground font-normal">of {planTotalWeeks}</span>
                </p>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium antialiased mb-1.5">Last workout</p>
                <p className="font-mono text-lg font-semibold tabular-nums leading-none antialiased">{daysAgoLabel(lastWorkoutAt) ?? '—'}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium antialiased mb-1.5">Last check-in</p>
                <p className={cn(
                  "font-mono text-lg font-semibold tabular-nums leading-none antialiased",
                  statusIsUrgent && "text-warning"
                )}>{daysAgoLabel(lastCheckInAt) ?? 'None yet'}</p>
              </div>
            </div>
          </SectionCard>
        </div>
        )}

        {/* Check-in section — only shown when client has an active plan */}
        {plan && (
        <section ref={checkInRef} className="animate-enter" style={{ animationDelay: '140ms' }}>
          <SectionLabel>Latest check-in</SectionLabel>
          <SectionCard>
            {activeCheckIn ? (
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
            ) : (
              /* No check-in in flight — one compact row instead of a full-height hero,
                 summarizing the most recent completed check-in so the section earns its label */
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  {lastCompletedCheckIn ? (
                    <>
                      <p className="text-sm font-semibold antialiased">
                        Completed {format(new Date(lastCompletedCheckIn.completedAt || lastCompletedCheckIn.date), 'MMM d')}
                        {lastCompletedCheckIn.workoutFeeling && WORKOUT_FEELING_DISPLAY[lastCompletedCheckIn.workoutFeeling] && (
                          <span className="font-normal text-muted-foreground">
                            {' '}· {WORKOUT_FEELING_DISPLAY[lastCompletedCheckIn.workoutFeeling].emoji} {WORKOUT_FEELING_DISPLAY[lastCompletedCheckIn.workoutFeeling].label}
                          </span>
                        )}
                        {lastCompletedCheckIn.bodyFeeling && BODY_FEELING_DISPLAY[lastCompletedCheckIn.bodyFeeling] && (
                          <span className="font-normal text-muted-foreground">
                            {' '}· {BODY_FEELING_DISPLAY[lastCompletedCheckIn.bodyFeeling].emoji} {BODY_FEELING_DISPLAY[lastCompletedCheckIn.bodyFeeling].label}
                          </span>
                        )}
                      </p>
                      {lastCompletedCheckIn.clientNotes && (
                        <p className="font-prose text-[13px] text-muted-foreground truncate mt-0.5 antialiased">
                          &ldquo;{lastCompletedCheckIn.clientNotes}&rdquo;
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-semibold antialiased">No check-ins yet</p>
                      <p className="text-[13px] text-muted-foreground mt-0.5 antialiased">
                        Send the first one to hear how {firstName}&apos;s training is going.
                      </p>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {lastCompletedCheckIn && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground tap-target"
                      onClick={() => {
                        setSecondaryTab('history');
                        secondaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                    >
                      View history
                    </Button>
                  )}
                  {/* The header CTA already sends the check-in — don't repeat the same primary button */}
                  {primaryAction.kind !== 'send' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleStartCheckIn}
                      disabled={isSendingCheckIn || justSentCheckIn}
                      className="active:scale-[0.96] transition-transform duration-150 tap-target"
                    >
                      {isSendingCheckIn ? 'Sending…' : justSentCheckIn ? 'Sent ✓' : 'Send check-in'}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </SectionCard>
        </section>
        )}

        {/* Two-column: Chat + Secondary — stagger delay 4 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 animate-enter" style={{ animationDelay: '200ms' }}>
          {/* Messages */}
          <section>
            <div ref={chatRef} className={cn(
              "bg-card rounded-xl overflow-hidden md:h-[480px] flex flex-col",
              "shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.03),0_0_0_1px_rgba(0,0,0,0.04)]",
            )}>
              <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-0 shrink-0">
                <div className="flex gap-1 border-b border-border mb-0 -mt-1">
                  <h2 className="pb-2 px-2 font-mono text-[11px] uppercase tracking-[0.15em] font-medium text-foreground antialiased relative">
                    Messages
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-foreground rounded-full" />
                  </h2>
                </div>
              </div>
              <ChatView
                client={client}
                messages={messages}
                currentUserId={user?.id ?? ''}
                currentUserName={user?.name ?? 'Coach'}
                onSendMessage={handleSendMessage}
                initialPrefill={chatPrefill}
                /* Fixed height on mobile so the history scrolls inside the card instead of
                   stretching the page (flex-basis 0 from flex-1 would override h-[…]) */
                heightClass="h-[420px] md:h-auto md:flex-1 md:min-h-0"
              />
            </div>
          </section>

          {/* Secondary: Tabbed Plan + History.
              Matches the chat card's height on desktop; footers pin to the bottom
              edge (like the chat input) so spare space sits inside the card. */}
          <section ref={secondaryRef}>
            <SectionCard className="md:h-[480px] md:flex md:flex-col">
              {/* Tab bar */}
              <div className="flex gap-1 border-b border-border mb-3 -mt-1">
                {([
                  { id: 'plan' as const, label: 'Training Plan' },
                  { id: 'history' as const, label: 'History', count: checkIns.filter(c => c.status === 'completed').length },
                ] as const).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSecondaryTab(tab.id)}
                    className={cn(
                      'pb-2 px-2 font-mono text-[11px] uppercase tracking-[0.15em] font-medium antialiased transition-colors duration-150 relative tap-target',
                      secondaryTab === tab.id
                        ? 'text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {tab.label}
                    {'count' in tab && tab.count > 0 && (
                      <span className="ml-1.5 text-[10px] tabular-nums text-muted-foreground">{tab.count}</span>
                    )}
                    {secondaryTab === tab.id && (
                      <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-foreground rounded-full" />
                    )}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              {secondaryTab === 'plan' ? (
                <div ref={planEditorRef} className={cn(
                  "md:flex-1 md:min-h-0 md:flex md:flex-col",
                  !plan && "flex items-center justify-center py-6"
                )}>
                  {plan ? (
                    <>
                      {/* Plan actions row */}
                      <div className="flex items-center justify-between pb-3 md:shrink-0">
                        <div className="min-w-0">
                          <h3 className="text-base font-semibold flex items-center gap-2 min-w-0 antialiased">
                            <span className="text-lg shrink-0" aria-hidden="true">{plan.emoji || '💪'}</span>
                            <span className="truncate">{plan.name}</span>
                          </h3>
                          <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground tabular-nums antialiased mt-1">
                            Week {currentWeekNum ?? 1} of {planTotalWeeks}
                          </p>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <Button variant="ghost" size="sm" onClick={handleChangePlan} className="text-muted-foreground hover:text-foreground active:scale-[0.96] transition-transform duration-150 tap-target">
                            <ArrowLeftRight className="w-3.5 h-3.5 mr-1.5" />
                            Change
                          </Button>
                          <Button variant="ghost" size="sm" onClick={handleEditPlan} className="text-muted-foreground hover:text-foreground active:scale-[0.96] transition-transform duration-150 tap-target">
                            <Pencil className="w-3.5 h-3.5 mr-1.5" />
                            Edit
                          </Button>
                        </div>
                      </div>
                      {/* Full weekly view — scrolls internally if it outgrows the card */}
                      <div className="md:flex-1 md:min-h-0 md:overflow-y-auto">
                        <InteractiveWeeklyStrip
                          client={client}
                          plan={plan}
                          planStartDate={client.planStartDate}
                          workoutCompletions={workoutCompletions}
                          onEditPlan={handleEditPlan}
                          variant="flat"
                        />
                      </div>
                      {/* Plan meta footer — pinned to the card's bottom edge on desktop */}
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground antialiased pt-3 mt-1 border-t border-border/40 md:shrink-0">
                        {planTotalWeeks} {planTotalWeeks === 1 ? 'week' : 'weeks'}
                        {plan.workoutsPerWeek ? ` · ${plan.workoutsPerWeek}×/week` : ''}
                        {client.planStartDate ? ` · Started ${format(new Date(client.planStartDate), 'MMM d')}` : ''}
                      </p>
                    </>
                  ) : (
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
                  )}
                </div>
              ) : (
                <div className="md:flex-1 md:min-h-0">
                  <CheckInHistoryPanel
                    checkIns={checkIns}
                    clientId={client.id}
                    clientName={client.name}
                    initialCount={3}
                    hasPlan={!!plan}
                    scheduleEnabled={scheduleOverride ?? apiClient.checkInScheduleEnabled}
                    onToggleSchedule={handleToggleCheckInSchedule}
                  />
                </div>
              )}
            </SectionCard>
          </section>
        </div>
        </main>
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
        onUnassign={handleUnassignPlan}
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
