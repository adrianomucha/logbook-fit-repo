import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Measurement } from '@/types';
import { TrendingUp, TrendingDown, Minus, Scale, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

interface BodyStatsCardProps {
  measurements: Measurement[];
  clientId: string;
  /** Which direction the client wants each measurement to go */
  desiredDirection?: {
    weight?: 'up' | 'down' | 'maintain';
    bodyFat?: 'up' | 'down' | 'maintain';
  };
}

interface StatItemProps {
  label: string;
  value: number | undefined;
  unit: string;
  previousValue?: number;
  desiredDirection?: 'up' | 'down' | 'maintain';
  history?: { date: string; value: number }[];
}

function StatItem({ label, value, unit, previousValue, desiredDirection, history }: StatItemProps) {
  const [showHistory, setShowHistory] = useState(false);

  if (value === undefined) return null;

  const change = previousValue !== undefined ? value - previousValue : 0;
  const changePercent = previousValue ? Math.round((change / previousValue) * 100 * 10) / 10 : 0;

  // Determine if the trend is "good" based on desired direction
  const isGoodTrend = desiredDirection
    ? desiredDirection === 'up'
      ? change > 0
      : desiredDirection === 'down'
      ? change < 0
      : Math.abs(change) < 0.5
    : true; // Default to neutral if no preference

  const trendDirection = change > 0.1 ? 'up' : change < -0.1 ? 'down' : 'neutral';

  return (
    <div className="space-y-1">
      <button
        onClick={() => history && history.length > 1 && setShowHistory(!showHistory)}
        className={cn(
          'w-full flex items-center justify-between p-2 rounded-lg',
          history && history.length > 1 && 'hover:bg-muted/50 cursor-pointer',
          !history || history.length <= 1 ? 'cursor-default' : ''
        )}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold">
            {value.toFixed(1)} {unit}
          </span>
          {trendDirection !== 'neutral' && (
            <div
              className={cn(
                'flex items-center gap-0.5 text-xs',
                isGoodTrend ? 'text-success' : 'text-warning'
              )}
            >
              {trendDirection === 'up' ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              <span>{Math.abs(changePercent)}%</span>
            </div>
          )}
          {trendDirection === 'neutral' && previousValue !== undefined && (
            <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
              <Minus className="w-3 h-3" />
            </div>
          )}
          {history && history.length > 1 && (
            showHistory ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )
          )}
        </div>
      </button>

      {/* Expandable history */}
      {showHistory && history && history.length > 1 && (
        <div className="ml-4 pl-3 border-l-2 border-muted space-y-1">
          {history.slice(0, 5).map((entry, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between text-xs text-muted-foreground py-1"
            >
              <span>{format(parseISO(entry.date), 'MMM d')}</span>
              <span>
                {entry.value.toFixed(1)} {unit}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function BodyStatsCard({ measurements, clientId, desiredDirection }: BodyStatsCardProps) {
  const stats = useMemo(() => {
    // Get measurements for this client, sorted by date (newest first)
    const clientMeasurements = measurements
      .filter((m) => m.clientId === clientId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (clientMeasurements.length === 0) {
      return null;
    }

    const latest = clientMeasurements[0];
    const previous = clientMeasurements[1];

    // Build history arrays for each measurement type
    const getHistory = (key: keyof Measurement) => {
      return clientMeasurements
        .filter((m) => m[key] !== undefined)
        .map((m) => ({ date: m.date, value: m[key] as number }));
    };

    return {
      latest,
      previous,
      weightHistory: getHistory('weight'),
      bodyFatHistory: getHistory('bodyFat'),
      chestHistory: getHistory('chest'),
      waistHistory: getHistory('waist'),
      hipsHistory: getHistory('hips'),
      bicepsHistory: getHistory('biceps'),
      thighsHistory: getHistory('thighs'),
    };
  }, [measurements, clientId]);

  if (!stats) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Scale className="w-4 h-4" />
            Body Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No measurements recorded yet.
          </p>
          <p className="text-xs text-muted-foreground text-center">
            Add measurements during your weekly check-in.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { latest, previous } = stats;

  // Check which measurements are tracked
  const hasWeightOrBodyFat = latest.weight !== undefined || latest.bodyFat !== undefined;
  const hasBodyMeasurements =
    latest.chest !== undefined ||
    latest.waist !== undefined ||
    latest.hips !== undefined ||
    latest.biceps !== undefined ||
    latest.thighs !== undefined;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Scale className="w-4 h-4" />
            Body Stats
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {format(parseISO(latest.date), 'MMM d, yyyy')}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {/* Primary stats: Weight & Body Fat */}
        {hasWeightOrBodyFat && (
          <div className="space-y-1">
            <StatItem
              label="Weight"
              value={latest.weight}
              unit="lbs"
              previousValue={previous?.weight}
              desiredDirection={desiredDirection?.weight}
              history={stats.weightHistory}
            />
            <StatItem
              label="Body Fat"
              value={latest.bodyFat}
              unit="%"
              previousValue={previous?.bodyFat}
              desiredDirection={desiredDirection?.bodyFat}
              history={stats.bodyFatHistory}
            />
          </div>
        )}

        {/* Secondary stats: Body measurements */}
        {hasBodyMeasurements && (
          <>
            {hasWeightOrBodyFat && <div className="border-t my-2" />}
            <div className="space-y-1">
              <StatItem
                label="Chest"
                value={latest.chest}
                unit="in"
                previousValue={previous?.chest}
                history={stats.chestHistory}
              />
              <StatItem
                label="Waist"
                value={latest.waist}
                unit="in"
                previousValue={previous?.waist}
                desiredDirection="down"
                history={stats.waistHistory}
              />
              <StatItem
                label="Hips"
                value={latest.hips}
                unit="in"
                previousValue={previous?.hips}
                history={stats.hipsHistory}
              />
              <StatItem
                label="Biceps"
                value={latest.biceps}
                unit="in"
                previousValue={previous?.biceps}
                desiredDirection="up"
                history={stats.bicepsHistory}
              />
              <StatItem
                label="Thighs"
                value={latest.thighs}
                unit="in"
                previousValue={previous?.thighs}
                history={stats.thighsHistory}
              />
            </div>
          </>
        )}

        {latest.notes && (
          <>
            <div className="border-t my-2" />
            <p className="text-xs text-muted-foreground italic">"{latest.notes}"</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
