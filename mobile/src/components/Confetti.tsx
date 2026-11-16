import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { CONFETTI, confettiPieces, type ConfettiPiece } from '@logbook/shared/week-complete';

const COLORS = { ink: '#0a0a0a', paper: '#ffffff' } as const;
/** Pieces start this far above the screen and end this far below it, in px */
const OVERSHOOT = 40;

function Piece({ piece, delay, width, height }: { piece: ConfettiPiece; delay: number; width: number; height: number }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    // Linear: a piece of paper falls at a steady rate, it does not ease to a stop mid-air
    progress.value = withDelay(delay + piece.delay, withTiming(1, { duration: piece.duration, easing: Easing.linear }));
  }, [piece, delay, progress]);
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: piece.drift * width * progress.value },
      { translateY: -OVERSHOOT + (height + OVERSHOOT * 2) * progress.value },
      { rotate: `${piece.spin * progress.value}deg` },
    ],
  }));
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 0,
          left: piece.x * width,
          width: piece.size,
          height: piece.size * CONFETTI.aspect[piece.shape],
          borderRadius: 1.5,
          backgroundColor: COLORS[piece.color],
        },
        style,
      ]}
    />
  );
}

/**
 * A burst of ink and white confetti falling once over the volt screen, the
 * web's Confetti. For the week-complete moment only. It sits above the
 * content but takes no touches, removes itself when the last piece has
 * left, and does not render at all under Reduce Motion.
 */
export function Confetti({ delay = 0 }: { delay?: number }) {
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const pieces = useMemo(() => confettiPieces(), []);
  const [done, setDone] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setDone(true), delay + CONFETTI.totalMs);
    return () => clearTimeout(id);
  }, [delay]);
  if (reduceMotion || done) return null;
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}
    >
      {pieces.map((piece, i) => (
        <Piece key={i} piece={piece} delay={delay} width={width} height={height} />
      ))}
    </View>
  );
}
