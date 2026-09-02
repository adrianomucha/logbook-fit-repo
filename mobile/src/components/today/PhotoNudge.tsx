import { Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { UserAvatar } from '@/components/UserAvatar';

interface PhotoNudgeProps {
  clientName: string;
  coachName: string;
  onAddPhoto: () => void;
}

/**
 * The coach sees the client as a monogram on their roster until a photo is
 * set — the web's nudge in WelcomeAwaitingPlan: the monogram they'd
 * otherwise be, one line, and a small outline action.
 */
export function PhotoNudge({ clientName, coachName, onAddPhoto }: PhotoNudgeProps) {
  const coachFirst = coachName.split(' ')[0];
  return (
    <View className="gap-3 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-3.5">
      <View className="flex-row items-center gap-3">
        <UserAvatar name={clientName} size={36} textSize={14} />
        <View className="flex-1">
          <Text className="font-sans-bold text-sm leading-5 text-foreground">Put a face to your name</Text>
          <Text className="mt-0.5 font-sans text-xs leading-5 text-muted-foreground">{coachFirst} sees this on your card. A photo helps.</Text>
        </View>
      </View>
      <Pressable
        onPress={onAddPhoto}
        accessibilityRole="button"
        className="ml-12 h-9 flex-row items-center gap-1.5 self-start rounded-lg border border-border bg-background px-3 active:scale-[0.96]"
      >
        <Feather name="camera" size={14} color="#0a0a0a" />
        <Text className="font-sans-semibold text-sm text-foreground">Add photo</Text>
      </Pressable>
    </View>
  );
}
