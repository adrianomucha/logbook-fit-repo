import { Client, WorkoutPlan } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
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
  const { lastMessage } = interactions;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent Messages</CardTitle>
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
          <div className="flex items-center gap-3">
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground flex-1">No messages yet</p>
            <Button variant="ghost" size="sm" onClick={onViewMessages}>
              Send
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
