'use client';

import { useState, useMemo, useEffect, type CSSProperties } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSWRConfig } from 'swr';
import type { Client, CheckIn, WorkoutPlan, WorkoutCompletion, Message } from '@/types';
import { getWeekDays, getActiveWorkout } from '@/lib/workout-week-helpers';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useKeyboardInset } from '@/hooks/useKeyboardInset';
import { useClientWeekOverview } from '@/hooks/api/useClientWeekOverview';
import { useClientProgress } from '@/hooks/api/useClientProgress';
import { useClientCheckIns } from '@/hooks/api/useClientCheckIns';
import { useMessages } from '@/hooks/api/useMessages';
import { useClientPlan } from '@/hooks/api/useClientPlan';
import { apiFetch, ApiError } from '@/lib/api-client';
import {
  apiPlanToWorkoutPlan,
  apiCheckInToCheckIn,
  apiMessagesToMessages,
  apiProgressToWorkoutCompletions,
} from '@/lib/adapters/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { WeeklyOverview } from '@/components/client/weekly/WeeklyOverview';
import { TodayFocusView } from '@/components/client/today/TodayFocusView';
import { ChatView } from '@/components/chat/ChatView';
import { ProgressHistory } from '@/components/client/ProgressHistory';
import { CoachFeedbackCard } from '@/components/client/CoachFeedbackCard';
import { CheckInDetailModal } from '@/components/client/CheckInDetailModal';
import { ClientNav } from '@/components/client/ClientNav';
import { WelcomeAwaitingPlan } from '@/components/client/WelcomeAwaitingPlan';
import { WorkoutViewToggle } from '@/components/client/WorkoutViewToggle';
import { NotificationToggle } from '@/components/notifications/NotificationToggle';
import { ConfirmationModal } from '@/components/coach/ConfirmationModal';
import { Button } from '@/components/ui/button';
import { Loader2, UserMinus } from 'lucide-react';

// ---- Component ----

type View = 'workout' | 'chat' | 'progress';
type WorkoutViewMode = 'today' | 'weekly';

