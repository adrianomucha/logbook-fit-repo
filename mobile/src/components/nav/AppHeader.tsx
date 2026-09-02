import { ActionSheetIOS, Alert, Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth';
import { Logo } from '@/components/brand/Logo';

/** Two-letter monogram for the account trigger — falls back to the email's first letter. */
function initials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || '';
  if (!source) return '';
  const words = source.split(/\s+/).filter(Boolean);
  if (words.length > 1) return (words[0][0] + words[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

/**
 * The client app's top bar — the web's ClientNav header on a phone: the
 * logotype on the left, the account monogram on the right. The monogram
 * opens the account menu (native action sheet on iOS).
 */
export function AppHeader() {
  const insets = useSafeAreaInsets();
  const { session, signOut } = useAuth();
  const monogram = initials(session?.user.name, session?.user.email);

  const openMenu = () => {
    const title = session?.user.email ?? undefined;
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { title, options: ['Sign out', 'Cancel'], destructiveButtonIndex: 0, cancelButtonIndex: 1 },
        (index) => {
          if (index === 0) void signOut();
        }
      );
      return;
    }
    Alert.alert(session?.user.name ?? 'Account', title, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  return (
    <View className="border-b border-border bg-background/95" style={{ paddingTop: insets.top }}>
      <View className="h-12 flex-row items-center justify-between px-3">
        <Logo markSize={20} />
        <Pressable
          onPress={openMenu}
          accessibilityRole="button"
          accessibilityLabel="Account menu"
          hitSlop={8}
          className="h-7 w-7 items-center justify-center rounded-full border border-border bg-muted/40 active:opacity-70"
        >
          <Text className="font-mono-semibold text-[10px] uppercase tracking-[0.4px] text-foreground">{monogram}</Text>
        </Pressable>
      </View>
    </View>
  );
}
