'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';

export type StatusType = 'workout-scheduled' | 'in-progress' | 'completed' | 'rest-day' | 'coach-updated';

interface StatusHeaderProps {
  status: StatusType;
  clientName?: string;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const statusTextMap: Record<StatusType, string> = {
  'workout-scheduled': 'Ready to train',
  'in-progress': 'Workout in progress',
  'completed': 'Great work today',
  'rest-day': 'Rest & recover',
  'coach-updated': 'Coach updated your plan',
};

export function StatusHeader({ status, clientName }: StatusHeaderProps) {
  const [dateStr, setDateStr] = useState('');
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    setDateStr(format(new Date(), 'EEEE, MMMM d'));
    setGreeting(getGreeting());
  }, []);

  const firstName = clientName?.split(' ')[0];

  return (
    <div className="text-center sm:text-left">
      <p className="text-sm text-muted-foreground">
        {dateStr || '\u00A0'}
      </p>
      <h1 className="text-lg font-semibold tracking-tight mt-0.5">
        {greeting && firstName ? `${greeting}, ${firstName}` : statusTextMap[status]}
      </h1>
      {greeting && firstName && (
        <p className="text-sm text-muted-foreground mt-0.5">{statusTextMap[status]}</p>
      )}
    </div>
  );
}
