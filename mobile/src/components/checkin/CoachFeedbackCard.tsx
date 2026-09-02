import { Pressable, Text, View } from 'react-native';
import { format } from 'date-fns';
import type { CheckIn } from '@logbook/shared/types';

/** Coach feedback strip for the weekly view; renders only for a completed check-in with a reply. */
export function CoachFeedbackCard({ checkIn, onViewDetails }: { checkIn: CheckIn | null; onViewDetails: () => void }) {
  if (!checkIn || checkIn.status !== 'completed' || !checkIn.coachResponse) return null;
  const date = format(new Date(checkIn.completedAt || checkIn.date), 'MMM d');
  return (
    <View className="rounded-xl border-l-2 border-brand bg-muted/40 px-4 py-4">
      <Text className="mb-1.5 font-mono text-[11px] uppercase tracking-[1.76px] text-muted-foreground">Coach feedback · {date}</Text>
      <Text className="mb-2 font-sans text-sm leading-5 text-foreground/80" numberOfLines={2}>
        {checkIn.coachResponse}
      </Text>
      <Pressable onPress={onViewDetails} hitSlop={8} className="self-start">
        <Text className="font-sans-bold text-[11px] uppercase tracking-[0.3px] text-muted-foreground underline">View Check-in</Text>
      </Pressable>
    </View>
  );
}
