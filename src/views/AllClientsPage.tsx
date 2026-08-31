import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCoachDashboard } from '@/hooks/api/useCoachDashboard';
import { usePastClients } from '@/hooks/api/useCoachClients';
import { useUnreadMessages } from '@/hooks/api/useUnreadMessages';
import type { DashboardClient } from '@/types/api';
import { CoachNav } from '@/components/coach/CoachNav';
import { PageHeader } from '@/components/coach/PageHeader';
import { InviteClientModal } from '@/components/coach/InviteClientModal';
import { EmptyStateNoClients, LoadErrorState } from '@/components/coach/EmptyStates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Loader2, Plus, Search } from 'lucide-react';
import {
  urgencyStyle,
  getSignal,
  avatarColor,
  SignalLine,
  ChevronIcon,
  UnreadChip,
} from '@/components/coach/shared/clientSignals';

function ClientRow({ client, unreadCount }: { client: DashboardClient; unreadCount: number }) {
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
          <UnreadChip count={unreadCount} />
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
  const router = useRouter();
  const { clients, isLoading, error, refresh } = useCoachDashboard();
  const { pastClients } = usePastClients();
  const { threads } = useUnreadMessages();
  const unreadByUserId = useMemo(
    () => new Map(threads.map((thread) => [thread.userId, thread.count])),
    [threads]
  );
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState<'urgency' | 'name'>('urgency');

  // Client-side search & sort — the roster arrives whole, so this stays
  // instant; the API's urgency order is the default
  const visibleClients = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? clients.filter(
          (c) =>
            (c.user.name ?? '').toLowerCase().includes(q) ||
            c.user.email.toLowerCase().includes(q)
        )
      : clients;
    if (sortMode === 'name') {
      return [...filtered].sort((a, b) =>
        (a.user.name || a.user.email).localeCompare(b.user.name || b.user.email)
      );
    }
    return filtered;
  }, [clients, query, sortMode]);

  return (
    <div className="min-h-dvh bg-background pb-24 sm:pb-4">
      <CoachNav activeTab="clients" />

      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 px-3 pt-3 sm:px-4 sm:pt-7">

        <div className="animate-enter mb-1.5 sm:mb-3">
          <PageHeader
            title="Clients"
            subtitle={
              clients.length > 0
                ? query.trim()
                  ? `${visibleClients.length} of ${clients.length} ${clients.length === 1 ? 'client' : 'clients'}`
                  : `${clients.length} ${clients.length === 1 ? 'client' : 'clients'}`
                : undefined
            }
            action={
              // Hidden while the roster is empty — the empty state carries its own invite CTA
              clients.length > 0 ? (
                <Button size="sm" variant="outline" onClick={() => setShowInviteModal(true)} className="active:scale-[0.96] transition-transform duration-150">
                  <Plus className="w-4 h-4 mr-1.5" />
                  Invite Client
                </Button>
              ) : undefined
            }
          />
        </div>

        {/* Search + sort — instant, client-side */}
        {!isLoading && clients.length > 0 && (
          <div className="animate-enter flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search clients…"
                aria-label="Search clients by name or email"
                className="pl-9"
              />
            </div>
            <div className="flex gap-1 shrink-0" role="group" aria-label="Sort clients">
              {([
                { mode: 'urgency' as const, label: 'Urgency' },
                { mode: 'name' as const, label: 'A–Z' },
              ]).map(({ mode, label }) => (
                <Button
                  key={mode}
                  size="sm"
                  variant={sortMode === mode ? 'secondary' : 'ghost'}
                  onClick={() => setSortMode(mode)}
                  className={cn('tap-target', sortMode !== mode && 'text-muted-foreground')}
                  aria-pressed={sortMode === mode}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12 animate-enter">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : error && clients.length === 0 ? (
          // A failed fetch must never masquerade as an empty roster
          <LoadErrorState
            kicker="Clients · Signal lost"
            title="Couldn't load your clients"
            onRetry={() => refresh()}
          />
        ) : clients.length === 0 ? (
          <EmptyStateNoClients onInvite={() => setShowInviteModal(true)} />
        ) : visibleClients.length === 0 ? (
          <div className="text-center py-10 animate-enter space-y-2">
            <p className="text-sm font-medium antialiased">No clients match &ldquo;{query.trim()}&rdquo;</p>
            <button
              onClick={() => setQuery('')}
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors tap-target"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="bg-card rounded-xl divide-y divide-border overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.03),0_0_0_1px_rgba(0,0,0,0.04)] animate-enter">
            {visibleClients.map((client) => (
              <ClientRow
                key={client.clientProfileId}
                client={client}
                unreadCount={unreadByUserId.get(client.user.id) ?? 0}
              />
            ))}
          </div>
        )}

        {/* The archive lives on its own page — just a quiet pointer here,
            so the roster stays a roster no matter how much history piles up */}
        {pastClients.length > 0 && (
          <div className="animate-enter flex justify-center pt-4">
            <button
              onClick={() => router.push('/coach/clients/past')}
              className="text-xs text-muted-foreground/70 hover:text-foreground transition-colors tap-target antialiased"
            >
              Past clients ({pastClients.length})
            </button>
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
