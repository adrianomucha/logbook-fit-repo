import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import type { WorkoutCompletion, WorkoutPlan } from '@logbook/shared/types';
import { apiPlanToWorkoutPlan } from '@logbook/shared/adapters/api';
import { getActiveWorkout, getWeekDays, type WeekDayInfo } from '@logbook/shared/workout-week-helpers';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useClientPlan, useClientWeekOverview } from '@/hooks/useClientWeek';
import { Screen } from '@/components/Screen';
import { Button, Card, EmptyState, Eyebrow, LoadingScreen } from '@/components/ui';
import { SessionCard } from '@/components/today/SessionCard';
import { ViewToggle, type WorkoutViewMode } from '@/components/today/ViewToggle';
import { WeekOverview } from '@/components/today/WeekOverview';

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
  const { signOut } = useAuth();
  const [view, setView] = useState<WorkoutViewMode>('today');
  const { user, coach, clientProfileId, isLoading: loadingUser } = useCurrentUser();
  const { weekOverview, error: weekError, isLoading: loadingWeek, refresh: refreshWeek } = useClientWeekOverview();
  const { plan: planDetail, error: planError, isLoading: loadingPlan, refresh: refreshPlan } = useClientPlan();

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
      <Screen onRefresh={refresh} refreshing={false}>
        {header}
        <EmptyState eyebrow="Getting started" title="Waiting for your coach" body="Once your coach connects with you, your plan shows up here." />
        <Button variant="ghost" onPress={signOut}>Sign out</Button>
      </Screen>
    );
  }
  if ((planError && isNotFound(planError)) || (weekError && isNotFound(weekError))) {
    return (
      <Screen onRefresh={refresh} refreshing={false}>
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
      <Screen onRefresh={refresh} refreshing={false}>
        {header}
        <EmptyState title="Couldn't load your plan" body="Pull down to try again." />
      </Screen>
    );
  }

  const state: 'scheduled' | 'in-progress' | 'completed' =
    today?.completion?.status === 'COMPLETED' ? 'completed' : today?.completion?.status === 'IN_PROGRESS' ? 'in-progress' : 'scheduled';

  const openDay = (day: WeekDayInfo) => {
    if (day.workoutDay) router.push({ pathname: '/client/workout/[dayId]', params: { dayId: day.workoutDay.id } });
  };

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      {header}

      <ViewToggle value={view} onChange={setView} />

      {view === 'weekly' && plan && weekOverview ? (
        <WeekOverview
          planName={plan.name}
          weekNumber={weekOverview.weekNumber}
          durationWeeks={weekOverview.plan.durationWeeks}
          days={weekDays}
          onOpenDay={openDay}
        />
      ) : weekOverview?.planEnded ? (
        <Card>
          <Eyebrow>Plan complete</Eyebrow>
          <Text className="mt-2 font-sans-bold text-2xl text-foreground">You finished {plan?.name}</Text>
          <Text className="mt-2 font-sans text-sm leading-5 text-muted-foreground">
            Nice work. Your coach will assign what's next.
          </Text>
        </Card>
      ) : today?.workoutDay ? (
        state === 'completed' ? (
          <Card>
            <Eyebrow>Today</Eyebrow>
            <Text className="mt-2 font-sans-bold text-2xl text-foreground">Session done</Text>
            <Text className="mt-2 font-sans text-sm leading-5 text-muted-foreground">
              {today.workoutDay.name} is in the books. Rest up — the next one is below.
            </Text>
          </Card>
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
    </Screen>
  );
}
