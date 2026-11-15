import { useEffect } from 'react';
import { View } from 'react-native';
import { CRASH_COPY } from '@logbook/shared/state-copy';
import { Button, EmptyState } from '@/components/ui';
import { reportCrash } from '@/lib/report-crash';

/**
 * What an error boundary shows instead of a blank screen: retry, and, where
 * the boundary sits below a mounted navigator, a way home. The web's
 * error.tsx. No error.message on screen: it can carry internals. The error
 * is reported to the operators instead, as the web's boundaries do.
 */
export function CrashScreen({
  error,
  screen,
  onRetry,
  onHome,
}: {
  error?: Error;
  /** Which boundary caught it: "root" or "client" */
  screen: string;
  onRetry: () => void;
  onHome?: () => void;
}) {
  useEffect(() => {
    reportCrash(error, screen);
  }, [error, screen]);

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
