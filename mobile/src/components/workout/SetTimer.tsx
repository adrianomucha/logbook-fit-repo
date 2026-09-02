import { Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { formatClock } from '@logbook/shared/set-timer';
import { formatDuration } from '@logbook/shared/reps';
import { useSetTimer } from '@/hooks/useSetTimer';

interface SetTimerProps {
  setNumber: number;
  /** Prescribed seconds to count down from; undefined → count-up stopwatch. */
  targetSeconds?: number;
  /** Countdown hit zero: log the prescribed seconds and complete the set. */
  onFinish: (seconds: number) => void;
  /** Stopped early: log the seconds actually held, leave the set unticked. */
  onStop: (seconds: number) => void;
}

/** The buzzer — a firm double tap, the native stand-in for the web's vibrate pattern. */
function buzz() {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
}

function Control({
  label,
  icon,
  onPress,
  variant,
  accessibilityLabel,
}: {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
  variant: 'primary' | 'plain';
  accessibilityLabel: string;
}) {
  const primary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className={`h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-lg px-4 active:scale-[0.97] ${
        primary ? 'bg-primary' : 'bg-background'
      }`}
    >
      <Feather name={icon} size={16} color={primary ? '#fafafa' : '#0a0a0a'} />
      <Text className={`font-sans-semibold text-sm ${primary ? 'text-primary-foreground' : 'text-foreground'}`}>{label}</Text>
    </Pressable>
  );
}

/**
 * Countdown for a single TIME set — the web's SetTimer. Idle it is one slim
 * "Start" line so a 3-set plank doesn't turn into three stopwatches; once
 * started it grows into a large clock with pause/stop so it can be read
 * from plank height.
 */
export function SetTimer({ setNumber, targetSeconds, onFinish, onStop }: SetTimerProps) {
  const timer = useSetTimer({
    targetSeconds,
    onFinish: (seconds) => {
      buzz();
      onFinish(seconds);
    },
  });

  if (timer.status === 'idle') {
    return (
      <Pressable
        onPress={timer.start}
        accessibilityRole="button"
        accessibilityLabel={
          timer.isCountdown
            ? `Start ${formatDuration(targetSeconds!)} countdown for set ${setNumber}`
            : `Start stopwatch for set ${setNumber}`
        }
        className="mb-2 h-10 w-full flex-row items-center justify-center gap-1.5 rounded-lg border border-dashed border-foreground/20 active:bg-muted/40"
      >
        <Feather name="play" size={16} color="#0a0a0a" />
        <Text className="font-sans-semibold text-sm text-foreground">
          {timer.isCountdown ? `Start ${formatDuration(targetSeconds!)} timer` : 'Start stopwatch'}
        </Text>
      </Pressable>
    );
  }

  const running = timer.status === 'running';
  const done = timer.status === 'done';
  // Last 5 seconds of a countdown: draw the eye so the athlete braces for the buzzer.
  const finalStretch = timer.isCountdown && running && timer.displaySeconds <= 5;

  const status = done
    ? 'Done'
    : timer.isCountdown
      ? `${formatDuration(targetSeconds!)} · ${running ? 'holding' : 'paused'}`
      : running
        ? 'stopwatch'
        : 'paused';

  return (
    <View accessibilityLabel={`Set ${setNumber} timer`} className="mb-2 rounded-xl bg-muted/50 px-4 py-3">
      {/* Clock on its own line: a 36px "19:49" plus two labelled buttons
          don't fit side by side at phone width, and the clock never shrinks. */}
      <View className="flex-row items-end justify-between gap-3">
        <Text
          accessibilityLiveRegion={running ? 'none' : 'polite'}
          className={`font-mono-bold text-4xl leading-none ${
            done ? 'text-success-text' : finalStretch ? 'text-primary' : 'text-foreground'
          }`}
        >
          {formatClock(timer.displaySeconds)}
        </Text>
        <Text className="shrink text-right font-mono text-[11px] uppercase tracking-[1.54px] text-muted-foreground">{status}</Text>
      </View>

      <View className="mt-3 flex-row gap-2">
        {done ? (
          <Control label="Reset" icon="rotate-ccw" onPress={timer.reset} variant="plain" accessibilityLabel={`Reset set ${setNumber} timer`} />
        ) : (
          <>
            <Control
              label={running ? 'Pause' : 'Resume'}
              icon={running ? 'pause' : 'play'}
              onPress={running ? timer.pause : timer.start}
              variant="primary"
              accessibilityLabel={running ? `Pause set ${setNumber} timer` : `Resume set ${setNumber} timer`}
            />
            <Control
              label="Stop"
              icon="square"
              onPress={() => {
                timer.pause();
                onStop(timer.elapsedSeconds);
                timer.reset();
              }}
              variant="plain"
              accessibilityLabel={`Stop set ${setNumber} timer and log ${timer.elapsedSeconds} seconds`}
            />
          </>
        )}
      </View>
    </View>
  );
}
