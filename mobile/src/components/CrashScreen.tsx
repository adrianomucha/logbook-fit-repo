import { View } from 'react-native';
import { CRASH_COPY } from '@logbook/shared/state-copy';
import { Button, EmptyState } from '@/components/ui';

/**
 * What an error boundary shows instead of a blank screen: retry, and, where
 * the boundary sits below a mounted navigator, a way home. The web's
 * error.tsx. No error.message: it can carry internals.
 */
export function CrashScreen({ onRetry, onHome }: { onRetry: () => void; onHome?: () => void }) {
  return (
    <View className="flex-1 justify-center bg-background px-5">
      <EmptyState art={CRASH_COPY.art} title={CRASH_COPY.title} tail={CRASH_COPY.tail}>
        <Button variant="primary" className="w-full" onPress={onRetry}>
          {CRASH_COPY.retry}
        </Button>
        {onHome ? (
          <Button variant="ghost" className="w-full" onPress={onHome}>
            {CRASH_COPY.home}
          </Button>
        ) : null}
      </EmptyState>
    </View>
  );
}
