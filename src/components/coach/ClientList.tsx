import { Client } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface ClientListProps {
  clients: Client[];
  onSelectClient: (clientId: string) => void;
  selectedClientId?: string;
}

export function ClientList({ clients, onSelectClient, selectedClientId }: ClientListProps) {
  const getAdherenceColor = (rate?: number) => {
    if (!rate) return 'bg-gray-200';
    if (rate >= 80) return 'bg-green-500';
    if (rate >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Clients</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {clients.map((client) => (
          <div
            key={client.id}
            onClick={() => onSelectClient(client.id)}
            className={`p-3 rounded-md border cursor-pointer transition-colors ${
              selectedClientId === client.id
                ? 'border-primary bg-accent'
                : 'border-border hover:bg-accent'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="text-2xl">{client.avatar}</div>
                <div>
                  <h4 className="font-medium">{client.name}</h4>
                  <p className="text-xs text-muted-foreground">{client.email}</p>
                  {client.lastWorkoutDate && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Last workout: {format(new Date(client.lastWorkoutDate), 'MMM d')}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                  {client.status}
                </Badge>
                {client.adherenceRate !== undefined && (
                  <div className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${getAdherenceColor(client.adherenceRate)}`} />
                    <span className="text-xs">{client.adherenceRate}%</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
