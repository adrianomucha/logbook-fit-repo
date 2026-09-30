import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { EffortRating, WorkoutCompletion, WorkoutPlan } from '@logbook/shared/types';
import { buildWorkoutHistory, EFFORT_LABELS, formatHistoryDuration, type HistoryEntry } from '@logbook/shared/progress';
import { Eyebrow } from '@/components/ui';

const EFFORT_COLOR: Record<EffortRating, string> = {
  EASY: 'text-success-text',
  MEDIUM: 'text-foreground',
  HARD: 'text-warning-text',
};

function HistoryItem({ entry, last }: { entry: HistoryEntry; last: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const { completion } = entry;
  const effort = completion.effortRating;
  return (
    <View className={last ? '' : 'border-b border-border/40'}>
      {/* One line: what it was and anything unusual on the left, when / how long / how much on the right */}
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        className="min-h-[44px] flex-row items-center gap-3 py-3 active:bg-muted/30"
      >
        <View className="flex-1 flex-row items-center gap-2">
          <Text className="shrink font-sans-semibold text-[15px] tracking-tight text-foreground" numberOfLines={1}>{entry.name}</Text>
          {entry.bests > 0 ? (
            <View
              className="flex-row items-center gap-0.5"
              accessibilityLabel={entry.bests === 1 ? 'Personal best' : `${entry.bests} personal bests`}
            >
              <Feather name="award" size={12} color="#157f3c" />
              {entry.bests > 1 ? <Text className="font-mono-bold text-[10px] text-success-text">{entry.bests}</Text> : null}
            </View>
          ) : null}
          {entry.partial ? (
            <Text className="font-mono-bold text-[10px] uppercase tracking-[1px] text-warning-text" accessibilityLabel={`${completion.exercisesDone} of ${completion.exercisesTotal} exercises`}>
              {completion.exercisesDone}/{completion.exercisesTotal}
            </Text>
          ) : null}
          {entry.effortCallout ? (
            <Text className={`font-mono-bold text-[10px] uppercase tracking-[1px] ${EFFORT_COLOR[entry.effortCallout]}`}>
              {EFFORT_LABELS[entry.effortCallout]}
            </Text>
          ) : null}
        </View>
        <Text className="font-mono text-[11px] text-muted-foreground">{entry.meta}</Text>
        <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color="#a3a3a3" />
      </Pressable>
      {expanded ? (
        <View className="gap-2.5 pb-4 pt-1">
          <View className="flex-row justify-between">
            <Text className="font-sans text-sm text-muted-foreground">Exercises</Text>
            <Text className="font-mono-medium text-sm text-foreground">{completion.exercisesDone}/{completion.exercisesTotal}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="font-sans text-sm text-muted-foreground">Duration</Text>
            <Text className="font-mono-medium text-sm text-foreground">{formatHistoryDuration(completion.durationSec)}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="font-sans text-sm text-muted-foreground">Effort</Text>
            <Text className={`font-sans-medium text-sm ${effort ? EFFORT_COLOR[effort] : 'text-foreground'}`}>{effort ? EFFORT_LABELS[effort] : '—'}</Text>
          </View>
          <View className="flex-row justify-between gap-4">
            <Text className="font-sans text-sm text-muted-foreground">Plan</Text>
            <Text className="shrink font-sans-medium text-sm text-foreground" numberOfLines={1}>
              {entry.planName}
              {entry.weekNumber != null ? ` · Week ${entry.weekNumber}` : ''}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

/** The full workout log, grouped by week — the web's EnrichedWorkoutHistory. */
export function WorkoutHistory({
  completions,
  plans,
  personalBests,
  initialWeeks = 4,
}: {
  completions: WorkoutCompletion[];
  plans: WorkoutPlan[];
  /** Bests mark the sessions they were set in */
  personalBests?: { completionId: string }[];
  /** Weeks shown before "Show all" */
  initialWeeks?: number;
}) {
  const [showAll, setShowAll] = useState(false);

  // Grouping, naming and the week summaries are shared with the web
  const weeks = useMemo(() => buildWorkoutHistory(completions, plans, personalBests), [completions, plans, personalBests]);
  const sessionCount = weeks.reduce((sum, w) => sum + w.entries.length, 0);

  const shown = showAll ? weeks : weeks.slice(0, initialWeeks);
  const hiddenWeeks = weeks.length - initialWeeks;

  return (
    <View className="overflow-hidden rounded-2xl border border-border/70 bg-card">
      <View className="flex-row items-baseline justify-between border-b border-border/50 px-4 pb-3 pt-4">
        <Text className="font-mono-medium text-[11px] uppercase tracking-[1.8px] text-muted-foreground">Workout history</Text>
        {sessionCount > 0 ? <Text className="font-mono text-[11px] text-muted-foreground">{sessionCount}</Text> : null}
      </View>
      {weeks.length === 0 ? (
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
          {/* One block per week: the week's line, then its sessions */}
          {shown.map((week, i) => (
            <View key={week.key} className={i > 0 ? 'border-t border-border/50' : ''}>
              <View className="flex-row items-baseline justify-between gap-3 bg-muted/30 px-4 py-2">
                <Text className="font-mono-semibold text-[10px] uppercase tracking-[1.4px] text-foreground" accessibilityRole="header">
                  {week.label}
                </Text>
                <Text className="shrink text-right font-mono text-[10px] uppercase tracking-[1.2px] text-muted-foreground">{week.summary}</Text>
              </View>
              <View className="px-4">
                {week.entries.map((entry, j) => (
                  <HistoryItem key={entry.completion.id} entry={entry} last={j === week.entries.length - 1} />
                ))}
              </View>
            </View>
          ))}
          {hiddenWeeks > 0 ? (
            <Pressable onPress={() => setShowAll((v) => !v)} className="h-11 flex-row items-center justify-center gap-1 border-t border-border/50 active:bg-muted/30">
              <Feather name={showAll ? 'chevron-up' : 'chevron-down'} size={16} color="#737373" />
              <Text className="font-mono text-[11px] uppercase tracking-[1.4px] text-muted-foreground">
                {showAll ? 'Show less' : `Show all (${hiddenWeeks} more ${hiddenWeeks === 1 ? 'week' : 'weeks'})`}
              </Text>
            </Pressable>
          ) : null}
        </>
      )}
    </View>
  );
}
