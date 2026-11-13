import { Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { EFFORT_CHOICES, type EffortRating } from '@logbook/shared/client-copy';
import { PressableScale } from '@/components/motion';

/**
 * "How did that feel?": the one effort picker, on the workout-finished
 * screen and the Today card alike. Outline pills; the chosen one fills ink.
 * The web's EffortPicker.
 */
export function EffortPicker({
  value,
  onPick,
  disabled,
}: {
  value?: EffortRating | null;
  onPick: (rating: EffortRating) => void;
  disabled?: boolean;
}) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="How did that feel?" className="flex-row gap-2.5">
      {EFFORT_CHOICES.map((choice) => {
        const isSelected = value === choice.value;
        return (
          <PressableScale
            key={choice.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: isSelected, disabled }}
            onPress={() => {
              // A tick as the choice lands, like a picker detent
              void Haptics.selectionAsync();
              onPick(choice.value);
            }}
            disabled={disabled}
            className={`min-h-[52px] flex-1 items-center justify-center rounded-full border-2 px-3 ${
              isSelected ? 'border-foreground bg-foreground' : 'border-border bg-card'
            } ${disabled ? 'opacity-50' : ''}`}
          >
            <Text className={`font-sans-semibold text-sm ${isSelected ? 'text-background' : 'text-foreground'}`}>{choice.label}</Text>
          </PressableScale>
        );
      })}
    </View>
  );
}
