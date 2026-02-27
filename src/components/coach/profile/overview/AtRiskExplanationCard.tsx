import { Client } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Clock } from 'lucide-react';

interface AtRiskExplanationCardProps {
  client: Client;
  daysSinceCheckIn: number;
}

export function AtRiskExplanationCard({ client, daysSinceCheckIn }: AtRiskExplanationCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-warning" />
          Why is {client.name} at risk?
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span>No check-in submitted in {daysSinceCheckIn} days</span>
          </div>
          <p className="text-muted-foreground">
            Regular check-ins help you catch issues early and keep {client.name} motivated.
            Send a check-in to reconnect.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
