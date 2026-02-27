import type { TrendResult } from '@/lib/status-helpers';

interface TrendIndicatorProps {
  trend: TrendResult | null;
  className?: string;
}

/**
 * Renders a small trend arrow + text (e.g. "+2.3" with ↗ icon).
 * Shared across measurements displays throughout the coach dashboard.
 */
export function TrendIndicator({ trend, className = '' }: TrendIndicatorProps) {
  if (!trend) return null;
  const Icon = trend.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${trend.color} ${className}`}>
      <Icon className="w-3 h-3" />
      <span>{trend.text}</span>
    </span>
  );
}
