import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import {
  ART_EASES,
  ART_STROKE,
  ART_VIEWBOX,
  stillPose,
  artViewBox,
  framedOrigin,
  motionSegments,
  poseOf,
  type ArtLayer,
  type ArtPose,
  type ArtTone,
  type StateArt as StateArtDef,
} from '@logbook/shared/iso-art';
import { STATE_ART, type StateArtId } from '@logbook/shared/state-art';
import { colors } from '@logbook/shared/palette';

// Same tokens as tailwind.config.js (the app is light-only)
const PAINT: Record<Exclude<ArtTone, 'accent'>, string> = {
  ink: colors.foreground,
  paper: colors.card,
  shade: colors.border,
  none: 'none',
};
const ACCENT = { brand: colors.brand, warning: colors.warning } as const;

const SIZES = { sm: 112, md: 160, lg: 208 } as const;

type PoseKey = keyof ArtPose;
const KEYS: PoseKey[] = ['x', 'y', 'scale', 'rotate', 'opacity'];

/** Plays a layer's keyframes on repeat, one chained tween per pose property */
function useLoop(values: Record<PoseKey, SharedValue<number>>, layer: ArtLayer, duration: number, enabled: boolean) {
  useEffect(() => {
    const motion = layer.motion;
    if (!motion || motion.length < 2 || !enabled) return;
    const segments = motionSegments(motion, duration);
    const start = poseOf(motion[0]);
    for (const key of KEYS) {
      const [first, ...rest] = segments.map((seg) =>
        withTiming(seg.pose[key], { duration: seg.duration, easing: Easing.bezier(...ART_EASES[seg.ease]) }),
      );
      values[key].value = start[key];
      values[key].value = withRepeat(withSequence(first, ...rest), -1);
    }
    return () => KEYS.forEach((key) => cancelAnimation(values[key]));
  }, [values, layer, duration, enabled]);
}

function ArtLayerView({
  art,
  layer,
  width,
  duration,
  accent,
  animate,
}: {
  art: StateArtDef;
  layer: ArtLayer;
  width: number;
  duration: number;
  accent: string;
  animate: boolean;
}) {
  const k = width / ART_VIEWBOX.width;
  const height = ART_VIEWBOX.height * k;
  const [ox, oy] = framedOrigin(art, layer);

  // Start on the still picture (the loop's first frame); under Reduce Motion
  // it stays there
  const still = stillPose(layer.motion);
  const x = useSharedValue(still.x);
  const y = useSharedValue(still.y);
  const scale = useSharedValue(still.scale);
  const rotate = useSharedValue(still.rotate);
  const opacity = useSharedValue(still.opacity);
  const values = useMemo(() => ({ x, y, scale, rotate, opacity }), [x, y, scale, rotate, opacity]);
  const moving = animate && !!layer.motion;
  useLoop(values, layer, duration, moving);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: x.value * k },
      { translateY: y.value * k },
      { rotate: `${rotate.value}deg` },
      { scale: scale.value },
    ],
  }));

  const paint = (tone: ArtTone) => (tone === 'accent' ? accent : PAINT[tone]);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: [ox * k, oy * k, 0] }, style]}>
      <Svg width={width} height={height} viewBox={artViewBox(art)}>
        {layer.shapes.map((s, i) => (
          <Path
            key={i}
            d={s.d}
            fill={paint(s.fill)}
            stroke={paint(s.stroke)}
            strokeWidth={s.strokeWidth ?? ART_STROKE}
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray={s.dashed ? [2.5, 2] : undefined}
          />
        ))}
      </Svg>
    </Animated.View>
  );
}

/**
 * One of the shared isometric state illustrations, looping its motion.
 * Same drawing and timing as the web's StateArt. Under Reduce Motion it
 * holds the loop's first frame, the still picture.
 */
export function StateArt({ art, size = 'md' }: { art: StateArtId; size?: keyof typeof SIZES }) {
  const def = STATE_ART[art];
  const reduceMotion = useReducedMotion();
  const width = SIZES[size];
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={{ width, height: (width * ART_VIEWBOX.height) / ART_VIEWBOX.width }}
    >
      {def.layers.map((layer) => (
        <ArtLayerView
          key={layer.id}
          art={def}
          layer={layer}
          width={width}
          duration={def.duration}
          accent={ACCENT[def.accent]}
          animate={!reduceMotion}
        />
      ))}
    </View>
  );
}
