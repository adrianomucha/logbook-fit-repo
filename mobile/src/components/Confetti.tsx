import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { CONFETTI, confettiPieces, type ConfettiPiece } from '@logbook/shared/week-complete';

const COLORS = { brand: '#c3f910', ink: '#0a0a0a' } as const;
/** Pieces start this far above the screen and end this far below it, in px */
const OVERSHOOT = 40;

function Piece({ piece, width, height }: { piece: ConfettiPiece; width: number; height: number }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    // Linear: a piece of paper falls at a steady rate, it does not ease to a stop mid-air
    progress.value = withDelay(piece.delay, withTiming(1, { duration: piece.duration, easing: Easing.linear }));
  }, [piece, progress]);
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
 * A burst of volt and ink confetti falling once over the whole screen, the
 * web's Confetti. For the week-complete moment only. It sits above the
 * content but takes no touches, removes itself when the last piece has
 * left, and does not render at all under Reduce Motion.
 */
export function Confetti() {
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const pieces = useMemo(() => confettiPieces(), []);
  const [done, setDone] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setDone(true), CONFETTI.totalMs);
    return () => clearTimeout(id);
  }, []);
  if (reduceMotion || done) return null;
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}
    >
      {pieces.map((piece, i) => (
        <Piece key={i} piece={piece} width={width} height={height} />
      ))}
    </View>
  );
}
