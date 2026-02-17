import { useState } from 'react';
import { Measurement, Client } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Plus, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { format } from 'date-fns';

interface MeasurementsViewProps {
  client: Client;
  measurements: Measurement[];
  onAddMeasurement: (measurement: Omit<Measurement, 'id'>) => void;
}

export function MeasurementsView({ client, measurements, onAddMeasurement }: MeasurementsViewProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newMeasurement, setNewMeasurement] = useState<Partial<Measurement>>({
    date: new Date().toISOString().split('T')[0],
  });

  const clientMeasurements = (measurements || [])
    .filter((m) => m.clientId === client.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const latest = clientMeasurements[0];
  const previous = clientMeasurements[1];

  const handleSubmit = () => {
    onAddMeasurement({
      clientId: client.id,
      date: newMeasurement.date || new Date().toISOString(),
      weight: newMeasurement.weight,
      bodyFat: newMeasurement.bodyFat,
      chest: newMeasurement.chest,
      waist: newMeasurement.waist,
      hips: newMeasurement.hips,
      biceps: newMeasurement.biceps,
      thighs: newMeasurement.thighs,
      notes: newMeasurement.notes,
    });
    setNewMeasurement({ date: new Date().toISOString().split('T')[0] });
    setIsAdding(false);
  };

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

  return (
    <>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Latest Measurements</CardTitle>
              <Button size="sm" onClick={() => setIsAdding(true)}>
                <Plus className="w-4 h-4 mr-1" />
                Add Measurement
              </Button>
            </div>
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
                  <div className="pt-3 mt-1">
                    <p className="text-sm text-muted-foreground">{latest.notes}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">No measurements recorded yet</p>
            )}
          </CardContent>
        </Card>

        {clientMeasurements.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Measurement History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {clientMeasurements.map((measurement) => (
                  <div key={measurement.id} className="border-b pb-3 last:border-0">
                    <p className="text-sm font-medium mb-2">{format(new Date(measurement.date), 'MMM d, yyyy')}</p>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {measurement.weight && <div>Weight: {measurement.weight} lbs</div>}
                      {measurement.bodyFat && <div>BF: {measurement.bodyFat}%</div>}
                      {measurement.waist && <div>Waist: {measurement.waist}"</div>}
                    </div>
                    {measurement.notes && (
                      <p className="text-xs text-muted-foreground mt-1">{measurement.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right-side Drawer */}
      <Sheet open={isAdding} onOpenChange={setIsAdding}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>New Measurement</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div>
              <label className="text-sm font-medium">Date</label>
              <Input
                type="date"
                value={newMeasurement.date?.split('T')[0] || ''}
                onChange={(e) => setNewMeasurement({ ...newMeasurement, date: e.target.value })}
                className="h-11"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Weight (lbs)</label>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  placeholder="185"
                  value={newMeasurement.weight || ''}
                  onChange={(e) => setNewMeasurement({ ...newMeasurement, weight: parseFloat(e.target.value) || undefined })}
                  className="h-11"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Body Fat (%)</label>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  placeholder="18.5"
                  value={newMeasurement.bodyFat || ''}
                  onChange={(e) => setNewMeasurement({ ...newMeasurement, bodyFat: parseFloat(e.target.value) || undefined })}
                  className="h-11"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Chest (in)</label>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  placeholder="42"
                  value={newMeasurement.chest || ''}
                  onChange={(e) => setNewMeasurement({ ...newMeasurement, chest: parseFloat(e.target.value) || undefined })}
                  className="h-11"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Waist (in)</label>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  placeholder="34"
                  value={newMeasurement.waist || ''}
                  onChange={(e) => setNewMeasurement({ ...newMeasurement, waist: parseFloat(e.target.value) || undefined })}
                  className="h-11"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Hips (in)</label>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  placeholder="40"
                  value={newMeasurement.hips || ''}
                  onChange={(e) => setNewMeasurement({ ...newMeasurement, hips: parseFloat(e.target.value) || undefined })}
                  className="h-11"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Biceps (in)</label>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  placeholder="15"
                  value={newMeasurement.biceps || ''}
                  onChange={(e) => setNewMeasurement({ ...newMeasurement, biceps: parseFloat(e.target.value) || undefined })}
                  className="h-11"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Thighs (in)</label>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  placeholder="24"
                  value={newMeasurement.thighs || ''}
                  onChange={(e) => setNewMeasurement({ ...newMeasurement, thighs: parseFloat(e.target.value) || undefined })}
                  className="h-11"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                placeholder="Optional notes..."
                value={newMeasurement.notes || ''}
                onChange={(e) => setNewMeasurement({ ...newMeasurement, notes: e.target.value })}
                rows={3}
              />
            </div>
            <Button onClick={handleSubmit} className="w-full h-11">
              Save Measurement
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
