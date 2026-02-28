'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';

export type StatusType = 'workout-scheduled' | 'in-progress' | 'completed' | 'rest-day' | 'coach-updated';

interface StatusHeaderProps {
  status: StatusType;
}

const statusTextMap: Record<StatusType, string> = {
  'workout-scheduled': 'Workout scheduled',
  'in-progress': 'Workout in progress',
  'completed': 'Workout completed',
  'rest-day': 'Rest day',
  'coach-updated': 'Coach updated your plan',
};

export function StatusHeader({ status }: StatusHeaderProps) {
  const [dateStr, setDateStr] = useState('');

  useEffect(() => {
    setDateStr(format(new Date(), 'EEEE, MMMM d'));
  }, []);

  return (
    <div className="text-center sm:text-left">
      <p className="text-sm text-muted-foreground">
        {dateStr || '\u00A0'}
      </p>
      <h1 className="text-lg font-semibold tracking-tight mt-0.5">{statusTextMap[status]}</h1>
    </div>
  );
}
