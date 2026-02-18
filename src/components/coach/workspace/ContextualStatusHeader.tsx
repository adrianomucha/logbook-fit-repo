import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Client, CheckIn } from '@/types';
import { ClientStatus } from '@/lib/client-status';
import { formatDistanceToNow } from 'date-fns';
import { FEELING_LABELS } from '@/lib/checkin-helpers';

interface ContextualStatusHeaderProps {
  client: Client;
  status: ClientStatus;
  lastCheckIn?: CheckIn | null;
  respondedCheckIn?: CheckIn | null;
  activeCheckIn?: CheckIn | null;
  onScrollToCheckIn: () => void;
  onStartCheckIn: () => void;
}

export function ContextualStatusHeader({
  client,
  status,
  lastCheckIn,
  respondedCheckIn,
  activeCheckIn,
  onScrollToCheckIn,
  onStartCheckIn,
}: ContextualStatusHeaderProps) {
  // Calculate days since last check-in
  const daysSinceCheckIn = client.lastCheckInDate
    ? Math.floor(
        (Date.now() - new Date(client.lastCheckInDate).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  // Truncate text helper
  const truncate = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + '...';
  };

  // Get contextual message based on status
  const getStatusContext = () => {
    switch (status.type) {
      case 'overdue':
        return (
          <p className="text-sm mt-1">
            {daysSinceCheckIn} days since last check-in.
            {lastCheckIn?.clientNotes && (
              <span className="text-muted-foreground">
                {' '}Last note: "{truncate(lastCheckIn.clientNotes, 50)}"
              </span>
            )}
          </p>
        );

      case 'at-risk':
        return (
          <p className="text-sm mt-1">
            {7 - (daysSinceCheckIn || 0)} days until overdue.
            {client.lastWorkoutDate && (
              <span className="text-muted-foreground">
                {' '}Last workout: {formatDistanceToNow(new Date(client.lastWorkoutDate), { addSuffix: true })}
              </span>
            )}
          </p>
        );

      // Note: Removed 'pending-checkin' case per Fix 17.
      // The pending check-in is already visible in the InlineCheckInReview component below,
      // so showing a banner here is redundant. Falls through to return null.

      case 'unread':
        return (
          <p className="text-sm mt-1 text-muted-foreground">
            New messages waiting for your response
          </p>
        );

      case 'ok':
        return (
          <p className="text-sm mt-1 text-muted-foreground">
            Everything is up to date with {client.name.split(' ')[0]}
          </p>
        );

      default:
        return null;
    }
  };

  // Get action button config
  const getActionButton = () => {
    switch (status.type) {
      // Note: Removed 'pending-checkin' case per Fix 17.
      // The check-in review UI is already visible in InlineCheckInReview below.
      case 'overdue':
      case 'at-risk':
        // Disable the button if there's already an active check-in
        const hasActiveCheckIn = !!activeCheckIn;
        return {
          label: hasActiveCheckIn ? 'Check-In Sent' : 'Send Check-In',
          onClick: onStartCheckIn,
          variant: 'default' as const,
          disabled: hasActiveCheckIn,
        };
      case 'unread':
        return {
          label: 'View Messages',
          onClick: onScrollToCheckIn,
          variant: 'outline' as const,
          disabled: false,
        };
      default:
        return null;
    }
  };

  const actionButton = getActionButton();
  const StatusIcon = status.icon;

  return (
    <Card className={cn(status.bgColor, status.borderColor, 'border')}>
      <CardContent className="py-3 sm:py-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={cn(
                'p-2 rounded-full shrink-0',
                status.type === 'ok' ? 'bg-green-100 dark:bg-green-900/30' : ''
              )}
            >
              <StatusIcon className={cn('w-5 h-5', status.color)} />
            </div>
            <div className="min-w-0">
              <h3 className={cn('font-semibold', status.color)}>
                {status.label}
              </h3>
              {getStatusContext()}
            </div>
          </div>

          {actionButton && (
            <Button
              variant={actionButton.variant}
              size="sm"
              onClick={actionButton.onClick}
              disabled={actionButton.disabled}
              className="shrink-0 w-full sm:w-auto"
            >
              {actionButton.label}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
