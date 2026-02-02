import { useNavigate } from 'react-router-dom';
import { Client, Message, CheckIn, CompletedWorkout, WorkoutPlan } from '@/types';
import { getClientStatus } from '@/lib/client-status';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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
    status: getClientStatus(
      client,
      messages,
      checkIns,
      completedWorkouts,
      plans.find(p => p.id === client.currentPlanId)
    )
  }));

  const clientsNeedingAction = clientsWithStatus
    .filter((c) => c.status.priority <= 5)
    .sort((a, b) => a.status.priority - b.status.priority);

  const clientsAllCaughtUp = clientsWithStatus.filter((c) => c.status.priority === 6);

  const handleClientAction = (clientId: string, statusType: string) => {
    // Navigate to unified client profile
    // Pending check-ins and overdue clients should see Overview tab with quick action to start check-in
    // Unread messages should switch to Messages tab
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
