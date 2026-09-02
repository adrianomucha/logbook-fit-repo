import { Text, View } from 'react-native';
import { noWidows } from '@logbook/shared/no-widows';
import { UserAvatar } from '@/components/UserAvatar';
import { Eyebrow } from '@/components/ui';

interface CoachContextStripProps {
  coachName: string;
  coachAvatar?: string | null;
  note: string;
}

/**
 * The coach's note for today's session, shown once the session is done.
 * Same card anatomy as the hero above it (surface, radius, mono eyebrow) so
 * the completed state reads as a stack of matched cards rather than a card
 * with loose fragments underneath; the avatar and eyebrow carry the voice.
 */
export function CoachContextStrip({ coachName, coachAvatar, note }: CoachContextStripProps) {
  const coachFirst = coachName.split(' ')[0];
  return (
    <View className="rounded-2xl border border-border/70 bg-card p-5">
      <View className="flex-row items-center gap-2.5">
        <UserAvatar name={coachName} avatarUrl={coachAvatar} size={28} textSize={10} />
        <Eyebrow>
          Coach note
          <Text className="text-muted-foreground/50">{'\u2002·\u2002'}</Text>
          {coachFirst}
        </Eyebrow>
      </View>
      {/* Coach-written copy of unknowable length: glue the last pair so the
          note never ends on a lone word, whatever the phone width */}
      <Text className="mt-3 font-sans text-[15px] leading-6 text-foreground">{noWidows(note)}</Text>
    </View>
  );
}
