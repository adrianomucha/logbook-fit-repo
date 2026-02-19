import { useState } from 'react';
import { Measurement } from '@/types';
import { ChevronDown, ChevronUp, Scale } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface CollapsedBodyStatsProps {
  measurements: Measurement[];
  clientId: string;
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

  // Count how many measurements are tracked
  const trackedCount = [
    latest.weight,
    latest.bodyFat,
    latest.chest,
    latest.waist,
    latest.hips,
    latest.biceps,
    latest.thighs,
  ].filter(Boolean).length;

  return (
    <div className="border rounded-lg">
      {/* Collapsed row */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Body Stats</span>
          <span className="text-xs text-muted-foreground">· Updated {latestDate}</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-1 border-t space-y-2">
          {latest.weight !== undefined && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Weight</span>
              <span className="font-medium">{latest.weight} lbs</span>
            </div>
          )}
          {latest.bodyFat !== undefined && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Body Fat</span>
              <span className="font-medium">{latest.bodyFat}%</span>
            </div>
          )}
          {latest.chest !== undefined && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Chest</span>
              <span className="font-medium">{latest.chest} in</span>
            </div>
          )}
          {latest.waist !== undefined && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Waist</span>
              <span className="font-medium">{latest.waist} in</span>
            </div>
          )}
          {latest.hips !== undefined && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Hips</span>
              <span className="font-medium">{latest.hips} in</span>
            </div>
          )}
          {latest.biceps !== undefined && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Biceps</span>
              <span className="font-medium">{latest.biceps} in</span>
            </div>
          )}
          {latest.thighs !== undefined && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Thighs</span>
              <span className="font-medium">{latest.thighs} in</span>
            </div>
          )}
          {latest.notes && (
            <p className="text-xs text-muted-foreground italic pt-1 border-t">
              "{latest.notes}"
            </p>
          )}
        </div>
      )}
    </div>
  );
}
