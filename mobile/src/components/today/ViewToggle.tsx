import { Pressable, Text, View } from 'react-native';

export type WorkoutViewMode = 'today' | 'weekly';

const SEGMENTS: { id: WorkoutViewMode; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'weekly', label: 'This week' },
];

/**
 * Quiet segmented control between the today focus and the full week — the
 * web's WorkoutViewToggle. Gray chrome on purpose: the volt CTA below stays
 * the loudest thing on the screen.
 */
export function ViewToggle({ value, onChange }: { value: WorkoutViewMode; onChange: (mode: WorkoutViewMode) => void }) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Workout view" className="h-10 flex-row gap-1 rounded-xl bg-muted/60 p-1">
      {SEGMENTS.map(({ id, label }) => {
        const active = value === id;
        return (
          <Pressable
            key={id}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            onPress={() => onChange(id)}
            className={`flex-1 items-center justify-center rounded-lg ${active ? 'border border-border bg-card' : ''}`}
          >
            <Text className={`font-mono-medium text-[11px] uppercase tracking-[1.3px] ${active ? 'text-foreground' : 'text-muted-foreground'}`}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
