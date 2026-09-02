import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/nav/AppHeader';

interface ScreenProps {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Extra bottom clearance, e.g. for a sticky action bar. */
  bottomInset?: number;
  /** Show the app header (logo + account). On for the tab screens. */
  withHeader?: boolean;
}

/** A scrolling screen with the safe-area and horizontal padding every tab shares. */
export function Screen({ children, refreshing = false, onRefresh, bottomInset = 0, withHeader = false }: ScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-background">
      {withHeader ? <AppHeader /> : null}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: withHeader ? 16 : insets.top + 8,
          paddingBottom: 24 + bottomInset,
          paddingHorizontal: 20,
        }}
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined}
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-6">{children}</View>
      </ScrollView>
    </View>
  );
}
