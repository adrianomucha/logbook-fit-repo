import { useRouter } from 'next/navigation';
import type { DashboardClient } from '@/types/api';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ClientsRequiringActionProps {
  clients: DashboardClient[];
}

type UrgencyStyle = {
  label: string;
  rail: string;
  chip: string;
  dot: string;
};

function urgencyStyle(urgency: DashboardClient['urgency']): UrgencyStyle {
  switch (urgency) {
    case 'AT_RISK':
      return {
        label: 'At Risk',
        rail: 'bg-red-500',
        chip: 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300',
        dot: 'bg-red-500',
      };
    case 'AWAITING_RESPONSE':
      return {
        label: 'Check-in Ready',
        rail: 'bg-blue-500',
        chip: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
        dot: 'bg-blue-500',
      };
    case 'CHECKIN_DUE':
      return {
        label: 'Check-in Due',
        rail: 'bg-amber-500',
        chip: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
        dot: 'bg-amber-500',
      };
    case 'ON_TRACK':
      return {
        label: 'On Track',
        rail: 'bg-transparent',
        chip: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
        dot: 'bg-emerald-500',
      };
  }
}

function ctaForUrgency(urgency: DashboardClient['urgency']): { label: string; variant: 'default' | 'outline' | 'ghost' } {
  switch (urgency) {
    case 'AWAITING_RESPONSE':
      return { label: 'Review Check-in', variant: 'default' };
    case 'AT_RISK':
      // The most urgent client gets the strongest, single obvious action.
      return { label: 'Send Reminder', variant: 'default' };
    case 'CHECKIN_DUE':
      return { label: 'View', variant: 'outline' };
    default:
      return { label: 'View', variant: 'ghost' };
  }
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

// The "signal": names *why* a client is flagged. An emphasized lead token
// carries the reason to act; the rest is quiet context. Built only from data
// that actually exists on DashboardClient — never invented.
function getSignal(client: DashboardClient): { lead?: string; rest: string[] } {
  const rest: string[] = [];
  const plan = client.activePlan?.name;

  switch (client.urgency) {
    case 'AT_RISK': {
      const lead = client.lastWorkoutAt
        ? `${daysSince(client.lastWorkoutAt)}d silent`
        : 'No workouts yet';
      if (client.pendingCheckIn) rest.push('no reply to check-in');
      if (plan) rest.push(plan);
      return { lead, rest };
    }
    case 'AWAITING_RESPONSE': {
      if (plan) rest.push(plan);
      return { lead: 'Ready to review', rest };
    }
    case 'CHECKIN_DUE': {
      if (plan) rest.push(plan);
      return { lead: 'Check-in due', rest };
    }
    case 'ON_TRACK': {
      if (plan) rest.push(plan);
      if (client.lastWorkoutAt) {
        const d = daysSince(client.lastWorkoutAt);
        rest.push(d <= 0 ? 'trained today' : d === 1 ? 'trained yesterday' : `last workout ${d}d ago`);
      }
      return { rest };
    }
  }
}

// Deterministic color from name initial — avoids bland gray avatars
const AVATAR_COLORS = [
  'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
  'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
  'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300',
  'bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300',
  'bg-pink-100 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300',
] as const;

function avatarColor(name: string) {
  const code = name.charCodeAt(0) || 0;
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

function SignalLine({ signal }: { signal: { lead?: string; rest: string[] } }) {
  const hasLead = !!signal.lead;
  return (
    <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5">
      {hasLead && <span className="font-medium text-foreground/80">{signal.lead}</span>}
      {signal.rest.map((part, i) => (
        <span key={i}>
          {(hasLead || i > 0) && <span className="opacity-40"> · </span>}
          {part}
        </span>
      ))}
    </p>
  );
}

function ChevronIcon() {
  return (
    <svg className="w-4 h-4 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

export function ClientsRequiringAction({ clients }: ClientsRequiringActionProps) {
  const router = useRouter();

  const needsAction = clients.filter((c) => c.urgency !== 'ON_TRACK');
  const onTrack = clients.filter((c) => c.urgency === 'ON_TRACK');

  if (needsAction.length === 0 && onTrack.length === 0) return null;

  const handleClientAction = (client: DashboardClient) => {
    if (client.urgency === 'AWAITING_RESPONSE' && client.pendingCheckIn) {
      router.push(`/coach/clients/${client.clientProfileId}/check-in`);
      return;
    }
    router.push(`/coach/clients/${client.clientProfileId}`);
  };

  const cardShadow =
    'shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.03),0_0_0_1px_rgba(0,0,0,0.04)]';

  return (
    <div className="space-y-6">
      {needsAction.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between gap-3 px-1 pb-2.5">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground font-medium antialiased">
              Needs Attention · {needsAction.length}
            </h2>
            <p className="text-[11px] text-muted-foreground/70 antialiased hidden sm:block">
              Sorted by who&rsquo;s slipping fastest
            </p>
          </div>
          <div className={cn('bg-card rounded-xl divide-y divide-border overflow-hidden', cardShadow)}>
            {needsAction.map((client) => {
              const style = urgencyStyle(client.urgency);
              const cta = ctaForUrgency(client.urgency);
              const displayName = client.user.name || client.user.email;
              return (
                <div
                  key={client.clientProfileId}
                  className="relative flex items-center gap-2.5 sm:gap-3 py-2.5 pl-4 pr-3 sm:py-3 sm:pl-5 sm:pr-4 hover:bg-muted/50 active:bg-muted/70 active:scale-[0.995] transition-[background-color,transform] duration-150 cursor-pointer"
                  onClick={() => handleClientAction(client)}
                  role="link"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleClientAction(client);
                    }
                  }}
                >
                  {/* Urgency rail — state encoded in form, readable at a glance */}
                  <span className={cn('absolute left-0 inset-y-0 w-[3px]', style.rail)} aria-hidden="true" />

                  <div className={cn(
                    'w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center select-none text-xs sm:text-sm font-bold flex-shrink-0',
                    avatarColor(displayName)
                  )}>
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm sm:text-[15px] font-semibold truncate leading-tight">
                        {displayName}
                      </span>
                      <span className={cn(
                        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium leading-none whitespace-nowrap flex-shrink-0',
                        style.chip
                      )}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', style.dot)} />
                        {style.label}
                      </span>
                    </div>
                    <SignalLine signal={getSignal(client)} />
                  </div>
                  <Button
                    variant={cta.variant}
                    size="sm"
                    className="shrink-0 hidden sm:inline-flex"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClientAction(client);
                    }}
                  >
                    {cta.label}
                  </Button>
                  <div className="flex-shrink-0 pl-1 sm:hidden">
                    <ChevronIcon />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {onTrack.length > 0 && (
        <section>
          <div className="px-1 pb-2.5">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground font-medium antialiased">
              On Track · {onTrack.length}
            </h2>
          </div>
          <div className={cn('bg-card rounded-xl divide-y divide-border overflow-hidden', cardShadow)}>
            {onTrack.map((client) => {
              const style = urgencyStyle(client.urgency);
              const displayName = client.user.name || client.user.email;
              return (
                <div
                  key={client.clientProfileId}
                  className="flex items-center gap-2.5 sm:gap-3 py-2.5 px-3 sm:py-3 sm:px-4 hover:bg-muted/50 active:bg-muted/70 active:scale-[0.995] transition-[background-color,transform] duration-150 cursor-pointer"
                  onClick={() => router.push(`/coach/clients/${client.clientProfileId}`)}
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
                    'w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center select-none text-xs sm:text-sm font-bold flex-shrink-0 opacity-90',
                    avatarColor(displayName)
                  )}>
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm sm:text-[15px] font-semibold truncate">
                        {displayName}
                      </p>
                      <span className={cn(
                        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium leading-none whitespace-nowrap flex-shrink-0',
                        style.chip
                      )}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', style.dot)} />
                        {style.label}
                      </span>
                    </div>
                    <SignalLine signal={getSignal(client)} />
                  </div>
                  <div className="flex-shrink-0 pl-1">
                    <ChevronIcon />
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
