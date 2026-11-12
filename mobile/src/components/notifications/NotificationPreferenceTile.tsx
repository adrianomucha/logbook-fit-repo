import { ActivityIndicator, Alert, Switch, Text, View } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { ALERTS_COPY } from '@logbook/shared/notification-copy';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { colors } from '@logbook/shared/palette';

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
        isSubscribed ? 'border-foreground/25 bg-card' : 'border-border/60 bg-secondary/40'
      }`}
    >
      {/* Icon well: turns solid ink once alerts are on so the state reads
          from across the room, not only from the switch */}
      <View
        className={`h-10 w-10 items-center justify-center rounded-lg ${
          isSubscribed ? 'bg-foreground' : 'border border-border/60 bg-background'
        }`}
      >
        {isBusy ? (
          <ActivityIndicator size="small" color={isSubscribed ? colors.background : colors.mutedForeground} />
        ) : isSubscribed ? (
          <MaterialCommunityIcons name="bell-ring" size={18} color={colors.background} />
        ) : (
          <Feather name="bell" size={18} color={colors.mutedForeground} />
        )}
      </View>

      <View className="min-w-0 flex-1">
        <View className="flex-row items-start justify-between gap-4">
          <Text className="pt-0.5 font-sans-semibold text-sm leading-tight text-foreground">{ALERTS_COPY.title}</Text>
          <Switch
            value={isSubscribed}
            onValueChange={(v) => void handleChange(v)}
            disabled={!canToggle}
            trackColor={{ true: colors.foreground, false: colors.border }}
            thumbColor={colors.card}
            accessibilityLabel={ALERTS_COPY.title}
          />
        </View>

        <Text className="mt-1 font-sans text-xs leading-5 text-muted-foreground">
          {ALERTS_COPY.body('client')}
        </Text>

        {/* Status line — the product's mono data voice; a green dot marks "on" */}
        <View className="mt-3 flex-row items-center gap-1.5" accessibilityLiveRegion="polite">
          <View className={`h-1.5 w-1.5 rounded-full ${isSubscribed ? 'bg-success' : 'bg-muted-foreground/40'}`} />
          <Text className="font-mono-medium text-[10px] uppercase tracking-[1.4px] text-muted-foreground">{status}</Text>
        </View>
      </View>
    </View>
  );
}
