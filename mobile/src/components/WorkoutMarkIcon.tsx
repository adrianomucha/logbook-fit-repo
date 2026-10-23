import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { WorkoutMark } from '@logbook/shared/workout-week-helpers';

/**
 * One workout's state, drawn the same wherever this week appears (the week
 * list and the Progress stepper): lime with a tick once done, a lime ring
 * once started, a dashed ring for the next one, a plain ring for the rest.
 * The web's WorkoutMarkIcon.
 */
export function WorkoutMarkIcon({ mark, size }: { mark: WorkoutMark; size: number }) {
  return (
    <View
      className={`items-center justify-center rounded-full ${
        mark === 'done'
          ? 'bg-brand'
          : mark === 'started'
            ? 'border-2 border-brand bg-background'
            : mark === 'next'
              ? 'border-2 border-dashed border-muted-foreground/60 bg-background'
              : 'border-2 border-border bg-background'
      }`}
      style={{ width: size, height: size }}
    >
      {mark === 'done' ? <Feather name="check" size={size < 40 ? 14 : 20} color="#1e2702" /> : null}
      {mark === 'started' ? <View className="rounded-full bg-brand" style={{ width: size / 4, height: size / 4 }} /> : null}
    </View>
  );
}
