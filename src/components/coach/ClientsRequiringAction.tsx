import { useNavigate } from 'react-router-dom';
import { Client, Message, CheckIn } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Clock, MessageSquare, CheckCircle2, ClipboardCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ClientsRequiringActionProps {
  clients: Client[];
  messages: Message[];
  checkIns: CheckIn[];
  onSelectClient: (clientId: string) => void;
  onViewChat: () => void;
}

export function ClientsRequiringAction({
  clients,
  messages,
  checkIns,
  onSelectClient,
  onViewChat
}: ClientsRequiringActionProps) {
  const navigate = useNavigate();

  const getClientStatus = (client: Client) => {
    const lastCheckIn = client.lastCheckInDate ? new Date(client.lastCheckInDate) : null;
    const daysSinceCheckIn = lastCheckIn
      ? Math.floor((Date.now() - lastCheckIn.getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    const unreadMessages = messages.filter(
      (m) => m.senderId === client.id && !m.read
    ).length;

    const pendingCheckIn = checkIns?.find(
      (c) => c.clientId === client.id && c.status === 'pending'
    );

    // Priority order (per PRD): Pending check-in > At risk > Check-in overdue > Awaiting response
    // "At risk" is highest urgency because we can still prevent them from becoming overdue

    if (pendingCheckIn) {
      return {
        type: 'pending-checkin' as const,
        icon: ClipboardCheck,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50 dark:bg-purple-950/20',
        borderColor: 'border-purple-200 dark:border-purple-900',
        label: 'Check-in Ready to Review',
        priority: 0,
        hasUnread: false,
        checkIn: pendingCheckIn
      };
    }

    if (daysSinceCheckIn >= 5 && daysSinceCheckIn < 7) {
      return {
        type: 'at-risk' as const,
        icon: Clock,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50 dark:bg-yellow-950/20',
        borderColor: 'border-yellow-200 dark:border-yellow-900',
        label: 'At Risk',
        priority: 1,
        hasUnread: unreadMessages > 0
      };
    }

    if (daysSinceCheckIn >= 7) {
      return {
        type: 'overdue' as const,
        icon: AlertCircle,
        color: 'text-red-600',
        bgColor: 'bg-red-50 dark:bg-red-950/20',
        borderColor: 'border-red-200 dark:border-red-900',
        label: 'Check-in Overdue',
        priority: 2,
        hasUnread: unreadMessages > 0
      };
    }

    if (unreadMessages > 0) {
      return {
        type: 'unread' as const,
        icon: MessageSquare,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50 dark:bg-blue-950/20',
        borderColor: 'border-blue-200 dark:border-blue-900',
        label: `${unreadMessages} Unread`,
        priority: 3,
        hasUnread: true
      };
    }

    return {
      type: 'ok' as const,
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-background',
      borderColor: 'border-border',
      label: 'All caught up',
      priority: 4,
      hasUnread: false
    };
  };

  const clientsWithStatus = clients.map((client) => ({
    client,
    status: getClientStatus(client)
  }));

  const clientsNeedingAction = clientsWithStatus
    .filter((c) => c.status.priority <= 3)
    .sort((a, b) => a.status.priority - b.status.priority);

  const clientsAllCaughtUp = clientsWithStatus.filter((c) => c.status.priority === 4);

  const handleClientAction = (clientId: string, statusType: string) => {
    // All actions now go to check-in page
    navigate(`/coach/client/${clientId}/check-in`);
  };

  return (
    <div className="space-y-4">
      {clientsNeedingAction.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Clients Requiring Action</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {clientsNeedingAction.map(({ client, status }) => (
                <div
                  key={client.id}
                  className={`p-4 rounded-lg border-2 ${status.bgColor} ${status.borderColor}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="text-2xl">{client.avatar}</div>
                      <div className="flex-1">
                        <p className="font-medium">{client.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <status.icon className={`w-3 h-3 ${status.color}`} />
                          <span className={`text-xs font-medium ${status.color}`}>
                            {status.label}
                          </span>
                          {status.type === 'pending-checkin' && 'checkIn' in status && status.checkIn && (
                            <span className="text-xs text-muted-foreground">
                              • Submitted{' '}
                              {formatDistanceToNow(new Date(status.checkIn.date), {
                                addSuffix: true
                              })}
                            </span>
                          )}
                          {status.type !== 'pending-checkin' && client.lastCheckInDate && (
                            <span className="text-xs text-muted-foreground">
                              • Last check-in{' '}
                              {formatDistanceToNow(new Date(client.lastCheckInDate), {
                                addSuffix: true
                              })}
                            </span>
                          )}
                        </div>
                        {status.type === 'pending-checkin' && 'checkIn' in status && status.checkIn?.notes && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                            "{status.checkIn.notes}"
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant={status.type === 'pending-checkin' || status.type === 'overdue' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleClientAction(client.id, status.type)}
                    >
                      {status.type === 'pending-checkin'
                        ? 'Review Check-in'
                        : status.type === 'overdue' || status.type === 'at-risk'
                        ? 'Send Reminder'
                        : status.hasUnread
                        ? 'Review & Respond'
                        : 'View'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {clientsAllCaughtUp.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              All Caught Up
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {clientsAllCaughtUp.map(({ client }) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-background"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{client.avatar}</div>
                    <div>
                      <p className="font-medium">{client.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Last check-in{' '}
                        {client.lastCheckInDate
                          ? formatDistanceToNow(new Date(client.lastCheckInDate), {
                              addSuffix: true
                            })
                          : 'never'}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleClientAction(client.id, 'ok')}
                  >
                    View
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
