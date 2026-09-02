import { Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

/**
 * Brand mark — a rep tally: three strokes and the volt slash that completes
 * the count. Same geometry as the web's LogoMark.
 */
export function LogoMark({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Rect width="64" height="64" rx="14.5" fill="#0a0a0a" />
      <Path d="M21 20v24M32 20v24M43 20v24" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
      <Path d="M14.5 41.5 49.5 22.5" stroke="#c3f910" strokeWidth="5.5" strokeLinecap="round" />
    </Svg>
  );
}

/** Horizontal lockup — mark plus the mono wordmark. */
export function Logo({ markSize = 20 }: { markSize?: number }) {
  return (
    <View className="flex-row items-center gap-2">
      <LogoMark size={markSize} />
      <View className="flex-row items-baseline gap-1.5">
        <Text className="font-mono-bold text-xs uppercase tracking-[1.8px] text-foreground">Logbook</Text>
        <Text className="font-mono text-[10px] uppercase tracking-[1.5px] text-muted-foreground">Fitness</Text>
      </View>
    </View>
  );
}
