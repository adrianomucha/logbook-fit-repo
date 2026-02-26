import { useState } from 'react';
import { Measurement } from '@/types';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface CollapsedBodyStatsProps {
  measurements: Measurement[];
  clientId: string;
}

function StatRow({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}{unit && ` ${unit}`}</span>
    </div>
  );
}

export function CollapsedBodyStats({ measurements, clientId }: CollapsedBodyStatsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get measurements for this client, sorted by date (newest first)
  const clientMeasurements = measurements
    .filter((m) => m.clientId === clientId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (clientMeasurements.length === 0) {
    return null;
  }

  const latest = clientMeasurements[0];
  const latestDate = format(parseISO(latest.date), 'MMM d');

  // Build rows from available data
  const rows: { label: string; value: number; unit: string }[] = [];
  if (latest.weight !== undefined) rows.push({ label: 'Weight', value: latest.weight, unit: 'lbs' });
  if (latest.bodyFat !== undefined) rows.push({ label: 'Body Fat', value: latest.bodyFat, unit: '%' });
  if (latest.chest !== undefined) rows.push({ label: 'Chest', value: latest.chest, unit: 'in' });
  if (latest.waist !== undefined) rows.push({ label: 'Waist', value: latest.waist, unit: 'in' });
  if (latest.hips !== undefined) rows.push({ label: 'Hips', value: latest.hips, unit: 'in' });
  if (latest.biceps !== undefined) rows.push({ label: 'Biceps', value: latest.biceps, unit: 'in' });
  if (latest.thighs !== undefined) rows.push({ label: 'Thighs', value: latest.thighs, unit: 'in' });

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Collapsed row */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3.5 min-h-[44px] text-left hover:bg-muted/50 transition-colors touch-manipulation"
        aria-expanded={isExpanded}
      >
        {/* Row 1: Title + chevron */}
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-[15px] font-semibold tracking-tight">Body Stats</h4>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
          )}
        </div>

        {/* Row 2: Date metadata */}
        <p className="text-xs text-muted-foreground mt-0.5">
          Updated {latestDate} · {rows.length} {rows.length === 1 ? 'measurement' : 'measurements'}
        </p>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-3 border-t space-y-2.5">
          {rows.map((row) => (
            <StatRow key={row.label} label={row.label} value={row.value} unit={row.unit} />
          ))}
          {latest.notes && (
            <p className="text-xs text-muted-foreground italic pt-2.5 mt-2.5 border-t border-border/50">
              &ldquo;{latest.notes}&rdquo;
            </p>
          )}
        </div>
      )}
    </div>
  );
}
