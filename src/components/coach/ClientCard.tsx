import { Client } from '@/types';
import { ClientStatus } from '@/lib/client-status';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface ClientCardProps {
  client: Client;
  status: ClientStatus;
  variant: 'needs-attention' | 'on-track';
  snippet?: string;
  nextCheckInDate?: string;
  planName?: string;
}

export function ClientCard({
  client,
  status,
  variant,
  snippet,
  nextCheckInDate,
  planName,
}: ClientCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/coach/clients/${client.id}`);
  };

  // Status dot color
  const dotColor = (() => {
    switch (status.type) {
      case 'at-risk':
      case 'overdue':
        return 'bg-red-500';
      case 'pending-checkin':
      case 'unread':
        return 'bg-blue-500';
      case 'ok':
        return 'bg-emerald-500';
      default:
        return 'bg-gray-400';
    }
  })();

  // Build subtitle parts
  const subtitleParts: string[] = [];
  if (planName) subtitleParts.push(planName);
  if (variant === 'needs-attention' && snippet) {
    subtitleParts.push(snippet);
  } else if (variant === 'on-track' && nextCheckInDate) {
    subtitleParts.push(`Next check-in: ${nextCheckInDate}`);
  }

  return (
    <div
      onClick={handleClick}
      className={cn(
        // Base: row layout, minimum 48px touch target
        'flex items-center cursor-pointer transition-colors',
        'hover:bg-muted/50 active:bg-muted/70',
        // Mobile: tighter padding, smaller gap
        'gap-3 py-3 px-3',
        // Desktop: more breathing room
        'sm:gap-4 sm:py-4 sm:px-4'
      )}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {/* Avatar — scales up on larger screens */}
      <div className="relative flex-shrink-0">
        <div
          className={cn(
            'rounded-full bg-gradient-to-br from-muted to-muted/60',
            'flex items-center justify-center select-none',
            // Mobile: 48px, Desktop: 56px
            'w-12 h-12 text-xl',
            'sm:w-14 sm:h-14 sm:text-2xl'
          )}
        >
          {client.avatar || client.name.charAt(0)}
        </div>
        {/* Unread message indicator on avatar */}
        {status.hasUnread && status.type !== 'unread' && (
          <div className="absolute -top-0.5 -right-0.5 w-3 h-3 sm:w-3.5 sm:h-3.5 bg-blue-500 rounded-full ring-2 ring-background" />
        )}
      </div>

      {/* Name + subtitle */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <h3 className="text-sm sm:text-[15px] font-semibold truncate leading-tight">
            {client.name}
          </h3>
          <span
            className={cn('w-2 h-2 rounded-full flex-shrink-0', dotColor)}
            aria-label={`Status: ${status.label}`}
            title={status.label}
          />
        </div>

        {subtitleParts.length > 0 && (
          <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5 leading-snug">
            {subtitleParts.join(' · ')}
          </p>
        )}
      </div>

      {/* Chevron — slightly larger touch-friendly area */}
      <div className="flex-shrink-0 pl-1">
        <svg
          className="w-4 h-4 text-muted-foreground/40"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 5l7 7-7 7"
          />
        </svg>
      </div>
    </div>
  );
}
