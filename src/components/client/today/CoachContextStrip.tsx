import { cn } from '@/lib/utils';
import { avatarColor } from '@/lib/avatar-colors';

interface CoachContextStripProps {
  coachName: string;
  coachAvatar?: string;
  /** Coaching note/instruction for today's workout */
  note: string;
}

export function CoachContextStrip({ coachName, coachAvatar, note }: CoachContextStripProps) {
  return (
    <div className="flex items-start gap-3 pl-3.5 border-l-2 border-brand">
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
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-0.5">
          Coach note
        </p>
        <p className="text-sm text-foreground/80 leading-relaxed line-clamp-2">{note}</p>
      </div>
    </div>
  );
}
