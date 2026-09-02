import { ActivityIndicator, Alert, Switch, Text, View } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { usePushNotifications } from '@/hooks/usePushNotifications';

/**
 * The settings-page control for per-device message alerts — the web's
 * NotificationPreferenceTile: icon well (volt once alerts are on), title +
 * description, a real switch, and a mono status line that either names the
 * device state or says why the switch is disabled — an unavailable control
 * should explain itself rather than vanish.
 */
export function NotificationPreferenceTile() {
  const { available, isSubscribed, isBlocked, isBusy, isLoading, enable, disable } = usePushNotifications();

  const blockedReason: string | null = isLoading
    ? null
    : !available
      ? 'Available in the App Store build'
      : isBlocked && !isSubscribed
        ? 'Off for Logbook in iOS Settings'
        : null;

  const canToggle = !isLoading && !isBusy && blockedReason === null;

  const handleChange = async (next: boolean) => {
    if (!canToggle) return;
    try {
      if (next) await enable();
      else await disable();
    } catch (e) {
      Alert.alert("Couldn't update notifications", e instanceof Error ? e.message : undefined);
    }
  };

  const status: string = isLoading
    ? 'Checking this device…'
    : (blockedReason ?? (isSubscribed ? 'On for this device' : 'Off on this device'));

  return (
    <View
      className={`flex-row items-start gap-3.5 rounded-xl border p-4 ${
        isSubscribed ? 'border-brand/40 bg-brand/[0.06]' : 'border-border/60 bg-secondary/40'
      }`}
    >
      {/* Icon well — lights up volt once alerts are on so the state reads
          from across the room, not only from the switch */}
      <View
        className={`h-10 w-10 items-center justify-center rounded-lg ${
          isSubscribed ? 'bg-brand' : 'border border-border/60 bg-background'
        }`}
      >
        {isBusy ? (
          <ActivityIndicator size="small" color={isSubscribed ? '#1e2702' : '#737373'} />
        ) : isSubscribed ? (
          <MaterialCommunityIcons name="bell-ring" size={18} color="#1e2702" />
        ) : (
          <Feather name="bell" size={18} color="#737373" />
        )}
      </View>

      <View className="min-w-0 flex-1">
        <View className="flex-row items-start justify-between gap-4">
          <Text className="pt-1 font-sans-semibold text-[15px] leading-5 text-foreground">Message alerts</Text>
          <Switch
            value={isSubscribed}
            onValueChange={(v) => void handleChange(v)}
            disabled={!canToggle}
            trackColor={{ true: '#c3f910', false: '#e5e5e5' }}
            thumbColor="#ffffff"
            accessibilityLabel="Message alerts"
          />
        </View>

        <Text className="mt-1.5 font-sans text-[13px] leading-[19px] text-muted-foreground">
          A push notification on this device when your coach messages you. Alerts are per device, so turn them on wherever you train from.
        </Text>

        {/* Status line — the product's mono data voice; a volt dot marks "on" */}
        <View className="mt-3 flex-row items-center gap-1.5" accessibilityLiveRegion="polite">
          <View className={`h-1.5 w-1.5 rounded-full ${isSubscribed ? 'bg-brand' : 'bg-muted-foreground/40'}`} />
          <Text className="font-mono-medium text-[11px] uppercase tracking-[1.54px] text-muted-foreground">{status}</Text>
        </View>
      </View>
    </View>
  );
}
