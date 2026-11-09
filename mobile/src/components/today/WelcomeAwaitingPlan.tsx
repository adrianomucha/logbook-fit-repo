import { Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { WELCOME_COPY } from '@logbook/shared/client-empty-states';
import { Button, Eyebrow } from '@/components/ui';
import { WorkoutMarkIcon } from '@/components/WorkoutMarkIcon';
import { PhotoNudge } from './PhotoNudge';

interface WelcomeAwaitingPlanProps {
  clientName: string;
  coachName: string;
  onMessageCoach: () => void;
  /** Client has a profile photo: hides the add-photo nudge */
  hasPhoto: boolean;
  onAddPhoto: () => void;
  onLeaveCoach: () => void;
}

/**
 * What a client sees between signing up and getting their first plan: a
 * welcome, where they are in getting started, and a line to the coach.
 * The web's WelcomeAwaitingPlan.
 */
export function WelcomeAwaitingPlan({ clientName, coachName, onMessageCoach, hasPhoto, onAddPhoto, onLeaveCoach }: WelcomeAwaitingPlanProps) {
  const firstName = clientName.split(' ')[0] || 'there';
  const coachFirstName = coachName.split(' ')[0];
  // The same marks as the week list: done, underway, still to come
  const steps = WELCOME_COPY.steps(coachName);

  return (
    <View className="gap-5">
      <View className="pt-2">
        <Eyebrow className="mb-1.5">{WELCOME_COPY.eyebrow}</Eyebrow>
        <Text className="font-sans-bold text-2xl tracking-tight text-foreground">{WELCOME_COPY.title(firstName)}</Text>
        <Text className="mt-1.5 font-sans text-sm leading-5 text-muted-foreground">{WELCOME_COPY.body(coachName)}</Text>
      </View>

      <View className="overflow-hidden rounded-2xl border border-border/70 bg-card">
        {steps.map((step, i) => (
          <View key={step.label} className={`flex-row items-center gap-3 px-4 py-3.5 ${i > 0 ? 'border-t border-border/50' : ''}`}>
            <WorkoutMarkIcon mark={step.mark} size={24} />
            <View className="flex-1">
              <Text className={`font-sans-semibold text-sm leading-5 ${step.mark === 'upcoming' ? 'text-muted-foreground' : 'text-foreground'}`}>
                {step.label}
              </Text>
              <Text className="mt-0.5 font-sans text-xs text-muted-foreground">{step.detail}</Text>
            </View>
          </View>
        ))}
      </View>

      <View className="rounded-2xl border border-border/70 bg-card px-4 py-4">
        <Text className="font-sans-bold text-[15px] tracking-tight text-foreground">{WELCOME_COPY.sayHiTitle}</Text>
        <Text className="mt-1 font-sans text-sm leading-5 text-muted-foreground">{WELCOME_COPY.sayHiBody(coachName)}</Text>
        <Button variant="primary" className="mt-3 h-11" onPress={onMessageCoach}>
          {WELCOME_COPY.sayHiCta(coachFirstName)}
        </Button>
      </View>

      {!hasPhoto ? <PhotoNudge clientName={clientName} coachName={coachName} onAddPhoto={onAddPhoto} /> : null}

      {/* Quiet exit: wrong coach, or changed your mind before day one */}
      <Pressable onPress={onLeaveCoach} accessibilityRole="button" className="h-11 flex-row items-center justify-center gap-1.5 self-center px-3 active:opacity-60">
        <Feather name="user-minus" size={14} color="#737373" />
        <Text className="font-sans-medium text-sm text-muted-foreground">{WELCOME_COPY.leave}</Text>
      </Pressable>
    </View>
  );
}
