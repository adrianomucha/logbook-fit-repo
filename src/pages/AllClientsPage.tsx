import { AppState } from '@/types';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getClientStatus } from '@/lib/client-status';
import { getClientSnippet } from '@/lib/snippet-helpers';
import { calculateNextCheckIn } from '@/lib/checkin-helpers';
import { ClientCard } from '@/components/coach/ClientCard';
import { EmptyStateNoClients, EmptyStateNoneNeedAttention, EmptyStateAllNeedAttention } from '@/components/coach/EmptyStates';
import { Button } from '@/components/ui/button';
import { Home, Users, Dumbbell, AlertTriangle, CheckCircle } from 'lucide-react';

interface AllClientsPageProps {
  appState: AppState;
  onUpdateState: (updater: (state: AppState) => AppState) => void;
}

export function AllClientsPage({ appState, onUpdateState }: AllClientsPageProps) {
  const navigate = useNavigate();

  // Compute client statuses
  const clientsWithStatus = useMemo(() => {
    return appState.clients.map(client => ({
      client,
      status: getClientStatus(
        client,
        appState.messages,
        appState.checkIns
      )
    }));
  }, [appState.clients, appState.messages, appState.checkIns, appState.completedWorkouts, appState.plans]);

  // Group by attention state
  const needsAttention = useMemo(() => {
    return clientsWithStatus
      .filter(c => c.status.priority <= 5)  // All non-OK statuses
      .sort((a, b) => a.status.priority - b.status.priority);
  }, [clientsWithStatus]);

  const onTrack = useMemo(() => {
    return clientsWithStatus
      .filter(c => c.status.priority === 6)  // OK status only
      .sort((a, b) => a.client.name.localeCompare(b.client.name));
  }, [clientsWithStatus]);

  // Empty state: no clients at all
  if (clientsWithStatus.length === 0) {
    return (
      <div className="min-h-screen bg-background p-3 sm:p-4">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold">Coach Dashboard</h1>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => navigate('/coach')}
                className="flex-1 sm:flex-none"
                size="sm"
              >
                <Home className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Dashboard</span>
              </Button>
              <Button variant="default" className="flex-1 sm:flex-none" size="sm">
                <Users className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Clients</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/coach?view=plans')}
                className="flex-1 sm:flex-none"
                size="sm"
              >
                <Dumbbell className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Plans</span>
              </Button>
            </div>
          </div>
          <EmptyStateNoClients />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header with Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold">Coach Dashboard</h1>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => navigate('/coach')}
              className="flex-1 sm:flex-none"
              size="sm"
            >
              <Home className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Dashboard</span>
            </Button>
            <Button variant="default" className="flex-1 sm:flex-none" size="sm">
              <Users className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Clients</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/coach?view=plans')}
              className="flex-1 sm:flex-none"
              size="sm"
            >
              <Dumbbell className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Plans</span>
            </Button>
          </div>
        </div>

        {/* NEEDS ATTENTION Section */}
        {needsAttention.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <h2 className="text-xl font-semibold">
                NEEDS ATTENTION
              </h2>
              <span className="text-sm text-muted-foreground">({needsAttention.length})</span>
            </div>
            <div className="space-y-3">
              {needsAttention.map(({ client, status }) => (
                <ClientCard
                  key={client.id}
                  client={client}
                  status={status}
                  variant="needs-attention"
                  snippet={getClientSnippet(client, status, appState)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Empty: None need attention */}
        {needsAttention.length === 0 && (
          <EmptyStateNoneNeedAttention />
        )}

        {/* ON TRACK Section */}
        {onTrack.length > 0 && (
          <section className="opacity-90">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h2 className="text-lg font-medium text-muted-foreground">
                ON TRACK
              </h2>
              <span className="text-sm text-muted-foreground">({onTrack.length})</span>
            </div>
            <div className="space-y-3">
              {onTrack.map(({ client, status }) => (
                <ClientCard
                  key={client.id}
                  client={client}
                  status={status}
                  variant="on-track"
                  nextCheckInDate={calculateNextCheckIn(client)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Empty: All need attention */}
        {onTrack.length === 0 && needsAttention.length > 0 && (
          <EmptyStateAllNeedAttention />
        )}
      </div>
    </div>
  );
}
