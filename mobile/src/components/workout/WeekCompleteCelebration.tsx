import { useEffect, useMemo, useRef } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import type { EffortRating } from '@logbook/shared/client-copy';
import { medalRestAngle, WEEK_COMPLETE_COPY, WEEK_MOMENT, weekMinutes, type CompletedWeek } from '@logbook/shared/week-complete';
import { haptic } from '@/lib/haptics';
import { Confetti } from '@/components/Confetti';
import { EffortPicker } from '@/components/EffortPicker';
import { EASE_IN_OUT, EASE_OUT, FadeInUp, PopIn } from '@/components/motion';

const VOLT = '#c3f910';
const INK = '#0a0a0a';
/** Quieter ink for labels: the same ink, let through at 72%. No third colour. */
const INK_DIM = 'rgba(10, 10, 10, 0.72)';

/** Where the medal's centre sits down the screen, as a fraction of its height: the flood starts here */
const MEDAL_CENTER_Y = 0.24;

// Plain functions for the UI thread to call back into: it cannot reach into the haptic object itself
const landHaptic = () => haptic.land();
const edgeHaptic = () => haptic.tap();

/** Volt spreading from the medal's centre until it covers the screen. */
function VoltFlood() {
  const { width, height } = useWindowDimensions();
  // Big enough to reach the far corners from the medal's centre
  const diameter = 2 * Math.hypot(width, height);
  const from = WEEK_MOMENT.medalSize / diameter;
  const scale = useSharedValue(from);
  useEffect(() => {
    scale.value = withTiming(1, { duration: WEEK_MOMENT.floodMs, easing: EASE_IN_OUT });
  }, [scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: diameter,
            height: diameter,
            borderRadius: diameter / 2,
            left: width / 2 - diameter / 2,
            top: height * MEDAL_CENTER_Y - diameter / 2,
            backgroundColor: VOLT,
          },
          style,
        ]}
      />
    </View>
  );
}

/**
 * The week's medal: an ink disc stamped with the week number. It spins in
 * and lands face up, ticking under the thumb on each half turn and landing
 * with a thud. After that it is the athlete's to play with: drag to spin
 * it, flick to send it round, tap to flip it. It always settles on a face.
 */
function WeekMedal({ week }: { week: CompletedWeek }) {
  const size = WEEK_MOMENT.medalSize;
  // Degrees. Starts wound back so it unwinds to 0, face up.
  const rot = useSharedValue(-WEEK_MOMENT.medalTurns * 360);
  const scale = useSharedValue<number>(WEEK_MOMENT.medalFrom);

  useEffect(() => {
    scale.value = withDelay(WEEK_MOMENT.medalDelay, withTiming(1, { duration: WEEK_MOMENT.medalSpinMs, easing: EASE_OUT }));
    rot.value = withDelay(
      WEEK_MOMENT.medalDelay,
      withTiming(0, { duration: WEEK_MOMENT.medalSpinMs, easing: EASE_OUT }, (finished) => {
        if (finished) runOnJS(landHaptic)();
      })
    );
  }, [rot, scale]);

  // A tick each time an edge passes: on the way in, and under the hand after
  useAnimatedReaction(
    () => Math.round((rot.value - 90) / 180),
    (edge, previous) => {
      if (previous !== null && edge !== previous) runOnJS(edgeHaptic)();
    }
  );

  const dragFrom = useRef(0);
  const pan = useMemo(() => {
    const settle = (angle: number, speed = 0) => {
      rot.value = withSpring(medalRestAngle(angle, speed), { damping: 14, stiffness: 120, mass: 0.9 });
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 4,
      onPanResponderGrant: () => {
        cancelAnimation(rot);
        dragFrom.current = rot.value;
      },
      onPanResponderMove: (_, g) => {
        rot.value = dragFrom.current + g.dx * WEEK_MOMENT.dragDegPerPx;
      },
      onPanResponderRelease: (_, g) => {
        // A tap flips it; a flick carries on the way it was going
        if (Math.abs(g.dx) < 4) settle(medalRestAngle(dragFrom.current, 0) + 180);
        else settle(rot.value, g.vx);
      },
      onPanResponderTerminate: () => settle(rot.value),
    });
  }, [rot]);

  const medalStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 900 }, { scale: scale.value }, { rotateY: `${rot.value}deg` }],
  }));
  // Show whichever face is towards the viewer. Explicit, not backface
  // culling, so it cannot disagree between platforms.
  const frontStyle = useAnimatedStyle(() => ({ opacity: Math.cos((rot.value * Math.PI) / 180) >= 0 ? 1 : 0 }));
  const backStyle = useAnimatedStyle(() => ({ opacity: Math.cos((rot.value * Math.PI) / 180) >= 0 ? 0 : 1 }));
  // The shadow on the floor narrows as the medal turns edge on
  const shadowStyle = useAnimatedStyle(() => ({
    opacity: scale.value,
    transform: [{ scaleX: 0.35 + 0.65 * Math.abs(Math.cos((rot.value * Math.PI) / 180)) }],
  }));

  const face = [StyleSheet.absoluteFill, { alignItems: 'center' as const, justifyContent: 'center' as const }];
  return (
    <View className="items-center">
      <Animated.View
        {...pan.panHandlers}
        accessible
        accessibilityRole="image"
        accessibilityLabel={WEEK_COMPLETE_COPY.medalA11y(week.weekNumber, week.total)}
        style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: INK }, medalStyle]}
      >
        {/* The struck rim */}
        <View
          pointerEvents="none"
          style={{ position: 'absolute', top: 9, left: 9, right: 9, bottom: 9, borderRadius: size / 2, borderWidth: 1.5, borderColor: 'rgba(195, 249, 16, 0.4)' }}
        />
        <Animated.View pointerEvents="none" style={[face, frontStyle]}>
          <Text className="font-mono-medium text-[11px] uppercase tracking-[3px]" style={{ color: VOLT }}>
            {WEEK_COMPLETE_COPY.medalLabel}
          </Text>
          <Text className="font-mono-bold text-[68px] leading-[72px]" style={{ color: VOLT }}>
            {WEEK_COMPLETE_COPY.medalNumber(week.weekNumber)}
          </Text>
          <Text className="font-mono text-[11px] uppercase tracking-[2px]" style={{ color: 'rgba(195, 249, 16, 0.7)' }}>
            {WEEK_COMPLETE_COPY.medalTally(week.total)}
          </Text>
        </Animated.View>
        {/* Turned round so it reads the right way when the medal shows its back */}
        <Animated.View pointerEvents="none" style={[face, { transform: [{ rotateY: '180deg' }] }, backStyle]}>
          <Feather name="check" size={72} color={VOLT} />
          <Text className="mt-1 font-mono-medium text-[11px] uppercase tracking-[3px]" style={{ color: VOLT }}>
            {WEEK_COMPLETE_COPY.medalBack}
          </Text>
        </Animated.View>
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[{ marginTop: 14, width: size * 0.62, height: 10, borderRadius: 5, backgroundColor: 'rgba(10, 10, 10, 0.16)' }, shadowStyle]}
      />
    </View>
  );
}

