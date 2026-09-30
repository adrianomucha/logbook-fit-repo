import { UserAvatar } from '@/components/UserAvatar';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DashboardClient } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUnreadMessages } from '@/hooks/api/useUnreadMessages';
import { usePastClients } from '@/hooks/api/useCoachClients';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ROSTER_COPY,
  rosterAction,
  splitRoster,
  type RosterAction,
} from '@logbook/shared/roster';
import {
  urgencyStyle,
  getSignal,
  SignalLine,
  ChevronIcon,
  UnreadChip,
} from '@/components/coach/shared/clientSignals';

const CARD =
  'bg-card rounded-xl divide-y divide-border overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.03),0_0_0_1px_rgba(0,0,0,0.04)]';

function SampleChip() {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-dashed border-border font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.1em] text-muted-foreground leading-none whitespace-nowrap flex-shrink-0">
      Sample
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="px-1 pb-2.5 font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground font-medium antialiased">
      {children}
    </h2>
  );
}

function hrefFor(client: DashboardClient, action: RosterAction | null): string {
  const profile = `/coach/clients/${client.clientProfileId}`;
  if (action?.target === 'check-in') return `${profile}/check-in`;
  if (action?.target === 'chat') return `${profile}?chat=1`;
  return profile;
}

function RosterRow({ client, unreadCount }: { client: DashboardClient; unreadCount: number }) {
  const router = useRouter();
  const style = urgencyStyle(client.urgency);
  const action = rosterAction(client, unreadCount);
  const href = hrefFor(client, action);
  const displayName = client.user.name || client.user.email;
  const signal = getSignal(client);

  return (
    <div
      onClick={() => router.push(href)}
      className="flex items-center gap-3 sm:gap-4 py-3 px-3 sm:py-3.5 sm:px-4 hover:bg-muted/50 active:bg-muted/70 active:scale-[0.995] transition-[background-color,transform] duration-150 cursor-pointer"
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          router.push(href);
        }
      }}
    >
      <UserAvatar
        name={displayName}
        avatarUrl={client.user.avatarUrl}
        className="w-10 h-10 sm:w-11 sm:h-11 text-sm sm:text-base"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <h3 className="text-sm sm:text-[15px] font-semibold truncate leading-tight">
            {displayName}
          </h3>
          {client.isSample && <SampleChip />}
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
      {/* Outline, not solid: a column of black buttons outshouts the names */}
      {action && (
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 hidden sm:inline-flex"
          onClick={(e) => {
            e.stopPropagation();
            router.push(href);
          }}
        >
          {action.label}
        </Button>
      )}
      <div className={cn('flex-shrink-0 pl-1', action && 'sm:hidden')}>
        <ChevronIcon />
      </div>
    </div>
  );
}

interface ClientRosterProps {
  clients: DashboardClient[];
}

/**
 * The coach's home: the whole roster in one list. Clients waiting on the
 * coach lead under "To do" with their next action; everyone else follows.
 * Search and A–Z sort for finding someone specific.
 */
export function ClientRoster({ clients }: ClientRosterProps) {
  const router = useRouter();
  const { pastClients } = usePastClients();
  const { threads } = useUnreadMessages();
  const unreadByUserId = useMemo(
    () => new Map(threads.map((thread) => [thread.userId, thread.count])),
    [threads]
  );
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

  const groups = useMemo(
    () => splitRoster(visibleClients, unreadByUserId),
    [visibleClients, unreadByUserId]
  );

  const renderRows = (list: DashboardClient[]) => (
    <div className={CARD}>
      {list.map((client) => (
        <RosterRow
          key={client.clientProfileId}
          client={client}
          unreadCount={unreadByUserId.get(client.user.id) ?? 0}
        />
      ))}
    </div>
  );

  const isSearching = query.trim().length > 0;

  return (
    <div className="space-y-6">
      {/* Search + sort — instant, client-side */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
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

      {visibleClients.length === 0 ? (
        <div className="text-center py-10 space-y-2">
          <p className="text-sm font-medium antialiased">No clients match &ldquo;{query.trim()}&rdquo;</p>
          <button
            onClick={() => setQuery('')}
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors tap-target"
          >
            Clear search
          </button>
        </div>
      ) : sortMode === 'name' ? (
        // Alphabetical is for finding someone — one flat list, actions intact
        renderRows(visibleClients)
      ) : (
        <>
          {groups.toDo.length > 0 ? (
            <section>
              <SectionLabel>
                {ROSTER_COPY.toDo} · {groups.toDo.length}
              </SectionLabel>
              {renderRows(groups.toDo)}
            </section>
          ) : (
            !isSearching && (
              <p className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3.5 text-sm font-medium text-emerald-700 dark:text-emerald-300 antialiased">
                {ROSTER_COPY.allClear}
              </p>
            )
          )}
          {groups.rest.length > 0 && (
            <section>
              <SectionLabel>
                {ROSTER_COPY.rest} · {groups.rest.length}
              </SectionLabel>
              {renderRows(groups.rest)}
            </section>
          )}
        </>
      )}

      {/* The archive lives on its own page — just a quiet pointer here,
          so the roster stays a roster no matter how much history piles up */}
      {pastClients.length > 0 && (
        <div className="flex justify-center pt-2">
          <button
            onClick={() => router.push('/coach/clients/past')}
            className="text-xs text-muted-foreground/70 hover:text-foreground transition-colors tap-target antialiased"
          >
            Past clients ({pastClients.length})
          </button>
        </div>
      )}
    </div>
  );
}
