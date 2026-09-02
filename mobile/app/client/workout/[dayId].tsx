import { Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Button, Eyebrow } from '@/components/ui';

/**
 * Workout execution — next build (IOS_APP_PLAN.md §3.3, screen 3). The route
 * exists now so Today's buttons and push deep links already resolve; it
 * mirrors the web's /client/workout/<dayId> path.
 */
export default function WorkoutScreen() {
  const router = useRouter();
  const { dayId } = useLocalSearchParams<{ dayId: string }>();
  return (
    <Screen>
      <View className="pt-6">
        <Eyebrow>Workout</Eyebrow>
        <Text className="mt-2 font-sans-bold text-2xl text-foreground">Logging arrives in the next build</Text>
        <Text className="mt-2 font-sans text-sm leading-5 text-muted-foreground">
          Set-by-set logging for this session is being built. For now, log it on logbook.fit.
        </Text>
        <Text className="mt-4 font-mono text-[10px] text-muted-foreground">day {dayId}</Text>
      </View>
      <Button variant="ghost" onPress={() => router.back()}>Back to today</Button>
    </Screen>
  );
}
