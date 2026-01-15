import { Measurement } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { format } from 'date-fns';

interface MeasurementsModalProps {
  measurements: Measurement[];
  onClose: () => void;
}

export function MeasurementsModal({ measurements, onClose }: MeasurementsModalProps) {
  const sortedMeasurements = [...measurements].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const latest = sortedMeasurements[sortedMeasurements.length - 1];
  const previous = sortedMeasurements[sortedMeasurements.length - 2];

  const getTrend = (current?: number, prev?: number) => {
    if (!current || !prev) return null;
    const diff = current - prev;
    if (Math.abs(diff) < 0.1) return { icon: Minus, text: 'No change', color: 'text-muted-foreground' };
    if (diff > 0) return { icon: TrendingUp, text: `+${diff.toFixed(1)}`, color: 'text-green-600' };
    return { icon: TrendingDown, text: diff.toFixed(1), color: 'text-red-600' };
  };

  const MeasurementRow = ({ label, current, previous, unit = '' }: any) => {
    const trend = getTrend(current, previous);
    if (!current) return null;

    return (
      <div className="flex items-center justify-between py-2 border-b last:border-0">
        <span className="text-sm font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold">{current}{unit}</span>
          {trend && (
            <div className={`flex items-center gap-1 text-xs ${trend.color}`}>
              <trend.icon className="w-3 h-3" />
              <span>{trend.text}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Simple trend chart
  const renderTrendChart = () => {
    const weights = sortedMeasurements.filter(m => m.weight).map(m => m.weight!);
    const bodyFats = sortedMeasurements.filter(m => m.bodyFat).map(m => m.bodyFat!);

    if (weights.length < 2 && bodyFats.length < 2) {
      return (
        <p className="text-center text-muted-foreground py-8">
          Not enough data points for trend visualization
        </p>
      );
    }

    const maxWeight = Math.max(...weights);
    const minWeight = Math.min(...weights);
    const maxBodyFat = Math.max(...bodyFats);
    const minBodyFat = Math.min(...bodyFats);

    const chartWidth = 100;
    const chartHeight = 60;

    const normalizeWeight = (value: number) => {
      if (maxWeight === minWeight) return 50;
      return chartHeight - ((value - minWeight) / (maxWeight - minWeight)) * chartHeight;
    };

    const normalizeBodyFat = (value: number) => {
      if (maxBodyFat === minBodyFat) return 50;
      return chartHeight - ((value - minBodyFat) / (maxBodyFat - minBodyFat)) * chartHeight;
    };

    const weightPoints = weights.map((w, i) => {
      const x = (i / (weights.length - 1)) * chartWidth;
      const y = normalizeWeight(w);
      return `${x},${y}`;
    }).join(' ');

    const bodyFatPoints = bodyFats.map((bf, i) => {
      const x = (i / (bodyFats.length - 1)) * chartWidth;
      const y = normalizeBodyFat(bf);
      return `${x},${y}`;
    }).join(' ');

    return (
      <div className="space-y-4">
        <div className="flex gap-4 justify-center text-xs">
          {weights.length >= 2 && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-blue-500"></div>
              <span>Weight</span>
            </div>
          )}
          {bodyFats.length >= 2 && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-orange-500"></div>
              <span>Body Fat</span>
            </div>
          )}
        </div>
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-32">
          {/* Grid lines */}
          <line x1="0" y1="0" x2={chartWidth} y2="0" stroke="currentColor" strokeOpacity="0.1" />
          <line x1="0" y1={chartHeight/2} x2={chartWidth} y2={chartHeight/2} stroke="currentColor" strokeOpacity="0.1" />
          <line x1="0" y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke="currentColor" strokeOpacity="0.1" />

          {/* Weight line */}
          {weights.length >= 2 && (
            <polyline
              points={weightPoints}
              fill="none"
              stroke="rgb(59, 130, 246)"
              strokeWidth="2"
            />
          )}

          {/* Body Fat line */}
          {bodyFats.length >= 2 && (
            <polyline
              points={bodyFatPoints}
              fill="none"
              stroke="rgb(249, 115, 22)"
              strokeWidth="2"
            />
          )}

          {/* Weight points */}
          {weights.map((w, i) => {
            const x = (i / (weights.length - 1)) * chartWidth;
            const y = normalizeWeight(w);
            return <circle key={`w-${i}`} cx={x} cy={y} r="2" fill="rgb(59, 130, 246)" />;
          })}

          {/* Body Fat points */}
          {bodyFats.map((bf, i) => {
            const x = (i / (bodyFats.length - 1)) * chartWidth;
            const y = normalizeBodyFat(bf);
            return <circle key={`bf-${i}`} cx={x} cy={y} r="2" fill="rgb(249, 115, 22)" />;
          })}
        </svg>
        <div className="flex justify-between text-xs text-muted-foreground px-2">
          <span>{format(new Date(sortedMeasurements[0].date), 'MMM d')}</span>
          <span>{format(new Date(sortedMeasurements[sortedMeasurements.length - 1].date), 'MMM d')}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Measurements Progress</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Progress Trends</CardTitle>
            </CardHeader>
            <CardContent>
              {renderTrendChart()}
            </CardContent>
          </Card>

          {/* Latest Measurements */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Latest Measurements</CardTitle>
            </CardHeader>
            <CardContent>
              {latest ? (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground mb-3">
                    Recorded on {format(new Date(latest.date), 'MMM d, yyyy')}
                  </p>
                  <MeasurementRow label="Weight" current={latest.weight} previous={previous?.weight} unit=" lbs" />
                  <MeasurementRow label="Body Fat" current={latest.bodyFat} previous={previous?.bodyFat} unit="%" />
                  <MeasurementRow label="Chest" current={latest.chest} previous={previous?.chest} unit='"' />
                  <MeasurementRow label="Waist" current={latest.waist} previous={previous?.waist} unit='"' />
                  <MeasurementRow label="Hips" current={latest.hips} previous={previous?.hips} unit='"' />
                  <MeasurementRow label="Biceps" current={latest.biceps} previous={previous?.biceps} unit='"' />
                  <MeasurementRow label="Thighs" current={latest.thighs} previous={previous?.thighs} unit='"' />
                  {latest.notes && (
                    <div className="pt-2 mt-2 border-t">
                      <p className="text-sm text-muted-foreground">{latest.notes}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">No measurements recorded yet</p>
              )}
            </CardContent>
          </Card>

          {/* Measurement History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Measurement History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sortedMeasurements.reverse().map((measurement) => (
                  <div key={measurement.id} className="border-b pb-3 last:border-0">
                    <p className="text-sm font-medium mb-2">{format(new Date(measurement.date), 'MMM d, yyyy')}</p>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {measurement.weight && <div>Weight: {measurement.weight} lbs</div>}
                      {measurement.bodyFat && <div>BF: {measurement.bodyFat}%</div>}
                      {measurement.waist && <div>Waist: {measurement.waist}"</div>}
                      {measurement.chest && <div>Chest: {measurement.chest}"</div>}
                      {measurement.hips && <div>Hips: {measurement.hips}"</div>}
                      {measurement.biceps && <div>Biceps: {measurement.biceps}"</div>}
                    </div>
                    {measurement.notes && (
                      <p className="text-xs text-muted-foreground mt-1">{measurement.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
