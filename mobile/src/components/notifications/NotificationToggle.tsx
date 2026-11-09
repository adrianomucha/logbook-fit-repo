import { ActivityIndicator, Alert, Linking, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ALERTS_COPY } from '@logbook/shared/alerts-copy';
import { usePushNotifications } from '@/hooks/usePushNotifications';

/**
 * The bell in the chat header, same as the web's icon-only NotificationToggle:
 * nothing when push can't work here; a slashed bell on a filled chip while
 * alerts are off (the nudge); a quiet plain bell once they're on. Blocked
 * permission keeps the slashed bell, unfilled, and a tap says where to fix it.
 */
export function NotificationToggle() {
  const { available, isSubscribed, isBlocked, isBusy, isLoading, enable, disable } = usePushNotifications();

  if (isLoading || !available) return null;

  if (isBlocked && !isSubscribed) {
    return (
      <Pressable
        onPress={() =>
          Alert.alert(ALERTS_COPY.blockedInSettingsTitle, ALERTS_COPY.blockedInSettings, [
            { text: ALERTS_COPY.notNow, style: 'cancel' },
            { text: ALERTS_COPY.openSettings, onPress: () => void Linking.openSettings() },
          ])
        }
        accessibilityRole="button"
        accessibilityLabel={ALERTS_COPY.blockedLabel}
        className="h-10 w-10 items-center justify-center rounded-full active:opacity-70"
      >
        <Feather name="bell-off" size={16} color="#737373" />
      </Pressable>
    );
  }

  const toggle = async () => {
    try {
      if (isSubscribed) await disable();
      else await enable();
    } catch (e) {
      Alert.alert(ALERTS_COPY.failed, e instanceof Error ? e.message : undefined);
    }
  };

  return (
    <Pressable
      onPress={toggle}
      disabled={isBusy}
      accessibilityRole="switch"
      accessibilityState={{ checked: isSubscribed }}
      accessibilityLabel={isSubscribed ? ALERTS_COPY.turnOff : ALERTS_COPY.turnOn}
      className={`h-10 w-10 items-center justify-center rounded-full active:opacity-70 ${isSubscribed ? '' : 'bg-muted/60'}`}
    >
      {isBusy ? (
        <ActivityIndicator size="small" color="#737373" />
      ) : (
        <Feather name={isSubscribed ? 'bell' : 'bell-off'} size={16} color={isSubscribed ? '#737373' : '#0a0a0a'} />
      )}
    </Pressable>
  );
}
