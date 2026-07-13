import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCoachDashboard } from '@/hooks/api/useCoachDashboard';
import { usePastClients } from '@/hooks/api/useCoachClients';
import type { DashboardClient, PastClient } from '@/types/api';
import { CoachNav } from '@/components/coach/CoachNav';
import { PageHeader } from '@/components/coach/PageHeader';
import { InviteClientModal } from '@/components/coach/InviteClientModal';
import { EmptyStateNoClients } from '@/components/coach/EmptyStates';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ChevronRight, Loader2, Plus, RotateCcw } from 'lucide-react';
import {
  urgencyStyle,
  getSignal,
  avatarColor,
  SignalLine,
  ChevronIcon,
} from '@/components/coach/shared/clientSignals';

function ClientRow({ client }: { client: DashboardClient }) {
  const router = useRouter();
  const style = urgencyStyle(client.urgency);
  const signal = getSignal(client);
  const displayName = client.user.name || client.user.email;

  return (
    <div
      onClick={() => router.push(`/coach/clients/${client.clientProfileId}`)}
      className="flex items-center gap-3 sm:gap-4 py-3.5 px-3 sm:py-4 sm:px-4 hover:bg-muted/50 active:bg-muted/70 active:scale-[0.995] transition-[background-color,transform] duration-150 cursor-pointer"
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          router.push(`/coach/clients/${client.clientProfileId}`);
        }
      }}
    >
      <div className={cn(
        'w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center select-none text-sm sm:text-base font-bold flex-shrink-0',
        avatarColor(displayName),
        client.urgency === 'ON_TRACK' && 'opacity-90'
      )}>
        {displayName.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <h3 className="text-sm sm:text-[15px] font-semibold truncate leading-tight">
            {displayName}
          </h3>
          <span
            className={cn(
              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium leading-none whitespace-nowrap flex-shrink-0',
              style.chip
            )}
          >
            <span className={cn('w-1.5 h-1.5 rounded-full', style.dot)} />
            {style.label}
          </span>
        </div>
        {signal.lead || signal.rest.length > 0 ? (
          <SignalLine signal={signal} />
        ) : (
          <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5 leading-snug">
            {client.user.email}
          </p>
        )}
      </div>
      <div className="flex-shrink-0 pl-1">
        <ChevronIcon />
      </div>
    </div>
  );
}

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
          {client.endedAt ? ` ${format(new Date(client.endedAt), 'MMM d')}` : ''}
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

export function AllClientsPage() {
  const { clients, isLoading, refresh: refreshDashboard } = useCoachDashboard();
  const { pastClients, refresh: refreshPast } = usePastClients();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showPast, setShowPast] = useState(false);
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
            title="Clients"
            subtitle={clients.length > 0 ? `${clients.length} ${clients.length === 1 ? 'client' : 'clients'}` : undefined}
            action={
              <Button size="sm" variant="outline" onClick={() => setShowInviteModal(true)} className="active:scale-[0.96] transition-transform duration-150">
                <Plus className="w-4 h-4 mr-1.5" />
                Invite Client
              </Button>
            }
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 animate-enter">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : clients.length === 0 ? (
          <EmptyStateNoClients />
        ) : (
          <div className="bg-card rounded-xl divide-y divide-border overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.03),0_0_0_1px_rgba(0,0,0,0.04)] animate-enter">
            {clients.map((client) => (
              <ClientRow key={client.clientProfileId} client={client} />
            ))}
          </div>
        )}

        {/* Past clients — the archive. Collapsed by default: history, not roster */}
        {pastClients.length > 0 && (
          <div className="animate-enter pt-2">
            <button
              onClick={() => setShowPast((v) => !v)}
              aria-expanded={showPast}
              className="flex items-center gap-1.5 px-1 pb-2.5 font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground font-medium antialiased hover:text-foreground transition-colors tap-target"
            >
              <ChevronRight
                className={cn('w-3.5 h-3.5 transition-transform duration-150', showPast && 'rotate-90')}
                aria-hidden="true"
              />
              Past clients
              <span className="tabular-nums">({pastClients.length})</span>
            </button>
            {showPast && (
              <div className="bg-card rounded-xl divide-y divide-border overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.03),0_0_0_1px_rgba(0,0,0,0.04)]">
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
        )}
      </div>

      <InviteClientModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
      />
    </div>
  );
}
