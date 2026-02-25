import { Switch } from '@/components/ui/switch';
import { CalendarCheck } from 'lucide-react';
import { CheckInSchedule } from '@/types';

interface CheckInScheduleToggleProps {
  schedule: CheckInSchedule | undefined;
  hasPlan: boolean;
  onToggle: (enabled: boolean) => void;
}

export function CheckInScheduleToggle({
  schedule,
  hasPlan,
  onToggle,
}: CheckInScheduleToggleProps) {
  // Hide entirely when no plan is assigned
  if (!hasPlan) return null;

  const isActive = schedule?.status === 'ACTIVE';

  return (
    <div className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-lg">
      <div className="flex items-center gap-2">
        <CalendarCheck className="w-4 h-4 text-muted-foreground" />
        <div>
          <span className="text-sm font-medium">Weekly check-ins</span>
          <p className="text-xs text-muted-foreground">
            {isActive
              ? 'Auto-sends every 7 days'
              : schedule?.status === 'PAUSED'
              ? 'Paused'
              : 'Not active'}
          </p>
        </div>
      </div>
      <Switch checked={isActive} onCheckedChange={onToggle} />
    </div>
  );
}
