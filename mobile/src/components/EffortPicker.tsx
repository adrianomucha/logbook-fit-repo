import { Text, View } from 'react-native';
import { haptic } from '@/lib/haptics';
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
  tone = 'default',
}: {
  value?: EffortRating | null;
  onPick: (rating: EffortRating) => void;
  disabled?: boolean;
  /**
   * `onVolt` for the week-complete screen: ink outlines straight on the volt,
   * no white fill, and the chosen one fills ink with volt text.
   */
  tone?: 'default' | 'onVolt';
}) {
  const onVolt = tone === 'onVolt';
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
              haptic.select();
              onPick(choice.value);
            }}
            disabled={disabled}
            className={`min-h-[52px] flex-1 items-center justify-center rounded-full border-2 px-3 ${
              isSelected ? 'border-foreground bg-foreground' : onVolt ? 'border-foreground bg-transparent' : 'border-border bg-card'
            } ${disabled ? 'opacity-50' : ''}`}
          >
            <Text className={`font-sans-semibold text-sm ${isSelected ? (onVolt ? 'text-brand' : 'text-background') : 'text-foreground'}`}>
              {choice.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}
