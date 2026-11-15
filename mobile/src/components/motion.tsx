import { useEffect, useRef, type ReactNode } from 'react';
import { Pressable, type GestureResponderEvent, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import {
  CELEBRATE_POP_FROM,
  CHECK_POP_FROM,
  DURATION,
  EASE,
  ENTER_OFFSET,
  PRESS_SCALE,
  TAB_LAND_FROM,
  TAB_PRESS_SCALE,
} from '@logbook/shared/motion';

/**
 * The app's motion, in one place. Curves and durations come from
 * @logbook/shared/motion so the native app moves like the web one.
 *
 * Everything here runs on the UI thread through Reanimated, and every
 * `withTiming` follows the system Reduce Motion setting by default: with it
 * on, values jump straight to where they were going.
 */

export const EASE_OUT = Easing.bezier(...EASE.out);
export const EASE_POP = Easing.bezier(...EASE.pop);
export const EASE_IN_OUT = Easing.bezier(...EASE.inOut);

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** How far it shrinks while held */
  scaleTo?: number;
}

/**
 * A Pressable that shrinks a touch while held, the web's
 * `active:scale-[0.97] transition-transform`. It answers on press-in, not on
 * release, so the control feels like it is under the finger.
 */
export function PressableScale({ scaleTo = PRESS_SCALE, onPressIn, onPressOut, style, ...rest }: PressableScaleProps) {
  const pressed = useSharedValue(0);
  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * (1 - scaleTo) }],
  }));
  return (
    <AnimatedPressable
      {...rest}
      style={[style, scaleStyle]}
      onPressIn={(event: GestureResponderEvent) => {
        // Down is quick so the press registers at once
        pressed.value = withTiming(1, { duration: 100, easing: EASE_OUT });
        onPressIn?.(event);
      }}
      onPressOut={(event: GestureResponderEvent) => {
        pressed.value = withTiming(0, { duration: DURATION.press, easing: EASE_OUT });
        onPressOut?.(event);
      }}
    />
  );
}

/** Content fading up into place on mount, the web's `animate-fade-in-up`. */
export function FadeInUp({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(delay, withTiming(1, { duration: DURATION.enter, easing: EASE_OUT }));
  }, [delay, progress]);
  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * ENTER_OFFSET }],
  }));
  return (
    <Animated.View className={className} style={style}>
      {children}
    </Animated.View>
  );
}

/** A completion mark popping in on mount, the web's `animate-completion-pop`. */
export function PopIn({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(delay, withTiming(1, { duration: DURATION.celebrate, easing: EASE_POP }));
  }, [delay, progress]);
  const style = useAnimatedStyle(() => ({
    // The pop curve overshoots past 1; opacity must not
    opacity: Math.min(1, Math.max(0, progress.value)),
    transform: [{ scale: CELEBRATE_POP_FROM + (1 - CELEBRATE_POP_FROM) * progress.value }],
  }));
  return (
    <Animated.View className={className} style={style}>
      {children}
    </Animated.View>
  );
}

const BRAND = '#c3f910';
const BRAND_CLEAR = 'rgba(195, 249, 16, 0)';
const RING = 'rgba(10, 10, 10, 0.15)';

/**
 * The round tick at the end of a set or an exercise. Ticking it fades the
 * volt fill in and pops the check, as on the web; unticking clears at once.
 * It only moves when `checked` changes, so a set that was already done when
 * the row appeared just sits there.
 */
export function CheckCircle({ checked, size = 32 }: { checked: boolean; size?: number }) {
  const fill = useSharedValue(checked ? 1 : 0);
  const pop = useSharedValue(checked ? 1 : 0);
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    fill.value = withTiming(checked ? 1 : 0, { duration: DURATION.state, easing: EASE_OUT });
    pop.value = checked
      ? withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: DURATION.pop, easing: EASE_POP }))
      : withTiming(0, { duration: 0 });
  }, [checked, fill, pop]);
  const circleStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(fill.value, [0, 1], [BRAND_CLEAR, BRAND]),
    borderColor: interpolateColor(fill.value, [0, 1], [RING, BRAND]),
  }));
  const checkStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, pop.value)),
    transform: [{ scale: CHECK_POP_FROM + (1 - CHECK_POP_FROM) * pop.value }],
  }));
  return (
    <Animated.View
      style={[
        { width: size, height: size, borderRadius: size / 2, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
        circleStyle,
      ]}
    >
      <Animated.View style={checkStyle}>
        <Feather name="check" size={size / 2} color="#1e2702" />
      </Animated.View>
    </Animated.View>
  );
}

/**
 * The lit part of a progress bar, easing to each new value like the web's
 * `transition-[width]`. Width is fine to animate here: the fill is alone in
 * its track, so nothing else is laid out again.
 *
 * It starts at `pct` (no motion on mount) unless `from` says otherwise.
 */
export function MeterFill({
  pct,
  from,
  delay = 0,
  duration = DURATION.meter,
  className = 'h-full rounded-full bg-brand',
}: {
  pct: number;
  from?: number;
  delay?: number;
  duration?: number;
  className?: string;
}) {
  const width = useSharedValue(from ?? pct);
  useEffect(() => {
    width.value = withDelay(delay, withTiming(pct, { duration, easing: EASE_OUT }));
  }, [pct, delay, duration, width]);
  const style = useAnimatedStyle(() => ({ width: `${width.value}%` }));
  return <Animated.View className={className} style={style} />;
}

/**
 * The tab bar's icon: it dips under the thumb while its tab is held, and
 * settles into place when its tab becomes the active one, as the pill
 * arrives. The web's `group-active:scale-95` and `animate-tab-pop`. Small
 * and quick, with no overshoot: tabs are switched all day.
 */
export function TabIconPop({ active, pressed, children }: { active: boolean; pressed: boolean; children: ReactNode }) {
  const land = useSharedValue(1);
  const press = useSharedValue(0);
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!active) return;
    land.value = withSequence(
      withTiming(TAB_LAND_FROM, { duration: 0 }),
      withTiming(1, { duration: DURATION.state, easing: EASE_OUT }),
    );
  }, [active, land]);
  useEffect(() => {
    // Down is quick so the press registers at once
    press.value = withTiming(pressed ? 1 : 0, { duration: pressed ? 100 : DURATION.press, easing: EASE_OUT });
  }, [pressed, press]);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: land.value * (1 - press.value * (1 - TAB_PRESS_SCALE)) }],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}
