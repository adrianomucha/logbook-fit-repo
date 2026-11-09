import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PAGE_NOT_FOUND_COPY } from '@logbook/shared/state-copy';
import { Button, EmptyState } from '@/components/ui';

/** A link into the app that leads nowhere. The web's not-found page. */
export default function NotFound() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 justify-center bg-background px-5" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <EmptyState
        art={PAGE_NOT_FOUND_COPY.art}
        eyebrow={PAGE_NOT_FOUND_COPY.kicker}
        title={PAGE_NOT_FOUND_COPY.title}
        tail={PAGE_NOT_FOUND_COPY.tail}
      >
        <Button variant="primary" className="w-full" onPress={() => router.replace('/')}>
          {PAGE_NOT_FOUND_COPY.home}
        </Button>
      </EmptyState>
    </View>
  );
}
