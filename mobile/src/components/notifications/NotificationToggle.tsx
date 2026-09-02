import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { usePushNotifications } from '@/hooks/usePushNotifications';

/**
 * The web's NotificationToggle pill: nothing when push can't work here, a
 * line of copy when permission is blocked, otherwise "Turn on alerts" /
 * "Alerts on".
 */
export function NotificationToggle() {
  const { available, isSubscribed, isBlocked, isBusy, isLoading, enable, disable } = usePushNotifications();

  if (isLoading || !available) return null;

  if (isBlocked && !isSubscribed) {
    return (
      <View className="flex-row items-center gap-1.5">
        <Feather name="bell-off" size={12} color="#737373" />
        <Text className="font-mono text-[11px] uppercase tracking-[1.32px] text-muted-foreground">Alerts off in Settings</Text>
      </View>
    );
  }

  const toggle = async () => {
    try {
      if (isSubscribed) await disable();
      else await enable();
    } catch (e) {
      Alert.alert("Couldn't update notifications", e instanceof Error ? e.message : undefined);
    }
  };

  return (
    <Pressable
      onPress={toggle}
      disabled={isBusy}
      accessibilityRole="switch"
      accessibilityState={{ checked: isSubscribed }}
      className={`min-h-[32px] flex-row items-center gap-1.5 rounded-full px-3 py-1.5 active:opacity-70 ${isSubscribed ? '' : 'bg-muted/60'}`}
    >
      {isBusy ? <ActivityIndicator size="small" color="#737373" /> : <Feather name="bell" size={12} color={isSubscribed ? '#737373' : '#0a0a0a'} />}
      <Text className={`font-mono-bold text-[11px] uppercase tracking-[1.32px] ${isSubscribed ? 'text-muted-foreground' : 'text-foreground'}`}>
        {isSubscribed ? 'Alerts on' : 'Turn on alerts'}
      </Text>
    </Pressable>
  );
}
