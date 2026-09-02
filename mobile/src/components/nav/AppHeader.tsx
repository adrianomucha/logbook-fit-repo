import { Image, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth';
import { useCurrentUser } from '@/hooks/useCurrentUser';
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
 * logotype on the left, the account trigger on the right — the profile
 * photo when there is one, else the monogram. It opens the account page.
 */
export function AppHeader() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuth();
  const { user } = useCurrentUser();
  const monogram = initials(session?.user.name, session?.user.email);
  const avatarUrl = user?.avatarUrl ?? null;

  const openMenu = () => router.push('/client/account');

  return (
    <View className="border-b border-border bg-background/95" style={{ paddingTop: insets.top }}>
      <View className="h-12 flex-row items-center justify-between px-3">
        <Logo markSize={20} />
        <Pressable
          onPress={openMenu}
          accessibilityRole="button"
          accessibilityLabel="Account menu"
          hitSlop={8}
          className="h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-border bg-muted/40 active:opacity-70"
        >
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={{ width: 26, height: 26, borderRadius: 13 }} accessibilityIgnoresInvertColors />
          ) : (
            <Text className="font-mono-semibold text-[10px] uppercase tracking-[0.4px] text-foreground">{monogram}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
