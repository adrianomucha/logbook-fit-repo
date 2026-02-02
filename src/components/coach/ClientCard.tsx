import { Client } from '@/types';
import { ClientStatus } from '@/lib/client-status';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

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
      case 'awaiting-response':
        navigate(`/coach/client/${client.id}/check-in`);
        break;
      case 'at-risk-workouts':
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
      case 'awaiting-response': return 'Respond to Check-in';
      case 'at-risk-workouts': return 'Send Workout Reminder';
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
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Avatar */}
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl flex-shrink-0">
              {client.avatar || client.name.charAt(0)}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold">{client.name}</h3>

              <div className="flex items-center gap-2 mt-1">
                <status.icon className={`w-4 h-4 ${status.color}`} />
                <span className="text-sm text-muted-foreground">{status.label}</span>
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
            variant={variant === 'needs-attention' ? 'default' : 'ghost'}
            size="sm"
            className="flex-shrink-0"
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
