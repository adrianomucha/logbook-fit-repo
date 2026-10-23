import { Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { noWidows } from '@logbook/shared/no-widows';
import { UserAvatar } from '@/components/UserAvatar';
import { Eyebrow } from '@/components/ui';

interface CoachContextStripProps {
  coachName: string;
  coachAvatar?: string | null;
  /** Today's coaching note, or a check-in reply */
  note: string;
  /** What the note is; defaults to "Coach note" */
  label?: string;
  /** Lines shown before the text is cut (the full note lives behind the action) */
  maxLines?: number;
  /** Quiet detail on the right of the eyebrow row, e.g. the reply's date */
  meta?: string;
  /** Makes the whole card the way into the full note */
  onPress?: () => void;
}

/**
 * A note from the coach: today's coaching note once the workout is done,
 * or the reply to the latest check-in. One look for both, as on the web.
 * Same card anatomy as the hero above it (surface, radius, mono eyebrow) so
 * the completed state reads as a stack of matched cards rather than a card
 * with loose fragments underneath; the avatar and eyebrow carry the voice.
 * With onPress the whole card opens the full note, so there's no loose link
 * line hanging under the text.
 */
export function CoachContextStrip({ coachName, coachAvatar, note, label = 'Coach note', maxLines, meta, onPress }: CoachContextStripProps) {
  const coachFirst = coachName.split(' ')[0];
  const body = (
    <>
      <View className="flex-row items-center gap-2.5">
        <UserAvatar name={coachName} avatarUrl={coachAvatar} size={28} textSize={10} />
        <Text className="flex-1 font-mono text-[10px] uppercase tracking-[1.6px] text-muted-foreground" numberOfLines={1}>
          {label}
          <Text className="text-muted-foreground/50">{' · '}</Text>
          {coachFirst}
        </Text>
        {meta ? <Eyebrow>{meta}</Eyebrow> : null}
        {onPress ? <Feather name="chevron-right" size={16} color="#a3a3a3" style={{ marginRight: -4 }} /> : null}
      </View>
      {/* Coach-written copy of unknowable length: glue the last pair so the
          note never ends on a lone word, whatever the phone width */}
      <Text className="mt-3 font-sans text-[15px] leading-6 text-foreground" numberOfLines={maxLines}>
        {noWidows(note)}
      </Text>
    </>
  );
  const cardClass = 'rounded-2xl border border-border/70 bg-card p-5';
  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="button" className={`${cardClass} active:opacity-70`}>
      {body}
    </Pressable>
  ) : (
    <View className={cardClass}>{body}</View>
  );
}
