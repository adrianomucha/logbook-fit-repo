import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LOG_EMPTY_TEXT, LOG_PAGE_WEEKS, type LogBadge, type LogEntry, type LogWeek, type LogWin, type ThisWeek } from '@logbook/shared/progress';
import { LOG_EMPTY_ART } from '@logbook/shared/state-copy';
import { StateArt } from '@/components/StateArt';
import { AUTO_FINISHED_COPY } from '@logbook/shared/auto-finish';
import { WorkoutMarkIcon } from '@/components/WorkoutMarkIcon';

/**
 * This week as a stepper: a mark per workout (see WorkoutMarkIcon), the
 * done ones joined by a lime track.
 */
export function WeekCircles({ week }: { week: ThisWeek }) {
  const { slots } = week;
  const done = slots.filter((s) => s.state === 'done').length;
  // Smaller circles once a week holds more workouts than fit comfortably
  const size = slots.length > 5 ? 40 : 52;
  // The lit part of the track runs from the first circle to the last one done
  const lit = slots.length > 1 && done > 1 ? (Math.min(done, slots.length) - 1) / (slots.length - 1) : 0;
  return (
    <View accessibilityRole="image" accessibilityLabel={`${week.completed} of ${week.target} workouts done this week`}>
      <View className="absolute h-1 rounded-full bg-muted" style={{ left: size / 2, right: size / 2, top: size / 2 - 2 }}>
        <View className="h-full rounded-full bg-brand" style={{ width: `${lit * 100}%` }} />
      </View>
      <View className="flex-row justify-between">
        {slots.map((slot, i) => (
          <View key={i} className="items-center gap-2">
            <WorkoutMarkIcon mark={slot.state} size={size} />
            <Text
              className={`h-4 text-[11px] leading-4 ${
                slot.state === 'next' || slot.state === 'started' ? 'font-sans-semibold text-foreground' : 'font-sans-medium text-muted-foreground'
              }`}
            >
              {slot.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** A best, a milestone or a comeback, under the workout it came from */
function Win({ win }: { win: LogWin }) {
  return (
    <View className="flex-row items-start gap-2" accessible accessibilityLabel={`${win.kind === 'best' ? 'New best: ' : ''}${win.label}${win.detail ? ` ${win.detail}` : ''}`}>
      <View className={`mt-px h-[18px] w-[18px] items-center justify-center rounded-full ${win.kind === 'best' ? 'bg-brand' : 'bg-muted'}`}>
        {win.kind === 'best' ? (
          <MaterialCommunityIcons name="trophy-outline" size={12} color="#1e2702" />
        ) : (
          <Feather name={win.kind === 'milestone' ? 'flag' : 'rotate-ccw'} size={11} color="#0a0a0a" />
        )}
      </View>
      <Text className="flex-1 font-sans text-sm leading-5 text-muted-foreground">
        <Text className="font-sans-semibold text-foreground">{win.label}</Text>
        {win.detail ? ` ${win.detail}` : ''}
      </Text>
    </View>
  );
}

function Badge({ badge }: { badge: LogBadge }) {
  const week = badge.kind === 'week';
  return (
    <View className={`h-6 flex-row items-center gap-1 rounded-full px-2.5 ${week ? 'bg-brand' : 'bg-foreground'}`}>
      <Feather name={week ? 'check' : 'zap'} size={12} color={week ? '#1e2702' : '#ffffff'} />
      <Text className={`font-sans-semibold text-xs ${week ? 'text-brand-foreground' : 'text-background'}`}>{badge.text}</Text>
    </View>
  );
}

/** A workout, or a note from the coach: the day on the left, what happened on the right */
function Entry({ entry, first }: { entry: LogEntry; first: boolean }) {
  return (
    // Entries on the same day share a block: no rule between them
    <View className={`flex-row gap-3 ${entry.firstOfDay ? 'py-3' : 'pb-3'} ${!first && entry.firstOfDay ? 'border-t border-border/60' : ''}`}>
      {/* A second entry on the same day leaves the day off */}
      <View className="w-9 items-center">
        {entry.firstOfDay ? (
          <>
            <Text className="font-sans-medium text-[11px] uppercase leading-4 tracking-[0.5px] text-muted-foreground">{entry.weekday}</Text>
            <Text className="font-sans-bold text-lg leading-6 text-foreground">{entry.date}</Text>
          </>
        ) : null}
      </View>
      {entry.kind === 'coach' ? (
        <View className="flex-1 rounded-xl bg-muted px-3.5 py-3">
          <Text className="font-sans-semibold text-xs text-muted-foreground">{entry.title}</Text>
          <Text className="mt-1 font-sans text-sm leading-5 text-foreground">{entry.note}</Text>
        </View>
      ) : (
        <View className="flex-1 pt-[7px]">
          <Text className="font-sans-semibold text-[15px] leading-5 text-foreground">{entry.title}</Text>
          {entry.autoFinished ? (
            <Text className="mt-0.5 font-sans text-xs leading-4 text-muted-foreground">{AUTO_FINISHED_COPY.label}</Text>
          ) : null}
          {entry.wins.length > 0 ? (
            <View className="mt-2 gap-1.5">
              {entry.wins.map((w, i) => (
                <Win key={i} win={w} />
              ))}
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

/**
 * The client's training, a week to a section, newest first: every workout
 * with its wins under it, and the coach's notes in the week they came. The
 * web's ProgressLog.
 */
export function ProgressLog({ weeks }: { weeks: LogWeek[] }) {
  const [showAll, setShowAll] = useState(false);
  if (weeks.length === 0) {
    return (
      <View className="items-center py-2">
        <View className="mb-3">
          <StateArt art={LOG_EMPTY_ART} size="sm" />
        </View>
        <Text className="max-w-[340px] text-center font-sans text-[15px] leading-6 text-muted-foreground">{LOG_EMPTY_TEXT}</Text>
      </View>
    );
  }
  const shown = showAll ? weeks : weeks.slice(0, LOG_PAGE_WEEKS);
  return (
    <View className="gap-7">
      {shown.map((week) => (
        <View key={week.key}>
          <View className="flex-row items-baseline justify-between gap-3 border-b border-border pb-2">
            <Text accessibilityRole="header" className="font-sans-bold text-[15px] tracking-tight text-foreground">
              {week.title}
            </Text>
            {week.summary ? <Text className="font-sans text-[13px] text-muted-foreground">{week.summary}</Text> : null}
          </View>
          {week.badges.length > 0 ? (
            <View className="mt-3 flex-row flex-wrap gap-1.5">
              {week.badges.map((b, i) => (
                <Badge key={i} badge={b} />
              ))}
            </View>
          ) : null}
          <View>
            {week.entries.map((e, i) => (
              <Entry key={e.key} entry={e} first={i === 0} />
            ))}
          </View>
        </View>
      ))}
      {weeks.length > LOG_PAGE_WEEKS ? (
        <Pressable onPress={() => setShowAll((v) => !v)} className="h-11 flex-row items-center justify-center gap-1 active:opacity-60">
          <Feather name={showAll ? 'chevron-up' : 'chevron-down'} size={16} color="#737373" />
          <Text className="font-mono text-[11px] uppercase tracking-[1.4px] text-muted-foreground">{showAll ? 'Show less' : 'Show earlier weeks'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
