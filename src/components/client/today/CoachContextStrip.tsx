interface CoachContextStripProps {
  coachName: string;
  coachAvatar?: string;
  /** Coaching note/instruction for today's workout */
  note: string;
}

export function CoachContextStrip({ coachName, coachAvatar, note }: CoachContextStripProps) {
  return (
    <div className="flex items-start gap-3 pl-3.5 border-l-2 border-foreground/15">
      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
        {coachAvatar ? (
          <img src={coachAvatar} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-[10px] font-bold text-muted-foreground uppercase">
            {coachName.charAt(0)}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-medium mb-0.5">
          Coach Note
        </p>
        <p className="text-sm text-foreground/80 leading-relaxed line-clamp-2">{note}</p>
      </div>
    </div>
  );
}
