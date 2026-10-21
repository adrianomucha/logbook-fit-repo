import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { WorkoutCompletion, WorkoutPlan } from '@logbook/shared/types';
import { buildWorkoutHistory, type HistoryEntry } from '@logbook/shared/progress';
import { Eyebrow } from '@/components/ui';

/** The session's name and its day — a trophy for a best, a note only when it was left unfinished */
function HistoryItem({ entry, last }: { entry: HistoryEntry; last: boolean }) {
  return (
    <View className={`min-h-[44px] justify-center py-3 ${last ? '' : 'border-b border-border/40'}`}>
      <View className="flex-row items-center gap-3">
        <View className="flex-1 flex-row items-center gap-1.5">
          <Text className="shrink font-sans-semibold text-[15px] tracking-tight text-foreground" numberOfLines={1}>{entry.name}</Text>
          {entry.bests > 0 ? (
            <View accessibilityLabel={entry.bests === 1 ? 'Personal best' : `${entry.bests} personal bests`}>
              <Feather name="award" size={14} color="#157f3c" />
            </View>
          ) : null}
        </View>
        <Text className="font-sans text-[13px] text-muted-foreground">{entry.date}</Text>
      </View>
      {entry.partialLabel ? <Text className="mt-0.5 font-sans text-xs text-warning-text">{entry.partialLabel}</Text> : null}
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

  // Grouping and naming are shared with the web
  const weeks = useMemo(() => buildWorkoutHistory(completions, plans, personalBests), [completions, plans, personalBests]);

  const shown = showAll ? weeks : weeks.slice(0, initialWeeks);
  const hiddenWeeks = weeks.length - initialWeeks;

  return (
    <View className="overflow-hidden rounded-2xl border border-border/70 bg-card">
      <View className="border-b border-border/50 px-4 pb-3 pt-4">
        <Text className="font-mono-medium text-[11px] uppercase tracking-[1.8px] text-muted-foreground">Workout history</Text>
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
          {/* One block per week: its name, then its sessions */}
          {shown.map((week, i) => (
            <View key={week.key} className={i > 0 ? 'border-t border-border/50' : ''}>
              <View className="bg-muted/30 px-4 py-2">
                <Text className="font-mono-semibold text-[10px] uppercase tracking-[1.4px] text-foreground" accessibilityRole="header">
                  {week.label}
                </Text>
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
