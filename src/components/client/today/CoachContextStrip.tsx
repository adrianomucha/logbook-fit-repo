import { cn } from '@/lib/utils';
import { avatarColor } from '@/lib/avatar-colors';

interface CoachContextStripProps {
  coachName: string;
  coachAvatar?: string;
  /** Coaching note/instruction for today's workout */
  note: string;
}

/**
 * The coach's note for today's session, shown once the session is done.
 * Same card anatomy as the hero above it (surface, radius, mono eyebrow) so
 * the completed state reads as a stack of matched cards rather than a card
 * with loose fragments underneath; the volt rail marks the coach's voice.
 */
export function CoachContextStrip({ coachName, coachAvatar, note }: CoachContextStripProps) {
  const coachFirst = coachName.split(' ')[0];

  return (
    <div className="rounded-2xl bg-card border border-border/70 p-5 sm:p-6">
      <div className="flex items-center gap-2.5">
        <div
          className={cn(
            'w-7 h-7 rounded-full flex items-center justify-center shrink-0 overflow-hidden',
            // Same deterministic avatar color the coach surfaces use — the client
            // sees their coach in the identical visual language.
            coachAvatar ? 'bg-muted' : avatarColor(coachName)
          )}
        >
          {coachAvatar ? (
            // Avatar URLs can point at arbitrary remote hosts, which next/image
            // rejects without a remotePatterns allowlist — and its optimization
            // buys nothing for a 28px avatar. Plain <img> is the right tool.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coachAvatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-[10px] font-bold uppercase">
              {coachName.charAt(0)}
            </span>
          )}
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          Coach note
          <span className="text-muted-foreground/50">&ensp;·&ensp;</span>
          {coachFirst}
        </p>
      </div>

      <p className="mt-4 pl-4 border-l-2 border-brand text-[15px] leading-relaxed text-foreground">
        {note}
      </p>
    </div>
  );
}
