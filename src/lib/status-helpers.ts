import { WorkoutPlan } from '@/types';
import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

// ---------------------------------------------------------------------------
// Trend helper — shared by ClientOverview, MeasurementsModal, MeasurementsView
// ---------------------------------------------------------------------------

export interface TrendResult {
  icon: LucideIcon;
  text: string;
  color: string;
}

/**
 * Compare two numeric values and return a directional trend indicator.
 * Returns `null` when either value is missing or zero.
 */
export function getTrend(current?: number, prev?: number): TrendResult | null {
  if (!current || !prev) return null;
  const diff = current - prev;
  if (Math.abs(diff) < 0.1) return { icon: Minus, text: 'No change', color: 'text-muted-foreground' };
  if (diff > 0) return { icon: TrendingUp, text: `+${diff.toFixed(1)}`, color: 'text-success' };
  return { icon: TrendingDown, text: diff.toFixed(1), color: 'text-destructive' };
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
