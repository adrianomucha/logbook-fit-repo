import { Client } from '@/types';
import { ClientStatus } from '@/lib/client-status';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClientCardProps {
  client: Client;
  status: ClientStatus;
  variant: 'needs-attention' | 'on-track';
  snippet?: string;
  nextCheckInDate?: string;
}

export function ClientCard({ client, status, variant, snippet, nextCheckInDate }: ClientCardProps) {
  const navigate = useNavigate();

  // Card click - always go to profile
  const handleCardClick = () => {
    navigate(`/coach/clients/${client.id}`);
  };

  // Button click - perform specific action based on status
  const handleButtonAction = () => {
    switch (status.type) {
      case 'pending-checkin':
        navigate(`/coach/client/${client.id}/check-in`);
        break;
      case 'at-risk':
      case 'overdue':
        navigate(`/coach/clients/${client.id}?tab=messages&action=remind`);
        break;
      case 'unread':
        navigate(`/coach/clients/${client.id}?tab=messages`);
        break;
      default:
        navigate(`/coach/clients/${client.id}`);
    }
  };

  const getButtonText = () => {
    switch (status.type) {
      case 'pending-checkin': return 'Review Check-in';
      case 'overdue': return 'Send Check-in Reminder';
      case 'at-risk': return 'Send Check-in Reminder';
      case 'unread': return 'Review Messages';
      default: return 'View Profile';
    }
  };

  const borderColor = variant === 'needs-attention' ? status.borderColor : 'border-green-200';
  const bgColor = variant === 'needs-attention' ? status.bgColor : 'bg-gray-50';

  return (
    <Card
      className={`border-l-4 ${borderColor} ${bgColor} cursor-pointer transition-shadow hover:shadow-md`}
      onClick={handleCardClick}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Avatar with unread indicator */}
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center text-xl sm:text-2xl">
                {client.avatar || client.name.charAt(0)}
              </div>
              {/* Show message badge when hasUnread and not already showing as unread status */}
              {status.hasUnread && status.type !== 'unread' && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                  <MessageSquare className="w-3 h-3 text-white" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold truncate">{client.name}</h3>

              <div className="flex items-center gap-2 mt-1">
                <status.icon className={`w-4 h-4 shrink-0 ${status.color}`} />
                <span className="text-sm text-muted-foreground truncate">{status.label}</span>
              </div>

              {/* Snippet (needs-attention only) */}
              {variant === 'needs-attention' && snippet && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                  {snippet}
                </p>
              )}

              {/* Next check-in (on-track only) */}
              {variant === 'on-track' && nextCheckInDate && (
                <p className="text-sm text-muted-foreground mt-1">
                  Next check-in: {nextCheckInDate}
                </p>
              )}
            </div>
          </div>

          {/* CTA Button */}
          <Button
            variant={
              status.type === 'overdue' || status.type === 'at-risk'
                ? 'outline'
                : variant === 'needs-attention'
                ? 'default'
                : 'ghost'
            }
            size="sm"
            className={cn(
              'flex-shrink-0 w-full sm:w-auto',
              (status.type === 'overdue' || status.type === 'at-risk') &&
                'border-amber-500 text-amber-700 hover:bg-amber-50 dark:border-amber-600 dark:text-amber-400 dark:hover:bg-amber-950/30'
            )}
            onClick={(e) => {
              e.stopPropagation();
              handleButtonAction();
            }}
          >
            {getButtonText()}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
