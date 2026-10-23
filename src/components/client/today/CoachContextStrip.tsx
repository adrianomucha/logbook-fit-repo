import { cn, noWidows } from '@/lib/utils';
import { avatarColor } from '@/lib/avatar-colors';

interface CoachContextStripProps {
  coachName: string;
  coachAvatar?: string;
  /** Coaching note/instruction for today's workout, or a check-in reply */
  note: string;
  /** What the note is; defaults to "Coach note" */
  label?: string;
  /** Lines shown before the text is cut (the full note lives behind the action) */
  maxLines?: 2 | 3;
  action?: { label: string; onClick: () => void };
}

/**
 * A note from the coach: today's coaching note once the workout is done,
 * or the reply to the latest check-in. One look for both.
 * Same card anatomy as the hero above it (surface, radius, mono eyebrow) so
 * the completed state reads as a stack of matched cards rather than a card
 * with loose fragments underneath; the avatar and eyebrow carry the voice.
 */
export function CoachContextStrip({ coachName, coachAvatar, note, label = 'Coach note', maxLines, action }: CoachContextStripProps) {
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
          {label}
          <span className="text-muted-foreground/50">&ensp;·&ensp;</span>
          {coachFirst}
        </p>
      </div>

      {/* Coach-written copy of unknowable length: glue the last pair so the
          note never ends on a lone word, whatever the phone width */}
      <p
        className={cn(
          'mt-3 text-[15px] leading-relaxed text-foreground',
          maxLines === 2 && 'line-clamp-2',
          maxLines === 3 && 'line-clamp-3'
        )}
      >
        {noWidows(note)}
      </p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-2 min-h-[44px] -mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground transition-colors touch-manipulation rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
