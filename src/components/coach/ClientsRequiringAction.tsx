import { useNavigate } from 'react-router-dom';
import { Client, Message, CheckIn, CompletedWorkout, WorkoutPlan } from '@/types';
import { getClientStatus, ClientStatus } from '@/lib/client-status';
import { calculateNextCheckIn } from '@/lib/checkin-helpers';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ClientsRequiringActionProps {
  clients: Client[];
  messages: Message[];
  checkIns: CheckIn[];
  completedWorkouts: CompletedWorkout[];
  plans: WorkoutPlan[];
  onSelectClient: (clientId: string) => void;
}

function statusBadgeStyles(status: ClientStatus): { dot: string; bg: string; text: string } {
  switch (status.type) {
    case 'at-risk':
    case 'overdue':
      return { dot: 'bg-red-500', bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400' };
    case 'pending-checkin':
    case 'unread':
      return { dot: 'bg-blue-500', bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400' };
    case 'ok':
      return { dot: 'bg-emerald-500', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' };
    default:
      return { dot: 'bg-gray-400', bg: 'bg-gray-400/10', text: 'text-muted-foreground' };
  }
}

function truncate(str: string, maxLength: number): string {
  return str.length > maxLength ? str.slice(0, maxLength) + '...' : str;
}

function getSnippet(client: Client, status: ClientStatus, messages: Message[]): string | undefined {
  switch (status.type) {
    case 'pending-checkin':
      if (status.checkIn?.clientNotes) return truncate(status.checkIn.clientNotes, 100);
      if (status.checkIn?.notes) return truncate(status.checkIn.notes, 100);
      return undefined;
    case 'unread': {
      const latestUnread = messages
        .filter(m => m.senderId === client.id && !m.read)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
      return latestUnread ? truncate(latestUnread.content, 100) : undefined;
    }
    case 'at-risk':
    case 'overdue': {
      const days = Math.floor(
        (Date.now() - new Date(client.lastCheckInDate!).getTime()) / (1000 * 60 * 60 * 24)
      );
      return `Last check-in was ${days} days ago`;
    }
    default:
      return undefined;
  }
}

function ctaVariant(status: ClientStatus): 'default' | 'outline' | 'ghost' {
  if (status.type === 'pending-checkin') return 'default';
  if (status.type === 'overdue' || status.type === 'at-risk') return 'outline';
  if (status.type === 'unread') return 'outline';
  return 'ghost';
}

function ctaLabel(status: ClientStatus): string {
  if (status.type === 'pending-checkin') return 'Review Check-in';
  if (status.type === 'overdue' || status.type === 'at-risk') return 'Send Reminder';
  if (status.hasUnread) return 'Review & Respond';
  return 'View';
}

export function ClientsRequiringAction({
  clients,
  messages,
  checkIns,
  completedWorkouts,
  plans,
  onSelectClient
}: ClientsRequiringActionProps) {
  const navigate = useNavigate();

  // Helper: look up plan name for a client
  const getPlanName = (clientPlanId?: string): string | undefined => {
    if (!clientPlanId) return undefined;
    const plan = plans.find((p) => p.id === clientPlanId);
    return plan?.name;
  };

  const clientsWithStatus = clients.map((client) => {
    const status = getClientStatus(client, messages, checkIns);
    return {
      client,
      status,
      planName: getPlanName(client.currentPlanId),
      snippet: getSnippet(client, status, messages)
    };
  });

  // Only clients that actually need action (not 'ok')
  const clientsNeedingAction = clientsWithStatus
    .filter((c) => c.status.type !== 'ok')
    .sort((a, b) => a.status.priority - b.status.priority);

  // Clients with no action needed, sorted alphabetically
  const clientsAllCaughtUp = clientsWithStatus
    .filter((c) => c.status.type === 'ok')
    .sort((a, b) => a.client.name.localeCompare(b.client.name));

  const handleClientAction = (clientId: string, statusType: string) => {
    if (statusType === 'pending-checkin') {
      navigate(`/coach/client/${clientId}/check-in`);
      return;
    }
    const tab = statusType === 'unread' ? 'messages' : 'overview';
    navigate(`/coach/clients/${clientId}?tab=${tab}`);
  };

  // When nobody needs action, render nothing — WeeklyConfidenceStrip shows the all-clear
  if (clientsNeedingAction.length === 0 && clientsAllCaughtUp.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Needs Attention section */}
      {clientsNeedingAction.length > 0 && (
        <section>
          <div className="px-1 pb-2">
            <span className="text-[11px] sm:text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Needs Attention · {clientsNeedingAction.length}
            </span>
          </div>
          <div className="bg-card rounded-xl border divide-y divide-border overflow-hidden">
            {clientsNeedingAction.map(({ client, status, planName, snippet }) => (
              <div
                key={client.id}
                className="flex items-center gap-3 sm:gap-4 py-3 px-3 sm:py-4 sm:px-4 hover:bg-muted/50 transition-colors"
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-muted to-muted/60 flex items-center justify-center select-none text-lg sm:text-xl">
                    {client.avatar || client.name.charAt(0)}
                  </div>
                  {status.hasUnread && status.type !== 'unread' && (
                    <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-blue-500 rounded-full ring-2 ring-background" />
                  )}
                </div>

                {/* Name + status badge + subtitle */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/coach/clients/${client.id}`);
                      }}
                      className="text-sm sm:text-[15px] font-semibold truncate text-left hover:underline hover:text-primary transition-colors cursor-pointer"
                    >
                      {client.name}
                    </button>
                    {(() => {
                      const badge = statusBadgeStyles(status);
                      return (
                        <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium leading-none whitespace-nowrap flex-shrink-0', badge.bg, badge.text)}>
                          <span className={cn('w-1.5 h-1.5 rounded-full', badge.dot)} />
                          {status.label}
                        </span>
                      );
                    })()}
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5">
                    {[planName, snippet].filter(Boolean).join(' · ')}
                  </p>
                </div>

                {/* CTA Button */}
                <Button
                  variant={ctaVariant(status)}
                  size="sm"
                  className="shrink-0 hidden sm:inline-flex"
                  onClick={() => handleClientAction(client.id, status.type)}
                >
                  {ctaLabel(status)}
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* On Track section */}
      {clientsAllCaughtUp.length > 0 && (
        <section>
          <div className="px-1 pb-2">
            <span className="text-[11px] sm:text-xs uppercase tracking-wider text-muted-foreground font-medium">
              On Track · {clientsAllCaughtUp.length}
            </span>
          </div>
          <div className="bg-card rounded-xl border divide-y divide-border overflow-hidden">
            {clientsAllCaughtUp.map(({ client, planName }) => {
              const nextCheckIn = calculateNextCheckIn(client);
              const subtitleParts: string[] = [];
              if (planName) subtitleParts.push(planName);
              if (nextCheckIn) subtitleParts.push(`Next check-in: ${nextCheckIn}`);

              return (
                <div
                  key={client.id}
                  className="flex items-center gap-3 sm:gap-4 py-3 px-3 sm:py-4 sm:px-4 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/coach/clients/${client.id}`)}
                  role="link"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/coach/clients/${client.id}`);
                    }
                  }}
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-muted to-muted/60 flex items-center justify-center select-none text-lg sm:text-xl flex-shrink-0">
                    {client.avatar || client.name.charAt(0)}
                  </div>

                  {/* Name + status badge + subtitle */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm sm:text-[15px] font-semibold truncate">
                        {client.name}
                      </p>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium leading-none whitespace-nowrap flex-shrink-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        On Track
                      </span>
                    </div>
                    {subtitleParts.length > 0 && (
                      <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5">
                        {subtitleParts.join(' · ')}
                      </p>
                    )}
                  </div>

                  {/* Chevron */}
                  <div className="flex-shrink-0 pl-1">
                    <svg
                      className="w-4 h-4 text-muted-foreground/40"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
