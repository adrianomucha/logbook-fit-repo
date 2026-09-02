import { Pressable, Text, View } from 'react-native';

export interface Choice {
  value: string;
  label: string;
  emoji: string;
  /** Selected look — the app's effort colour semantics (success / neutral / warning / destructive). */
  tone: 'success' | 'neutral' | 'warning' | 'destructive';
}

const SELECTED: Record<Choice['tone'], { shell: string; text: string }> = {
  success: { shell: 'border-success/40 bg-success/10', text: 'text-success-text' },
  neutral: { shell: 'border-foreground/25 bg-muted', text: 'text-foreground' },
  warning: { shell: 'border-warning/40 bg-warning/10', text: 'text-warning-text' },
  destructive: { shell: 'border-destructive/40 bg-destructive/10', text: 'text-destructive' },
};

interface ChoiceGridProps {
  choices: Choice[];
  value: string | null;
  onChange: (value: string) => void;
  columns: 2 | 3;
  accessibilityLabel: string;
}

/** Emoji + label tiles, one selected — the check-in form's answer grids. */
export function ChoiceGrid({ choices, value, onChange, columns, accessibilityLabel }: ChoiceGridProps) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel} className="flex-row flex-wrap gap-2">
      {choices.map((choice) => {
        const selected = value === choice.value;
        const look = SELECTED[choice.tone];
        return (
          <Pressable
            key={choice.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            onPress={() => onChange(choice.value)}
            style={{ width: columns === 3 ? '31.5%' : '48.5%' }}
            className={`min-h-[64px] items-center justify-center gap-1 rounded-lg border-2 px-1 py-3 active:opacity-80 ${
              selected ? look.shell : 'border-transparent bg-muted/50'
            }`}
          >
            <Text className="text-xl leading-6">{choice.emoji}</Text>
            <Text className={`font-sans-bold text-xs uppercase tracking-[0.3px] ${selected ? look.text : 'text-muted-foreground'}`}>
              {choice.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
