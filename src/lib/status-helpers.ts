import { ClientStatus } from '@/lib/client-status';
import { WorkoutPlan } from '@/types';

/**
 * Shared status badge style mapping.
 * Used by ClientCard, ClientsRequiringAction, and any other status display.
 */
export function statusBadgeStyles(status: ClientStatus): {
  dot: string;
  bg: string;
  text: string;
} {
  switch (status.type) {
    case 'at-risk':
    case 'overdue':
      return { dot: 'bg-warning', bg: 'bg-warning/10', text: 'text-warning' };
    case 'pending-checkin':
    case 'unread':
      return { dot: 'bg-info', bg: 'bg-info/10', text: 'text-info' };
    case 'ok':
      return { dot: 'bg-success', bg: 'bg-success/10', text: 'text-success' };
    default:
      return {
        dot: 'bg-muted-foreground',
        bg: 'bg-muted-foreground/10',
        text: 'text-muted-foreground',
      };
  }
}

/**
 * Truncate a string to maxLength, appending '...' if trimmed.
 */
export function truncate(str: string, maxLength: number): string {
  return str.length > maxLength ? str.slice(0, maxLength) + '...' : str;
}

/**
 * Look up a plan name by its ID from a plans array.
 */
export function getPlanName(
  plans: WorkoutPlan[],
  planId?: string
): string | undefined {
  if (!planId) return undefined;
  return plans.find((p) => p.id === planId)?.name;
}
