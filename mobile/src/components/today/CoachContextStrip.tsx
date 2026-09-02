import { Text, View } from 'react-native';
import { avatarColor } from '@/lib/avatar-colors';
import { Eyebrow } from '@/components/ui';

/** The coach's note for today's session — avatar, eyebrow, two lines, volt rail. */
export function CoachContextStrip({ coachName, note }: { coachName: string; note: string }) {
  const color = avatarColor(coachName);
  return (
    <View className="flex-row items-start gap-3 border-l-2 border-brand pl-3.5">
      <View className="h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: color.bg }}>
        <Text className="font-sans-bold text-[10px] uppercase" style={{ color: color.text }}>{coachName.charAt(0)}</Text>
      </View>
      <View className="flex-1">
        <Eyebrow className="mb-0.5">Coach note</Eyebrow>
        <Text className="font-sans text-sm leading-5 text-foreground/80" numberOfLines={2}>{note}</Text>
      </View>
    </View>
  );
}
