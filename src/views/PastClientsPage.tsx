import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePastClients } from '@/hooks/api/useCoachClients';
import { useCoachDashboard } from '@/hooks/api/useCoachDashboard';
import type { PastClient } from '@/types/api';
import { CoachNav } from '@/components/coach/CoachNav';
import { PageHeader } from '@/components/coach/PageHeader';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Loader2, RotateCcw } from 'lucide-react';
import { avatarColor } from '@/components/coach/shared/clientSignals';

function PastClientRow({
  client,
  onRestore,
  isRestoring,
}: {
  client: PastClient;
  onRestore: () => void;
  isRestoring: boolean;
}) {
  const displayName = client.user.name || client.user.email;
  const leftThemselves = client.endedBy === 'CLIENT';

  return (
    <div className="flex items-center gap-3 sm:gap-4 py-3.5 px-3 sm:py-4 sm:px-4">
      <div
        className={cn(
          'w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center select-none text-sm sm:text-base font-bold flex-shrink-0 opacity-50',
          avatarColor(displayName)
        )}
      >
        {displayName.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm sm:text-[15px] font-semibold truncate leading-tight text-muted-foreground">
          {displayName}
        </h3>
        <p className="text-xs sm:text-sm text-muted-foreground/80 truncate mt-0.5 leading-snug">
          {leftThemselves ? 'Left' : 'Ended'}
          {client.endedAt ? ` ${format(new Date(client.endedAt), 'MMM d, yyyy')}` : ''}
          {leftThemselves ? ' · can rejoin with a new invite' : ''}
        </p>
      </div>
      {!leftThemselves && (
        <Button
          size="sm"
          variant="outline"
          onClick={onRestore}
          disabled={isRestoring}
          className="shrink-0 active:scale-[0.96] transition-transform duration-150"
        >
          {isRestoring ? (
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
          ) : (
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
          )}
          Restore
        </Button>
      )}
    </div>
  );
}

export function PastClientsPage() {
  const router = useRouter();
  const { pastClients, isLoading, refresh: refreshPast } = usePastClients();
  const { refresh: refreshDashboard } = useCoachDashboard();
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const handleRestore = async (client: PastClient) => {
    if (restoringId) return;
    setRestoringId(client.clientProfileId);
    try {
      const result = await apiFetch<{ planRestored: boolean }>(
        `/api/coach/clients/${client.clientProfileId}/restore`,
        { method: 'POST' }
      );
      toast.success(
        `${client.user.name ?? client.user.email} is back on your roster${
          result.planRestored ? ' with their plan' : ''
        }`
      );
      await Promise.all([refreshDashboard(), refreshPast()]);
    } catch {
      toast.error('Failed to restore this client. Please try again.');
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div className="min-h-dvh bg-background pb-24 sm:pb-4">
      <CoachNav activeTab="clients" />

      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 px-3 pt-3 sm:px-4 sm:pt-7">
        <div className="animate-enter mb-1.5 sm:mb-3">
          <PageHeader
            title="Past clients"
            subtitle={
              pastClients.length > 0
                ? `${pastClients.length} ended ${pastClients.length === 1 ? 'relationship' : 'relationships'} — nothing here is deleted`
                : undefined
            }
            breadcrumb={{ label: 'Clients', onClick: () => router.push('/coach/clients') }}
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 animate-enter">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : pastClients.length === 0 ? (
          <div className="bg-card rounded-xl overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.03),0_0_0_1px_rgba(0,0,0,0.04)] animate-enter">
            <div className="text-center py-12 px-6">
              <div className="text-4xl select-none mb-4">📁</div>
              <h2 className="text-lg font-bold mb-1.5 tracking-tight antialiased">No past clients</h2>
              <p className="text-sm text-muted-foreground antialiased">
                When a coaching relationship ends, it lands here — with its
                history intact and a way back.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-xl divide-y divide-border overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.03),0_0_0_1px_rgba(0,0,0,0.04)] animate-enter">
            {pastClients.map((client) => (
              <PastClientRow
                key={client.clientProfileId}
                client={client}
                onRestore={() => handleRestore(client)}
                isRestoring={restoringId === client.clientProfileId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
