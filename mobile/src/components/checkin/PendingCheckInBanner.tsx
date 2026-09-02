import { Text, View } from 'react-native';
import { Button } from '@/components/ui';

/** The prompt at the top of the Workout tab while a check-in is waiting. */
export function PendingCheckInBanner({ onComplete }: { onComplete: () => void }) {
  return (
    <View accessibilityLabel="Pending check-in" className="rounded-xl border border-border/70 bg-card px-4 py-4">
      <View className="mb-2 flex-row items-center gap-1.5">
        <View className="h-1.5 w-1.5 rounded-full bg-brand" />
        <Text className="font-mono text-[11px] uppercase tracking-[1.76px] text-muted-foreground">Check-in</Text>
      </View>
      <Text className="font-sans-bold text-[15px] tracking-tight text-foreground">Your coach wants to hear how training is going</Text>
      <Button variant="primary" className="mt-3 h-11" onPress={onComplete}>
        Complete check-in
      </Button>
    </View>
  );
}
