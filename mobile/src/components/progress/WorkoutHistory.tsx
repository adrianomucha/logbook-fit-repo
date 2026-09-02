import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import type { EffortRating, WorkoutCompletion, WorkoutPlan } from '@logbook/shared/types';
import { formatHistoryDuration, getWorkoutDisplayName } from '@logbook/shared/progress';
import { Eyebrow } from '@/components/ui';

const EFFORT_LABELS: Record<EffortRating, { label: string; color: string }> = {
  EASY: { label: 'Easy', color: 'text-success-text' },
  MEDIUM: { label: 'Medium', color: 'text-foreground' },
  HARD: { label: 'Hard', color: 'text-warning-text' },
};

interface Item {
  completion: WorkoutCompletion;
  dayName: string;
  weekNumber: number | null;
  planName: string;
}

function HistoryItem({ completion, dayName, weekNumber, planName, last }: Item & { last: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const effort = completion.effortRating ? EFFORT_LABELS[completion.effortRating] : null;
  const estimatedSets = completion.exercisesDone * 3;
  return (
    <View className={last ? '' : 'border-b border-border/50'}>
      <Pressable onPress={() => setExpanded((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded }} className="min-h-[44px] py-3.5 active:bg-muted/30">
        <View className="flex-row items-center justify-between gap-2">
          <View className="flex-1 flex-row items-center gap-2">
            <Text className="shrink font-sans-semibold text-[15px] tracking-tight text-foreground" numberOfLines={1}>{dayName}</Text>
            {completion.status === 'COMPLETED' ? <View className="h-1.5 w-1.5 rounded-full bg-success" /> : null}
          </View>
          <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color="#a3a3a3" />
        </View>
        <Text className="mt-1 font-mono text-[11px] uppercase tracking-[1.32px] text-muted-foreground">
          {completion.completedAt ? format(parseISO(completion.completedAt), 'MMM d, yyyy') : 'In Progress'}
          {weekNumber != null ? ` · Week ${weekNumber}` : ''}
          {effort ? <Text className={`font-mono-bold ${effort.color}`}>{`  ${effort.label}`}</Text> : null}
        </Text>
        <Text className="mt-1.5 font-mono text-xs text-muted-foreground">
          {completion.exercisesDone}/{completion.exercisesTotal} exercises{'  ·  '}{formatHistoryDuration(completion.durationSec)}{'  ·  '}~{estimatedSets} sets
        </Text>
      </Pressable>
      {expanded ? (
        <View className="gap-2.5 pb-4 pt-1">
          <View className="flex-row justify-between">
            <Text className="font-sans text-sm text-muted-foreground">Completion</Text>
            <Text className="font-mono-medium text-sm text-foreground">{Math.round(completion.completionPct)}%</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="font-sans text-sm text-muted-foreground">Effort</Text>
            <Text className={`font-sans-medium text-sm ${effort?.color ?? 'text-foreground'}`}>{effort ? effort.label : '—'}</Text>
          </View>
          <View className="flex-row justify-between gap-4">
            <Text className="font-sans text-sm text-muted-foreground">Plan</Text>
            <Text className="shrink font-sans-medium text-sm text-foreground" numberOfLines={1}>{planName}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

/** The full workout log — the web's EnrichedWorkoutHistory. */
export function WorkoutHistory({ completions, plans, initialCount = 10 }: { completions: WorkoutCompletion[]; plans: WorkoutPlan[]; initialCount?: number }) {
  const [showAll, setShowAll] = useState(false);

  const items = useMemo<Item[]>(() => {
    const sorted = [...completions]
      .filter((c) => c.status === 'COMPLETED' && c.completedAt)
      .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());
    return sorted.map((completion) => {
      const plan = plans.find((p) => p.id === completion.planId);
      const week = plan?.weeks.find((w) => w.id === completion.weekId);
      const day = week?.days.find((d) => d.id === completion.dayId);
      const dayIndex = week?.days.findIndex((d) => d.id === completion.dayId) ?? -1;
      return {
        completion,
        dayName: getWorkoutDisplayName(day, dayIndex, completion.completedAt),
        // Only the active plan's tree is loaded — don't mislabel older work as "Week 1"
        weekNumber: week?.weekNumber ?? null,
        planName: plan?.name || 'Earlier plan',
      };
    });
  }, [completions, plans]);

  const shown = showAll ? items : items.slice(0, initialCount);
  const hasMore = items.length > initialCount;

  return (
    <View className="overflow-hidden rounded-2xl border border-border/70 bg-card">
      <View className="flex-row items-baseline justify-between border-b border-border/50 px-4 pb-3 pt-4">
        <Text className="font-mono-medium text-[11px] uppercase tracking-[1.8px] text-muted-foreground">Workout history</Text>
        {items.length > 0 ? <Text className="font-mono text-[11px] text-muted-foreground">{items.length}</Text> : null}
      </View>
      {items.length === 0 ? (
        <View className="items-center gap-3 px-6 py-10">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Feather name="activity" size={24} color="#737373" />
          </View>
          <View className="items-center">
            <Text className="font-sans-semibold text-[15px] tracking-tight text-foreground">No workouts logged yet</Text>
            <Eyebrow className="mt-1.5">Your completed sessions will appear here</Eyebrow>
          </View>
        </View>
      ) : (
        <>
          <View className="px-4">
            {shown.map((item, i) => (
              <HistoryItem key={item.completion.id} {...item} last={i === shown.length - 1} />
            ))}
          </View>
          {hasMore ? (
            <Pressable onPress={() => setShowAll((v) => !v)} className="h-11 flex-row items-center justify-center gap-1 border-t border-border/50 active:bg-muted/30">
              <Feather name={showAll ? 'chevron-up' : 'chevron-down'} size={16} color="#737373" />
              <Text className="font-mono text-[11px] uppercase tracking-[1.4px] text-muted-foreground">
                {showAll ? 'Show less' : `Show all (${items.length - initialCount} more)`}
              </Text>
            </Pressable>
          ) : null}
        </>
      )}
    </View>
  );
}
