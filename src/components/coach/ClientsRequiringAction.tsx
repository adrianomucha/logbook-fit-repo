import { useNavigate } from 'react-router-dom';
import { Client, Message, CheckIn, CompletedWorkout, WorkoutPlan } from '@/types';
import { getClientStatus } from '@/lib/client-status';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface ClientsRequiringActionProps {
  clients: Client[];
  messages: Message[];
  checkIns: CheckIn[];
  completedWorkouts: CompletedWorkout[];
  plans: WorkoutPlan[];
  onSelectClient: (clientId: string) => void;
}

export function ClientsRequiringAction({
  clients,
  messages,
  checkIns,
  completedWorkouts,
  plans,
  onSelectClient
}: ClientsRequiringActionProps) {
  const navigate = useNavigate();

  const clientsWithStatus = clients.map((client) => ({
    client,
    status: getClientStatus(client, messages, checkIns)
  }));

  // Only clients that actually need action (not 'ok')
  const clientsNeedingAction = clientsWithStatus
    .filter((c) => c.status.type !== 'ok')
    .sort((a, b) => a.status.priority - b.status.priority);

  // Clients with no action needed
  const clientsAllCaughtUp = clientsWithStatus.filter((c) => c.status.type === 'ok');

  const handleClientAction = (clientId: string, statusType: string) => {
    if (statusType === 'pending-checkin') {
      navigate(`/coach/client/${clientId}/check-in`);
      return;
    }
    const tab = statusType === 'unread' ? 'messages' : 'overview';
    navigate(`/coach/clients/${clientId}?tab=${tab}`);
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
                  className={`p-3 sm:p-4 rounded-lg border-2 ${status.bgColor} ${status.borderColor}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="text-xl sm:text-2xl shrink-0">{client.avatar}</div>
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/coach/clients/${client.id}`);
                          }}
                          className="font-medium truncate text-left hover:underline hover:text-primary transition-colors cursor-pointer"
                        >
                          {client.name}
                        </button>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <status.icon className={`w-3 h-3 shrink-0 ${status.color}`} />
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
                        {status.type === 'pending-checkin' && 'checkIn' in status && status.checkIn?.clientNotes && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
                            "{status.checkIn.clientNotes.length > 60 ? status.checkIn.clientNotes.slice(0, 60) + '…' : status.checkIn.clientNotes}"
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant={
                        status.type === 'overdue' || status.type === 'at-risk'
                          ? 'outline'
                          : 'default'
                      }
                      size="sm"
                      className={cn(
                        'w-full sm:w-auto shrink-0',
                        (status.type === 'overdue' || status.type === 'at-risk') &&
                          'border-amber-500 text-amber-700 hover:bg-amber-50 dark:border-amber-600 dark:text-amber-400 dark:hover:bg-amber-950/30'
                      )}
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

      {clientsNeedingAction.length === 0 && (
        <Card>
          <CardContent className="py-6 text-center">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <CheckCircle2 className="w-5 h-5" />
              <p className="text-sm">All clients on track</p>
            </div>
          </CardContent>
        </Card>
      )}

      {clientsAllCaughtUp.length > 0 && clientsNeedingAction.length > 0 && (
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
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 p-3 rounded-lg border bg-background"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="text-xl sm:text-2xl shrink-0">{client.avatar}</div>
                    <div className="min-w-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/coach/clients/${client.id}`);
                        }}
                        className="font-medium truncate text-left hover:underline hover:text-primary transition-colors cursor-pointer"
                      >
                        {client.name}
                      </button>
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
                    className="w-full sm:w-auto shrink-0"
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
