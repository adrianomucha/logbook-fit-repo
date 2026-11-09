import { Text, View } from 'react-native';
import type { WeekDayInfo } from '@logbook/shared/workout-week-helpers';
import { WEEK_NOT_BUILT_COPY } from '@logbook/shared/client-empty-states';
import { Button, EmptyState, Eyebrow } from '@/components/ui';
import { WeekList } from './WeekList';

interface WeekOverviewProps {
  planName: string;
  weekNumber: number;
  durationWeeks: number;
  days: WeekDayInfo[];
  onOpenDay: (day: WeekDayInfo) => void;
  /** Named in the "not set up yet" state, as on Today */
  coachName?: string | null;
  /** The way out of a week that isn't built: ask the coach */
  onMessageCoach?: () => void;
}

/** The "This week" view: week header and the day checklist, the web's WeeklyOverview. */
export function WeekOverview({ planName, weekNumber, durationWeeks, days, onOpenDay, coachName, onMessageCoach }: WeekOverviewProps) {
  if (days.length === 0) {
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
      <View>
        <Eyebrow className="mb-1">
          Week {weekNumber} of {durationWeeks}
        </Eyebrow>
        <Text className="font-sans-bold text-2xl tracking-tight text-foreground" numberOfLines={2}>
          {planName}
        </Text>
      </View>

      {/* No progress bar here: the checklist shows what's done, and the
          Progress tab's stepper is the one place the week is counted */}
      <WeekList days={days} onOpenDay={onOpenDay} />
    </View>
  );
}
