import { avatarColor } from '@/lib/avatar-colors';
import { NotificationToggle } from '@/components/notifications/NotificationToggle';
import { cn } from '@/lib/utils';

interface ClientChatHeaderProps {
  coachName: string;
}

/**
 * Conversation header for the client's chat tab. Leads with the coach —
 * avatar in the shared deterministic color, "Your coach" eyebrow — so the
 * thread reads as a line to a person, not a generic "Messages" screen.
 */
export function ClientChatHeader({ coachName }: ClientChatHeaderProps) {
  return (
    <div className="shrink-0 py-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={cn(
            'relative w-10 h-10 rounded-full flex items-center justify-center shrink-0',
            avatarColor(coachName)
          )}
          aria-hidden="true"
        >
          <span className="text-sm font-bold uppercase">{coachName.charAt(0)}</span>
          {/* Volt dot — the same brand accent the coach-side avatars carry */}
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-brand ring-2 ring-background" />
        </div>
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-0.5">
            Your coach
          </p>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight leading-tight truncate">
            {coachName}
          </h1>
        </div>
      </div>
      <NotificationToggle className="shrink-0" />
    </div>
  );
}
