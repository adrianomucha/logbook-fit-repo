import { ChevronRight, X } from 'lucide-react';
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
  /** Quiet detail on the right of the eyebrow row, e.g. the reply's date */
  meta?: string;
  /** Makes the whole card the way into the full note */
  onClick?: () => void;
  /** Accessible name for the whole-card action */
  openLabel?: string;
  /** Puts the card away; shows a close button in place of the chevron */
  onDismiss?: () => void;
  dismissLabel?: string;
}

/**
 * A note from the coach: today's coaching note once the workout is done,
 * or the reply to the latest check-in. One look for both.
 * Same card anatomy as the hero above it (surface, radius, mono eyebrow) so
 * the completed state reads as a stack of matched cards rather than a card
 * with loose fragments underneath; the avatar and eyebrow carry the voice.
 * With onClick the whole card opens the full note, so there's no loose link
 * line hanging under the text. It's a stretched button under the content
 * rather than a button wrapper, so a dismiss button can sit inside the card.
 */
export function CoachContextStrip({
  coachName,
  coachAvatar,
  note,
  label = 'Coach note',
  maxLines,
  meta,
  onClick,
  openLabel,
  onDismiss,
  dismissLabel = 'Dismiss',
}: CoachContextStripProps) {
  const coachFirst = coachName.split(' ')[0];

  return (
    <div
      className={cn(
        'relative rounded-2xl bg-card border border-border/70 p-5 sm:p-6',
        onClick &&
          'group hover:border-border has-[>button:first-child:active]:scale-[0.99] transition-[transform,border-color] duration-150'
      )}
    >
      {onClick && (
        <button
          type="button"
          onClick={onClick}
          aria-label={openLabel}
          className="absolute inset-0 rounded-2xl touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      )}
      <span className="flex items-center gap-2.5">
        <span
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
        </span>
        <span className="flex-1 min-w-0 truncate font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          {label}
          <span className="text-muted-foreground/50">&ensp;·&ensp;</span>
          {coachFirst}
        </span>
        {meta && (
          <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            {meta}
          </span>
        )}
        {onDismiss ? (
          // Positioned above the stretched button (which paints over the
          // static content); the padding gives it a 40px target without
          // growing the header row
          <button
            type="button"
            onClick={onDismiss}
            aria-label={dismissLabel}
            className="relative z-10 -my-3 -mr-3 p-3 shrink-0 rounded-full text-muted-foreground/60 hover:text-foreground transition-colors touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        ) : onClick && (
          <ChevronRight
            className="-mr-1 w-4 h-4 shrink-0 text-muted-foreground/60 group-hover:text-foreground transition-colors"
            aria-hidden="true"
          />
        )}
      </span>

      {/* Coach-written copy of unknowable length: glue the last pair so the
          note never ends on a lone word, whatever the phone width */}
      <span
        className={cn(
          'block mt-3 text-[15px] leading-relaxed text-foreground',
          maxLines === 2 && 'line-clamp-2',
          maxLines === 3 && 'line-clamp-3'
        )}
      >
        {noWidows(note)}
      </span>
    </div>
  );
}
