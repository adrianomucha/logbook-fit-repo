import { Text, View } from 'react-native';
import type { WeekDayInfo } from '@logbook/shared/workout-week-helpers';
import { Eyebrow } from '@/components/ui';
import { WeekList } from './WeekList';

interface WeekOverviewProps {
  planName: string;
  weekNumber: number;
  durationWeeks: number;
  days: WeekDayInfo[];
  onOpenDay: (day: WeekDayInfo) => void;
}

/** The "This week" view: week header and the day checklist, the web's WeeklyOverview. */
export function WeekOverview({ planName, weekNumber, durationWeeks, days, onOpenDay }: WeekOverviewProps) {
  if (days.length === 0) {
    return (
      <View className="items-center py-12">
        <Eyebrow className="mb-2">Week {weekNumber}</Eyebrow>
        <Text className="font-sans-bold text-lg tracking-tight text-foreground">This week isn't set up yet</Text>
        <Text className="mt-1 font-sans text-sm text-muted-foreground">Your coach hasn't built this week of your plan yet.</Text>
      </View>
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
