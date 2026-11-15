import { Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { WEEK_STEP_COPY, type WeekDayInfo, type WeekStep } from '@logbook/shared/workout-week-helpers';
import { WEEK_NOT_BUILT_COPY } from '@logbook/shared/client-empty-states';
import { Button, EmptyState, Eyebrow } from '@/components/ui';
import { WeekList } from './WeekList';

interface WeekOverviewProps {
  planName: string;
  /** Which week is on screen, and where the client can step from here */
  step: WeekStep;
  onStep: (weekNumber: number) => void;
  /** The current week, for the way back from an earlier one */
  currentWeekNumber: number;
  /** Unfinished workouts in earlier weeks, pointed at from the current week */
  leftBehind?: { count: number; weekNumber: number } | null;
  durationWeeks: number;
  days: WeekDayInfo[];
  onOpenDay: (day: WeekDayInfo) => void;
  /** Named in the "not set up yet" state, as on Today */
  coachName?: string | null;
  /** The way out of a week that isn't built: ask the coach */
  onMessageCoach?: () => void;
}

/** The "This week" view: week header and the day checklist, the web's WeeklyOverview. */
export function WeekOverview({
  planName,
  step,
  onStep,
  currentWeekNumber,
  leftBehind,
  durationWeeks,
  days,
  onOpenDay,
  coachName,
  onMessageCoach,
}: WeekOverviewProps) {
  if (days.length === 0 && !step.isEarlier) {
    return (
      <EmptyState
        fill
        art={WEEK_NOT_BUILT_COPY.art}
        title={WEEK_NOT_BUILT_COPY.title}
        tail={WEEK_NOT_BUILT_COPY.tail(coachName)}
      >
        {onMessageCoach ? (
          <Button variant="primary" className="h-11 w-full" onPress={onMessageCoach}>
            {WEEK_NOT_BUILT_COPY.message(coachName)}
          </Button>
        ) : null}
      </EmptyState>
    );
  }

  return (
    <View className="gap-5">
      <View className="flex-row items-end justify-between gap-3">
        <View className="flex-1">
          <Eyebrow className="mb-1">
            Week {step.viewed} of {durationWeeks}
            {step.isEarlier ? ` · ${WEEK_STEP_COPY.earlier}` : ''}
          </Eyebrow>
          <Text className="font-sans-bold text-2xl tracking-tight text-foreground" numberOfLines={2}>
            {planName}
          </Text>
        </View>

        {/* Only once there is somewhere to step to: week 1 has no earlier week */}
        {step.canGoBack || step.canGoForward ? (
          <View className="flex-row items-center gap-1.5">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={WEEK_STEP_COPY.previous}
              accessibilityState={{ disabled: !step.canGoBack }}
              disabled={!step.canGoBack}
              hitSlop={6}
              onPress={() => onStep(step.viewed - 1)}
              className={`h-9 w-9 items-center justify-center rounded-full border border-border/70 active:bg-muted ${step.canGoBack ? '' : 'opacity-30'}`}
            >
              <Feather name="chevron-left" size={16} color="#0a0a0a" />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={WEEK_STEP_COPY.next}
              accessibilityState={{ disabled: !step.canGoForward }}
              disabled={!step.canGoForward}
              hitSlop={6}
              onPress={() => onStep(step.viewed + 1)}
              className={`h-9 w-9 items-center justify-center rounded-full border border-border/70 active:bg-muted ${step.canGoForward ? '' : 'opacity-30'}`}
            >
              <Feather name="chevron-right" size={16} color="#0a0a0a" />
            </Pressable>
          </View>
        ) : null}
      </View>

      {/* No progress bar here: the checklist shows what's done, and the
          Progress tab's stepper is the one place the week is counted */}
      <WeekList days={days} onOpenDay={onOpenDay} />

      {step.isEarlier ? (
        <Pressable accessibilityRole="button" hitSlop={8} onPress={() => onStep(currentWeekNumber)}>
          <Text className="font-sans-medium text-sm text-muted-foreground underline">{WEEK_STEP_COPY.backToCurrent}</Text>
        </Pressable>
      ) : leftBehind ? (
        <Pressable accessibilityRole="button" hitSlop={8} onPress={() => onStep(leftBehind.weekNumber)}>
          <Text className="font-sans-medium text-sm text-muted-foreground underline">
            {WEEK_STEP_COPY.unfinished(leftBehind.count)}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
