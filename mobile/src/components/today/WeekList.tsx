import { Pressable, Text, View } from 'react-native';
import { WORKOUT_MARK_LABEL, workoutMark, type WeekDayInfo } from '@logbook/shared/workout-week-helpers';
import { parseSessionName } from '@logbook/shared/parse-session-name';
import { Eyebrow } from '@/components/ui';
import { WorkoutMarkIcon } from '@/components/WorkoutMarkIcon';

interface WeekListProps {
  days: WeekDayInfo[];
  onOpenDay: (day: WeekDayInfo) => void;
}

/** This week's workouts as an ordered checklist, the web's DayCardGrid. */
export function WeekList({ days, onOpenDay }: WeekListProps) {
  return (
    <View className="overflow-hidden rounded-2xl border border-border/70 bg-card p-2">
      {days.map((day) => {
        const isCompleted = day.status === 'COMPLETED';
        const isCurrent = day.status === 'CURRENT';
        const count = day.workoutDay?.exercises.length ?? 0;
        const mark = workoutMark(day);
        const markLabel = WORKOUT_MARK_LABEL[mark];
        // The coach's "Day 5: Lower B (Backup)" reads as day 05, "Lower B"
        const parsed = parseSessionName(day.workoutDay?.name || 'Workout');
        const dayNumber = parsed.day ?? String(day.orderIndex);
        return (
          <Pressable
            key={day.orderIndex}
            accessibilityRole="button"
            accessibilityLabel={[`Workout ${day.orderIndex}`, parsed.title, isCompleted ? 'done' : markLabel.toLowerCase()].filter(Boolean).join(', ')}
            disabled={!day.isInteractive}
            onPress={() => onOpenDay(day)}
            className={`min-h-[56px] flex-row items-center gap-3 rounded-lg px-3.5 py-3 active:bg-muted ${
              isCurrent ? 'border border-brand/50 bg-muted/60' : ''
            }`}
          >
            <View className="w-9">
              <Eyebrow>Day</Eyebrow>
              <Text className="mt-0.5 font-mono-bold text-sm text-foreground">{dayNumber.padStart(2, '0')}</Text>
            </View>
            <View className="flex-1">
              <Text className={`font-sans-semibold text-[15px] tracking-tight ${isCompleted ? 'text-muted-foreground' : 'text-foreground'}`} numberOfLines={1}>
                {parsed.title}
              </Text>
              <Text className="mt-0.5 font-mono text-[10px] text-muted-foreground">{count} exercises</Text>
            </View>
            {/* The same mark as the Progress stepper */}
            <View className="flex-row items-center gap-2">
              {markLabel ? <Text className="font-sans-semibold text-[11px] text-foreground">{markLabel}</Text> : null}
              <WorkoutMarkIcon mark={mark} size={24} />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
