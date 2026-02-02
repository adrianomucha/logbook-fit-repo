import { Client, Measurement } from '@/types';
import { MeasurementsView } from '@/components/coach/MeasurementsView';

interface ClientProgressTabProps {
  client: Client;
  measurements: Measurement[];
  onAddMeasurement: (measurement: Omit<Measurement, 'id'>) => void;
}

export function ClientProgressTab({
  client,
  measurements,
  onAddMeasurement
}: ClientProgressTabProps) {
  return (
    <MeasurementsView
      client={client}
      measurements={measurements}
      onAddMeasurement={onAddMeasurement}
    />
  );
}