export function ClientDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentView, setCurrentView] = useState<View>('workout');
  const [workoutViewMode, setWorkoutViewMode] = useState<WorkoutViewMode>('today');
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const { mutate } = useSWRConfig();

  // On mobile the chat is a fixed full-screen column. Left anchored to the
  // layout viewport it would keep reserving the full screen height once the
  // keyboard is up — iOS doesn't shrink that viewport — and the composer
  // would float above the keys with a band of blank page between them. Pin
  // the column to the area that's actually visible instead, and drop the
  // tab-bar clearance for as long as the bar is hiding itself.
  const keyboard = useKeyboardInset();
  const chatShellClass = cn(
    'fixed left-0 right-0 top-[var(--kb-top,0px)] bottom-[var(--kb-bottom,0px)] flex flex-col overflow-hidden',
    keyboard.isOpen ? 'pb-0' : 'pb-[calc(var(--tabbar-h)+env(safe-area-inset-bottom))]',
    'sm:relative sm:left-auto sm:right-auto sm:top-auto sm:bottom-auto sm:pb-0 sm:min-h-dvh'
  );
  const chatShellStyle = {
    '--kb-top': `${keyboard.top}px`,
    '--kb-bottom': `${keyboard.bottom}px`,
  } as CSSProperties;

  // ---- API Hooks ----
  const { user, coach, isLoading: isLoadingUser, error: userError } = useCurrentUser();
  const { weekOverview, isLoading: isLoadingWeek, refresh: refreshWeek, error: weekError } = useClientWeekOverview();
  const { progress } = useClientProgress();
  const { checkIns: apiCheckIns } = useClientCheckIns();
  const coachUserId = coach?.user.id ?? null;
  const {
    messages: apiMessages,
    sendMessage,
    hasMore: hasEarlierMessages,
    loadOlder: loadEarlierMessages,
  } = useMessages(coachUserId, {
    // Only the chat tab counts as "read" — the poll runs from every tab
    markRead: currentView === 'chat',
    // …and only the chat tab polls at conversation speed
    active: currentView === 'chat',
  });

  // Fetch full plan detail for sub-components that need the full plan structure
  const { plan: planDetail, error: planError, isLoading: isLoadingPlan } = useClientPlan();

  // A 404 from the plan endpoints means "no plan assigned yet" — an expected
  // state, not a failure. Anything else is a real error.
  const isNotFound = (e: unknown): boolean =>
    e instanceof ApiError && e.status === 404;
  const hasFatalError = !!(
    (userError && !user) ||
    (planError && !isNotFound(planError) && !planDetail)
  );

  // Handle URL tab parameter
  useEffect(() => {
    const tab = searchParams?.get('tab');
    if (tab === 'chat') setCurrentView('chat');
    else if (tab === 'progress') setCurrentView('progress');
    else if (tab === 'workout') setCurrentView('workout');
  }, [searchParams]);

  // Tab changes update the URL too, so refresh and back/forward keep the tab
  const handleTabChange = (tab: View) => {
    setCurrentView(tab);
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.set('tab', tab);
    router.replace(`/client?${params.toString()}`, { scroll: false });
    window.scrollTo(0, 0);
  };

  // ---- Adapted Data ----

  const client: Client | null = useMemo(() => {
    if (!user?.clientProfile) return null;
    return {
      id: user.clientProfile.id,
      name: user.name ?? 'Unknown',
      email: user.email,
      currentPlanId: user.clientProfile.activePlanId ?? undefined,
      status: 'active' as const,
      planStartDate: user.clientProfile.planStartDate ?? undefined,
    };
  }, [user]);

  const plan: WorkoutPlan | null = useMemo(
    () => (planDetail ? apiPlanToWorkoutPlan(planDetail) : null),
    [planDetail]
  );

  const checkIns: CheckIn[] = useMemo(
    () =>
      apiCheckIns.map((ci) =>
        apiCheckInToCheckIn(ci, client?.id ?? '', coachUserId ?? '')
      ),
    [apiCheckIns, client, coachUserId]
  );

  const pendingCheckIn = useMemo(
    () => checkIns.find((c) => c.status === 'pending'),
    [checkIns]
  );

  // The client's check-in is with their coach, not with the calendar: this
  // used to be filtered to the current Monday-anchored week, so feedback the
  // coach sent on Sunday night vanished when the client opened the app on
  // Monday — the one reply the whole loop exists to deliver, gone unread.
  // Newest completed check-in with a reply, whenever it arrived.
  const latestFeedbackCheckIn = useMemo(
    () =>
      checkIns
        .filter((c) => c.status === 'completed' && c.completedAt)
        .sort(
          (a, b) =>
            new Date(b.completedAt!).getTime() -
            new Date(a.completedAt!).getTime()
        )[0] ?? null,
    [checkIns]
  );

  // Sent, waiting on the coach. Without this the check-in simply disappeared
  // from every client surface between submitting and the coach replying.
  const awaitingCoachCheckIn = useMemo(
    () => checkIns.find((c) => c.status === 'responded') ?? null,
    [checkIns]
  );

  // Build adapted workout completions from week overview
  const clientWorkoutCompletions: WorkoutCompletion[] = useMemo(() => {
    if (!weekOverview || !client) return [];
    return weekOverview.days
      .filter((d) => d.status !== 'NOT_STARTED')
      .map((d) => ({
        id: d.completionId ?? `wc-${d.dayId}`,
        clientId: client.id,
        planId: weekOverview.plan.id,
        weekId: weekOverview.weekId,
        dayId: d.dayId,
        status: d.status as WorkoutCompletion['status'],
        completionPct: d.completionPct ?? 0,
        exercisesDone: d.exercisesDone ?? 0,
        exercisesTotal: d.exerciseCount,
        startedAt: d.startedAt ?? undefined,
        completedAt: d.completedAt ?? undefined,
        durationSec: d.durationSec ?? undefined,
        effortRating: (d.effortRating as WorkoutCompletion['effortRating']) ?? undefined,
      }));
  }, [weekOverview, client]);

  // All workout completions from progress API (for full history on progress page)
  const allWorkoutCompletions: WorkoutCompletion[] = useMemo(() => {
    if (!progress?.allCompletions) return clientWorkoutCompletions;
    return apiProgressToWorkoutCompletions(progress.allCompletions);
  }, [progress, clientWorkoutCompletions]);

  // Today's workout data for TodayFocusView. The server's week-overview is
  // the single source of truth for which week the client is in — recomputing
  // it here with the browser clock can disagree with the server (timezones),
  // which would break the completion join below for the whole plan.
  const { todayWorkout, todayCompletion, todayCoachNote, currentWeek } = useMemo(() => {
    if (!client || !plan || !weekOverview) {
      return { todayWorkout: null, todayCompletion: null, todayCoachNote: undefined, currentWeek: null };
    }

    const currentWeek = plan.weeks.find(
      (w) => w.weekNumber === weekOverview.weekNumber
    );

    if (!currentWeek) {
      return { todayWorkout: null, todayCompletion: null, todayCoachNote: undefined, currentWeek: null };
    }

    const weekDays = getWeekDays(
      currentWeek,
      clientWorkoutCompletions,
      client.id
    );

    const today = getActiveWorkout(weekDays);
    const completion = today?.completion || null;

    const exercises = today?.workoutDay?.exercises || [];
    const firstNote = exercises.find((e) => e.notes?.trim())?.notes;

    return {
      todayWorkout: today,
      todayCompletion: completion,
      todayCoachNote: firstNote,
      currentWeek,
    };
  }, [client, plan, weekOverview, clientWorkoutCompletions]);

  // "New plan" pill — on while the client is in week 1 and hasn't started
  // anything yet; off the moment they begin (so it can't claim "updated"
  // week-round on a plan nobody touched changed)
  const showNewPlan = useMemo(() => {
    if (!weekOverview) return false;
    if (weekOverview.weekNumber !== 1) return false;
    return weekOverview.days.every((d) => d.status === 'NOT_STARTED');
  }, [weekOverview]);

  // Messages adapted for ChatView
  const messages: Message[] = useMemo(
    () => apiMessagesToMessages(apiMessages, client?.id ?? ''),
    [apiMessages, client]
  );

  // Plan has run its course — celebrate instead of replaying the last week.
  // Server-computed only: deriving it locally can disagree across timezones.
  const planEnded = weekOverview?.planEnded ?? false;

  // ---- Handlers ----
  // Errors intentionally propagate: ChatView owns send-failure UX (it restores
  // the draft and shows a toast). Swallowing here would eat the user's message.
  const handleSendMessage = async (content: string) => {
    await sendMessage(content);
  };

  const handleStartWorkout = () => {
    if (todayWorkout?.workoutDay && currentWeek) {
      router.push(`/client/workout/${currentWeek.id}/${todayWorkout.workoutDay.id}`);
    }
  };

  const handleResumeWorkout = () => {
    if (todayWorkout?.workoutDay && currentWeek) {
      router.push(`/client/workout/${currentWeek.id}/${todayWorkout.workoutDay.id}`);
    }
  };

  const handleSendFeedback = async (rating: 'EASY' | 'MEDIUM' | 'HARD', notes?: string) => {
    if (!todayCompletion?.id) return;
    setIsSendingFeedback(true);
    try {
      await apiFetch(`/api/client/workout/${todayCompletion.id}/finish`, {
        method: 'POST',
        body: JSON.stringify({ effortRating: rating }),
      });
      if (notes) {
        try {
          await sendMessage(`Workout feedback: ${rating.toLowerCase()}. ${notes}`);
        } catch {
          // The rating itself saved — only the note failed
          toast.error('Feedback saved, but your note failed to send.');
        }
      }
      setFeedbackSent(true);
      await refreshWeek();
    } catch {
      toast.error('Failed to send feedback. Please try again.');
    } finally {
      setIsSendingFeedback(false);
    }
  };

  const [isRestartingWorkout, setIsRestartingWorkout] = useState(false);

  const handleRestartWorkout = async () => {
    if (!todayCompletion?.id || !todayWorkout?.workoutDay || !currentWeek) return;
    setIsRestartingWorkout(true);
    try {
      await apiFetch(`/api/client/workout/${todayCompletion.id}/restart`, {
        method: 'POST',
      });
      router.push(`/client/workout/${currentWeek.id}/${todayWorkout.workoutDay.id}`);
    } catch {
      toast.error('Failed to restart workout. Please try again.');
      setIsRestartingWorkout(false);
    }
  };

  const handleMessageCoach = () => {
    setCurrentView('chat');
    requestAnimationFrame(() => window.scrollTo(0, 0));
  };

  const handleLeaveCoach = async () => {
    try {
      await apiFetch('/api/client/coach', { method: 'DELETE' });
      setShowLeaveConfirm(false);
      toast.success('You’ve left your coach');
      // Refetch the profile — the dashboard re-renders into the no-coach state
      await mutate('/api/me');
    } catch {
      toast.error('Failed to leave your coach. Please try again.');
    }
  };

  // Shared between the awaiting-plan and full dashboard branches
  const leaveCoachModal = (
    <ConfirmationModal
      isOpen={showLeaveConfirm}
      onClose={() => setShowLeaveConfirm(false)}
      onConfirm={handleLeaveCoach}
      title="Leave your coach?"
      message={`You'll stop training with ${coach?.user.name ?? 'your coach'}.`}
      warningMessage="Your assigned plan is removed and messaging closes for both of you. Your workout history stays on your account."
      confirmLabel="Leave coach"
      confirmVariant="destructive"
    />
  );

  // ---- Loading/Empty States ----
  // Wait for the plan too — otherwise a client with a plan briefly sees the
  // "awaiting plan" welcome screen on every cold load while the plan loads
  if (isLoadingUser || isLoadingWeek || isLoadingPlan) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center animate-enter">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (hasFatalError) {
    return (
      <div className="min-h-dvh bg-background p-3 sm:p-4 flex items-center justify-center">
        <div className="bg-card rounded-xl overflow-hidden border border-border/70 animate-enter">
          <div className="py-10 px-6 text-center">
            <div className="text-4xl select-none mb-4 animate-bounce-once">😵</div>
            <h2 className="text-lg font-bold mb-1.5 tracking-tight antialiased">Something went wrong</h2>
            <p className="text-sm text-muted-foreground mb-5 antialiased">
              Check your connection and try again.
            </p>
            <Button onClick={() => window.location.reload()} className="active:scale-[0.96] transition-transform duration-150">
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-dvh bg-background p-3 sm:p-4 flex items-center justify-center">
        <div className="text-center animate-enter">
          <div className="text-5xl select-none mb-4 animate-bounce-once">🏋️</div>
          <h1 className="text-2xl font-bold mb-2 tracking-tight antialiased">No plan yet</h1>
          <p className="text-sm text-muted-foreground antialiased">
            Your coach will assign a workout plan. Hang tight.
          </p>
        </div>
      </div>
    );
  }

  // No coach — either side ended the relationship. History stays on the
  // account; there's nothing coached to show until a new invite is accepted.
  if (!coach) {
    return (
      <div className="min-h-dvh bg-background p-3 sm:p-4 flex items-center justify-center">
        <div className="text-center animate-enter max-w-sm">
          <div className="text-5xl select-none mb-4 animate-bounce-once">🤝</div>
          <h1 className="text-2xl font-bold mb-2 tracking-tight antialiased">
            You&apos;re not connected to a coach
          </h1>
          <p className="text-sm text-muted-foreground antialiased">
            Your workout history is saved on your account. Ask a coach for a new
            invite link when you&apos;re ready to train again.
          </p>
        </div>
      </div>
    );
  }

  // Signed up, no plan assigned yet — welcome them and keep chat open so the
  // wait isn't a dead end (and the coach gets nudged)
  if (!plan) {
    const isChat = currentView === 'chat' && !!coachUserId;
    return (
      <div
        className={cn('bg-background', isChat ? chatShellClass : 'min-h-dvh sm:pb-4')}
        style={isChat ? chatShellStyle : undefined}
      >
        <ClientNav
          activeTab={isChat ? 'chat' : 'workout'}
          onTabChange={(tab) => {
            // Progress has nothing to show before the first plan — land on the welcome
            handleTabChange(tab === 'progress' ? 'workout' : tab);
          }}
        />
        <div className={cn(
          'max-w-2xl mx-auto w-full px-4 pt-4 sm:pt-7',
          isChat
            ? 'flex-1 flex flex-col min-h-0 gap-3 sm:gap-4'
            : 'space-y-5 sm:space-y-6 pb-[calc(var(--tabbar-h)+1.25rem+env(safe-area-inset-bottom))] sm:pb-8'
        )}>
          {isChat ? (
            <>
              <div className="shrink-0 py-4 flex items-end justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-1">Messages</p>
                  <h1 className="text-[24px] sm:text-2xl font-bold tracking-tight">{coach?.user.name ?? 'Coach'}</h1>
                </div>
                <NotificationToggle className="shrink-0" />
              </div>
              <div className="flex-1 min-h-0 sm:flex-none sm:h-[600px] flex flex-col rounded-2xl bg-card border border-border/70 overflow-hidden mb-3 sm:mb-8">
                <ChatView
                  client={client}
                  messages={messages}
                  currentUserId={user?.id ?? ''}
                  currentUserName={client.name}
                  onSendMessage={handleSendMessage}
                  hasEarlier={hasEarlierMessages}
                  onLoadEarlier={loadEarlierMessages}
                  heightClass="flex-1 min-h-0"
                  peerName={coach?.user.name ?? 'Coach'}
                  conversationStarters={[
                    'Hi! Just signed up 👋',
                    'Here’s what I want to work on…',
                    'Anything you need from me?',
                  ]}
                />
              </div>
            </>
          ) : (
            <>
              <WelcomeAwaitingPlan
                clientName={client.name}
                coachName={coach?.user.name ?? 'Your coach'}
                canMessage={!!coachUserId}
                onMessageCoach={handleMessageCoach}
              />
              {/* Quiet exit — wrong coach or changed your mind before day one */}
              <div className="flex justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLeaveConfirm(true)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <UserMinus className="w-3.5 h-3.5 mr-1.5" />
                  Leave this coach
                </Button>
              </div>
            </>
          )}
        </div>
        {leaveCoachModal}
      </div>
    );
  }

  return (
    <div
      className={cn('bg-background', currentView === 'chat' ? chatShellClass : 'sm:pb-4')}
      style={currentView === 'chat' ? chatShellStyle : undefined}
    >
      <ClientNav
        activeTab={currentView}
        onTabChange={handleTabChange}
      />

      <div className={cn(
        'max-w-2xl mx-auto w-full px-4 pt-4 sm:pt-7',
        currentView === 'chat'
          ? 'flex-1 flex flex-col min-h-0 gap-3 sm:gap-4'
          : 'space-y-5 sm:space-y-6 pb-[calc(var(--tabbar-h)+1.25rem+env(safe-area-inset-bottom))] sm:pb-8'
      )}>

        {/* Check-in prompt banner */}
        {pendingCheckIn && (
          <section aria-label="Pending check-in">
            <div className="rounded-xl border border-border/70 bg-card px-4 py-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-2 antialiased flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brand" aria-hidden="true" />
                Weekly check-in
              </p>
              <p className="text-[15px] font-bold tracking-tight antialiased">Your coach wants to hear how training is going</p>
              <Button
                onClick={() => router.push(`/client/checkin/${pendingCheckIn.id}`)}
                className="w-full h-11 text-sm font-bold uppercase tracking-wider bg-foreground text-background hover:bg-foreground/90 active:scale-[0.97] transition-transform duration-150 mt-3"
                size="sm"
              >
                Complete check-in
              </Button>
            </div>
          </section>
        )}

        {/* Answered, waiting on the coach. Without this the check-in vanished
            from every client surface the moment it was submitted, so a client
            who had just written up their week saw no trace of it. */}
        {!pendingCheckIn && awaitingCoachCheckIn && (
          <section aria-label="Check-in sent">
            <div className="rounded-xl border border-border/70 bg-card px-4 py-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-2 antialiased flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" aria-hidden="true" />
                Weekly check-in
              </p>
              <p className="text-[15px] font-bold tracking-tight antialiased">
                Sent — {coach?.user.name?.split(' ')[0] ?? 'your coach'} is reviewing it
              </p>
              <p className="text-sm text-muted-foreground mt-1 antialiased">
                You&apos;ll see their reply here when it lands.
              </p>
            </div>
          </section>
        )}

        {/* Plan complete — the last week must not replay as if un-started */}
        {currentView === 'workout' && planEnded && (
          <section
            aria-label="Plan complete"
            className="rounded-2xl border border-border/70 bg-card px-6 py-10 text-center"
          >
            <div className="text-5xl select-none mb-4 animate-bounce-once">🏁</div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-1.5">
              Plan complete
            </p>
            <h1 className="text-2xl font-bold tracking-tight mb-2 antialiased">
              You finished {plan.name}
            </h1>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto antialiased">
              All {plan.durationWeeks || plan.weeks.length} weeks are behind you
              {progress?.stats?.totalWorkouts ? `, ${progress.stats.totalWorkouts} workouts logged` : ''}.
              {' '}{coach?.user.name?.split(' ')[0] ?? 'Your coach'} will line up your next block.
            </p>
            <div className="flex flex-col items-center gap-2 mt-6">
              <Button
                onClick={handleMessageCoach}
                className="min-w-[220px] h-11 text-sm font-bold uppercase tracking-wider bg-foreground text-background hover:bg-foreground/90 active:scale-[0.97] transition-transform duration-150"
              >
                Message {coach?.user.name?.split(' ')[0] ?? 'Coach'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentView('progress')}
                className="text-muted-foreground"
              >
                See your progress
              </Button>
            </div>
          </section>
        )}

        {/* This week couldn't be loaded — say so instead of rendering a blank
            Today tab or a mislabeled week (chat and progress still work) */}
        {currentView === 'workout' && !planEnded && !weekOverview && (
          <section
            aria-label="Week unavailable"
            className="rounded-2xl border border-border/70 bg-card px-6 py-10 text-center"
          >
            <div className="text-4xl select-none mb-4">🗓️</div>
            <h2 className="text-lg font-bold mb-1.5 tracking-tight antialiased">
              {isNotFound(weekError)
                ? "This week isn't set up yet"
                : "Couldn't load this week"}
            </h2>
            <p className="text-sm text-muted-foreground mb-5 antialiased">
              {isNotFound(weekError)
                ? `${coach?.user.name?.split(' ')[0] ?? 'Your coach'} hasn't built this week of your plan yet — send them a message.`
                : 'Check your connection and try again.'}
            </p>
            {isNotFound(weekError) ? (
              <Button onClick={handleMessageCoach} className="active:scale-[0.96] transition-transform duration-150">
                Message {coach?.user.name?.split(' ')[0] ?? 'Coach'}
              </Button>
            ) : (
              <Button onClick={() => refreshWeek()} className="active:scale-[0.96] transition-transform duration-150">
                Retry
              </Button>
            )}
          </section>
        )}

        {/* Workout Views */}
        {currentView === 'workout' && !planEnded && !!weekOverview && workoutViewMode === 'today' && (
          <TodayFocusView
            client={client}
            todayWorkout={todayWorkout}
            todayCompletion={todayCompletion}
            coachNote={todayCoachNote}
            coachName={coach?.user.name ?? undefined}
            coachAvatar={undefined}
            feedbackSubmitted={feedbackSent || !!todayCompletion?.effortRating}
            isSendingFeedback={isSendingFeedback}
            onStartWorkout={handleStartWorkout}
            onResumeWorkout={handleResumeWorkout}
            onRestartWorkout={handleRestartWorkout}
            isRestarting={isRestartingWorkout}
            onSendFeedback={handleSendFeedback}
            onMessageCoach={handleMessageCoach}
            onViewWeekly={() => setWorkoutViewMode('weekly')}
            showNewPlan={showNewPlan}
          />
        )}

        {currentView === 'workout' && !planEnded && !!weekOverview && workoutViewMode === 'weekly' && (
          <>
            <WorkoutViewToggle
              value="weekly"
              onChange={(m) => {
                setWorkoutViewMode(m);
                window.scrollTo(0, 0);
              }}
            />

            <WeeklyOverview
              client={client}
              plan={plan}
              currentWeekNumber={weekOverview.weekNumber}
              completions={clientWorkoutCompletions}
            />

            {latestFeedbackCheckIn && (
              <CoachFeedbackCard
                checkIn={latestFeedbackCheckIn}
                onViewDetails={() => setShowCheckInModal(true)}
              />
            )}
          </>
        )}

        {currentView === 'chat' && coachUserId && (
          <>
            <div className="shrink-0 py-4 flex items-end justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-1">Messages</p>
                <h1 className="text-[24px] sm:text-2xl font-bold tracking-tight">{coach?.user.name ?? 'Coach'}</h1>
              </div>
              <NotificationToggle className="shrink-0" />
            </div>
            {/* Contained module — hairline card, matching the rest of the client pages */}
            <div className="flex-1 min-h-0 sm:flex-none sm:h-[600px] flex flex-col rounded-2xl bg-card border border-border/70 overflow-hidden mb-3 sm:mb-8">
              <ChatView
                client={client}
                messages={messages}
                currentUserId={user?.id ?? ''}
                currentUserName={client.name}
                onSendMessage={handleSendMessage}
                hasEarlier={hasEarlierMessages}
                onLoadEarlier={loadEarlierMessages}
                heightClass="flex-1 min-h-0"
                peerName={coach?.user.name ?? 'Coach'}
                conversationStarters={[
                  'How should I warm up?',
                  'Feeling sore today',
                  'Can we adjust my plan?',
                ]}
              />
            </div>
          </>
        )}

        {currentView === 'progress' && (
          <>
            <div className="py-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-1">History</p>
              <h1 className="text-[24px] sm:text-2xl font-bold tracking-tight">Progress</h1>
            </div>
            <ProgressHistory
              plans={plan ? [plan] : []}
              client={client}
              plan={plan}
              workoutCompletions={allWorkoutCompletions}
              progressStats={progress?.stats}
            />

            {/* Coaching membership — quiet, at the very end of the page */}
            <div className="flex items-center justify-between rounded-xl border border-border/70 bg-card px-4 py-3">
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-0.5">Coaching</p>
                <p className="text-sm font-medium truncate antialiased">
                  Coached by {coach?.user.name ?? 'your coach'}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLeaveConfirm(true)}
                className="text-muted-foreground hover:text-destructive shrink-0"
              >
                <UserMinus className="w-3.5 h-3.5 mr-1.5" />
                Leave coach
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Check-in detail modal */}
      <CheckInDetailModal
        isOpen={showCheckInModal}
        onClose={() => setShowCheckInModal(false)}
        checkIn={latestFeedbackCheckIn}
        completedWorkouts={allWorkoutCompletions}
        plan={plan}
      />
      {leaveCoachModal}
    </div>
  );
}
