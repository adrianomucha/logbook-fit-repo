'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import type { Client, CheckIn, WorkoutPlan, WorkoutCompletion, ExerciseFlag, Message } from '@/types';
import { useCoachClientProfile } from '@/hooks/api/useCoachClientProfile';
import { usePlanDetail } from '@/hooks/api/usePlanDetail';
import { useMessages } from '@/hooks/api/useMessages';
import { useCoachPlans } from '@/hooks/api/useCoachPlans';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { createCheckInForClient, useCheckIn } from '@/hooks/api/useCheckIn';
import { apiFetch, ApiError } from '@/lib/api-client';
import {
  apiPlanToWorkoutPlan,
  apiCheckInToCheckIn,
  apiMessagesToMessages,
  apiClientDetailToWorkoutCompletions,
  apiClientDetailToExerciseFlags,
  apiClientDetailToClient,
} from '@/lib/adapters/api';
import { cn } from '@/lib/utils';
import { InlineCheckInReview } from '@/components/coach/workspace/InlineCheckInReview';
import {
  CheckInHistoryPanel,
  CheckInScheduleSettings,
} from '@/components/coach/workspace/CheckInHistoryPanel';
import { WorkoutHistoryPanel } from '@/components/coach/workspace/WorkoutHistoryPanel';
import { InlinePlanEditor } from '@/components/coach/workspace/InlinePlanEditor';
import { InteractiveWeeklyStrip } from '@/components/coach/workspace/InteractiveWeeklyStrip';
import { PlanEditorDrawer } from '@/components/coach/workspace/PlanEditorDrawer';
import { ChatView } from '@/components/chat/ChatView';
import { NotificationToggle } from '@/components/notifications/NotificationToggle';
import { PlanSetupModal } from '@/components/coach/PlanSetupModal';
import { AssignPlanModal } from '@/components/coach/AssignPlanModal';
import { ConfirmationModal } from '@/components/coach/ConfirmationModal';
import { CoachNav } from '@/components/coach/CoachNav';
import { PageHeader } from '@/components/coach/PageHeader';
import { Button } from '@/components/ui/button';
import { LoadErrorState } from '@/components/coach/EmptyStates';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AlertCircle, ArrowLeftRight, Loader2, MoreVertical, Pencil, RotateCcw, UserMinus } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { getCurrentWeekNumber, getPlanProgressStatus, getWeekDays, getWeekProgress } from '@/lib/workout-week-helpers';

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
  const searchParams = useSearchParams();
  const { user } = useCurrentUser();

  // API hooks
  const { client: apiClient, isLoading: isLoadingClient, error: clientError, refresh: refreshClient } = useCoachClientProfile(clientId);
  const { plan: apiPlan, refresh: refreshPlan } = usePlanDetail(apiClient?.activePlan?.id ?? null);
  // markRead: the coach is on this client's profile, where the message panel
  // lives — reading the thread here is genuinely "reading" it. active: the
  // panel is always on screen here, so the thread polls at chat speed.
  const {
    messages: apiMessages,
    sendMessage,
    hasMore: hasEarlierMessages,
    loadOlder: loadEarlierMessages,
  } = useMessages(apiClient?.user.id ?? null, { markRead: true, active: true });
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
  const [secondaryTab, setSecondaryTab] = useState<'plan' | 'workouts' | 'history'>('plan');
  const [justSentCheckIn, setJustSentCheckIn] = useState(false);
  const [isSendingCheckIn, setIsSendingCheckIn] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showContinueConfirm, setShowContinueConfirm] = useState(false);
  const [isContinuingPlan, setIsContinuingPlan] = useState(false);
  // Optimistic override for the check-in schedule settings (null = follow server)
  const [scheduleOverride, setScheduleOverride] =
    useState<Partial<CheckInScheduleSettings> | null>(null);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [clientId]);

  // Refs for scrolling
  const checkInRef = useRef<HTMLDivElement>(null);
  const planEditorRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const secondaryRef = useRef<HTMLDivElement>(null);

  // ?chat=1 deep link (e.g. the dashboard's "Say hello" nudge) — bring the
  // chat into view once the profile has actually rendered
  const wantsChat = searchParams?.get('chat') != null;
  useEffect(() => {
    if (!wantsChat || isLoadingClient || !apiClient) return;
    const raf = requestAnimationFrame(() => {
      chatRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => cancelAnimationFrame(raf);
  }, [wantsChat, isLoadingClient, apiClient]);

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

  const exerciseFlags: ExerciseFlag[] = useMemo(
    () => (apiClient ? apiClientDetailToExerciseFlags(apiClient.completions) : []),
    [apiClient]
  );

  // Same seven-day window the check-in panel uses for its "Flagged this week"
  // section — lets the page skip the whole check-in card when the panel would
  // have nothing to show (idle, send action already in the header, no flags)
  const hasRecentFlags = useMemo(() => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentCompletionIds = new Set(
      workoutCompletions
        .filter((wc) => {
          const at = wc.completedAt ?? wc.startedAt;
          return !!at && new Date(at).getTime() >= sevenDaysAgo;
        })
        .map((wc) => wc.id)
    );
    return exerciseFlags.some((ef) => recentCompletionIds.has(ef.workoutCompletionId));
  }, [workoutCompletions, exerciseFlags]);

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

  // Unread = messages from the client's user not yet marked read. Best-effort:
  // the messages API stamps the thread read on fetch (backlog #15).
  const hasUnread = useMemo(
    () => !!apiClient && messages.some((m) => m.senderId === apiClient.user.id && !m.read),
    [messages, apiClient]
  );

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
    } catch (err) {
      toast.error(err instanceof ApiError && err.status === 409 ? err.message : 'Failed to send check-in. Please try again.');
      refreshClient(); // a 409 means one already exists — pull it into view
    } finally {
      setIsSendingCheckIn(false);
    }
  };

  // Both of these rethrow after toasting: the review panel awaits them and
  // only clears the coach's typed response once the write is durable. Failing
  // silently here is what used to show a green "response sent" over a request
  // that 500'd, with the draft already wiped.
  const handleCompleteCheckIn = async (completedCheckIn: CheckIn) => {
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
    } catch (err) {
      toast.error('Failed to submit your response. Please try again.');
      throw err;
    }
  };

  const handleCreateCheckIn = async () => {
    if (!clientId) return;
    try {
      await createCheckInForClient(clientId);
      refreshClient();
    } catch (err) {
      toast.error(err instanceof ApiError && err.status === 409 ? err.message : 'Failed to create check-in. Please try again.');
      refreshClient();
      throw err;
    }
  };

  const handleCancelCheckIn = async () => {
    if (!activeCheckInId) return;
    try {
      await apiFetch(`/api/check-ins/${activeCheckInId}`, { method: 'DELETE' });
      toast.success('Check-in withdrawn');
    } catch {
      toast.error('Couldn’t withdraw the check-in. They may have just responded.');
    }
    refreshClient();
  };

  const handleEditCheckInResponse = async (checkInId: string, coachFeedback: string) => {
    try {
      await apiFetch(`/api/check-ins/${checkInId}/coach-respond`, {
        method: 'PUT',
        body: JSON.stringify({ coachFeedback }),
      });
      toast.success('Response updated');
      refreshClient();
    } catch {
      toast.error('Failed to update your response. Please try again.');
      throw new Error('edit-failed'); // keep the editor open with the draft
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

  // The finished plan is working — run it again rather than build a new block.
  // The server clones it, so the new cycle starts empty and the completed one
  // stays in the client's history.
  const handleContinuePlan = async () => {
    if (!clientId) return;
    setIsContinuingPlan(true);
    try {
      await apiFetch(`/api/coach/clients/${clientId}/plan/continue`, {
        method: 'POST',
      });
      setShowContinueConfirm(false);
      await Promise.all([refreshClient(), refreshPlan()]);
      const name = client?.name?.split(' ')[0] ?? 'Your client';
      toast.success(`${plan?.name ?? 'Plan'} restarted — ${name} is on week 1`);
    } catch (e) {
      toast.error(
        e instanceof ApiError && e.status === 409
          ? 'This plan hasn’t finished yet.'
          : 'Couldn’t restart the plan. Please try again.'
      );
    } finally {
      setIsContinuingPlan(false);
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

  const handleEndRelationship = async () => {
    if (!clientId) return;
    try {
      await apiFetch(`/api/coach/clients/${clientId}`, { method: 'DELETE' });
      setShowEndConfirm(false);
      toast.success(`Ended coaching with ${client?.name ?? 'this client'}`);
      router.push('/coach/clients');
    } catch {
      toast.error('Failed to end the coaching relationship. Please try again.');
    }
  };

  const handleUpdateCheckInSchedule = async (
    update: Partial<CheckInScheduleSettings>
  ) => {
    if (!clientId) return;
    setScheduleOverride((prev) => ({ ...prev, ...update }));
    try {
      await apiFetch(`/api/coach/clients/${clientId}/check-in-schedule`, {
        method: 'PUT',
        body: JSON.stringify(update),
      });
      // Enabling or shortening the cadence may auto-create a due check-in —
      // refetch to show it
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
      <div className="min-h-dvh bg-background flex items-center justify-center animate-enter">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Fetch failure — distinct from "not found" so a network/server error never
  // reads as the client having been removed
  if (clientError && !apiClient && !(clientError instanceof ApiError && clientError.status === 404)) {
    return (
      <div className="min-h-dvh bg-background pb-24 sm:pb-4">
        <CoachNav activeTab="clients" />
        <div className="max-w-7xl mx-auto px-3 pt-3 sm:px-4 sm:pt-7">
          <LoadErrorState
            kicker="Client profile · Signal lost"
            title="Couldn't load this client"
            onRetry={() => refreshClient()}
            preview="profile"
          />
        </div>
      </div>
    );
  }

  // Client not found
  if (!client || !apiClient) {
    return (
      <div className="min-h-dvh bg-background pb-24 sm:pb-4">
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
  const planEnded = !!plan && !!client.planStartDate
    && getPlanProgressStatus(client.planStartDate, planTotalWeeks) === 'ENDED';
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

  // Derive inline status info from the same server-computed urgency the
  // dashboard ranks by, so this page can never disagree with the roster.
  // Suppress the urgent banner while a check-in is in flight — the
  // "Waiting for X" section is the real status then.
  const hasActiveCheckIn = !!activeCheckIn;
  const statusIsUrgent = apiClient.urgency === 'AT_RISK' && !hasActiveCheckIn;
  const statusLabel = statusIsUrgent ? 'At Risk' : null;

  // Days-silent detail folded into the subtitle — the same signal ("Nd
  // silent" since the last workout) the roster row shows.
  const urgentDetail: string | null = statusIsUrgent
    ? lastWorkoutAt
      ? `${Math.max(1, Math.floor((Date.now() - lastWorkoutAt.getTime()) / (1000 * 60 * 60 * 24)))}d since last workout`
      : 'no workouts logged yet'
    : null;

  // Primary action — always give the coach one obvious next move, chosen by the
  // client's state, so the page is never just a passive read-out. `kind` lets
  // other parts of the page avoid repeating the same button.
  const scrollToChat = () =>
    chatRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const primaryAction: { label: string; onClick: () => void; disabled?: boolean; kind: 'assign' | 'review' | 'message' | 'send' } =
    !plan
      ? { label: 'Assign a plan', onClick: handleChangePlan, kind: 'assign' }
      : planEnded
      ? { label: 'Assign next plan', onClick: handleChangePlan, kind: 'assign' }
      : activeCheckIn?.status === 'responded'
        ? { label: 'Review check-in', onClick: handleScrollToCheckIn, kind: 'review' }
        : activeCheckIn?.status === 'pending'
          ? { label: `Message ${firstName}`, onClick: scrollToChat, kind: 'message' }
          : statusIsUrgent || !hasUnread
            ? { label: isSendingCheckIn ? 'Sending…' : 'Send check-in', onClick: handleStartCheckIn, disabled: isSendingCheckIn, kind: 'send' }
            : { label: `Message ${firstName}`, onClick: scrollToChat, kind: 'message' };

  // Build subtitle from status or plan. Urgent statuses get the warning voice
  // with the days detail folded in; everything else keeps a quiet metadata line.
  const headerSubtitle: React.ReactNode = statusIsUrgent && statusLabel
    ? (
      <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-warning font-medium antialiased flex items-center gap-1.5">
        <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        {statusLabel}
        {urgentDetail && <span className="text-warning/70 normal-case tracking-normal tabular-nums">· {urgentDetail}</span>}
      </p>
    )
    : plan ? (
      <p className="text-[13px] text-muted-foreground antialiased">
        {plan.emoji} {plan.name}
      </p>
    ) : undefined;

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
      cardClassName
    )}>
      {children}
    </div>
  );

  return (
    <div className="min-h-dvh bg-background pb-24 sm:pb-4">
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
              <div className="flex items-center gap-2.5 shrink-0">
                <Button
                  variant="default"
                  size="sm"
                  onClick={primaryAction.onClick}
                  disabled={primaryAction.disabled}
                  className="active:scale-[0.96] transition-transform duration-150 tap-target"
                >
                  {primaryAction.label}
                </Button>
                {/* Rare/destructive actions live behind the header overflow,
                    not on the page — the typed-name confirm is the real gate */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-muted-foreground hover:text-foreground"
                      aria-label="More actions"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => setShowEndConfirm(true)}
                      className="text-destructive focus:text-destructive"
                    >
                      <UserMinus className="w-4 h-4 mr-2" />
                      End coaching relationship
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
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
                  {planEnded
                    ? <>Done <span className="text-muted-foreground font-normal">· {planTotalWeeks} wks</span></>
                    : <>{currentWeekNum ?? 1} <span className="text-muted-foreground font-normal">of {planTotalWeeks}</span></>}
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

        {/* Check-in section — only when it has something to show: an active
            check-in, recent flags, or the send prompt when the header's
            primary action is something other than "Send check-in" (the coach
            must always have some way to start one). The prompt is suppressed
            inside the panel whenever the header already carries Send, so the
            same button never appears twice on one screen. Past check-ins
            still live in the History tab. */}
        {plan && (activeCheckIn || justSentCheckIn || hasRecentFlags || primaryAction.kind !== 'send') && (
        <section ref={checkInRef} className="animate-enter" style={{ animationDelay: '140ms' }}>
          <SectionLabel>{activeCheckIn ? 'Latest check-in' : 'Check-in'}</SectionLabel>
          <SectionCard>
            <InlineCheckInReview
              client={client}
              activeCheckIn={activeCheckIn}
              plan={plan}
              workoutCompletions={workoutCompletions}
              exerciseFlags={exerciseFlags}
              currentUserId={user?.id ?? ''}
              onCompleteCheckIn={handleCompleteCheckIn}
              onCreateCheckIn={handleCreateCheckIn}
              onCancelCheckIn={handleCancelCheckIn}
              onMessageAboutFlag={handleMessageAboutFlag}
              justSentFromParent={justSentCheckIn}
              variant="flat"
              hideSendPrompt={primaryAction.kind === 'send'}
            />
          </SectionCard>
        </section>
        )}

        {/* Two equal columns: Chat + tabbed Plan/History. Matched heights keep
            the pairing symmetric on desktop; one column through tablet widths,
            where two columns wrapped the tab labels and truncated the plan
            name. */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 animate-enter" style={{ animationDelay: '200ms' }}>
          {/* Messages */}
          <section>
            <div ref={chatRef} className={cn(
              "bg-card rounded-xl overflow-hidden lg:h-[480px] flex flex-col",
              "shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.03),0_0_0_1px_rgba(0,0,0,0.04)]",
            )}>
              <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-0 shrink-0">
                <div className="flex gap-1 items-center justify-between border-b border-border mb-0 -mt-1">
                  <h2 className="pb-2 px-2 font-mono text-[11px] uppercase tracking-[0.15em] font-medium text-foreground antialiased relative">
                    Messages
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-foreground rounded-full" />
                  </h2>
                  <NotificationToggle className="mb-1.5" />
                </div>
              </div>
              <ChatView
                client={client}
                messages={messages}
                currentUserId={user?.id ?? ''}
                currentUserName={user?.name ?? 'Coach'}
                onSendMessage={handleSendMessage}
                hasEarlier={hasEarlierMessages}
                onLoadEarlier={loadEarlierMessages}
                initialPrefill={chatPrefill}
                /* Fixed height below lg so the history scrolls inside the card instead
                   of stretching the page (flex-basis 0 from flex-1 would override h-[…]) */
                heightClass="h-[420px] lg:h-auto lg:flex-1 lg:min-h-0"
              />
            </div>
          </section>

          {/* Secondary: Tabbed Plan + History.
              Matches the chat card's height on desktop; footers pin to the bottom
              edge (like the chat input) so spare space sits inside the card. */}
          <section ref={secondaryRef}>
            <SectionCard className="lg:h-[480px] lg:flex lg:flex-col">
              {/* Tab bar — labels never wrap; "Training Plan" shortens to
                  "Plan" on phones where three full labels don't fit */}
              <div className="flex gap-1 border-b border-border mb-3 -mt-1">
                {([
                  { id: 'plan' as const, label: 'Training Plan', shortLabel: 'Plan' },
                  { id: 'workouts' as const, label: 'Workouts', count: apiClient.completions.length },
                  { id: 'history' as const, label: 'Check-ins', count: checkIns.filter(c => c.status === 'completed').length },
                ] as const).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSecondaryTab(tab.id)}
                    className={cn(
                      'pb-2 px-2 font-mono text-[11px] uppercase tracking-[0.15em] font-medium antialiased transition-colors duration-150 relative tap-target whitespace-nowrap',
                      secondaryTab === tab.id
                        ? 'text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {'shortLabel' in tab ? (
                      <>
                        <span className="sm:hidden">{tab.shortLabel}</span>
                        <span className="hidden sm:inline">{tab.label}</span>
                      </>
                    ) : (
                      tab.label
                    )}
                    {'count' in tab && tab.count > 0 && (
                      <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] px-1 py-0.5 rounded-full bg-muted text-[9px] leading-none tabular-nums text-muted-foreground">
                        {tab.count}
                      </span>
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
                  "lg:flex-1 lg:min-h-0 lg:flex lg:flex-col",
                  !plan && "flex items-center justify-center py-6"
                )}>
                  {plan ? (
                    <>
                      {/* Plan actions row — stacked on phones so the plan
                          name keeps the full width instead of truncating
                          against three action buttons */}
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3 lg:shrink-0">
                        <div className="min-w-0">
                          <h3 className="text-base font-semibold flex items-center gap-2 min-w-0 antialiased">
                            <span className="text-lg shrink-0" aria-hidden="true">{plan.emoji || '💪'}</span>
                            <span className="truncate">{plan.name}</span>
                          </h3>
                          <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground tabular-nums antialiased mt-1">
                            {planEnded ? 'Plan complete' : `Week ${currentWeekNum ?? 1} of ${planTotalWeeks}`}
                          </p>
                        </div>
                        {/* -ms cancels the first button's padding so the
                            stacked row's icon sits flush with the title */}
                        <div className="flex items-center gap-0.5 shrink-0 -ms-2.5 sm:ms-0">
                          {/* A finished block that's working doesn't need
                              replacing — one tap starts the next cycle */}
                          {planEnded && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowContinueConfirm(true)}
                              disabled={isContinuingPlan}
                              className="ps-2.5 text-muted-foreground hover:text-foreground active:scale-[0.96] transition-transform duration-150 tap-target"
                            >
                              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                              {isContinuingPlan ? 'Starting…' : 'Run again'}
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={handleChangePlan} className="ps-2.5 text-muted-foreground hover:text-foreground active:scale-[0.96] transition-transform duration-150 tap-target">
                            <ArrowLeftRight className="w-3.5 h-3.5 mr-1.5" />
                            Change
                          </Button>
                          <Button variant="ghost" size="sm" onClick={handleEditPlan} className="ps-2.5 text-muted-foreground hover:text-foreground active:scale-[0.96] transition-transform duration-150 tap-target">
                            <Pencil className="w-3.5 h-3.5 mr-1.5" />
                            Edit
                          </Button>
                        </div>
                      </div>
                      {/* Full weekly view — scrolls internally if it outgrows the card */}
                      <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto">
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
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground antialiased pt-3 mt-1 border-t border-border/40 lg:shrink-0">
                        {planTotalWeeks} {planTotalWeeks === 1 ? 'week' : 'weeks'}
                        {plan.workoutsPerWeek ? ` · ${plan.workoutsPerWeek}×/week` : ''}
                        {client.planStartDate ? ` · Started ${format(new Date(client.planStartDate), 'MMM d')}` : ''}
                        {plan.sourceTemplateId ? ` · ${firstName}’s copy` : ''}
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
              ) : secondaryTab === 'workouts' ? (
                <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto">
                  <WorkoutHistoryPanel
                    completions={apiClient.completions}
                    clientName={client.name}
                    initialCount={5}
                  />
                </div>
              ) : (
                <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto">
                  <CheckInHistoryPanel
                    checkIns={checkIns}
                    clientId={client.id}
                    clientName={client.name}
                    initialCount={3}
                    hasPlan={!!plan}
                    schedule={{
                      enabled:
                        scheduleOverride?.enabled ?? apiClient.checkInScheduleEnabled,
                      intervalDays:
                        scheduleOverride?.intervalDays ?? apiClient.checkInIntervalDays,
                      dayOfWeek:
                        scheduleOverride?.dayOfWeek !== undefined
                          ? scheduleOverride.dayOfWeek
                          : apiClient.checkInDayOfWeek,
                    }}
                    onUpdateSchedule={handleUpdateCheckInSchedule}
                    onEditResponse={handleEditCheckInResponse}
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
        /* The client trains on their own copy — match against its template */
        currentPlanId={plan?.sourceTemplateId ?? plan?.id}
        clientName={client.name}
      />
      <PlanEditorDrawer
        open={showPlanDrawer}
        onOpenChange={setShowPlanDrawer}
        plan={plan ?? null}
        onUpdatePlan={handleUpdatePlan}
        onRefresh={() => { refreshPlan(); refreshCoachPlans(); }}
      />
      <ConfirmationModal
        isOpen={showContinueConfirm}
        onClose={() => setShowContinueConfirm(false)}
        onConfirm={handleContinuePlan}
        title={`Run ${plan?.name ?? 'this plan'} again?`}
        message={`${client.name?.split(' ')[0] || 'They'} starts back at week 1 from today with the same workouts, including any edits you made for them. Their completed weeks stay in their history.`}
        confirmLabel="Start week 1"
        icon={RotateCcw}
      />
      <ConfirmationModal
        isOpen={showEndConfirm}
        onClose={() => setShowEndConfirm(false)}
        onConfirm={handleEndRelationship}
        title="End Coaching Relationship"
        message={`Stop coaching ${client.name}? They'll be removed from your roster.`}
        warningMessage={
          apiClient.isSample
            ? 'This is your sample client. It and all its generated data will be deleted.'
            : 'Their plan is removed and messaging closes for both of you. Nothing is deleted. You can restore them from Past clients on the Clients page.'
        }
        confirmLabel="End Coaching"
        confirmVariant="destructive"
        icon={UserMinus}
        /* Typing the name makes ending a real coaching relationship a
           deliberate act — the sample client stays one-tap disposable */
        requireText={apiClient.isSample ? undefined : client.name}
      />
    </div>
  );
}
