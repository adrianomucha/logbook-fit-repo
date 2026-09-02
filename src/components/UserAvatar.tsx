import { avatarColor } from '@/lib/avatar-colors';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  /** Drives the monogram letter and its deterministic color */
  name: string;
  avatarUrl?: string | null;
  /** Size and monogram text size, e.g. "w-9 h-9 text-xs" */
  className?: string;
}

/**
 * One avatar for every surface: the uploaded photo when there is one, else
 * the same deterministic-color monogram the app has always drawn. Callers
 * own the size (and any ring) via className; status dots go on a `relative`
 * wrapper around this, not inside it — the circle clips to its edge so a
 * photo never bleeds out of the round.
 */
export function UserAvatar({ name, avatarUrl, className }: UserAvatarProps) {
  const label = name.trim() || '?';
  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center select-none font-bold shrink-0 overflow-hidden antialiased',
        avatarUrl ? 'bg-muted' : avatarColor(label),
        className
      )}
      aria-hidden="true"
    >
      {avatarUrl ? (
        // Storage URLs are remote; next/image would need a remotePatterns
        // allowlist and buys nothing for a thumbnail this size
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        label.charAt(0).toUpperCase()
      )}
    </div>
  );
}
