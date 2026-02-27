import { getTrend } from '@/lib/status-helpers';
import { TrendIndicator } from './TrendIndicator';

interface MeasurementRowProps {
  label: string;
  current?: number;
  previous?: number;
  unit?: string;
}

/**
 * Single measurement row with value + trend indicator.
 * Used in MeasurementsModal, MeasurementsView, and anywhere measurements are displayed.
 */
export function MeasurementRow({ label, current, previous, unit = '' }: MeasurementRowProps) {
  const trend = getTrend(current, previous);
  if (!current) return null;

  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold">{current}{unit}</span>
        <TrendIndicator trend={trend} />
      </div>
    </div>
  );
}
