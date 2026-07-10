import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCoachDashboard } from '@/hooks/api/useCoachDashboard';
import type { DashboardClient } from '@/types/api';
import { CoachNav } from '@/components/coach/CoachNav';
import { PageHeader } from '@/components/coach/PageHeader';
import { InviteClientModal } from '@/components/coach/InviteClientModal';
import { EmptyStateNoClients } from '@/components/coach/EmptyStates';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Loader2, Plus } from 'lucide-react';
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

export function AllClientsPage() {
  const { clients, isLoading } = useCoachDashboard();
  const [showInviteModal, setShowInviteModal] = useState(false);

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
      </div>

      <InviteClientModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
      />
    </div>
  );
}
