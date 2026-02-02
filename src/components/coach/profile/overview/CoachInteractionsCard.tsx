import { Client, WorkoutPlan } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, Dumbbell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { CoachInteractions } from '@/lib/client-activity';

interface CoachInteractionsCardProps {
  client: Client;
  plan: WorkoutPlan | undefined;
  interactions: CoachInteractions;
  onViewMessages: () => void;
  onEditPlan: () => void;
}

export function CoachInteractionsCard({
  client,
  plan,
  interactions,
  onViewMessages,
  onEditPlan
}: CoachInteractionsCardProps) {
  const { lastMessage, lastPlanEdit } = interactions;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent Interactions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Last message */}
        {lastMessage && (
          <div className="flex items-start gap-3">
            <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-1">
                Last message • {formatDistanceToNow(new Date(lastMessage.timestamp), { addSuffix: true })}
              </p>
              <p className="text-sm line-clamp-2">{lastMessage.content}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onViewMessages}>
              View
            </Button>
          </div>
        )}

        {!lastMessage && (
          <div className="flex items-start gap-3">
            <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">No messages sent yet</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onViewMessages}>
              Send
            </Button>
          </div>
        )}

        {/* Last plan edit */}
        {plan && lastPlanEdit && (
          <div className="flex items-start gap-3">
            <Dumbbell className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-1">
                Last plan update • {formatDistanceToNow(lastPlanEdit, { addSuffix: true })}
              </p>
              <p className="text-sm font-medium line-clamp-1">{plan.name}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onEditPlan}>
              Edit
            </Button>
          </div>
        )}

        {plan && !lastPlanEdit && (
          <div className="flex items-start gap-3">
            <Dumbbell className="w-4 h-4 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">{plan.name}</p>
              <p className="text-xs text-muted-foreground">Current plan</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onEditPlan}>
              Edit
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
