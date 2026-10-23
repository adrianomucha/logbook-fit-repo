import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { STORY_EMPTY_TEXT, STORY_PAGE_SIZE, type Moment, type MomentKind, type ThisWeek } from '@logbook/shared/progress';
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

// Lime for a best, ink for the other wins, an outline for the coach and for plain workouts
const DOT: Record<MomentKind, string> = {
  best: 'border-brand bg-brand',
  streak: 'border-foreground bg-foreground',
  week: 'border-foreground bg-foreground',
  milestone: 'border-foreground bg-foreground',
  comeback: 'border-foreground bg-foreground',
  coach: 'border-brand bg-background',
  quiet: 'border-muted-foreground/40 bg-background',
};

/** "+ 2 workouts": taps open to list them, so nothing logged is out of reach */
function QuietRow({ moment }: { moment: Moment }) {
  const [open, setOpen] = useState(false);
  return (
    <Pressable onPress={() => setOpen((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: open }} className="min-h-[32px]">
      <View className="flex-row items-center gap-1">
        <Text className="font-sans-medium text-sm text-muted-foreground">{moment.title}</Text>
        <Feather name={open ? 'chevron-up' : 'chevron-down'} size={14} color="#a3a3a3" />
      </View>
      {open ? (
        <View className="mt-1 gap-1">
          {moment.sessions?.map((s, i) => (
            <Text key={i} className="font-sans text-[13px] text-muted-foreground">{s}</Text>
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}

/** The story of the client's training: only the moments worth noticing, newest first. The web's ProgressStory. */
export function ProgressStory({ moments }: { moments: Moment[] }) {
  const [showAll, setShowAll] = useState(false);
  if (moments.length === 0) {
    return <Text className="font-sans text-[15px] leading-6 text-muted-foreground">{STORY_EMPTY_TEXT}</Text>;
  }
  const shown = showAll ? moments : moments.slice(0, STORY_PAGE_SIZE);
  return (
    <View>
      <View className="relative pl-7">
        {/* The timeline's spine */}
        <View className="absolute bottom-2 left-[6px] top-2 w-0.5 rounded-full bg-muted" />
        {shown.map((m) => (
          <View key={m.key} className="relative mb-5">
            <View className={`absolute -left-7 top-[3px] h-3.5 w-3.5 rounded-full border-2 ${DOT[m.kind]}`} />
            {m.kind === 'quiet' ? (
              <QuietRow moment={m} />
            ) : (
              <>
                <Text className="font-sans text-xs text-muted-foreground">{m.when}</Text>
                <Text className="mt-0.5 font-sans-bold text-base tracking-tight text-foreground">{m.title}</Text>
                {m.detail ? (
                  <Text
                    className={`mt-0.5 font-sans text-sm leading-5 ${m.kind === 'coach' ? 'text-foreground' : 'text-muted-foreground'}`}
                    numberOfLines={m.kind === 'coach' ? 3 : 2}
                  >
                    {m.kind === 'coach' ? `“${m.detail}”` : m.detail}
                  </Text>
                ) : null}
              </>
            )}
          </View>
        ))}
      </View>
      {moments.length > STORY_PAGE_SIZE ? (
        <Pressable onPress={() => setShowAll((v) => !v)} className="h-11 flex-row items-center justify-center gap-1 active:opacity-60">
          <Feather name={showAll ? 'chevron-up' : 'chevron-down'} size={16} color="#737373" />
          <Text className="font-mono text-[11px] uppercase tracking-[1.4px] text-muted-foreground">{showAll ? 'Show less' : 'Show earlier'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
