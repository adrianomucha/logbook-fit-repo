import { Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { WeekDayInfo } from '@logbook/shared/workout-week-helpers';
import { Eyebrow } from '@/components/ui';

interface WeekListProps {
  days: WeekDayInfo[];
  onOpenDay: (day: WeekDayInfo) => void;
}

/** This week's workouts as an ordered checklist — the web's DayCardGrid. */
export function WeekList({ days, onOpenDay }: WeekListProps) {
  return (
    <View className="overflow-hidden rounded-2xl border border-border bg-card p-2">
      {days.map((day) => {
        const isCompleted = day.status === 'COMPLETED';
        const isInProgress = day.completion?.status === 'IN_PROGRESS';
        const isCurrent = day.status === 'CURRENT';
        const count = day.workoutDay?.exercises.length ?? 0;
        return (
          <Pressable
            key={day.orderIndex}
            accessibilityRole="button"
            disabled={!day.isInteractive}
            onPress={() => onOpenDay(day)}
            className={`min-h-[56px] flex-row items-center gap-3 rounded-lg px-3.5 py-3 active:bg-muted ${
              isCurrent ? 'bg-muted/60' : ''
            } ${isCompleted ? 'opacity-60' : ''}`}
          >
            <View className="w-9">
              <Eyebrow>Day</Eyebrow>
              <Text className="mt-0.5 font-mono-bold text-sm text-foreground">{String(day.orderIndex).padStart(2, '0')}</Text>
            </View>
            <View className="flex-1">
              <Text className="font-sans-semibold text-[15px] tracking-tight text-foreground" numberOfLines={1}>
                {day.workoutDay?.name || 'Workout'}
              </Text>
              <Text className="mt-0.5 font-mono text-[11px] text-muted-foreground">{count} exercises</Text>
            </View>
            {isCompleted ? (
              <View className="h-6 w-6 items-center justify-center rounded-full bg-success/15">
                <Feather name="check" size={14} color="#21c45d" />
              </View>
            ) : isInProgress ? (
              <Text className="rounded-full bg-warning/15 px-2 py-1 font-mono-bold text-[11px] uppercase tracking-[1.54px] text-warning-text">
                In progress
              </Text>
            ) : isCurrent ? (
              <Text className="rounded-full bg-brand px-2 py-1 font-mono-bold text-[11px] uppercase tracking-[1.54px] text-brand-foreground">
                Up next
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
