import { Text, View } from 'react-native';
import type { WeekDayInfo } from '@logbook/shared/workout-week-helpers';
import { getWeekProgress } from '@logbook/shared/workout-week-helpers';
import { Eyebrow } from '@/components/ui';
import { WeekList } from './WeekList';

interface WeekOverviewProps {
  planName: string;
  weekNumber: number;
  durationWeeks: number;
  days: WeekDayInfo[];
  onOpenDay: (day: WeekDayInfo) => void;
}

/** The "This week" view: week header, progress strip, and the day checklist — the web's WeeklyOverview. */
export function WeekOverview({ planName, weekNumber, durationWeeks, days, onOpenDay }: WeekOverviewProps) {
  const { completed, total } = getWeekProgress(days);
  const remaining = days.filter((d) => d.status !== 'COMPLETED').length;

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

      <View className="rounded-xl bg-muted/40 p-4">
        <View className="mb-3 flex-row items-baseline justify-between">
          <View className="flex-row items-baseline gap-1.5">
            <Text className="font-mono-bold text-2xl leading-7 text-foreground">{completed}</Text>
            <Text className="font-mono-bold text-sm text-muted-foreground">/ {total}</Text>
            <Eyebrow className="ml-1">done</Eyebrow>
          </View>
          <Eyebrow>{remaining} to go</Eyebrow>
        </View>
        <View className="flex-row gap-1.5" accessibilityRole="image" accessibilityLabel={`${completed} of ${total} workouts completed`}>
          {Array.from({ length: total }).map((_, i) => (
            <View key={i} className={`h-2.5 flex-1 rounded-full ${i < completed ? 'bg-brand' : 'bg-muted-foreground/15'}`} />
          ))}
        </View>
      </View>

      <WeekList days={days} onOpenDay={onOpenDay} />
    </View>
  );
}