/** One ink tick per workout of the week, popping in left to right. */
function WeekTicks({ total }: { total: number }) {
  return (
    <View className="mt-4 flex-row flex-wrap justify-center gap-2" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: total }, (_, i) => (
        <PopIn
          key={i}
          delay={WEEK_MOMENT.ticksDelay + i * WEEK_MOMENT.tickStagger}
          className="h-7 w-7 items-center justify-center rounded-full"
        >
          <View className="h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: INK }}>
            <Feather name="check" size={14} color={VOLT} />
          </View>
        </PopIn>
      ))}
    </View>
  );
}

interface WeekCompleteCelebrationProps {
  week: CompletedWeek;
  /** The workout just finished */
  workoutTitle: string;
  /** Its duration, added to the week's other workouts for the total */
  durationMin: number;
  onRate: (rating: EffortRating) => void;
  onSkip: () => void;
  isSavingRating: boolean;
}

/**
 * The workout-finished screen when that workout closed out the week, the
 * web's WeekCompleteCelebration. Same job as the everyday one (name what was
 * done, ask how it felt), dressed for the occasion: see
 * @logbook/shared/week-complete for the show and its timings.
 */
export function WeekCompleteCelebration({ week, workoutTitle, durationMin, onRate, onSkip, isSavingRating }: WeekCompleteCelebrationProps) {
  const insets = useSafeAreaInsets();
  const eyebrow = 'font-mono text-[10px] uppercase tracking-[1.6px]';
  const dim = { color: INK_DIM };
  return (
    <View className="flex-1 items-center justify-center bg-background px-6" style={{ paddingTop: insets.top, paddingBottom: insets.bottom + 24 }}>
      <VoltFlood />

      <View className="mb-7 items-center">
        <WeekMedal week={week} />
        <FadeInUp delay={WEEK_MOMENT.contentDelay} className="mt-5 items-center">
          <Text className={`mb-1.5 ${eyebrow}`} style={dim}>
            {WEEK_COMPLETE_COPY.eyebrow(week.weekNumber)}
          </Text>
          <Text accessibilityRole="header" className="text-center font-sans-bold text-2xl tracking-tight" style={{ color: INK }}>
            {workoutTitle}
          </Text>
        </FadeInUp>
        <WeekTicks total={week.total} />
      </View>

      <FadeInUp delay={WEEK_MOMENT.contentDelay + 80} className="mb-8 w-full max-w-xs flex-row gap-3">
        {(
          [
            [`${week.total}/${week.total}`, WEEK_COMPLETE_COPY.workoutsStat],
            [weekMinutes(week, durationMin), WEEK_COMPLETE_COPY.minutesStat],
          ] as const
        ).map(([value, label]) => (
          // Ink blocks with volt figures, like the medal: no in-between green
          <View key={label} className="flex-1 items-center rounded-xl px-3 py-5" style={{ backgroundColor: INK }}>
            <Text className="font-mono-bold text-2xl" style={{ color: VOLT }}>
              {value}
            </Text>
            <Text className={`mt-2 ${eyebrow}`} style={{ color: 'rgba(195, 249, 16, 0.7)' }}>
              {label}
            </Text>
          </View>
        ))}
      </FadeInUp>

      <FadeInUp delay={WEEK_MOMENT.contentDelay + 140} className="w-full items-center">
        <Text className={`mb-4 ${eyebrow}`} style={dim}>
          How did that feel?
        </Text>
        <View className="w-full">
          <EffortPicker onPick={onRate} disabled={isSavingRating} tone="onVolt" />
        </View>
      </FadeInUp>
      <Pressable onPress={onSkip} disabled={isSavingRating} className="mt-6 min-h-[44px] justify-center px-4">
        <Text className={eyebrow} style={dim}>
          Skip for now
        </Text>
      </Pressable>

      <Confetti delay={WEEK_MOMENT.confettiDelay} />
    </View>
  );
}
