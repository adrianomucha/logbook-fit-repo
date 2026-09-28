import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import type { WorkoutCompletion, WorkoutPlan } from '@logbook/shared/types';
import { formatTrainingTime, summarizeCompletedPlan } from '@logbook/shared/plan-summary';
import { Button, Card, Eyebrow } from '@/components/ui';

interface PlanCompleteCardProps {
  plan: WorkoutPlan;
  /** Every completion on the client's account — filtered to this plan in the summary */
  completions: WorkoutCompletion[];
  coachName?: string | null;
  onMessageCoach: () => void;
  onViewProgress: () => void;
}

/**
 * Shown in place of Today once the plan has run its course — the web's
 * PlanCompleteCard. No chart on purpose: the completion rate leads, one
 * meter shows it, and a sentence names the misses. The numbers and wording
 * come from @logbook/shared so both apps say the same thing.
 */
export function PlanCompleteCard({ plan, completions, coachName, onMessageCoach, onViewProgress }: PlanCompleteCardProps) {
  const coachFirst = coachName?.split(' ')[0];
  const { weekCount, planned, completed, pct, trainedSec, avgSessionMin, missNote } = summarizeCompletedPlan(plan, completions);

  const stats: [string | number, string][] = [];
  if (trainedSec >= 60 && avgSessionMin !== null) {
    const [value, unit] = formatTrainingTime(trainedSec);
    stats.push([value, `${unit} trained`]);
    stats.push([avgSessionMin, 'min avg session']);
  }

  // Meter fills in from the left; reanimated skips it under Reduce Motion
  const fill = useSharedValue(0);
  useEffect(() => {
    fill.value = withDelay(150, withTiming(pct, { duration: 700, easing: Easing.bezier(0.22, 1, 0.36, 1) }));
  }, [pct, fill]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value}%` }));

  return (
    <Card>
      {/* Header — eyebrow + plan name, volt flag as the celebration mark */}
      <View className="flex-row items-start justify-between gap-4">
        <View className="flex-1">
          <Eyebrow>
            Plan complete · {weekCount} {weekCount === 1 ? 'week' : 'weeks'}
          </Eyebrow>
          <Text className="mt-2.5 font-sans-bold text-[26px] leading-[30px] tracking-tight text-foreground">{plan.name}</Text>
        </View>
        <View className="h-11 w-11 items-center justify-center rounded-full bg-brand">
          <Feather name="flag" size={20} color="#1e2702" />
        </View>
      </View>

      {planned > 0 ? (
        <>
          {/* Headline — the one number the block comes down to */}
          <View className="mt-6 flex-row items-baseline gap-3">
            <Text className="font-sans-bold text-[44px] leading-[48px] tracking-tight text-foreground">{pct}%</Text>
            <Text className="flex-1 font-sans text-sm text-muted-foreground">
              {completed} of {planned} workouts done
            </Text>
          </View>
          <View className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Animated.View className="h-full rounded-full bg-brand" style={fillStyle} />
          </View>
          <Text className="mt-3 font-sans text-sm text-muted-foreground">{missNote}</Text>
        </>
      ) : null}

      {/* Stat band — numbers carry the weight, units stay quiet */}
      {stats.length > 0 ? (
        <View className="mt-5 flex-row flex-wrap items-baseline border-t border-border/50 pt-4">
          {stats.map(([value, unit], i) => (
            <Text key={unit} className="font-mono text-[13px]">
              {i > 0 ? <Text className="text-muted-foreground/40">{'  ·  '}</Text> : null}
              <Text className="font-mono-semibold text-foreground">{value}</Text>
              <Text className="text-muted-foreground"> {unit}</Text>
            </Text>
          ))}
        </View>
      ) : null}

      {/* What's next — the coach builds the next block */}
      <View className="mt-5 border-t border-border/50 pt-5">
        <Text className="mb-1.5 font-mono text-[11px] uppercase tracking-[1.8px] text-muted-foreground">What’s next</Text>
        <Text className="font-sans text-sm leading-5 text-muted-foreground">
          {coachFirst ?? 'Your coach'} will line up your next block. Tell them how this one went and what you want to chase next.
        </Text>
        <Button onPress={onMessageCoach} className="mt-4">
          {`Message ${coachFirst ?? 'coach'}`}
        </Button>
        <Pressable
          accessibilityRole="button"
          onPress={onViewProgress}
          className="mt-2 h-12 items-center justify-center rounded-xl border border-border active:opacity-70"
        >
          <Text className="font-sans-semibold text-sm text-foreground">See your progress</Text>
        </Pressable>
      </View>
    </Card>
  );
}
