import { UserAvatar } from '@/components/UserAvatar';
import { NotificationToggle } from '@/components/notifications/NotificationToggle';

interface ClientChatHeaderProps {
  coachName: string;
  coachAvatar?: string | null;
}

/**
 * Conversation header for the client's chat tab. Leads with the coach —
 * avatar in the shared deterministic color, "Your coach" eyebrow — so the
 * thread reads as a line to a person, not a generic "Messages" screen.
 */
export function ClientChatHeader({ coachName, coachAvatar }: ClientChatHeaderProps) {
  return (
    <div className="shrink-0 py-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative w-10 h-10 shrink-0" aria-hidden="true">
          <UserAvatar name={coachName} avatarUrl={coachAvatar} className="w-10 h-10 text-sm" />
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
