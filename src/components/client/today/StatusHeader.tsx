import { format } from 'date-fns';

export type StatusType = 'workout-scheduled' | 'in-progress' | 'completed' | 'rest-day' | 'coach-updated';

interface StatusHeaderProps {
  date: Date;
  status: StatusType;
}

const statusTextMap: Record<StatusType, string> = {
  'workout-scheduled': 'Workout scheduled',
  'in-progress': 'Workout in progress',
  'completed': 'Workout completed',
  'rest-day': 'Rest day',
  'coach-updated': 'Coach updated your plan',
};

export function StatusHeader({ date, status }: StatusHeaderProps) {
  return (
    <div className="text-center sm:text-left">
      <p className="text-sm text-muted-foreground">
        {format(date, 'EEEE, MMMM d')}
      </p>
      <h1 className="text-lg font-semibold tracking-tight mt-0.5">{statusTextMap[status]}</h1>
    </div>
  );
}
