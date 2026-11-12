import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { WorkoutMark } from '@logbook/shared/workout-week-helpers';
import { colors } from '@logbook/shared/palette';

/**
 * One workout's state, drawn the same wherever this week appears (the week
 * list and the Progress stepper): volt with a tick once done (a logged workout
 * is the one thing that earns volt), an ink ring once started, a dashed ring for the next one, a plain ring for the rest.
 * The web's WorkoutMarkIcon.
 */
export function WorkoutMarkIcon({ mark, size }: { mark: WorkoutMark; size: number }) {
  return (
    <View
      className={`items-center justify-center rounded-full ${
        mark === 'done'
          ? 'bg-brand'
          : mark === 'started'
            ? 'border-2 border-foreground bg-background'
            : mark === 'next'
              ? 'border-2 border-dashed border-muted-foreground/60 bg-background'
              : 'border-2 border-border bg-background'
      }`}
      style={{ width: size, height: size }}
    >
      {mark === 'done' ? <Feather name="check" size={size < 40 ? 14 : 20} color={colors.brandForeground} /> : null}
      {mark === 'started' ? <View className="rounded-full bg-foreground" style={{ width: size / 4, height: size / 4 }} /> : null}
    </View>
  );
}
