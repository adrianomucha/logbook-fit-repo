import { useMemo, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import type { CheckIn, WorkoutCompletion, WorkoutPlan } from '@logbook/shared/types';
import { apiCheckInToCheckIn, apiPlanToWorkoutPlan, apiProgressToWorkoutCompletions } from '@logbook/shared/adapters/api';
import { getActiveWorkout, getWeekDays, type WeekDayInfo } from '@logbook/shared/workout-week-helpers';
import { ApiError, apiFetch } from '@/lib/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useClientPlan, useClientWeekOverview } from '@/hooks/useClientWeek';
import { useClientCheckIns, useClientProgress } from '@/hooks/useCheckIns';
import { useMessages } from '@/hooks/useMessages';
import { Screen } from '@/components/Screen';
import { EmptyState, Eyebrow, LoadingScreen } from '@/components/ui';
import { SessionCard } from '@/components/today/SessionCard';
import { SessionCompleteCard } from '@/components/today/SessionCompleteCard';
import { CoachContextStrip } from '@/components/today/CoachContextStrip';
import { ViewToggle, type WorkoutViewMode } from '@/components/today/ViewToggle';
import { WeekOverview } from '@/components/today/WeekOverview';
import { PendingCheckInBanner } from '@/components/checkin/PendingCheckInBanner';
import { CoachFeedbackCard } from '@/components/checkin/CoachFeedbackCard';
import { CheckInDetailSheet } from '@/components/checkin/CheckInDetailSheet';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const isNotFound = (e: unknown) => e instanceof ApiError && e.status === 404;

/**
 * Today: the greeting, the one session that matters, and the week around it.
 * The server's week-overview decides which week the client is in; the plan
 * detail supplies the exercises. Same joins as the web's ClientDashboard.
 */
export default function TodayScreen() {
  const router = useRouter();
  const [view, setView] = useState<WorkoutViewMode>('today');
  const [showCheckInDetail, setShowCheckInDetail] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const { user, coach, clientProfileId, isLoading: loadingUser } = useCurrentUser();
  const { weekOverview, error: weekError, isLoading: loadingWeek, refresh: refreshWeek } = useClientWeekOverview();
  const { plan: planDetail, error: planError, isLoading: loadingPlan, refresh: refreshPlan } = useClientPlan();
  const { checkIns: apiCheckIns, refresh: refreshCheckIns } = useClientCheckIns();
  const { sendMessage } = useMessages(coach?.user.id ?? null);
  const { progress } = useClientProgress();

  const plan: WorkoutPlan | null = useMemo(() => (planDetail ? apiPlanToWorkoutPlan(planDetail) : null), [planDetail]);

  const completions: WorkoutCompletion[] = useMemo(() => {
    if (!weekOverview || !clientProfileId) return [];
    return weekOverview.days
      .filter((d) => d.status !== 'NOT_STARTED')
      .map((d) => ({
        id: d.completionId ?? `wc-${d.dayId}`,
        clientId: clientProfileId,
        planId: weekOverview.plan.id,
        weekId: weekOverview.weekId,
        dayId: d.dayId,
        status: d.status,
        completionPct: d.completionPct ?? 0,
        exercisesDone: d.exercisesDone ?? 0,
        exercisesTotal: d.exerciseCount,
        startedAt: d.startedAt ?? undefined,
        completedAt: d.completedAt ?? undefined,
        durationSec: d.durationSec ?? undefined,
        effortRating: (d.effortRating as WorkoutCompletion['effortRating']) ?? undefined,
      }));
  }, [weekOverview, clientProfileId]);

  const checkIns: CheckIn[] = useMemo(
    () => apiCheckIns.map((ci) => apiCheckInToCheckIn(ci, clientProfileId ?? '', coach?.user.id ?? '')),
    [apiCheckIns, clientProfileId, coach]
  );
  const pendingCheckIn = useMemo(() => checkIns.find((c) => c.status === 'pending') ?? null, [checkIns]);
  // Newest completed check-in with a reply, whenever it arrived — the one
  // reply the whole loop exists to deliver must not vanish on a Monday.
  const latestFeedbackCheckIn = useMemo(
    () =>
      checkIns
        .filter((c) => c.status === 'completed' && c.completedAt)
        .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())[0] ?? null,
    [checkIns]
  );
  const allCompletions: WorkoutCompletion[] = useMemo(
    () => (progress?.allCompletions ? apiProgressToWorkoutCompletions(progress.allCompletions) : completions),
    [progress, completions]
  );

  const { weekDays, today } = useMemo(() => {
    if (!plan || !weekOverview || !clientProfileId) return { weekDays: [] as WeekDayInfo[], today: null };
    const week = plan.weeks.find((w) => w.weekNumber === weekOverview.weekNumber);
    if (!week) return { weekDays: [] as WeekDayInfo[], today: null };
    const days = getWeekDays(week, completions, clientProfileId);
    return { weekDays: days, today: getActiveWorkout(days) };
  }, [plan, weekOverview, completions, clientProfileId]);

  const refresh = () => {
    void refreshWeek();
    void refreshPlan();
    void refreshCheckIns();
  };
  const refreshing = (loadingWeek || loadingPlan) && !!weekOverview;

  if (loadingUser || (!weekOverview && loadingWeek) || (!planDetail && loadingPlan)) return <LoadingScreen />;

  const firstName = user?.name?.split(' ')[0];
  const header = (
    <View className="pt-2">
      <Eyebrow>{format(new Date(), 'EEEE, MMMM d')}</Eyebrow>
      <Text className="mt-1.5 font-sans-bold text-2xl leading-7 tracking-tight text-foreground" numberOfLines={1}>
        {firstName ? `${greeting()}, ${firstName}` : greeting()}
      </Text>
    </View>
  );

  // No coach yet → nothing can be assigned; no plan yet → the coach is on it.
  if (!coach) {
    return (
      <Screen withHeader onRefresh={refresh} refreshing={false}>
        {header}
        <EmptyState eyebrow="Getting started" title="Waiting for your coach" body="Once your coach connects with you, your plan shows up here." />
      </Screen>
    );
  }
  if ((planError && isNotFound(planError)) || (weekError && isNotFound(weekError))) {
    return (
      <Screen withHeader onRefresh={refresh} refreshing={false}>
        {header}
        <EmptyState
          eyebrow="Getting started"
          title={`${coach.user.name?.split(' ')[0] ?? 'Your coach'} is building your plan`}
          body="Usually ready within a day or two. Your workouts will appear right here."
        />
      </Screen>
    );
  }
  if (weekError || planError) {
    return (
      <Screen withHeader onRefresh={refresh} refreshing={false}>
        {header}
        <EmptyState title="Couldn't load your plan" body="Pull down to try again." />
      </Screen>
    );
  }

  const state: 'scheduled' | 'in-progress' | 'completed' =
    today?.completion?.status === 'COMPLETED' ? 'completed' : today?.completion?.status === 'IN_PROGRESS' ? 'in-progress' : 'scheduled';

  const todayCoachNote = today?.workoutDay?.exercises.find((e) => e.notes?.trim())?.notes;

  // Effort feedback goes through the finish endpoint (already completed; the
  // server just records the rating); a note rides along as a chat message.
  const sendFeedback = async (rating: 'EASY' | 'MEDIUM' | 'HARD', notes?: string) => {
    const completionId = today?.completion?.id;
    if (!completionId) return;
    setIsSendingFeedback(true);
    try {
      await apiFetch(`/api/client/workout/${completionId}/finish`, { method: 'POST', body: JSON.stringify({ effortRating: rating }) });
      if (notes) {
        try {
          await sendMessage(`Workout feedback: ${rating.toLowerCase()}. ${notes}`);
        } catch {
          Alert.alert('Feedback saved', 'Your note failed to send — try it from Chat.');
        }
      }
      setFeedbackSent(true);
      await refreshWeek();
    } catch {
      Alert.alert("Couldn't send feedback", 'Please try again.');
    } finally {
      setIsSendingFeedback(false);
    }
  };

  const restartWorkout = () => {
    const completionId = today?.completion?.id;
    const dayId = today?.workoutDay?.id;
    if (!completionId || !dayId) return;
    Alert.alert('Restart this workout?', "You'll start again from the first set. All progress, flags and notes from this session are cleared.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Restart workout',
        style: 'destructive',
        onPress: async () => {
          setIsRestarting(true);
          try {
            await apiFetch(`/api/client/workout/${completionId}/restart`, { method: 'POST' });
            await refreshWeek();
            router.push({ pathname: '/client/workout/[dayId]', params: { dayId } });
          } catch {
            Alert.alert("Couldn't restart", 'Please try again.');
          } finally {
            setIsRestarting(false);
          }
        },
      },
    ]);
  };

  const openDay = (day: WeekDayInfo) => {
    if (day.workoutDay) router.push({ pathname: '/client/workout/[dayId]', params: { dayId: day.workoutDay.id } });
  };

  return (
    <Screen withHeader onRefresh={refresh} refreshing={refreshing}>
      {header}

      {pendingCheckIn ? (
        <PendingCheckInBanner onComplete={() => router.push({ pathname: '/client/checkin/[checkinId]', params: { checkinId: pendingCheckIn.id } })} />
      ) : null}

      <ViewToggle value={view} onChange={setView} />

      {view === 'weekly' && plan && weekOverview ? (
        <>
          <WeekOverview
            planName={plan.name}
            weekNumber={weekOverview.weekNumber}
            durationWeeks={weekOverview.plan.durationWeeks}
            days={weekDays}
            onOpenDay={openDay}
          />
          {latestFeedbackCheckIn ? (
            <CoachFeedbackCard checkIn={latestFeedbackCheckIn} onViewDetails={() => setShowCheckInDetail(true)} />
          ) : null}
        </>
      ) : weekOverview?.planEnded ? (
        <View className="items-center rounded-2xl border border-border/70 bg-card px-6 py-10">
          <Text className="mb-4 text-5xl">🏁</Text>
          <Eyebrow className="mb-1.5">Plan complete</Eyebrow>
          <Text className="mb-2 text-center font-sans-bold text-2xl tracking-tight text-foreground">You finished {plan?.name}</Text>
          <Text className="max-w-xs text-center font-sans text-sm leading-5 text-muted-foreground">
            All {weekOverview.plan.durationWeeks} weeks are behind you
            {progress?.stats?.totalWorkouts ? `, ${progress.stats.totalWorkouts} workouts logged` : ''}.{' '}
            {coach.user.name?.split(' ')[0] ?? 'Your coach'} will line up your next block.
          </Text>
        </View>
      ) : today?.workoutDay ? (
        state === 'completed' && today.completion ? (
          <>
            <SessionCompleteCard
              workoutName={today.workoutDay.name}
              completion={today.completion}
              coachName={coach.user.name}
              feedbackSubmitted={feedbackSent || !!today.completion.effortRating}
              isSubmittingFeedback={isSendingFeedback}
              onSubmitFeedback={(rating, notes) => void sendFeedback(rating, notes)}
            />
            {todayCoachNote && coach.user.name ? <CoachContextStrip coachName={coach.user.name} note={todayCoachNote} /> : null}
            <Pressable onPress={restartWorkout} disabled={isRestarting} className="min-h-[36px] flex-row items-center justify-center gap-1.5 self-center px-3 active:opacity-70">
              <Feather name="rotate-ccw" size={14} color="#737373" />
              <Text className="font-sans-medium text-sm text-muted-foreground">{isRestarting ? 'Restarting…' : 'Restart workout'}</Text>
            </Pressable>
          </>
        ) : (
          <SessionCard
            workoutDay={today.workoutDay}
            coachName={coach.user.name}
            state={state}
            completionPct={today.completion?.completionPct ?? 0}
            onAction={() => openDay(today)}
          />
        )
      ) : (
        <EmptyState title="Nothing scheduled" body="Every workout this week is done. See the week for what's next." />
      )}

      <CheckInDetailSheet
        checkIn={latestFeedbackCheckIn}
        visible={showCheckInDetail}
        onClose={() => setShowCheckInDetail(false)}
        completedWorkouts={allCompletions}
        plan={plan}
      />
    </Screen>
  );
}
