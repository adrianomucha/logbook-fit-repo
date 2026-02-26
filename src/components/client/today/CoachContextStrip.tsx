import { Lightbulb } from 'lucide-react';

interface CoachContextStripProps {
  coachName: string;
  coachAvatar?: string;
  /** Coaching note/instruction for today's workout */
  note: string;
}

export function CoachContextStrip({ coachName, coachAvatar, note }: CoachContextStripProps) {
  return (
    <div className="flex items-start gap-2.5 px-1">
      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5 overflow-hidden">
        {coachAvatar ? (
          <img src={coachAvatar} alt="" className="w-full h-full object-cover" />
        ) : (
          <Lightbulb className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground font-medium mb-0.5">
          Coach tip
        </p>
        <p className="text-sm text-foreground line-clamp-2">{note}</p>
      </div>
    </div>
  );
}
